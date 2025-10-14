-- Add google_sheets column to clients table for multi-sheet support
-- This column will store the new hierarchical sheet data structure

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS google_sheets JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN clients.google_sheets IS 'JSONB array storing multi-sheet configuration with tabs and selection data';
