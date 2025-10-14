-- Drop the unauthorized connection tables that were identified
-- These tables were created without authorization and are not needed

-- ==============================================
-- DROP UNAUTHORIZED CONNECTION TABLES
-- ==============================================

-- Drop the specific connection tables that were identified
-- These appear to be views or materialized views based on the "Unrestricted" labels
DROP VIEW IF EXISTS connection_recommendation CASCADE;
DROP VIEW IF EXISTS connection_status CASCADE;
DROP VIEW IF EXISTS idle_connections_breakdown CASCADE;
DROP VIEW IF EXISTS top_idle_connections CASCADE;

-- Also try dropping as materialized views
DROP MATERIALIZED VIEW IF EXISTS connection_recommendation CASCADE;
DROP MATERIALIZED VIEW IF EXISTS connection_status CASCADE;
DROP MATERIALIZED VIEW IF EXISTS idle_connections_breakdown CASCADE;
DROP MATERIALIZED VIEW IF EXISTS top_idle_connections CASCADE;
