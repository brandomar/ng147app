export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  client_type?: "client" | "primary";
  data_source?: "google-sheets" | "excel-import";
  google_sheets_url?: string;
  google_sheets_tabs?: string[];
  allowed_categories?: string[];
  company_name?: string;
  logo_url?: string;
  sheet_type?: "client-dashboard" | "admin-dashboard";
  tabs: any[];
  goals_config?: {
    monthly_targets?: {
      ad_spend?: number;
      booked_calls?: number;
      offer_rate?: number;
      closes?: number;
      cpa?: number;
      sales?: number;
    };
    updated_at?: string;
    updated_by?: string;
  };
  created_at?: string;
  updated_at?: string;
}

// Re-export data source types
export * from './dataSource';

export interface ClientTab {
  id: string;
  client_id: string;
  tab_name: string;
  google_sheet_id: string;
  sheet_name: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface MetricEntry {
  id?: string;
  category: string;
  metric_name: string;
  value: number;
  date: string;
  user_id: string;
  client_id?: string;
  created_at?: string;
  // Enhanced metrics table fields
  google_sheet_id?: string;
  sheet_name?: string;
  tab_name?: string;
  tab_gid?: string;
  data_source_type?: string;
  data_source_id?: string;
  is_calculated?: boolean;
  // Client-specific fields for targets and metric types
  target_value?: number;
  metric_type?: 'actual' | 'target' | 'calculated';
}

export interface DashboardMetric {
  name: string;
  current: number;
  previous: number;
  change: number;
  changeType: 'increase' | 'decrease';
}

export type TimeFrame = 'daily' | '3days' | '7d' | '30d' | '7days' | '14days' | '30days' | '90days' | '1year' | 'alltime';

export interface CategoryData {
  [key: string]: {
    current: number;
    previous: number;
    entries: MetricEntry[];
  };
}

export interface SpreadsheetConfiguration {
  id?: string;
  client_id: string;
  null_representation: 'zero' | 'dash' | 'empty';
  currency_symbol: '$' | '€' | '£';
  percentage_format: 'decimal' | 'percentage';
  skip_empty_rows: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MetricConfiguration {
  id?: string;
  client_id: string;
  metric_name: string;
  sheet_column_name: string;
  display_name: string;
  metric_type: 'number' | 'percentage' | 'currency' | 'count';
  is_enabled: boolean;
  dashboard_position: number;
  is_metric_card: boolean;
  format_options: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SyncStatus {
  id?: string;
  user_id: string;
  client_id: string;
  google_sheet_id: string;
  sheet_name?: string;
  sync_status: 'success' | 'error' | 'never_synced' | 'syncing';
  last_sync_at?: string;
  last_successful_sync_at?: string;
  sync_error_message?: string;
  total_sync_count: number;
  successful_sync_count: number;
  created_at?: string;
  updated_at?: string;
}