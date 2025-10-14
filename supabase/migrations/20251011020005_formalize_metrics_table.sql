-- ==============================================
-- FORMALIZE METRICS TABLE STRUCTURE
-- ==============================================
-- This migration formalizes the metrics table structure with proper
-- unique constraints for both Google Sheets and Excel/CSV imports

-- Ensure all columns exist with correct types
CREATE TABLE IF NOT EXISTS "public"."metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "date" "date" NOT NULL,
    "category" character varying NOT NULL,
    "metric_name" character varying NOT NULL,
    "value" numeric(15,2) NOT NULL,
    "is_calculated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "data_source" "text" DEFAULT 'google-sheets'::"text",
    "google_sheet_id" "text",
    "sheet_name" "text",
    "tab_name" "text",
    "tab_gid" "text",
    "data_source_type" character varying(20) DEFAULT 'google_sheets'::character varying,
    "data_source_id" character varying(255),
    "target_value" numeric(15,2),
    "metric_type" "text" DEFAULT 'actual'::"text",
    CONSTRAINT "metrics_data_source_check" CHECK (("data_source" = ANY (ARRAY['google-sheets'::"text", 'excel-import'::"text"])))
);

-- Add missing columns if they don't exist
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS "google_sheet_id" "text",
ADD COLUMN IF NOT EXISTS "sheet_name" "text",
ADD COLUMN IF NOT EXISTS "tab_name" "text",
ADD COLUMN IF NOT EXISTS "tab_gid" "text",
ADD COLUMN IF NOT EXISTS "data_source_type" character varying(20) DEFAULT 'google_sheets'::character varying,
ADD COLUMN IF NOT EXISTS "data_source_id" character varying(255),
ADD COLUMN IF NOT EXISTS "target_value" numeric(15,2),
ADD COLUMN IF NOT EXISTS "metric_type" "text" DEFAULT 'actual'::"text";

-- Update data_source_type constraint to include csv_import
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_data_source_type_check;
ALTER TABLE metrics ADD CONSTRAINT metrics_data_source_type_check 
CHECK (data_source_type IN ('google_sheets', 'excel_import', 'csv_import'));

-- ==============================================
-- UNIQUE CONSTRAINT STRATEGY
-- ==============================================

-- Drop existing constraint that doesn't handle NULL google_sheet_id properly
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_unique_per_sheet_tab_type;

-- Create partial unique index for Google Sheets (where google_sheet_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS metrics_unique_google_sheets 
ON metrics(user_id, client_id, google_sheet_id, sheet_name, tab_name, date, category, metric_name, metric_type)
WHERE google_sheet_id IS NOT NULL;

-- Create partial unique index for Excel/CSV imports (where google_sheet_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS metrics_unique_file_imports
ON metrics(user_id, client_id, data_source_id, sheet_name, tab_name, date, category, metric_name, metric_type)
WHERE google_sheet_id IS NULL;

-- ==============================================
-- PERFORMANCE INDEXES
-- ==============================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_metrics_user_client_date ON metrics(user_id, client_id, date);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_date_category ON metrics(date, category);

-- Google Sheets specific indexes
CREATE INDEX IF NOT EXISTS idx_metrics_google_sheet ON metrics(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab ON metrics(sheet_name, tab_name);
CREATE INDEX IF NOT EXISTS idx_metrics_user_sheet ON metrics(user_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_client_sheet ON metrics(client_id, sheet_name);
CREATE INDEX IF NOT EXISTS idx_metrics_sheet_tab_date ON metrics(sheet_name, tab_name, date);
CREATE INDEX IF NOT EXISTS idx_metrics_user_client_sheet ON metrics(user_id, client_id, sheet_name);

-- Data source indexes
CREATE INDEX IF NOT EXISTS idx_metrics_data_source ON metrics(data_source);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_type ON metrics(data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_data_source_id ON metrics(data_source_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user_data_source ON metrics(user_id, data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_client_data_source ON metrics(client_id, data_source_type);
CREATE INDEX IF NOT EXISTS idx_metrics_user_client_data_source ON metrics(user_id, client_id, data_source_type);

-- Target value and metric type indexes
CREATE INDEX IF NOT EXISTS idx_metrics_target_value ON metrics(target_value) WHERE target_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_metrics_metric_type ON metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_category_type ON metrics(category, metric_type);

-- ==============================================
-- COLUMN COMMENTS
-- ==============================================

COMMENT ON COLUMN metrics.google_sheet_id IS 'Google Sheets spreadsheet ID (NULL for Excel/CSV imports)';
COMMENT ON COLUMN metrics.sheet_name IS 'Google spreadsheet name OR Excel/CSV filename';
COMMENT ON COLUMN metrics.tab_name IS 'Google worksheet name OR Excel/CSV sheet name';
COMMENT ON COLUMN metrics.tab_gid IS 'Google Sheets tab GID OR Excel sheet index as string';
COMMENT ON COLUMN metrics.data_source_type IS 'Type of data source: google_sheets, excel_import, csv_import';
COMMENT ON COLUMN metrics.data_source_id IS 'Universal identifier: Google Sheet ID, filename hash, or import batch ID';
COMMENT ON COLUMN metrics.target_value IS 'Target/goal value for this metric';
COMMENT ON COLUMN metrics.metric_type IS 'Type of metric: actual, target, or calculated';
COMMENT ON COLUMN metrics.is_calculated IS 'Boolean flag indicating if this metric is calculated/derived (true) or raw data (false)';
COMMENT ON COLUMN metrics.data_source IS 'Data source type: google-sheets or excel-import (legacy field)';

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'google_sheet_id'
    ) THEN
        RAISE EXCEPTION 'Column google_sheet_id missing from metrics table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'data_source_id'
    ) THEN
        RAISE EXCEPTION 'Column data_source_id missing from metrics table';
    END IF;
    
    -- Check if unique indexes exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'metrics' AND indexname = 'metrics_unique_google_sheets'
    ) THEN
        RAISE EXCEPTION 'Unique index metrics_unique_google_sheets missing';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'metrics' AND indexname = 'metrics_unique_file_imports'
    ) THEN
        RAISE EXCEPTION 'Unique index metrics_unique_file_imports missing';
    END IF;
    
    RAISE NOTICE 'Metrics table structure verified successfully';
END $$;
