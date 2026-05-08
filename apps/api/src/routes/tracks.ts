import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../middleware/auth.js';

const uploadsRoot = process.env.UPLOADS_ROOT ?? '/data/uploads';
const originalDir = path.join(uploadsRoot, 'original');
const normalizedDir = path.join(uploadsRoot, 'normalized');
const allowedExt = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'];

const run = (args: string[]) => new Promise<string>((resolve, reject) => {
  const p = spawn('ffmpeg', args);
  let stderr = '';
  p.stderr.on('data', (d) => (stderr += d.toString()));
  p.on('close', (code) => (code === 0 ? resolve(stderr) : reject(new Error(stderr))));
});

const tracksRoutes: FastifyPluginAsync = async (app) => {
  await fs.mkdir(originalDir, { recursive: true });
  await fs.mkdir(normalizedDir, { recursive: true });

  app.get('/health/ffmpeg', async (_req, reply) => {
    try { await run(['-version']); return { status: 'ok' }; } catch { return reply.code(500).send({ status: 'missing' }); }
  });

  app.get('/tracks', async () => {
    const r = await app.db.query(`SELECT t.id,t.title,t.artist_id,t.created_at,t.normalization_status,t.integrated_loudness_lufs,t.true_peak_dbtp,t.loudness_range_lra,u.display_name artist_name
    FROM tracks t JOIN users u ON u.id=t.artist_id WHERE t.is_public=TRUE ORDER BY t.created_at DESC`);
    return { tracks: r.rows };
  });

  app.post('/tracks/upload', { preHandler: [authenticate, authorize(['artist', 'admin'])] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'file is required' });
    const ext = path.extname(file.filename || '').toLowerCase();
    if (!allowedExt.includes(ext)) return reply.code(400).send({ error: 'unsupported audio format' });

    const id = randomUUID();
    const originalPath = path.join(originalDir, `${id}${ext}`);
    const normalizedPath = path.join(normalizedDir, `${id}.mp3`);
    await pipeline(file.file, (await import('fs')).createWriteStream(originalPath));

    const relOriginal = path.relative(uploadsRoot, originalPath);
    const relNormalized = path.relative(uploadsRoot, normalizedPath);
    await app.db.query(`INSERT INTO tracks (id,artist_id,title,audio_file_path,original_file_path,normalized_file_path,is_public,normalization_status)
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,'processing')`, [id, request.user.sub, file.filename, relOriginal, relOriginal, relNormalized]);

    try {
      const analysis = await run(['-i', originalPath, '-af', 'loudnorm=I=-23:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']);
      const m = analysis.match(/\{[\s\S]*\}/m);
      const j = m ? JSON.parse(m[0]) : {};
      await run(['-i', originalPath, '-af', 'loudnorm=I=-23:TP=-1:LRA=11', '-c:a', 'libmp3lame', '-b:a', '192k', normalizedPath, '-y']);
      await app.db.query(`UPDATE tracks SET normalization_status='ready',integrated_loudness_lufs=$2,true_peak_dbtp=$3,loudness_range_lra=$4 WHERE id=$1`,
        [id, Number(j.output_i ?? 0), Number(j.output_tp ?? 0), Number(j.output_lra ?? 0)]);
      // Synka till AzuraCast (fire-and-forget, blockerar inte svaret)
      import('../azuracast.js').then(({ syncTrackToAzuraCast }) => {
        syncTrackToAzuraCast(normalizedPath, { title: file.filename, artist: request.user.sub });
      }).catch(() => {});
    } catch (e: any) {
      await app.db.query(`UPDATE tracks SET normalization_status='failed', normalization_error=$2 WHERE id=$1`, [id, e.message?.slice(0, 4000) ?? 'normalization failed']);
      return reply.code(500).send({ error: 'normalization failed' });
    }

    return { track_id: id, normalization_status: 'ready' };
  });

  app.get('/tracks/:id/stream', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const r = await app.db.query('SELECT * FROM tracks WHERE id=$1 AND is_public=TRUE', [id]);
    if (!r.rowCount) return reply.code(404).send({ error: 'track not found' });
    const t = r.rows[0];
    if (t.normalization_status !== 'ready' || !t.normalized_file_path) return reply.code(409).send({ error: 'track not ready' });
    await app.db.query('INSERT INTO play_events (track_id,user_id) VALUES ($1,$2)', [id, request.user.sub]);
    reply.header('Content-Type','audio/mpeg');
    const stream=(await import('fs')).createReadStream(path.join(uploadsRoot, t.normalized_file_path));
    return reply.send(stream);
  });
};
export default tracksRoutes;
