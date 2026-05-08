/**
 * azuracast.ts
 * Synkar uppladdade låtar till AzuraCast via REST API.
 */

const BASE_URL = process.env.AZURACAST_URL;
const API_KEY = process.env.AZURACAST_API_KEY;
const STATION_ID = process.env.AZURACAST_STATION_ID ?? '1';

function enabled() {
  return !!(BASE_URL && API_KEY);
}

function headers() {
  return {
    'X-API-Key': API_KEY!,
  };
}

/**
 * Laddar upp en musikfil till AzuraCast.
 * Anropas efter lyckad normalisering i tracks-routen.
 */
export async function syncTrackToAzuraCast(
  filePath: string,
  metadata: { title: string; artist: string }
): Promise<string | null> {
  if (!enabled()) {
    console.log('[AzuraCast] Ej konfigurerat, hoppar över synk');
    return null;
  }

  try {
    const { createReadStream } = await import('fs');
    const { default: FormData } = await import('form-data');

    const form = new FormData();
    form.append('file', createReadStream(filePath), {
      filename: `${metadata.artist} - ${metadata.title}.mp3`,
      contentType: 'audio/mpeg',
    });

    const res = await fetch(
      `${BASE_URL}/api/station/${STATION_ID}/files`,
      {
        method: 'POST',
        headers: {
          ...headers(),
          ...form.getHeaders(),
        },
        body: form as any,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[AzuraCast] Upload misslyckades:', err);
      return null;
    }

    const data = await res.json() as { unique_id: string };
    console.log('[AzuraCast] Låt synkad:', data.unique_id);
    return data.unique_id;
  } catch (e) {
    console.error('[AzuraCast] Fel vid synk:', e);
    return null;
  }
}
