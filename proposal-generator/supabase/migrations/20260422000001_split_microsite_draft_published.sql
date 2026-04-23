-- Split microsites.data into draft_data (what the studio/internal view renders)
-- and published_data (what /m/[slug] serves to customers).
-- Backfill both columns from the existing data snapshot, then drop data.

ALTER TABLE microsites ADD COLUMN IF NOT EXISTS draft_data JSONB;
ALTER TABLE microsites ADD COLUMN IF NOT EXISTS published_data JSONB;

UPDATE microsites
SET draft_data = data,
    published_data = data
WHERE draft_data IS NULL OR published_data IS NULL;

ALTER TABLE microsites ALTER COLUMN draft_data SET NOT NULL;
ALTER TABLE microsites ALTER COLUMN published_data SET NOT NULL;
ALTER TABLE microsites ALTER COLUMN draft_data SET DEFAULT '{}'::jsonb;
ALTER TABLE microsites ALTER COLUMN published_data SET DEFAULT '{}'::jsonb;

ALTER TABLE microsites DROP COLUMN data;
