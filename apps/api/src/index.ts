import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import databasePlugin from './plugins/database.js';
import authRoutes from './routes/auth.js';
import tracksRoutes from './routes/tracks.js';
import { verifyDatabaseConnection } from './db/client.js';
import { startCron } from './cron.js';

const app = Fastify({ logger: true });
app.register(cors, { origin: true });
app.register(databasePlugin);
app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' });
app.register(multipart, { limits: { fileSize: 30 * 1024 * 1024, files: 1 } });
app.get('/health', async () => ({ status: 'ok' }));
app.register(authRoutes, { prefix: '/auth' });
app.register(tracksRoutes);

const start = async () => {
  await app.ready();
  await verifyDatabaseConnection(app.db, app.log);
  startCron(app.db);
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: process.env.HOST ?? '0.0.0.0' });
};
void start();
