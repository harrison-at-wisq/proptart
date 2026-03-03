-- Create pdf_exports table for saved PDF export configurations
CREATE TABLE IF NOT EXISTS pdf_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'PDF Export',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for proposal lookups
CREATE INDEX IF NOT EXISTS idx_pdf_exports_proposal_id ON pdf_exports(proposal_id);

-- Enable Row Level Security
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;

-- Permissive policies (ownership enforced in API routes with service role key)
CREATE POLICY "Anyone can view pdf_exports" ON pdf_exports
  FOR SELECT USING (true);

CREATE POLICY "Users can insert pdf_exports" ON pdf_exports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update pdf_exports" ON pdf_exports
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete pdf_exports" ON pdf_exports
  FOR DELETE USING (true);

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS pdf_exports_updated_at ON pdf_exports;
CREATE TRIGGER pdf_exports_updated_at
  BEFORE UPDATE ON pdf_exports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
