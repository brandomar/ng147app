-- Add missing columns to clients table for Google Sheets integration
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'google-sheets',
ADD COLUMN IF NOT EXISTS google_sheets_url TEXT,
ADD COLUMN IF NOT EXISTS google_sheets_tabs TEXT[],
ADD COLUMN IF NOT EXISTS sheet_type TEXT DEFAULT 'client-dashboard';

-- Add comments for documentation
COMMENT ON COLUMN clients.data_source IS 'Data source type: google-sheets or excel-import';
COMMENT ON COLUMN clients.google_sheets_url IS 'Google Sheets URL for data source';
COMMENT ON COLUMN clients.google_sheets_tabs IS 'Array of selected Google Sheets tab names';
COMMENT ON COLUMN clients.sheet_type IS 'Sheet type: client-dashboard or undeniable-dashboard';
