-- Update Metric Categories to Business Structure
-- Generated: 2025-01-02
-- Updates metric_definitions table to use new business-focused categories

-- ==============================================
-- UPDATE METRIC DEFINITIONS
-- ==============================================

-- Update metric_definitions table to use new category names
-- Only update if the table and columns exist
DO $$
BEGIN
    -- Check if metric_definitions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metric_definitions') THEN
        
        -- Update categories to new business structure
        UPDATE metric_definitions 
        SET categories = ARRAY['spend-revenue'] 
        WHERE categories && ARRAY['spend_revenue', 'ads', 'performance'] 
          AND (metric_name ILIKE '%spend%' OR metric_name ILIKE '%revenue%' OR metric_name ILIKE '%cash%' OR metric_name ILIKE '%roas%');

        UPDATE metric_definitions 
        SET categories = ARRAY['cost-per-show'] 
        WHERE categories && ARRAY['cost_per_show', 'ads', 'performance'] 
          AND (metric_name ILIKE '%cost per%' OR metric_name ILIKE '%cost per show%' OR metric_name ILIKE '%cost per call%');

        UPDATE metric_definitions 
        SET categories = ARRAY['funnel-volume'] 
        WHERE categories && ARRAY['funnel_volume', 'growth', 'cold-email', 'spam-outreach'] 
          AND (metric_name ILIKE '%lead%' OR metric_name ILIKE '%sql%' OR metric_name ILIKE '%call%' OR metric_name ILIKE '%show%' OR metric_name ILIKE '%close%');

        UPDATE metric_definitions 
        SET categories = ARRAY['funnel-conversion'] 
        WHERE categories && ARRAY['funnel_conversion', 'growth', 'performance'] 
          AND (metric_name ILIKE '%rate%' OR metric_name ILIKE '%opt-in%' OR metric_name ILIKE '%conversion%');

        RAISE NOTICE 'Updated metric_definitions categories to business structure';
    ELSE
        RAISE NOTICE 'metric_definitions table does not exist, skipping updates';
    END IF;
END $$;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Metric categories migration completed';
    RAISE NOTICE 'New categories: spend-revenue, cost-per-show, funnel-volume, funnel-conversion';
    RAISE NOTICE 'Frontend and edge functions have been updated to use new categories';
END $$;
