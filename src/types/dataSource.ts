// Data Source Types for Multi-Source Support
// Generated: 2025-09-29

export interface DataSource {
  id: string;
  client_id: string;
  name: string;
  source_type: 'google_sheets' | 'csv' | 'xlsx';
  source_config: DataSourceConfig;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DataSourceConfig {
  // Google Sheets configuration
  spreadsheet_id?: string;
  sheet_name?: string;
  range?: string;
  auto_sync?: boolean;
  sync_frequency?: 'daily' | 'weekly' | 'monthly';
  
  // CSV/XLSX configuration
  file_name?: string;
  uploaded_at?: string;
  file_size?: number;
  columns?: string[];
  has_headers?: boolean;
  delimiter?: string;
  encoding?: string;
}

export interface OverviewDisplayMode {
  mode: 'combined' | 'individual' | 'joint';
  selectedSources: string[]; // Data source IDs
  selectedCategories: string[]; // Metric categories
}

export interface MetricCategory {
  id: string;
  name: string;
  description: string;
  metrics: string[];
}

export const NEW_METRIC_CATEGORIES: Record<string, MetricCategory> = {
  'spend_revenue': {
    id: 'spend_revenue',
    name: 'Spend & Revenue',
    description: 'Financial metrics including spend, revenue, and ROAS',
    metrics: [
      'ad_spend_current',
      'ad_spend_target', 
      'ad_spend_percent_to_target',
      'ad_spend_pacing_projection',
      'cash_collected_current',
      'cash_collected_target',
      'cash_collected_percent_to_target', 
      'cash_collected_pacing_projection',
      'revenue_booked_current',
      'revenue_booked_target',
      'revenue_booked_percent_to_target',
      'revenue_booked_pacing_projection',
      'roas',
      'cash_roas'
    ]
  },
  'cost_per_show': {
    id: 'cost_per_show',
    name: 'Cost per Show / Cost per Call',
    description: 'Cost efficiency metrics broken down by source',
    metrics: [
      'total_spend',
      'number_of_shows',
      'cost_per_show',
      'cost_per_call',
      'meta_cost_per_show',
      'cold_email_cost_per_show',
      'optzilla_cost_per_show'
    ]
  },
  'funnel_volume': {
    id: 'funnel_volume',
    name: 'Funnel Volume',
    description: 'Lead generation and conversion volume metrics',
    metrics: [
      'leads_current',
      'leads_target',
      'leads_percent_to_target',
      'leads_pacing_projection',
      'sql_volume_current',
      'sql_volume_target',
      'sql_volume_percent_to_target',
      'sql_volume_pacing_projection',
      'calls_booked_current',
      'calls_booked_target',
      'calls_booked_percent_to_target',
      'calls_booked_pacing_projection',
      'live_calls_current',
      'live_calls_target',
      'live_calls_percent_to_target',
      'live_calls_pacing_projection',
      'closed_sales_current',
      'closed_sales_target',
      'closed_sales_percent_to_target',
      'closed_sales_pacing_projection'
    ]
  },
  'funnel_conversion': {
    id: 'funnel_conversion',
    name: 'Funnel Conversion Rates',
    description: 'Conversion rate metrics throughout the funnel',
    metrics: [
      'opt_in_rate_meta',
      'opt_in_rate_cold_email',
      'opt_in_rate_optzilla',
      'show_rate',
      'offer_rate',
      'close_rate'
    ]
  }
};
