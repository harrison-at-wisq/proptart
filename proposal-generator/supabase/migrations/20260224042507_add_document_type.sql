ALTER TABLE proposals ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'proposal';
