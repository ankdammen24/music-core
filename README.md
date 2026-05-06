# Music Core MVP

Music Core is a stabilized MVP for track discovery and role-based music workflows.

## What is included
- Public catalog browsing.
- Role-based authentication (`listener`, `artist`, `admin`).
- Track upload/manage endpoints for artists.
- Likes, comments, and playlists for listeners.
- Admin moderation and management APIs.

## Setup
1. Prerequisites:
   - Docker + Docker Compose
   - Node.js 22+ (only required for local non-Docker dev)
2. Start all services:
   ```bash
   docker compose -f infra/docker/docker-compose.yml up --build
   ```
   This now starts Postgres, runs migrations/seeding automatically, then starts API and Web.
3. Open:
   - Web: `http://localhost:5173`
   - API health: `http://localhost:3000/health`

## Environment variables

### API (`apps/api/.env.example`)
- `PORT` - API port (`3000`)
- `HOST` - bind host (`0.0.0.0`)
- `DATABASE_URL` - Postgres connection string
- `JWT_SECRET` - JWT signing secret

### Web (`apps/web/.env.example`)
- `VITE_API_URL` - API base URL fallback
- `VITE_API_BASE_URL` - preferred API base URL (supported by app)

## Default seed users
Created/updated automatically by `apps/api/scripts/seed.ts`:
- `admin@music-core.local` / `Admin123!` (`admin`)
- `artist@music-core.local` / `Artist123!` (`artist`)
- `listener@music-core.local` / `Listener123!` (`listener`)

## MVP flow coverage

### Flow 1: Public visitor
- Can list public tracks via `GET /tracks`.
- Cannot stream tracks because `GET /tracks/:id/stream` requires auth.

### Flow 2: Listener
- Register/login: `POST /auth/register`, `POST /auth/login`
- Play tracks: `GET /tracks/:id/stream` (authenticated)
- Like/unlike: `POST/DELETE /tracks/:id/like`
- Comment: `GET/POST /tracks/:id/comments`
- Playlist CRUD/playback: `/playlists` and `/playlists/:id/play`

### Flow 3: Artist
- Register/login with `role=artist` or seed login.
- Upload file metadata flow: `POST /tracks/upload`, create track via `POST /tracks`.
- Edit/delete own tracks: `PATCH /tracks/:id`, `DELETE /tracks/:id`
- Stats: `GET /artist/stats`

### Flow 4: Admin
- Manage users: `GET /admin/users`, `PATCH /admin/users/:id`
- Manage tracks: `GET /admin/tracks`, `DELETE /admin/tracks/:id`
- Manage comments: `GET /admin/comments`, `DELETE /admin/comments/:id`

## API overview
- Auth: `/auth/*`
- Tracks/social/streaming: `/tracks*`
- Playlists: `/playlists*`
- Artist analytics: `/artist/stats`
- Admin moderation: `/admin/*`

## Known limitations
- Upload stores files on local Docker volume (`/data/uploads`), not object storage.
- Streaming is full-file response only (no true adaptive bitrates).
- UI is intentionally minimal and token-driven for quick verification.
- No automated e2e tests yet.

## Future Radio Core integration notes
- Add event bridge so track plays/likes/comments can be consumed by Radio Core.
- Map playlists to scheduler-friendly queue payloads.
- Add metadata sync contracts for artist/library records.
- Introduce auth trust boundary (service-to-service JWT or mTLS).

## TODO (next phases)
- S3-compatible storage
- HLS streaming
- Radio Core scheduler integration
- payments
- waveform player
- AI tagging
- moderation queue
