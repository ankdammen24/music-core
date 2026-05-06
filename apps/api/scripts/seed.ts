import pg from 'pg';
import { hashPassword } from '../src/auth/security.js';
import type { UserRole } from '../src/types.js';
import { spawn } from 'child_process';
import path from 'path';
import { mkdir } from 'fs/promises';

const { Pool } = pg;
const runCmd = (args: string[]) => new Promise<void>((resolve, reject) => { const p = spawn('ffmpeg', args); p.on('close', (c) => c===0?resolve():reject(new Error('ffmpeg failed'))); });

const seeds: Array<{ email: string; password: string; displayName: string; role: UserRole }> = [
  { email: 'admin@music-core.local', password: 'Admin123!', displayName: 'Admin User', role: 'admin' },
  { email: 'artist@music-core.local', password: 'Artist123!', displayName: 'Demo Artist', role: 'artist' },
  { email: 'listener@music-core.local', password: 'Listener123!', displayName: 'Listener User', role: 'listener' }
];

const run = async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const uploadsRoot = process.env.UPLOADS_ROOT ?? '/data/uploads';
  await mkdir(path.join(uploadsRoot, 'normalized'), { recursive: true });
  await mkdir(path.join(uploadsRoot, 'original'), { recursive: true });
  try {
    let artistId = '';
    for (const seed of seeds) {
      const h = await hashPassword(seed.password);
      const r = await pool.query(`INSERT INTO users (email,password_hash,display_name,role) VALUES ($1,$2,$3,$4)
        ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name, role=EXCLUDED.role, password_hash=EXCLUDED.password_hash RETURNING id`, [seed.email,h,seed.displayName,seed.role]);
      if (seed.role === 'artist') artistId = r.rows[0].id;
    }
    await pool.query(`INSERT INTO artist_profiles (user_id,artist_name,bio) VALUES ($1,'Demo Artist','Seeded artist') ON CONFLICT (user_id) DO NOTHING`, [artistId]);
    const original = path.join(uploadsRoot, 'original', 'seed-demo.wav');
    const normalized = path.join(uploadsRoot, 'normalized', 'seed-demo.mp3');
    await runCmd(['-f','lavfi','-i','sine=frequency=440:duration=8',original,'-y']);
    await runCmd(['-i',original,'-af','loudnorm=I=-23:TP=-1:LRA=11','-c:a','libmp3lame',normalized,'-y']);
    await pool.query(`INSERT INTO tracks (artist_id,title,audio_file_path,original_file_path,normalized_file_path,is_public,normalization_status,integrated_loudness_lufs,true_peak_dbtp,loudness_range_lra)
      VALUES ($1,'Seed Demo Track','original/seed-demo.wav','original/seed-demo.wav','normalized/seed-demo.mp3',TRUE,'ready',-23,-1,5)
      ON CONFLICT DO NOTHING`, [artistId]);
    console.log('Seed complete.');
  } finally { await pool.end(); }
};
void run();
