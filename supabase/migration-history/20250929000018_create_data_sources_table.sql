-- Create Data Sources Table
-- Generated: 2025-09-29
-- Supports multiple data sources per client (Google Sheets, CSV, Excel)

-- ==============================================
-- DATA SOURCES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('google_sheets', 'csv', 'xlsx')),
    source_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, name)
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_data_sources_client_id ON data_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_source_type ON data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_data_sources_is_active ON data_sources(is_active);

-- ==============================================
-- RLS POLICIES
-- ==============================================

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Users can manage data sources for their clients
CREATE POLICY "Users can manage data sources for their clients" ON data_sources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_client_access uca 
            WHERE uca.user_id = auth.uid() 
            AND uca.client_id = data_sources.client_id
        )
    );

-- Undeniable users can manage all data sources
CREATE POLICY "Undeniable users can manage all data sources" ON data_sources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.user_id = auth.uid() 
            AND u.global_role = 'undeniable'
        )
    );

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Data sources table created successfully';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'RLS policies applied for security';
END $$;
