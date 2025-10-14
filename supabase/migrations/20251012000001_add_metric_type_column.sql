-- Add metric_type column to metrics table
-- Supports: 'number', 'currency', 'percentage'

-- Add metric_type column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'metrics' 
    AND column_name = 'metric_type'
  ) THEN
    ALTER TABLE public.metrics 
    ADD COLUMN metric_type TEXT DEFAULT 'number'
    CHECK (metric_type IN ('number', 'currency', 'percentage'));
    
    RAISE NOTICE '✅ Added metric_type column to metrics table';
  ELSE
    RAISE NOTICE '⚠️ metric_type column already exists, skipping';
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_metrics_type ON public.metrics(metric_type);

-- Add helpful comment
COMMENT ON COLUMN public.metrics.metric_type IS 'Type of metric: number (plain numeric), currency (monetary value), or percentage (stored as numeric value like 12.5 for 12.5%)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Metrics table updated with metric_type column';
  RAISE NOTICE '✅ Index created for better performance';
  RAISE NOTICE '✅ Valid types: number, currency, percentage';
  RAISE NOTICE '==============================================';
END $$;

