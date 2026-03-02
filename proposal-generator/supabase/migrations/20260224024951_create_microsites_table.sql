-- Create microsites table for published proposal web pages
CREATE TABLE IF NOT EXISTS microsites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unpublished_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  owner_email TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_microsites_slug ON microsites(slug);
CREATE INDEX IF NOT EXISTS idx_microsites_proposal_id ON microsites(proposal_id);

-- Enable Row Level Security
ALTER TABLE microsites ENABLE ROW LEVEL SECURITY;

-- Permissive policies (ownership enforced in API routes with service role key)
CREATE POLICY "Anyone can view microsites" ON microsites
  FOR SELECT USING (true);

CREATE POLICY "Users can insert microsites" ON microsites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update microsites" ON microsites
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete microsites" ON microsites
  FOR DELETE USING (true);
