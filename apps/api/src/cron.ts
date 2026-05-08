/**
 * cron.ts
 * Hämtar spelstatistik från AzuraCast var 15:e minut.
 * Startas automatiskt när API:et startar.
 */

import type { Pool } from 'pg';

const BASE_URL = process.env.AZURACAST_URL;
const API_KEY = process.env.AZURACAST_API_KEY;
const STATION_ID = process.env.AZURACAST_STATION_ID ?? '1';

interface AzuraSongHistory {
  sh_id: number;
  played_at: number;
  duration: number;
  playlist: string;
  song: {
    id: string;
    text: string;
    artist: string;
    title: string;
    art: string;
  };
}

async function fetchSongHistory(): Promise<AzuraSongHistory[]> {
  if (!BASE_URL || !API_KEY) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/api/station/${STATION_ID}/history?rows=1000`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    if (!res.ok) return [];
    return res.json() as Promise<AzuraSongHistory[]>;
  } catch {
    return [];
  }
}

async function syncStats(pool: Pool) {
  if (!BASE_URL || !API_KEY) return;

  console.log('[Cron] Synkar AzuraCast-statistik...');

  try {
    const history = await fetchSongHistory();
    if (history.length === 0) return;

    // Räkna spel per song_id
    const playCounts = new Map<string, number>();
    for (const entry of history) {
      const id = entry.song.id;
      playCounts.set(id, (playCounts.get(id) ?? 0) + 1);
    }

    // Uppdatera statistik för varje låt
    for (const [songId, count] of playCounts) {
      // Hitta track via azuracast_id
      const track = await pool.query(
        'SELECT id FROM tracks WHERE azuracast_id = $1',
        [songId]
      );

      if (!track.rowCount || track.rowCount === 0) continue;

      const trackId = track.rows[0].id;

      await pool.query(
        `INSERT INTO azuracast_stats (track_id, azuracast_id, play_count)
         VALUES ($1, $2, $3)`,
        [trackId, songId, count]
      );
    }

    console.log(`[Cron] Statistik sparad för ${playCounts.size} låtar`);
  } catch (e) {
    console.error('[Cron] Fel vid statistik-sync:', e);
  }
}

export function startCron(pool: Pool) {
  if (!BASE_URL || !API_KEY) {
    console.log('[Cron] AzuraCast ej konfigurerat, hoppar över cron');
    return;
  }

  // Kör direkt vid start
  syncStats(pool);

  // Sedan var 15:e minut
  setInterval(() => syncStats(pool), 15 * 60 * 1000);
  console.log('[Cron] Statistik-sync startad (var 15:e minut)');
}
