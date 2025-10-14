-- Update Metric Categories Based on Client Requirements
-- Generated: 2025-09-29
-- Implements new metric categories: Spend & Revenue, Cost per Show, Funnel Volume, Funnel Conversion

-- ==============================================
-- NEW METRIC CATEGORIES
-- ==============================================

-- Spend & Revenue Category
UPDATE metric_definitions SET 
  categories = ARRAY['spend_revenue'] 
WHERE metric_name IN (
  'ad_spend_current', 'ad_spend_target', 'ad_spend_percent_to_target', 
  'ad_spend_pacing_projection', 'cash_collected_current', 'cash_collected_target',
  'cash_collected_percent_to_target', 'cash_collected_pacing_projection',
  'revenue_booked_current', 'revenue_booked_target', 'revenue_booked_percent_to_target',
  'revenue_booked_pacing_projection', 'roas', 'cash_roas'
);

-- Cost per Show Category
UPDATE metric_definitions SET 
  categories = ARRAY['cost_per_show'] 
WHERE metric_name IN (
  'total_spend', 'number_of_shows', 'cost_per_show', 'cost_per_call',
  'meta_cost_per_show', 'cold_email_cost_per_show', 'optzilla_cost_per_show'
);

-- Funnel Volume Category
UPDATE metric_definitions SET 
  categories = ARRAY['funnel_volume'] 
WHERE metric_name IN (
  'leads_current', 'leads_target', 'leads_percent_to_target', 'leads_pacing_projection',
  'sql_volume_current', 'sql_volume_target', 'sql_volume_percent_to_target', 'sql_volume_pacing_projection',
  'calls_booked_current', 'calls_booked_target', 'calls_booked_percent_to_target', 'calls_booked_pacing_projection',
  'live_calls_current', 'live_calls_target', 'live_calls_percent_to_target', 'live_calls_pacing_projection',
  'closed_sales_current', 'closed_sales_target', 'closed_sales_percent_to_target', 'closed_sales_pacing_projection'
);

-- Funnel Conversion Category
UPDATE metric_definitions SET 
  categories = ARRAY['funnel_conversion'] 
WHERE metric_name IN (
  'opt_in_rate_meta', 'opt_in_rate_cold_email', 'opt_in_rate_optzilla',
  'show_rate', 'offer_rate', 'close_rate'
);

-- ==============================================
-- ADD NEW METRIC DEFINITIONS
-- ==============================================

-- Spend & Revenue Metrics
INSERT INTO metric_definitions (metric_name, categories, is_calculated, calculation_formula)
VALUES 
  ('ad_spend_current', ARRAY['spend_revenue'], false, null),
  ('ad_spend_target', ARRAY['spend_revenue'], false, null),
  ('ad_spend_percent_to_target', ARRAY['spend_revenue'], true, 'ad_spend_current / ad_spend_target * 100'),
  ('ad_spend_pacing_projection', ARRAY['spend_revenue'], true, 'ad_spend_current / (days_elapsed / total_days) * total_days'),
  ('cash_collected_current', ARRAY['spend_revenue'], false, null),
  ('cash_collected_target', ARRAY['spend_revenue'], false, null),
  ('cash_collected_percent_to_target', ARRAY['spend_revenue'], true, 'cash_collected_current / cash_collected_target * 100'),
  ('cash_collected_pacing_projection', ARRAY['spend_revenue'], true, 'cash_collected_current / (days_elapsed / total_days) * total_days'),
  ('revenue_booked_current', ARRAY['spend_revenue'], false, null),
  ('revenue_booked_target', ARRAY['spend_revenue'], false, null),
  ('revenue_booked_percent_to_target', ARRAY['spend_revenue'], true, 'revenue_booked_current / revenue_booked_target * 100'),
  ('revenue_booked_pacing_projection', ARRAY['spend_revenue'], true, 'revenue_booked_current / (days_elapsed / total_days) * total_days'),
  ('roas', ARRAY['spend_revenue'], true, 'revenue_booked_current / ad_spend_current'),
  ('cash_roas', ARRAY['spend_revenue'], true, 'cash_collected_current / ad_spend_current')
ON CONFLICT (metric_name) DO NOTHING;

-- Cost per Show Metrics
INSERT INTO metric_definitions (metric_name, categories, is_calculated, calculation_formula)
VALUES 
  ('total_spend', ARRAY['cost_per_show'], false, null),
  ('number_of_shows', ARRAY['cost_per_show'], false, null),
  ('cost_per_show', ARRAY['cost_per_show'], true, 'total_spend / number_of_shows'),
  ('cost_per_call', ARRAY['cost_per_show'], true, 'total_spend / number_of_shows'),
  ('meta_cost_per_show', ARRAY['cost_per_show'], true, 'meta_spend / meta_shows'),
  ('cold_email_cost_per_show', ARRAY['cost_per_show'], true, 'cold_email_spend / cold_email_shows'),
  ('optzilla_cost_per_show', ARRAY['cost_per_show'], true, 'optzilla_spend / optzilla_shows')
ON CONFLICT (metric_name) DO NOTHING;

-- Funnel Volume Metrics
INSERT INTO metric_definitions (metric_name, categories, is_calculated, calculation_formula)
VALUES 
  ('leads_current', ARRAY['funnel_volume'], false, null),
  ('leads_target', ARRAY['funnel_volume'], false, null),
  ('leads_percent_to_target', ARRAY['funnel_volume'], true, 'leads_current / leads_target * 100'),
  ('leads_pacing_projection', ARRAY['funnel_volume'], true, 'leads_current / (days_elapsed / total_days) * total_days'),
  ('sql_volume_current', ARRAY['funnel_volume'], false, null),
  ('sql_volume_target', ARRAY['funnel_volume'], false, null),
  ('sql_volume_percent_to_target', ARRAY['funnel_volume'], true, 'sql_volume_current / sql_volume_target * 100'),
  ('sql_volume_pacing_projection', ARRAY['funnel_volume'], true, 'sql_volume_current / (days_elapsed / total_days) * total_days'),
  ('calls_booked_current', ARRAY['funnel_volume'], false, null),
  ('calls_booked_target', ARRAY['funnel_volume'], false, null),
  ('calls_booked_percent_to_target', ARRAY['funnel_volume'], true, 'calls_booked_current / calls_booked_target * 100'),
  ('calls_booked_pacing_projection', ARRAY['funnel_volume'], true, 'calls_booked_current / (days_elapsed / total_days) * total_days'),
  ('live_calls_current', ARRAY['funnel_volume'], false, null),
  ('live_calls_target', ARRAY['funnel_volume'], false, null),
  ('live_calls_percent_to_target', ARRAY['funnel_volume'], true, 'live_calls_current / live_calls_target * 100'),
  ('live_calls_pacing_projection', ARRAY['funnel_volume'], true, 'live_calls_current / (days_elapsed / total_days) * total_days'),
  ('closed_sales_current', ARRAY['funnel_volume'], false, null),
  ('closed_sales_target', ARRAY['funnel_volume'], false, null),
  ('closed_sales_percent_to_target', ARRAY['funnel_volume'], true, 'closed_sales_current / closed_sales_target * 100'),
  ('closed_sales_pacing_projection', ARRAY['funnel_volume'], true, 'closed_sales_current / (days_elapsed / total_days) * total_days')
ON CONFLICT (metric_name) DO NOTHING;

-- Funnel Conversion Metrics
INSERT INTO metric_definitions (metric_name, categories, is_calculated, calculation_formula)
VALUES 
  ('opt_in_rate_meta', ARRAY['funnel_conversion'], true, 'leads_meta / clicks_meta * 100'),
  ('opt_in_rate_cold_email', ARRAY['funnel_conversion'], true, 'leads_cold_email / clicks_cold_email * 100'),
  ('opt_in_rate_optzilla', ARRAY['funnel_conversion'], true, 'leads_optzilla / clicks_optzilla * 100'),
  ('show_rate', ARRAY['funnel_conversion'], true, 'shows / booked_calls * 100'),
  ('offer_rate', ARRAY['funnel_conversion'], true, 'offers / shows * 100'),
  ('close_rate', ARRAY['funnel_conversion'], true, 'closes / shows * 100')
ON CONFLICT (metric_name) DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Metric categories updated successfully';
    RAISE NOTICE 'Spend & Revenue category configured';
    RAISE NOTICE 'Cost per Show category configured';
    RAISE NOTICE 'Funnel Volume category configured';
    RAISE NOTICE 'Funnel Conversion category configured';
    RAISE NOTICE 'New metric definitions added';
END $$;
