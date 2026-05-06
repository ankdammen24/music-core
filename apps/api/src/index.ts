import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import databasePlugin from './plugins/database.js';
import authRoutes from './routes/auth.js';
import tracksRoutes from './routes/tracks.js';
import { verifyDatabaseConnection } from './db/client.js';

const app = Fastify({ logger: true });

app.register(databasePlugin);
app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-me'
});
app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

app.get('/health', async () => {
  return { status: 'ok' };
});

app.register(authRoutes, { prefix: '/auth' });
app.register(tracksRoutes);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const start = async () => {
  try {
    await verifyDatabaseConnection(app.db, app.log);
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
