import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../middleware/auth.js';

const createTrackSchema = z.object({
  title: z.string().min(1),
  album: z.string().optional(),
  genre: z.string().optional(),
  release_date: z.string().optional(),
  stream_url: z.string().url(),
  duration_seconds: z.number().int().positive().optional(),
  cover_url: z.string().url().optional(),
  artist_id: z.string().uuid().optional()
});

const updateTrackSchema = z.object({
  title: z.string().min(1).optional(),
  album: z.string().optional(),
  genre: z.string().optional(),
  release_date: z.string().optional(),
  stream_url: z.string().url().optional(),
  duration_seconds: z.number().int().positive().optional(),
  cover_url: z.string().url().optional(),
  is_public: z.boolean().optional()
});

const uploadsRoot = process.env.UPLOADS_ROOT ?? '/data/uploads';
const audioDir = path.join(uploadsRoot, 'audio');
const coverDir = path.join(uploadsRoot, 'covers');

const tracksRoutes: FastifyPluginAsync = async (app) => {
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(coverDir, { recursive: true });

  app.get('/tracks', async () => {
    const result = await app.db.query(
      `SELECT t.id, t.artist_id, t.title, t.album, t.genre, t.release_date, t.stream_url, t.duration_seconds, t.cover_url, t.created_at, u.display_name AS artist_name
       FROM tracks t
       JOIN users u ON u.id = t.artist_id
       WHERE t.is_public = TRUE
       ORDER BY t.created_at DESC`
    );
    return { tracks: result.rows };
  });

  app.post('/tracks/upload', { preHandler: [requireAuth, requireRole(['artist', 'admin'])] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'file is required' });

    const ext = path.extname(file.filename || '').toLowerCase();
    const kind = file.fieldname === 'cover' ? 'cover' : 'audio';
    const dir = kind === 'cover' ? coverDir : audioDir;
    const allowedAudio = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'];
    const allowedCover = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowed = kind === 'cover' ? allowedCover : allowedAudio;

    if (ext && !allowed.includes(ext)) {
      return reply.code(400).send({ error: `unsupported ${kind} extension` });
    }

    const id = randomUUID();
    const filename = `${id}${ext || ''}`;
    const dest = path.join(dir, filename);

    await pipeline(file.file, (await import('fs')).createWriteStream(dest));

    const stat = await fs.stat(dest);
    const storedPath = path.relative(uploadsRoot, dest);

    await app.db.query(
      `INSERT INTO uploads (user_id, upload_type, original_file_name, stored_file_path, mime_type, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [request.user!.id, kind, file.filename, storedPath, file.mimetype, stat.size]
    );

    return { upload_type: kind, path: storedPath, size: stat.size };
  });

  app.post('/tracks', { preHandler: [requireAuth, requireRole(['artist', 'admin'])] }, async (request, reply) => {
    const parsed = createTrackSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const body = parsed.data;
    const artistId = request.user!.role === 'admin' && body.artist_id ? body.artist_id : request.user!.id;

    const result = await app.db.query(
      `INSERT INTO tracks (artist_id, title, album, genre, release_date, stream_url, duration_seconds, cover_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [artistId, body.title, body.album ?? null, body.genre ?? null, body.release_date ?? null, body.stream_url, body.duration_seconds ?? null, body.cover_url ?? null]
    );

    return reply.code(201).send({ track: result.rows[0] });
  });

  app.patch('/tracks/:id', { preHandler: [requireAuth, requireRole(['artist', 'admin'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTrackSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const existing = await app.db.query('SELECT * FROM tracks WHERE id = $1', [id]);
    if (!existing.rowCount) return reply.code(404).send({ error: 'track not found' });

    const track = existing.rows[0];
    if (request.user!.role !== 'admin' && track.artist_id !== request.user!.id) {
      return reply.code(403).send({ error: 'forbidden' });
    }

    const fields = parsed.data;
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (!keys.length) return { track };

    const setClauses = keys.map((key, idx) => `${key} = $${idx + 1}`);
    const values = keys.map((key) => fields[key]);
    values.push(id);

    const result = await app.db.query(`UPDATE tracks SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`, values);

    return { track: result.rows[0] };
  });

  app.delete('/tracks/:id', { preHandler: [requireAuth, requireRole(['artist', 'admin'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await app.db.query('SELECT * FROM tracks WHERE id = $1', [id]);
    if (!existing.rowCount) return reply.code(404).send({ error: 'track not found' });

    const track = existing.rows[0];
    if (request.user!.role !== 'admin' && track.artist_id !== request.user!.id) {
      return reply.code(403).send({ error: 'forbidden' });
    }

    await app.db.query('DELETE FROM tracks WHERE id = $1', [id]);
    return reply.code(204).send();
  });

  app.get('/tracks/:id/stream', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await app.db.query('SELECT * FROM tracks WHERE id = $1 AND is_public = TRUE', [id]);
    if (!result.rowCount) return reply.code(404).send({ error: 'track not found' });

    const track = result.rows[0];
    await app.db.query('INSERT INTO play_events (track_id, user_id) VALUES ($1, $2)', [id, request.user!.id]);

    return { stream_url: track.stream_url };
  });

  app.post('/tracks/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.db.query(
      `INSERT INTO likes (track_id, user_id) VALUES ($1, $2)
       ON CONFLICT (track_id, user_id) DO NOTHING`,
      [id, request.user!.id]
    );
    return reply.code(201).send({ ok: true });
  });

  app.delete('/tracks/:id/like', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.db.query('DELETE FROM likes WHERE track_id = $1 AND user_id = $2', [id, request.user!.id]);
    return reply.code(204).send();
  });

  app.get('/tracks/:id/comments', async (request) => {
    const { id } = request.params as { id: string };
    const result = await app.db.query(
      `SELECT c.id, c.track_id, c.user_id, c.body, c.created_at, u.display_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.track_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    return { comments: result.rows };
  });

  app.post('/tracks/:id/comments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ body: z.string().min(1).max(1000) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const result = await app.db.query(
      `INSERT INTO comments (track_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, request.user!.id, parsed.data.body]
    );

    return reply.code(201).send({ comment: result.rows[0] });
  });
};

export default tracksRoutes;
