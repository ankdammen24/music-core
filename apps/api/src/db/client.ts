import pg from 'pg';
import type { FastifyBaseLogger } from 'fastify';

const { Pool } = pg;

export const createDbPool = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({ connectionString });
};

export const verifyDatabaseConnection = async (pool: pg.Pool, logger: FastifyBaseLogger) => {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.error(error, 'Failed to connect to the database');
    throw error;
  }
};
