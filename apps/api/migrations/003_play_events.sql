CREATE TABLE IF NOT EXISTS play_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS play_events_user_id_idx ON play_events(user_id);
CREATE INDEX IF NOT EXISTS play_events_track_id_idx ON play_events(track_id);
CREATE INDEX IF NOT EXISTS play_events_played_at_idx ON play_events(played_at DESC);
