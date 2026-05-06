import fp from 'fastify-plugin';
import type { Pool } from 'pg';
import { createDbPool } from '../db/client.js';


export default fp(async (app) => {
  const pool = createDbPool();

  app.decorate('db', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
});
