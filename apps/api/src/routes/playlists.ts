import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth.js';

type Playlist = { id: string; user_id: string; name: string; created_at: Date; updated_at: Date };
type Track = { id: string; title: string; artist_id: string; is_public: boolean; stream_url: string; position?: number };

const playlistsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/playlists', { preHandler: [authenticate] }, async (request) => {
    const result = await app.db.query<Playlist>('SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC', [request.user.sub]);
    return { playlists: result.rows };
  });

  app.post<{ Body: { name?: string } }>('/playlists', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.body.name?.trim()) return reply.code(400).send({ message: 'name is required' });
    const result = await app.db.query<Playlist>('INSERT INTO playlists (user_id, name) VALUES ($1,$2) RETURNING *', [request.user.sub, request.body.name.trim()]);
    return reply.code(201).send({ playlist: result.rows[0] });
  });

  app.patch<{ Params: { id: string }; Body: { name?: string } }>('/playlists/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.body.name?.trim()) return reply.code(400).send({ message: 'name is required' });
    const updated = await app.db.query<Playlist>('UPDATE playlists SET name = $2 WHERE id = $1 AND user_id = $3 RETURNING *', [request.params.id, request.body.name.trim(), request.user.sub]);
    if (!updated.rows[0]) return reply.code(404).send({ message: 'Playlist not found' });
    return { playlist: updated.rows[0] };
  });

  app.delete<{ Params: { id: string } }>('/playlists/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const deleted = await app.db.query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [request.params.id, request.user.sub]);
    if (!deleted.rowCount) return reply.code(404).send({ message: 'Playlist not found' });
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string }; Body: { track_id?: string } }>('/playlists/:id/items', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.body.track_id) return reply.code(400).send({ message: 'track_id is required' });
    const own = await app.db.query('SELECT 1 FROM playlists WHERE id = $1 AND user_id = $2', [request.params.id, request.user.sub]);
    if (!own.rowCount) return reply.code(404).send({ message: 'Playlist not found' });
    const pos = await app.db.query<{ next_position: number }>('SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM playlist_items WHERE playlist_id = $1', [request.params.id]);
    await app.db.query('INSERT INTO playlist_items (playlist_id, track_id, position) VALUES ($1,$2,$3) ON CONFLICT (playlist_id, track_id) DO NOTHING', [request.params.id, request.body.track_id, pos.rows[0].next_position]);
    return reply.code(201).send({ message: 'Track added' });
  });

  app.delete<{ Params: { id: string; trackId: string } }>('/playlists/:id/items/:trackId', { preHandler: [authenticate] }, async (request, reply) => {
    const own = await app.db.query('SELECT 1 FROM playlists WHERE id = $1 AND user_id = $2', [request.params.id, request.user.sub]);
    if (!own.rowCount) return reply.code(404).send({ message: 'Playlist not found' });
    await app.db.query('DELETE FROM playlist_items WHERE playlist_id = $1 AND track_id = $2', [request.params.id, request.params.trackId]);
    return reply.code(204).send();
  });

  app.get<{ Params: { id: string }; Querystring: { shuffle?: string } }>('/playlists/:id/play', { preHandler: [authenticate] }, async (request, reply) => {
    const own = await app.db.query('SELECT 1 FROM playlists WHERE id = $1 AND user_id = $2', [request.params.id, request.user.sub]);
    if (!own.rowCount) return reply.code(404).send({ message: 'Playlist not found' });
    const orderClause = request.query.shuffle === 'true' ? 'RANDOM()' : 'pi.position ASC';
    const result = await app.db.query<Track>(
      `SELECT t.id, t.title, t.artist_id, t.is_public, CONCAT('/tracks/', t.id, '/stream') AS stream_url, pi.position
       FROM playlist_items pi
       JOIN tracks t ON t.id = pi.track_id
       WHERE pi.playlist_id = $1 AND (t.is_public = true OR t.artist_id = $2 OR $3 = 'admin')
       ORDER BY ${orderClause}`,
      [request.params.id, request.user.sub, request.user.role]
    );
    return { tracks: result.rows };
  });
};

export default playlistsRoutes;
