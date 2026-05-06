import type { FastifyPluginAsync } from 'fastify';
import { authenticate, authorize } from '../middleware/auth.js';

type TopTrack = {
  id: string;
  title: string;
  plays: string;
};

const artistRoutes: FastifyPluginAsync = async (app) => {
  app.get('/artist/stats', { preHandler: [authenticate, authorize(['artist'])] }, async (request) => {
    const artistId = request.user.sub;

    const [totalsRes, topTracksRes, latestCommentsRes] = await Promise.all([
      app.db.query<{
        total_tracks: string;
        total_plays: string;
        total_likes: string;
        total_comments: string;
      }>(
        `SELECT
            (SELECT COUNT(*)::text FROM tracks WHERE artist_id = $1) AS total_tracks,
            (SELECT COUNT(*)::text FROM play_events pe JOIN tracks t ON t.id = pe.track_id WHERE t.artist_id = $1) AS total_plays,
            (SELECT COUNT(*)::text FROM likes l JOIN tracks t ON t.id = l.track_id WHERE t.artist_id = $1) AS total_likes,
            (SELECT COUNT(*)::text FROM comments c JOIN tracks t ON t.id = c.track_id WHERE t.artist_id = $1) AS total_comments`,
        [artistId]
      ),
      app.db.query<TopTrack>(
        `SELECT t.id, t.title, COUNT(pe.id)::text AS plays
         FROM tracks t
         LEFT JOIN play_events pe ON pe.track_id = t.id
         WHERE t.artist_id = $1
         GROUP BY t.id
         ORDER BY COUNT(pe.id) DESC, t.created_at DESC
         LIMIT 10`,
        [artistId]
      ),
      app.db.query(
        `SELECT c.id, c.body, c.created_at, c.track_id, t.title AS track_title, u.display_name
         FROM comments c
         JOIN tracks t ON t.id = c.track_id
         JOIN users u ON u.id = c.user_id
         WHERE t.artist_id = $1
         ORDER BY c.created_at DESC
         LIMIT 20`,
        [artistId]
      )
    ]);

    const totals = totalsRes.rows[0] ?? {
      total_tracks: '0',
      total_plays: '0',
      total_likes: '0',
      total_comments: '0'
    };

    return {
      totals: {
        total_tracks: Number(totals.total_tracks),
        total_plays: Number(totals.total_plays),
        total_likes: Number(totals.total_likes),
        total_comments: Number(totals.total_comments)
      },
      top_tracks: topTracksRes.rows.map((track) => ({ ...track, plays: Number(track.plays) })),
      latest_comments: latestCommentsRes.rows
    };
  });
};

export default artistRoutes;
