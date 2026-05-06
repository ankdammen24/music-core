import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req: any) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = await app.prisma.user.create({ data: { email: req.body.email, passwordHash: hash, displayName: req.body.displayName, role: req.body.role || 'listener' } });
    return { id: user.id };
  });
  app.post('/login', async (req: any) => {
    const user = await app.prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw app.httpErrors.unauthorized();
    return { token: app.jwt.sign({ id: user.id, role: user.role, email: user.email }) };
  });
  app.get('/me', { preHandler: async (req) => req.jwtVerify() }, async (req: any) => req.user);
}
