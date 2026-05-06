import pg from 'pg';
import { hashPassword } from '../src/auth/security.js';
import type { UserRole } from '../src/types.js';

const { Pool } = pg;

const seeds: Array<{ email: string; password: string; displayName: string; role: UserRole }> = [
  { email: 'admin@music-core.local', password: 'Admin123!', displayName: 'Admin User', role: 'admin' },
  { email: 'artist@music-core.local', password: 'Artist123!', displayName: 'Artist User', role: 'artist' },
  { email: 'listener@music-core.local', password: 'Listener123!', displayName: 'Listener User', role: 'listener' }
];

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString });

  try {
    for (const seed of seeds) {
      const passwordHash = await hashPassword(seed.password);
      await pool.query(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
        [seed.email, passwordHash, seed.displayName, seed.role]
      );
    }

    // eslint-disable-next-line no-console
    console.log('Seed complete.');
  } finally {
    await pool.end();
  }
};

void run();
