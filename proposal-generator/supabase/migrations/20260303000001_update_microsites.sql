-- Add name and updated_at columns to microsites for multi-microsite support
ALTER TABLE microsites ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Microsite';
ALTER TABLE microsites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS microsites_updated_at ON microsites;
CREATE TRIGGER microsites_updated_at
  BEFORE UPDATE ON microsites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
