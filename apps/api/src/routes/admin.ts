import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../middleware/auth.js';
import type { UserRole } from '../types.js';

const adminRoutes: FastifyPluginAsync = async (app) => {
  const guard = { preHandler: [authenticate, authorize(['admin'])] };

  app.get('/admin/users', guard, async () => {
    const result = await app.db.query('SELECT id, email, display_name, role, created_at, updated_at FROM users ORDER BY created_at DESC');
    return { users: result.rows };
  });

  app.get('/admin/tracks', guard, async () => {
    const result = await app.db.query(
      `SELECT t.id, t.title, t.is_public, t.created_at, u.display_name AS artist_name, u.id AS artist_id
       FROM tracks t
       JOIN users u ON u.id = t.artist_id
       ORDER BY t.created_at DESC`
    );
    return { tracks: result.rows };
  });

  app.get('/admin/comments', guard, async () => {
    const result = await app.db.query(
      `SELECT c.id, c.body, c.created_at, c.track_id, t.title AS track_title, u.id AS user_id, u.display_name
       FROM comments c
       JOIN tracks t ON t.id = c.track_id
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC`
    );
    return { comments: result.rows };
  });

  app.patch<{ Params: { id: string }; Body: { role?: UserRole; display_name?: string } }>('/admin/users/:id', guard, async (request, reply) => {
    const { role, display_name } = request.body;
    if (!role && !display_name) return reply.code(400).send({ message: 'Nothing to update' });
    const result = await app.db.query(
      `UPDATE users
       SET role = COALESCE($2, role), display_name = COALESCE($3, display_name)
       WHERE id = $1
       RETURNING id, email, display_name, role, created_at, updated_at`,
      [request.params.id, role ?? null, display_name?.trim() || null]
    );
    if (!result.rows[0]) return reply.code(404).send({ message: 'User not found' });
    return { user: result.rows[0] };
  });

  app.delete<{ Params: { id: string } }>('/admin/comments/:id', guard, async (request, reply) => {
    const result = await app.db.query('DELETE FROM comments WHERE id = $1', [request.params.id]);
    if (!result.rowCount) return reply.code(404).send({ message: 'Comment not found' });
    return reply.code(204).send();
  });

  app.delete<{ Params: { id: string } }>('/admin/tracks/:id', guard, async (request, reply) => {
    const result = await app.db.query('DELETE FROM tracks WHERE id = $1', [request.params.id]);
    if (!result.rowCount) return reply.code(404).send({ message: 'Track not found' });
    return reply.code(204).send();
  });
};

export default adminRoutes;
