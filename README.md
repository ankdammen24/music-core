# Music Core MVP (Step 2 Database + Auth)

This repository contains the monorepo foundation for the Music Core MVP, now with PostgreSQL-backed auth.

## Stack
- Monorepo with npm workspaces
- Web: Vue 3 + TypeScript + Vite + Tailwind + Pinia + Vue Router
- API: Node.js + Fastify + TypeScript
- Database: PostgreSQL (Docker)

## Project structure

```txt
apps/
  web/
  api/
packages/
  shared/
infra/
  docker/
```

## Local setup

1. Copy env files if you want custom values:
   - `apps/api/.env.example`
   - `apps/web/.env.example`
2. Run:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

3. In another shell, run migrations and seed:

```bash
npm run -w @music-core/api migrate
npm run -w @music-core/api seed
```

4. Verify services:
   - Web: http://localhost:5173
   - API health: http://localhost:3000/health
   - Postgres: localhost:5432

## Auth API

Base URL: `http://localhost:3000`

### Register
`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "displayName": "New User",
  "role": "listener"
}
```

### Login
`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

### Me (authenticated)
`GET /auth/me`

Header:

```txt
Authorization: Bearer <jwt_token>
```

## Seeded users

`npm run -w @music-core/api seed` creates or updates:
- `admin@music-core.local` (admin)
- `artist@music-core.local` (artist)
- `listener@music-core.local` (listener)

## Notes
- Passwords are hashed with bcrypt.
- Sessions are JWT-based.
- Initial schema includes `users` and `artist_profiles`.
