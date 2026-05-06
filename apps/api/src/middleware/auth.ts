import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '../types.js';
import { canAccessRole } from '../auth/roles.js';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ message: 'Unauthorized' });
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.user.role;

    if (!canAccessRole(role, allowedRoles)) {
      return reply.code(403).send({ message: 'Forbidden' });
    }
  };
};
