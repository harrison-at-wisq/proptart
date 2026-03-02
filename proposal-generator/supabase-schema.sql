-- Supabase Schema for Prop Tart
-- Run this in your Supabase SQL editor to set up the database

-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_proposals_owner ON proposals(owner_email);

-- Create index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all proposals
-- (All users are wisq.com since we restrict at OAuth level)
CREATE POLICY "Anyone can view proposals" ON proposals
  FOR SELECT
  USING (true);

-- Policy: Users can only insert their own proposals
CREATE POLICY "Users can insert own proposals" ON proposals
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can only update their own proposals
CREATE POLICY "Users can update own proposals" ON proposals
  FOR UPDATE
  USING (true);

-- Policy: Users can only delete their own proposals
CREATE POLICY "Users can delete own proposals" ON proposals
  FOR DELETE
  USING (true);

-- Note: RLS policies use 'true' here because we handle ownership
-- checks in our API routes. Supabase is used with service role key
-- server-side, so RLS policies are bypassed. The API routes
-- explicitly check ownership before allowing updates/deletes.

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS proposals_updated_at ON proposals;
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
