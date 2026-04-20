-- Delete all MOU rows, then drop the document_type column.
-- MOU feature is being removed; only proposal rows remain.
DELETE FROM proposals WHERE document_type = 'mou';
ALTER TABLE proposals DROP COLUMN IF EXISTS document_type;
