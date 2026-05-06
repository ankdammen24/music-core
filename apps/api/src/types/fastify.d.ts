import type { Pool } from 'pg';
import type { UserRole } from '../types.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: UserRole };
    user: { sub: string; role: UserRole };
  }
}
