/**
 * useAzuraCast.ts
 * React hooks för AzuraCast-integrationen.
 * Lägg filen i: src/hooks/useAzuraCast.ts
 */

import { useState, useEffect, useCallback } from "react";
import {
  getNowPlaying,
  subscribeNowPlaying,
  getTracks,
  uploadTrack,
  updateTrackMetadata,
  deleteTrack,
  getPlaylists,
  addTrackToPlaylist,
  type AzuraNowPlaying,
  type AzuraTrack,
  type AzuraPlaylist,
} from "@/lib/azuracastService";

// ── useNowPlaying ─────────────────────────────────────────────────────────

/**
 * Prenumererar på realtidsuppdateringar av vad som spelas just nu.
 * Faller tillbaka på polling (var 10:e sekund) om SSE inte stöds.
 */
export function useNowPlaying() {
  const [data, setData] = useState<AzuraNowPlaying | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hämta initial data
    getNowPlaying()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });

    // Prenumerera på SSE-uppdateringar
    const stop = subscribeNowPlaying(
      (d) => {
        setData(d);
        setError(null);
      },
      () => {
        // SSE-fel: falla tillbaka på polling
        const interval = setInterval(() => {
          getNowPlaying()
            .then(setData)
            .catch((e) => setError(e.message));
        }, 10_000);
        return () => clearInterval(interval);
      }
    );

    return stop;
  }, []);

  return { data, error, loading };
}

// ── useTracks ─────────────────────────────────────────────────────────────

/**
 * Hämtar och hanterar musikkatalogen.
 */
export function useTracks() {
  const [tracks, setTracks] = useState<AzuraTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTracks();
      setTracks(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const removeTrack = useCallback(
    async (uniqueId: string) => {
      await deleteTrack(uniqueId);
      setTracks((prev) => prev.filter((t) => t.unique_id !== uniqueId));
    },
    []
  );

  const updateTrack = useCallback(
    async (
      uniqueId: string,
      metadata: Parameters<typeof updateTrackMetadata>[1]
    ) => {
      const updated = await updateTrackMetadata(uniqueId, metadata);
      setTracks((prev) =>
        prev.map((t) => (t.unique_id === uniqueId ? updated : t))
      );
      return updated;
    },
    []
  );

  return { tracks, loading, error, refetch: fetchTracks, removeTrack, updateTrack };
}

// ── useUpload ─────────────────────────────────────────────────────────────

/**
 * Hanterar uppladdning av en musikfil till AzuraCast.
 */
export function useUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      file: File,
      metadata?: Parameters<typeof uploadTrack>[1]
    ) => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const result = await uploadTrack(file, metadata, setProgress);
        setProgress(100);
        return result;
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, progress, error };
}

// ── usePlaylists ──────────────────────────────────────────────────────────

/**
 * Hämtar spellistor och låter dig lägga till låtar i dem.
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<AzuraPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlaylists()
      .then((data) => {
        setPlaylists(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const addToPlaylist = useCallback(
    async (uniqueId: string, playlistIds: number[]) => {
      return addTrackToPlaylist(uniqueId, playlistIds);
    },
    []
  );

  return { playlists, loading, error, addToPlaylist };
}
