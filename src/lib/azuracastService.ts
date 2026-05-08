/**
 * azuracastService.ts
 * Komplett integration mot AzuraCast REST API.
 * Lägg filen i: src/lib/azuracastService.ts
 *
 * Miljövariabler som krävs i .env:
 *   VITE_AZURACAST_URL=https://din-azuracast.example.com
 *   VITE_AZURACAST_API_KEY=din-api-nyckel
 *   VITE_AZURACAST_STATION_ID=1
 */

const BASE_URL = import.meta.env.VITE_AZURACAST_URL as string;
const API_KEY = import.meta.env.VITE_AZURACAST_API_KEY as string;
const STATION_ID = import.meta.env.VITE_AZURACAST_STATION_ID as string;

// ── Typer ──────────────────────────────────────────────────────────────────

export interface AzuraTrack {
  unique_id: string;
  song_id: string;
  text: string;           // "Artist - Titel"
  artist: string;
  title: string;
  album: string;
  genre: string;
  length: number;         // sekunder
  length_text: string;    // "3:45"
  path: string;
  playlists: AzuraPlaylist[];
}

export interface AzuraPlaylist {
  id: number;
  name: string;
}

export interface AzuraNowPlaying {
  station: {
    id: number;
    name: string;
    shortcode: string;
    listen_url: string;
  };
  now_playing: {
    song: {
      id: string;
      text: string;
      artist: string;
      title: string;
      album: string;
      art: string;        // URL till albumomslag
    };
    duration: number;
    elapsed: number;
    remaining: number;
    played_at: number;
  };
  song_history: Array<{
    song: {
      text: string;
      artist: string;
      title: string;
      art: string;
    };
    played_at: number;
  }>;
  listeners: {
    current: number;
    total: number;
  };
  live: {
    is_live: boolean;
    streamer_name: string;
  };
}

export interface UploadResult {
  unique_id: string;
  song_id: string;
  artist: string;
  title: string;
  path: string;
}

// ── Hjälpfunktioner ───────────────────────────────────────────────────────

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    "X-API-Key": API_KEY,
    ...extra,
  };
}

function stationUrl(path: string): string {
  return `${BASE_URL}/api/station/${STATION_ID}${path}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `AzuraCast API-fel: ${res.status}`;
    try {
      const err = await res.json();
      message = err.message ?? message;
    } catch {}
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Now Playing ───────────────────────────────────────────────────────────

/**
 * Hämtar vad som spelas just nu på stationen.
 * Ingen auth krävs – publik endpoint.
 */
export async function getNowPlaying(): Promise<AzuraNowPlaying> {
  const res = await fetch(
    `${BASE_URL}/api/nowplaying/${STATION_ID}`
  );
  return handleResponse<AzuraNowPlaying>(res);
}

/**
 * Prenumererar på realtidsuppdateringar via Server-Sent Events.
 * Returnerar en cleanup-funktion.
 *
 * Exempel:
 *   const stop = subscribeNowPlaying((data) => setNowPlaying(data));
 *   // ...senare:
 *   stop();
 */
export function subscribeNowPlaying(
  onUpdate: (data: AzuraNowPlaying) => void,
  onError?: (err: Event) => void
): () => void {
  const url = `${BASE_URL}/api/live/nowplaying/${STATION_ID}`;
  const source = new EventSource(url);

  source.onmessage = (e) => {
    try {
      onUpdate(JSON.parse(e.data) as AzuraNowPlaying);
    } catch {}
  };

  if (onError) source.onerror = onError;

  return () => source.close();
}

// ── Musikkatalog ──────────────────────────────────────────────────────────

/**
 * Hämtar hela musikkatalogen för stationen.
 */
export async function getTracks(): Promise<AzuraTrack[]> {
  const res = await fetch(stationUrl("/files"), {
    headers: headers(),
  });
  return handleResponse<AzuraTrack[]>(res);
}

/**
 * Hämtar en enskild låt via dess unique_id.
 */
export async function getTrack(uniqueId: string): Promise<AzuraTrack> {
  const res = await fetch(stationUrl(`/file/${uniqueId}`), {
    headers: headers(),
  });
  return handleResponse<AzuraTrack>(res);
}

// ── Uppladdning ───────────────────────────────────────────────────────────

/**
 * Laddar upp en musikfil direkt till AzuraCast.
 * @param file       - Filen från <input type="file"> eller drag-and-drop
 * @param metadata   - Artist, titel, album, genre (valfritt)
 * @param onProgress - Callback med procentuellt framsteg (0–100)
 */
export async function uploadTrack(
  file: File,
  metadata?: {
    artist?: string;
    title?: string;
    album?: string;
    genre?: string;
  },
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Metadata kan skickas med direkt vid uppladdning
  if (metadata?.artist) formData.append("artist", metadata.artist);
  if (metadata?.title) formData.append("title", metadata.title);
  if (metadata?.album) formData.append("album", metadata.album);
  if (metadata?.genre) formData.append("genre", metadata.genre);

  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", stationUrl("/files"));
      xhr.setRequestHeader("X-API-Key", API_KEY);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message ?? `Upload misslyckades: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload misslyckades: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Nätverksfel vid uppladdning"));
      xhr.send(formData);
    });
  }

  const res = await fetch(stationUrl("/files"), {
    method: "POST",
    headers: headers(),
    body: formData,
  });

  return handleResponse<UploadResult>(res);
}

/**
 * Uppdaterar metadata för en befintlig låt.
 */
export async function updateTrackMetadata(
  uniqueId: string,
  metadata: {
    artist?: string;
    title?: string;
    album?: string;
    genre?: string;
  }
): Promise<AzuraTrack> {
  const res = await fetch(stationUrl(`/file/${uniqueId}`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(metadata),
  });
  return handleResponse<AzuraTrack>(res);
}

/**
 * Tar bort en låt från AzuraCast.
 */
export async function deleteTrack(uniqueId: string): Promise<void> {
  const res = await fetch(stationUrl(`/file/${uniqueId}`), {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Kunde inte ta bort låt: ${res.status}`);
  }
}

// ── Spellistor ────────────────────────────────────────────────────────────

/**
 * Hämtar alla spellistor för stationen.
 */
export async function getPlaylists(): Promise<AzuraPlaylist[]> {
  const res = await fetch(stationUrl("/playlists"), {
    headers: headers(),
  });
  return handleResponse<AzuraPlaylist[]>(res);
}

/**
 * Lägger till en låt i en spellista.
 * OBS: Skicka playlists som en array med playlist-ID:n.
 */
export async function addTrackToPlaylist(
  uniqueId: string,
  playlistIds: number[]
): Promise<AzuraTrack> {
  const res = await fetch(stationUrl(`/file/${uniqueId}`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ playlists: playlistIds }),
  });
  return handleResponse<AzuraTrack>(res);
}

/**
 * Skapar en ny spellista.
 */
export async function createPlaylist(name: string): Promise<AzuraPlaylist> {
  const res = await fetch(stationUrl("/playlists"), {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name,
      is_enabled: true,
      type: "default",
      source: "songs",
      order: "shuffle",
    }),
  });
  return handleResponse<AzuraPlaylist>(res);
}
