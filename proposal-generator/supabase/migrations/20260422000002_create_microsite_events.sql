-- Visitor telemetry for public /m/[slug] microsites.
-- Rows are written by an unauthenticated API endpoint (anyone can POST),
-- but reads are gated in API code (owner-only).

CREATE TABLE IF NOT EXISTS microsite_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  microsite_id UUID NOT NULL REFERENCES microsites(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  visitor_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  user_agent TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_microsite_events_microsite_time
  ON microsite_events(microsite_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_microsite_events_session
  ON microsite_events(session_id);
CREATE INDEX IF NOT EXISTS idx_microsite_events_visitor
  ON microsite_events(visitor_id);

ALTER TABLE microsite_events ENABLE ROW LEVEL SECURITY;

-- Permissive policies; ownership on reads is enforced in API routes with the
-- service role key, matching the existing microsites table pattern.
CREATE POLICY "Anyone can insert microsite events" ON microsite_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can select microsite events" ON microsite_events
  FOR SELECT USING (true);
