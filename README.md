# Music Core v0.1-alpha

## Snabbstart (lokalt)
1. Kör setup-wizard:
   ```bash
   ./scripts/setup-wizard.sh
   ```
2. Starta tjänster:
   ```bash
   docker compose up --build
   ```
3. Öppna webb:
   - http://localhost:5173

---

## Installationsinstruktioner (detaljerat)

### Krav
- Docker Engine + Docker Compose Plugin
- Öppna portar:
  - `5173` för lokal webb
  - `3000` för lokal API
  - `5432` för lokal databas

### 1) Konfigurera miljö
Wizardn skapar en root-`.env` med:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `JWT_SECRET`
- `VITE_API_BASE_URL`

Du kan köra om wizardn när som helst för att uppdatera värden.

### 2) Starta appen
```bash
docker compose up --build
```

### 3) Verifiera
- API health: `http://localhost:3000/health`
- Web: `http://localhost:5173`

---

## Reverse proxy på port 443 + Let's Encrypt

Wizardn kan automatiskt skapa:
- `docker-compose.proxy.yml`
- `infra/proxy/Caddyfile`

När de finns startar du med:
```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up --build -d
```

### Hur det fungerar
- Caddy lyssnar på `80/443`
- Caddy hämtar och förnyar certifikat via Let's Encrypt automatiskt
- Routing:
  - `https://din-domän/api/*` -> `api:3000`
  - `https://din-domän/*` -> `web:5173`

### Viktigt i produktion
- Peka domänens DNS A/AAAA till servern
- Se till att portar `80` och `443` är öppna i brandvägg/security group
- Byt default-hemligheter (särskilt `JWT_SECRET`)

---

## Seeded demo accounts
- artist@music-core.local / Artist123!
- listener@music-core.local / Listener123!
- admin@music-core.local / Admin123!

## MVP scope
Included: authentication, roles, artist upload, public track listing, authenticated playback, simple player, PostgreSQL, local storage, docker compose, kubernetes manifests.
Excluded: playlists/comments/likes/statistics/moderation/notifications/social/payments/Radio Core.

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
- Proxy/TLS in `docker-compose.proxy.yml` + `infra/proxy/Caddyfile`
- Kubernetes base + overlays in `infra/kubernetes`
