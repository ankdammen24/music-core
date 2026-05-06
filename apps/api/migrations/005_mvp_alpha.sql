DROP TABLE IF EXISTS playlist_tracks CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS moderation_actions CASCADE;

ALTER TABLE tracks
  DROP COLUMN IF EXISTS stream_url,
  DROP COLUMN IF EXISTS genre_id,
  DROP COLUMN IF EXISTS album_id,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS cover_image_path,
  ADD COLUMN IF NOT EXISTS original_file_path TEXT,
  ADD COLUMN IF NOT EXISTS normalized_file_path TEXT,
  ADD COLUMN IF NOT EXISTS integrated_loudness_lufs DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS true_peak_dbtp DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS loudness_range_lra DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS normalization_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS normalization_error TEXT;

ALTER TABLE tracks ALTER COLUMN audio_file_path DROP NOT NULL;

UPDATE tracks SET normalization_status='pending' WHERE normalization_status IS NULL;
