import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import { join } from 'node:path';
import { authRoutes } from './routes/auth.js';
import { registerApiRoutes } from './routes/index.js';

const app = Fastify({ logger: true });
export const prisma = new PrismaClient();
app.decorate('prisma', prisma);
app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });
app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
app.register(fastifyStatic, { root: join(process.cwd(), 'uploads'), prefix: '/uploads/' });
app.register(authRoutes, { prefix: '/auth' });
app.register(registerApiRoutes, { prefix: '/api' });

app.listen({ port: Number(process.env.API_PORT || 4000), host: '0.0.0.0' });
