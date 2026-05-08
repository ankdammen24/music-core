-- AzuraCast-metadata på tracks
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS azuracast_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS album TEXT,
  ADD COLUMN IF NOT EXISTS genre TEXT,
  ADD COLUMN IF NOT EXISTS art_url TEXT,
  ADD COLUMN IF NOT EXISTS lyrics TEXT,
  ADD COLUMN IF NOT EXISTS isrc TEXT,
  ADD COLUMN IF NOT EXISTS bpm INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER;

-- Statistik från AzuraCast per låt
CREATE TABLE IF NOT EXISTS azuracast_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  azuracast_id TEXT NOT NULL,
  play_count INTEGER NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS azuracast_stats_track_id_idx ON azuracast_stats(track_id);
CREATE INDEX IF NOT EXISTS azuracast_stats_fetched_at_idx ON azuracast_stats(fetched_at);
