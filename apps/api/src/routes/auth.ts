import type { FastifyPluginAsync } from 'fastify';
import { hashPassword, verifyPassword } from '../auth/security.js';
import { authenticate } from '../middleware/auth.js';
import type { SafeUser, UserRecord, UserRole } from '../types.js';

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

interface LoginBody {
  email: string;
  password: string;
}

const toSafeUser = (user: UserRecord): SafeUser => ({
  id: user.id,
  email: user.email,
  display_name: user.display_name,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at
});

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { email, password, displayName, role } = request.body;

    if (!email || !password || !displayName) {
      return reply.code(400).send({ message: 'email, password, and displayName are required' });
    }

    const userRole = role ?? 'listener';

    const existing = await app.db.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rowCount) {
      return reply.code(409).send({ message: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const result = await app.db.query<UserRecord>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, passwordHash, displayName, userRole]
    );

    const user = result.rows[0];
    const token = app.jwt.sign({ sub: user.id, role: user.role });

    return reply.code(201).send({ token, user: toSafeUser(user) });
  });

  app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ message: 'email and password are required' });
    }

    const result = await app.db.query<UserRecord>('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const passwordIsValid = await verifyPassword(password, user.password_hash);
    if (!passwordIsValid) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: toSafeUser(user) };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await app.db.query<UserRecord>('SELECT * FROM users WHERE id = $1', [request.user.sub]);
    const user = result.rows[0];

    if (!user) {
      return reply.code(404).send({ message: 'User not found' });
    }

    return { user: toSafeUser(user) };
  });
};

export default authRoutes;
