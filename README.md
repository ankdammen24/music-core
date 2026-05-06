# Music Core v0.1-alpha

## Run locally
```bash
docker compose up --build
```
Open http://localhost:5173

## Seeded demo accounts
- artist@music-core.local / Artist123!
- listener@music-core.local / Listener123!
- admin@music-core.local / Admin123!

## MVP scope
Included: authentication, roles, artist upload, public track listing, authenticated playback, simple player, PostgreSQL, local storage, docker compose, kubernetes manifests.
Excluded: playlists/comments/likes/statistics/moderation/notifications/social/payments/Radio Core.

## Setup
1. Copy env examples if needed.
2. Run compose command above.
3. Register/login.
4. Upload audio from artist account.
5. Wait for normalization status `ready`.
6. Play from player page.

## API endpoints
- POST /auth/register
- POST /auth/login
- GET /tracks
- POST /tracks/upload (artist/admin)
- GET /tracks/:id/stream (auth)
- GET /health
- GET /health/ffmpeg

## Infra
- Dockerfiles in `apps/api` and `apps/web`
- Compose in root `docker-compose.yml`
- Kubernetes base + overlays in `infra/kubernetes`
