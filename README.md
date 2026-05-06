# Music Core MVP (Step 1 Foundation)

This repository contains the initial monorepo foundation for the Music Core MVP.

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

3. Verify services:
   - Web: http://localhost:5173
   - API health: http://localhost:3000/health
   - Postgres: localhost:5432

## Notes
- This step intentionally excludes auth, uploads, player logic, and data models.
- API currently exposes only `GET /health` and returns `{ "status": "ok" }`.
