# Music Core MVP

Music Core is a standalone on-demand music platform for listeners, artists, and admins. It is intentionally separated so a future Radio Core API integration can be added later.

## Monorepo structure
- `apps/web`: Vue 3 + TypeScript + Pinia + Vue Router frontend
- `apps/api`: Fastify + TypeScript backend
- `packages/shared`: shared types
- `infra/docker`: Docker development setup

## Features in this MVP
- Public browsing for artists and tracks
- JWT auth (`/auth/register`, `/auth/login`, `/auth/me`)
- Role model: listener, artist, admin
- Auth-required playback endpoint (`/api/tracks/:id/playback`)
- Track creation for artist/admin
- Playlists, likes, comments, artist stats, admin moderation summary
- Pinia audio player controls: play/pause, next/prev, shuffle, repeat
- Prisma schema + seed data
- Local file storage abstraction path (`uploads/`) ready for future S3-compatible swap
- TODO markers for Radio Core integration

## Quick start
```bash
npm run dev
```
This runs Postgres, API and web via Docker Compose.

## Local setup without docker
1. `npm install`
2. Copy envs from `apps/api/.env.example` and `apps/web/.env.example`
3. Start postgres and set `DATABASE_URL`
4. `cd apps/api && npx prisma migrate dev && npm run db:seed && npm run dev`
5. `cd apps/web && npm run dev`

## Seed users
- admin@musiccore.local / password123
- artist@musiccore.local / password123

## Security notes
- Passwords hashed with bcrypt
- JWT for protected endpoints
- Role-based authorization for artist/admin operations
- Playback requires auth
- Upload limits enforced by multipart file size config
- Secrets loaded from env vars
