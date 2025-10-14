-- Emergency restoration of essential tables
-- This creates the basic schema needed for the application to function

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    tabs JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User access control
CREATE TABLE IF NOT EXISTS user_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write', 'admin')),
    role TEXT CHECK (role IN ('undeniable', 'staff', 'client')),
    granted_by UUID REFERENCES auth.users(id),
    granted_by_email TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR NOT NULL,
    metric_name VARCHAR NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    is_calculated BOOLEAN DEFAULT FALSE,
    calculation_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, client_id, date, category, metric_name)
);

-- Metric definitions
CREATE TABLE IF NOT EXISTS metric_definitions (
    metric_name VARCHAR PRIMARY KEY,
    categories TEXT[] NOT NULL,
    is_calculated BOOLEAN DEFAULT FALSE,
    calculation_formula TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered metrics
CREATE TABLE IF NOT EXISTS discovered_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    google_sheet_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    metrics JSONB DEFAULT '[]',
    metric_configs JSONB DEFAULT '[]',
    total_metrics INTEGER DEFAULT 0,
    total_configured_metrics INTEGER DEFAULT 0,
    sheet_names TEXT[] DEFAULT '{}',
    allowed_categories TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, client_id, google_sheet_id, sheet_name)
);

-- Sync status
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    google_sheet_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    sync_status VARCHAR DEFAULT 'pending',
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    sync_error_message TEXT,
    total_sync_count INTEGER DEFAULT 0,
    successful_sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, client_id, google_sheet_id, sheet_name)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_metrics_user_client_date ON metrics(user_id, client_id, date);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_discovered_metrics_user_client ON discovered_metrics(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_user_client ON sync_status(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_access_control_user_client ON user_access_control(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_access_control_role ON user_access_control(role);

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Authenticated users can access all clients" ON clients
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all user_access_control" ON user_access_control
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all metrics" ON metrics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all discovered_metrics" ON discovered_metrics
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access all sync_status" ON sync_status
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can access their own settings" ON user_settings
    FOR ALL USING (user_id = auth.uid());

-- ==============================================
-- ESSENTIAL FUNCTIONS
-- ==============================================

-- Get user access level function
CREATE OR REPLACE FUNCTION get_user_access_level(p_user_id UUID, p_client_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    IF p_client_id IS NULL THEN
        RETURN 'admin';
    END IF;
    
    -- Check for global undeniable role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN 'admin';
    END IF;
    
    -- Check client-specific access
    SELECT access_level INTO STRICT result FROM user_access_control 
    WHERE user_id = p_user_id AND client_id = p_client_id;
    
    RETURN COALESCE(result, 'none');
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'none';
    WHEN TOO_MANY_ROWS THEN
        RETURN 'admin';
END;
$$;

-- Get accessible clients function
CREATE OR REPLACE FUNCTION get_accessible_clients()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    is_active BOOLEAN,
    tabs JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        c.is_active,
        c.tabs,
        c.created_at,
        c.updated_at
    FROM clients c
    WHERE c.is_active = true
    AND (
        -- User has undeniable role
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.role = 'undeniable'
            AND uac.client_id IS NULL
        )
        OR
        -- User has access to this specific client
        EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.user_id = auth.uid() 
            AND uac.client_id = c.id
        )
    );
END;
$$;

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Add default "Staff Dashboard" client
INSERT INTO clients (id, name, slug, is_active, tabs) VALUES
('00000000-0000-0000-0000-000000000001', 'Staff Dashboard', 'staff-dashboard', true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add default user access for the current user (if they exist)
INSERT INTO user_access_control (user_id, client_id, access_level, role)
SELECT 
    auth.uid(),
    '00000000-0000-0000-0000-000000000001'::UUID,
    'admin',
    'undeniable'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Essential tables restored successfully';
    RAISE NOTICE 'Default Staff Dashboard client created';
    RAISE NOTICE 'Basic RLS policies applied';
END $$;
