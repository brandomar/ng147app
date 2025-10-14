-- ==============================================
-- ADD TARGET VALUES AND METRIC TYPES
-- ==============================================
-- This migration adds support for target values and metric types
-- to support client's specific metric requirements

-- Add target value column for goals/targets
ALTER TABLE metrics 
ADD COLUMN IF NOT EXISTS target_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'actual'; -- 'actual', 'target', 'calculated'

-- Add comments for documentation
COMMENT ON COLUMN metrics.target_value IS 'Target/goal value for this metric';
COMMENT ON COLUMN metrics.metric_type IS 'Type of metric: actual, target, or calculated';

-- Update unique constraint to include metric_type
ALTER TABLE metrics DROP CONSTRAINT IF EXISTS metrics_unique_per_sheet_tab;
ALTER TABLE metrics ADD CONSTRAINT metrics_unique_per_sheet_tab_type 
UNIQUE(user_id, client_id, google_sheet_id, sheet_name, tab_name, date, category, metric_name, metric_type);

-- Add indexes for target values and metric types
CREATE INDEX IF NOT EXISTS idx_metrics_target_value ON metrics(target_value) WHERE target_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_metrics_metric_type ON metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_category_type ON metrics(category, metric_type);

-- ==============================================
-- HELPER FUNCTIONS FOR CLIENT METRICS
-- ==============================================

-- Function to get metrics with targets for a specific category
CREATE OR REPLACE FUNCTION get_metrics_with_targets(
  p_user_id UUID,
  p_client_id UUID,
  p_category TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  metric_name TEXT,
  actual_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  percentage_to_target DECIMAL(5,2),
  date DATE,
  metric_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.metric_name,
    m.value as actual_value,
    m.target_value,
    CASE 
      WHEN m.target_value > 0 THEN ROUND((m.value / m.target_value) * 100, 2)
      ELSE NULL
    END as percentage_to_target,
    m.date,
    m.metric_type
  FROM metrics m
  WHERE m.user_id = p_user_id
    AND m.client_id = p_client_id
    AND m.category = p_category
    AND m.metric_type = 'actual'
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
  ORDER BY m.date DESC, m.metric_name;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate conversion rates
CREATE OR REPLACE FUNCTION calculate_conversion_rates(
  p_user_id UUID,
  p_client_id UUID,
  p_date DATE
)
RETURNS TABLE (
  conversion_type TEXT,
  numerator_metric TEXT,
  denominator_metric TEXT,
  rate DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics_data AS (
    SELECT 
      metric_name,
      value,
      category
    FROM metrics
    WHERE user_id = p_user_id
      AND client_id = p_client_id
      AND date = p_date
      AND metric_type = 'actual'
  )
  SELECT 
    'Opt-in Rate' as conversion_type,
    'Leads' as numerator_metric,
    'Clicks' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Clicks') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Leads') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Clicks'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Show Rate' as conversion_type,
    'Shows' as numerator_metric,
    'Calls Booked' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Calls Booked') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Calls Booked'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Offer Rate' as conversion_type,
    'Offers' as numerator_metric,
    'Shows' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Shows') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Offers') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Close Rate' as conversion_type,
    'Closes' as numerator_metric,
    'Shows' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Shows') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Closes') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows'), 4
      )
      ELSE 0
    END as rate;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_metrics_with_targets(UUID, UUID, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_conversion_rates(UUID, UUID, DATE) TO authenticated;

-- Add verification
DO $$
DECLARE
    target_column_exists BOOLEAN;
    metric_type_column_exists BOOLEAN;
BEGIN
    -- Check if target_value column was added
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'target_value'
    ) INTO target_column_exists;
    
    -- Check if metric_type column was added
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'metrics' AND column_name = 'metric_type'
    ) INTO metric_type_column_exists;
    
    IF target_column_exists AND metric_type_column_exists THEN
        RAISE NOTICE 'Target values and metric types added successfully';
        RAISE NOTICE 'New columns: target_value, metric_type';
        RAISE NOTICE 'Helper functions created for client metric requirements';
    ELSE
        RAISE EXCEPTION 'Failed to add target values and metric types';
    END IF;
END $$;
