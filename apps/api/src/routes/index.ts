import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

export async function registerApiRoutes(app: FastifyInstance) {
  app.get('/public/tracks', async () => app.prisma.track.findMany({ where: { isPublic: true }, include: { artist: true } }));
  app.get('/public/artists', async () => app.prisma.user.findMany({ where: { role: 'artist' }, include: { artistProfile: true } }));
  app.addHook('preHandler', async (req) => { if (req.url.includes('/public')) return; await req.jwtVerify(); });
  app.get('/users/me', async (req: any) => app.prisma.user.findUnique({ where: { id: req.user.id } }));
  app.post('/tracks', async (req: any) => {
    if (!['artist', 'admin'].includes(req.user.role)) throw app.httpErrors.forbidden();
    return app.prisma.track.create({ data: { ...req.body, artistId: req.user.id } });
  });
  app.get('/tracks/:id/playback', async (req: any) => {
    const track = await app.prisma.track.findUnique({ where: { id: req.params.id } });
    if (!track) throw app.httpErrors.notFound();
    await app.prisma.playEvent.create({ data: { trackId: track.id, userId: req.user.id } });
    return { streamUrl: `/${track.audioPath}` };
  });
  app.post('/playlists', async (req: any) => app.prisma.playlist.create({ data: { userId: req.user.id, name: req.body.name } }));
  app.post('/likes/:trackId', async (req: any) => app.prisma.like.create({ data: { userId: req.user.id, trackId: req.params.trackId } }));
  app.delete('/likes/:trackId', async (req: any) => app.prisma.like.delete({ where: { userId_trackId: { userId: req.user.id, trackId: req.params.trackId } } }));
  app.post('/comments/:trackId', async (req: any) => app.prisma.comment.create({ data: { userId: req.user.id, trackId: req.params.trackId, body: req.body.body } }));
  app.get('/artists/me/stats', async (req: any) => {
    if (!['artist', 'admin'].includes(req.user.role)) throw app.httpErrors.forbidden();
    const count = await app.prisma.playEvent.count({ where: { track: { artistId: req.user.id } } });
    return { playCount: count };
  });
  app.get('/admin/moderation/summary', async (req: any) => {
    if (req.user.role !== 'admin') throw app.httpErrors.forbidden();
    const [users, tracks, comments] = await Promise.all([app.prisma.user.count(), app.prisma.track.count(), app.prisma.comment.count()]);
    return { users, tracks, comments };
  });
  // TODO: Add Radio Core federation endpoints once Radio Core API contracts are finalized.
}
