/**
 * import-azuracast.ts
 * Engångsskript: importerar alla låtar från AzuraCast till music-core.
 * Kör med: npm run -w @music-core/api import-azuracast
 */

import { createDbPool } from '../src/db/client.js';

const BASE_URL = process.env.AZURACAST_URL;
const API_KEY = process.env.AZURACAST_API_KEY;
const STATION_ID = process.env.AZURACAST_STATION_ID ?? '1';
const IMPORT_USER_ID = process.env.AZURACAST_IMPORT_USER_ID; // admin-användarens UUID

if (!BASE_URL || !API_KEY || !IMPORT_USER_ID) {
  console.error('Saknade env-variabler: AZURACAST_URL, AZURACAST_API_KEY, AZURACAST_IMPORT_USER_ID');
  process.exit(1);
}

interface AzuraFile {
  unique_id: string;
  song_id: string;
  text: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
  lyrics: string;
  isrc: string;
  art: string;
  length: number;
  length_text: string;
  custom_fields: Record<string, string>;
}

async function fetchAllTracks(): Promise<AzuraFile[]> {
  const res = await fetch(`${BASE_URL}/api/station/${STATION_ID}/files`, {
    headers: { 'X-API-Key': API_KEY! },
  });
  if (!res.ok) throw new Error(`AzuraCast API fel: ${res.status}`);
  return res.json() as Promise<AzuraFile[]>;
}

async function main() {
  const pool = createDbPool();

  console.log('Hämtar låtar från AzuraCast...');
  const tracks = await fetchAllTracks();
  console.log(`Hittade ${tracks.length} låtar`);

  let imported = 0;
  let skipped = 0;

  for (const track of tracks) {
    try {
      // Kolla om låten redan finns via azuracast_id
      const existing = await pool.query(
        'SELECT id FROM tracks WHERE azuracast_id = $1',
        [track.unique_id]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        // Uppdatera metadata om den redan finns
        await pool.query(
          `UPDATE tracks SET
            title = $2,
            album = $3,
            genre = $4,
            art_url = $5,
            lyrics = $6,
            isrc = $7,
            duration_seconds = $8,
            updated_at = NOW()
          WHERE azuracast_id = $1`,
          [
            track.unique_id,
            track.title || track.text,
            track.album || null,
            track.genre || null,
            track.art || null,
            track.lyrics || null,
            track.isrc || null,
            Math.round(track.length) || null,
          ]
        );
        skipped++;
        continue;
      }

      // Skapa ny låt
      await pool.query(
        `INSERT INTO tracks (
          artist_id, title, album, genre, art_url, lyrics, isrc,
          duration_seconds, is_public, normalization_status,
          azuracast_id, audio_file_path
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'ready',$9,$10)`,
        [
          IMPORT_USER_ID,
          track.title || track.text || 'Okänd titel',
          track.album || null,
          track.genre || null,
          track.art || null,
          track.lyrics || null,
          track.isrc || null,
          Math.round(track.length) || null,
          track.unique_id,
          track.unique_id, // audio_file_path sätts till azuracast_id
        ]
      );
      imported++;
      console.log(`  ✓ ${track.artist} - ${track.title}`);
    } catch (e: any) {
      console.error(`  ✗ ${track.title}: ${e.message}`);
    }
  }

  console.log(`\nKlart! Importerade: ${imported}, uppdaterade: ${skipped}`);
  await pool.end();
}

main().catch(console.error);
