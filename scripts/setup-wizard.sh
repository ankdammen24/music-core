#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

prompt_default() {
  local prompt="$1"
  local default="$2"
  local value
  read -r -p "$prompt [$default]: " value
  if [[ -z "$value" ]]; then
    value="$default"
  fi
  printf '%s' "$value"
}

yes_no_default_yes() {
  local prompt="$1"
  local answer
  read -r -p "$prompt [Y/n]: " answer
  answer="${answer:-Y}"
  [[ "$answer" =~ ^[Yy]$ ]]
}

echo "🎵 Music Core setup wizard"

echo "\n1) Grundkonfiguration"
POSTGRES_USER="$(prompt_default 'Postgres användare' 'musiccore')"
POSTGRES_PASSWORD="$(prompt_default 'Postgres lösenord' 'musiccore')"
POSTGRES_DB="$(prompt_default 'Postgres databas' 'musiccore')"
JWT_SECRET="$(prompt_default 'JWT secret' 'change-me-in-production')"
VITE_API_BASE_URL="$(prompt_default 'Publik API URL för web (ex: http://localhost:3000)' 'http://localhost:3000')"

cat > .env <<ENV
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
JWT_SECRET=${JWT_SECRET}
VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV

echo "Skrev .env"

echo "\n2) Reverse proxy + TLS (443)"
if yes_no_default_yes "Vill du konfigurera Caddy med Let's Encrypt?"; then
  DOMAIN="$(prompt_default 'Domän (ex: music.example.com)' 'music.example.com')"
  LE_EMAIL="$(prompt_default "Email för Let's Encrypt" "admin@example.com")"

  sed \
    -e "s/__DOMAIN__/${DOMAIN}/g" \
    -e "s/__LE_EMAIL__/${LE_EMAIL}/g" \
    infra/proxy/Caddyfile.template > infra/proxy/Caddyfile

  cat > docker-compose.proxy.yml <<'YAML'
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/proxy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api

volumes:
  caddy_data:
  caddy_config:
YAML

  echo "Skrev infra/proxy/Caddyfile och docker-compose.proxy.yml"
else
  echo "Hoppar över proxy/TLS-konfiguration."
fi

echo "\n✅ Klar!"
echo "Starta lokalt: docker compose up --build"
echo "Starta med proxy/TLS: docker compose -f docker-compose.yml -f docker-compose.proxy.yml up --build -d"
