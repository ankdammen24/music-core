import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../middleware/auth.js';

type TrackRecord = {
  id: string;
  artist_id: string;
  album_id: string | null;
  title: string;
  description: string | null;
  genre_id: string | null;
  audio_file_path: string;
  cover_image_path: string | null;
  duration_seconds: number | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
};

type SafeTrack = Omit<TrackRecord, 'audio_file_path'> & {
  stream_url: string;
};

const audioDir = '/data/uploads/audio';
const coverDir = '/data/uploads/covers';
const allowedExt = new Set(['.mp3', '.wav', '.flac', '.m4a']);
const maxUploadBytes = 25 * 1024 * 1024;

const toSafeTrack = (track: TrackRecord): SafeTrack => {
  const { audio_file_path: _hidden, ...safeTrack } = track;
  return {
    ...safeTrack,
    stream_url: `/tracks/${track.id}/stream`
  };
};

const tracksRoutes: FastifyPluginAsync = async (app) => {
  await mkdir(audioDir, { recursive: true });
  await mkdir(coverDir, { recursive: true });

  app.get('/tracks', async (request) => {
    const token = request.headers.authorization;
    let userRole: string | null = null;
    let userId: string | null = null;

    if (token?.startsWith('Bearer ')) {
      try {
        const decoded = app.jwt.verify<{ sub: string; role: string }>(token.substring(7));
        userRole = decoded.role;
        userId = decoded.sub;
      } catch {
        // no-op
      }
    }

    const showAll = userRole === 'admin';
    const showOwnAndPublic = userRole === 'artist' && userId;

    if (showAll) {
      const result = await app.db.query<TrackRecord>('SELECT * FROM tracks ORDER BY created_at DESC');
      return { tracks: result.rows.map(toSafeTrack) };
    }

    if (showOwnAndPublic) {
      const result = await app.db.query<TrackRecord>(
        'SELECT * FROM tracks WHERE is_public = true OR artist_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return { tracks: result.rows.map(toSafeTrack) };
    }

    const result = await app.db.query<TrackRecord>('SELECT * FROM tracks WHERE is_public = true ORDER BY created_at DESC');
    return { tracks: result.rows.map(toSafeTrack) };
  });

  app.get<{ Params: { id: string } }>('/tracks/:id', async (request, reply) => {
    const result = await app.db.query<TrackRecord>('SELECT * FROM tracks WHERE id = $1', [request.params.id]);
    const track = result.rows[0];
    if (!track) return reply.code(404).send({ message: 'Track not found' });

    if (!track.is_public) {
      const token = request.headers.authorization;
      if (!token?.startsWith('Bearer ')) return reply.code(403).send({ message: 'Forbidden' });
      try {
        const decoded = app.jwt.verify<{ sub: string; role: string }>(token.substring(7));
        if (decoded.role !== 'admin' && decoded.sub !== track.artist_id) {
          return reply.code(403).send({ message: 'Forbidden' });
        }
      } catch {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
    }

    return { track: toSafeTrack(track) };
  });

  app.get<{ Params: { id: string } }>('/tracks/:id/stream', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await app.db.query<TrackRecord>('SELECT * FROM tracks WHERE id = $1', [request.params.id]);
    const track = result.rows[0];
    if (!track) return reply.code(404).send({ message: 'Track not found' });

    const canStream = track.is_public || request.user.role === 'admin' || request.user.sub === track.artist_id;
    if (!canStream) return reply.code(403).send({ message: 'Forbidden' });

    await app.db.query('INSERT INTO play_events (user_id, track_id) VALUES ($1, $2)', [request.user.sub, track.id]);

    const stats = await stat(track.audio_file_path);
    reply.header('Content-Type', 'audio/mpeg');
    reply.header('Content-Length', stats.size);
    reply.header('Accept-Ranges', 'bytes');
    return reply.send(createReadStream(track.audio_file_path));
  });

  app.post('/tracks/upload', { preHandler: [authenticate, authorize(['artist', 'admin'])] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ message: 'File is required' });

    const ext = extname(file.filename).toLowerCase();
    if (!allowedExt.has(ext)) {
      return reply.code(400).send({ message: 'Unsupported audio type' });
    }

    const storedName = `${randomUUID()}${ext}`;
    const storedPath = join(audioDir, storedName);
    await pipeline(file.file, createWriteStream(storedPath));
    const fileStat = await stat(storedPath);
    if (fileStat.size > maxUploadBytes) {
      return reply.code(400).send({ message: 'File too large' });
    }

    const upload = await app.db.query(
      `INSERT INTO uploads (user_id, upload_type, original_file_name, stored_file_path, mime_type, file_size_bytes)
       VALUES ($1, 'audio', $2, $3, $4, $5) RETURNING *`,
      [request.user.sub, file.filename, storedPath, file.mimetype, fileStat.size]
    );

    return reply.code(201).send({ upload: upload.rows[0] });
  });

  app.post<{ Body: Partial<TrackRecord> }>('/tracks', { preHandler: [authenticate, authorize(['artist', 'admin'])] }, async (request, reply) => {
    const body = request.body;
    if (!body.title || !body.audio_file_path) return reply.code(400).send({ message: 'title and audio_file_path are required' });

    const artistId = request.user.role === 'admin' && body.artist_id ? body.artist_id : request.user.sub;
    const result = await app.db.query<TrackRecord>(
      `INSERT INTO tracks (artist_id, album_id, title, description, genre_id, audio_file_path, cover_image_path, duration_seconds, is_public)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [artistId, body.album_id ?? null, body.title, body.description ?? null, body.genre_id ?? null, body.audio_file_path, body.cover_image_path ?? null, body.duration_seconds ?? null, body.is_public ?? false]
    );
    return reply.code(201).send({ track: toSafeTrack(result.rows[0]) });
  });

  app.patch<{ Params: { id: string }; Body: Partial<TrackRecord> }>('/tracks/:id', { preHandler: [authenticate, authorize(['artist', 'admin'])] }, async (request, reply) => {
    const existing = await app.db.query<TrackRecord>('SELECT * FROM tracks WHERE id = $1', [request.params.id]);
    const track = existing.rows[0];
    if (!track) return reply.code(404).send({ message: 'Track not found' });
    if (request.user.role !== 'admin' && track.artist_id !== request.user.sub) return reply.code(403).send({ message: 'Forbidden' });

    const updated = await app.db.query<TrackRecord>(
      `UPDATE tracks SET
       title = COALESCE($2, title), description = COALESCE($3, description), album_id = COALESCE($4, album_id), genre_id = COALESCE($5, genre_id),
       audio_file_path = COALESCE($6, audio_file_path), cover_image_path = COALESCE($7, cover_image_path), duration_seconds = COALESCE($8, duration_seconds), is_public = COALESCE($9, is_public)
       WHERE id = $1 RETURNING *`,
      [request.params.id, request.body.title, request.body.description, request.body.album_id, request.body.genre_id, request.body.audio_file_path, request.body.cover_image_path, request.body.duration_seconds, request.body.is_public]
    );

    return { track: toSafeTrack(updated.rows[0]) };
  });

  app.delete<{ Params: { id: string } }>('/tracks/:id', { preHandler: [authenticate, authorize(['artist', 'admin'])] }, async (request, reply) => {
    const existing = await app.db.query<TrackRecord>('SELECT * FROM tracks WHERE id = $1', [request.params.id]);
    const track = existing.rows[0];
    if (!track) return reply.code(404).send({ message: 'Track not found' });
    if (request.user.role !== 'admin' && track.artist_id !== request.user.sub) return reply.code(403).send({ message: 'Forbidden' });

    await app.db.query('DELETE FROM tracks WHERE id = $1', [request.params.id]);
    return reply.code(204).send();
  });
};

export default tracksRoutes;
