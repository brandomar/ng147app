/**
 * Metric Category Mapping
 * Maps existing metrics to the new business-focused categories
 */

export interface MetricCategoryMapping {
  [metricName: string]: string;
}

/**
 * Maps metrics to business categories based on client's structure
 */
export const METRIC_CATEGORY_MAPPING: MetricCategoryMapping = {
  // Spend & Revenue
  'Ad Spend': 'spend-revenue',
  'Ad Spend Current': 'spend-revenue',
  'Ad Spend Target': 'spend-revenue',
  'Ad Spend % to Target': 'spend-revenue',
  'Ad Spend Pacing Projection': 'spend-revenue',
  'Cash Collected': 'spend-revenue',
  'Cash Collected Current': 'spend-revenue',
  'Cash Collected Target': 'spend-revenue',
  'Cash Collected % to Target': 'spend-revenue',
  'Cash Collected Pacing Projection': 'spend-revenue',
  'Revenue Booked': 'spend-revenue',
  'Revenue Booked Current': 'spend-revenue',
  'Revenue Booked Target': 'spend-revenue',
  'Revenue Booked % to Target': 'spend-revenue',
  'Revenue Booked Pacing Projection': 'spend-revenue',
  'ROAS': 'spend-revenue',
  'Cash ROAS': 'spend-revenue',
  
  // Cost per Show / Cost per Call
  'Cost per Show': 'cost-per-show',
  'Cost per Call': 'cost-per-show',
  'Cost per Show Meta': 'cost-per-show',
  'Cost per Show Cold Email': 'cost-per-show',
  'Cost per Show Optzilla': 'cost-per-show',
  'Cost per Call Meta': 'cost-per-show',
  'Cost per Call Cold Email': 'cost-per-show',
  'Cost per Call Optzilla': 'cost-per-show',
  
  // Funnel Volume
  'Leads': 'funnel-volume',
  'SQL Volume': 'funnel-volume',
  'Leads Current': 'funnel-volume',
  'Leads Target': 'funnel-volume',
  'Leads % to Target': 'funnel-volume',
  'Leads Pacing Projection': 'funnel-volume',
  'SQL Volume Current': 'funnel-volume',
  'SQL Volume Target': 'funnel-volume',
  'SQL Volume % to Target': 'funnel-volume',
  'SQL Volume Pacing Projection': 'funnel-volume',
  'Calls Booked': 'funnel-volume',
  'Calls Booked Current': 'funnel-volume',
  'Calls Booked Target': 'funnel-volume',
  'Calls Booked % to Target': 'funnel-volume',
  'Calls Booked Pacing Projection': 'funnel-volume',
  'Live Calls': 'funnel-volume',
  'Shows': 'funnel-volume',
  'Live Calls Current': 'funnel-volume',
  'Live Calls Target': 'funnel-volume',
  'Live Calls % to Target': 'funnel-volume',
  'Live Calls Pacing Projection': 'funnel-volume',
  'Closed Sales': 'funnel-volume',
  'Closes': 'funnel-volume',
  'Closed Sales Current': 'funnel-volume',
  'Closed Sales Target': 'funnel-volume',
  'Closed Sales % to Target': 'funnel-volume',
  'Closed Sales Pacing Projection': 'funnel-volume',
  
  // Funnel Conversion Rates
  'Opt-in Rate': 'funnel-conversion',
  'Opt-in Rate Meta': 'funnel-conversion',
  'Opt-in Rate Cold Email': 'funnel-conversion',
  'Opt-in Rate Optzilla': 'funnel-conversion',
  'Show Rate': 'funnel-conversion',
  'Offer Rate': 'funnel-conversion',
  'Close Rate': 'funnel-conversion',
  
  // Legacy mappings for existing metrics
  'Impressions': 'spend-revenue',
  'Clicks': 'spend-revenue',
  'CTR': 'spend-revenue',
  'CPC': 'spend-revenue',
  'CPM': 'spend-revenue',
  'Spend': 'spend-revenue',
  'Revenue': 'spend-revenue',
  'Conversions': 'funnel-volume',
  'Conversion Rate': 'funnel-conversion',
};

/**
 * Get the category for a metric name
 */
export function getMetricCategory(metricName: string): string {
  return METRIC_CATEGORY_MAPPING[metricName] || 'Uncategorized';
}

/**
 * Get all metrics for a specific category
 */
export function getMetricsForCategory(category: string): string[] {
  return Object.entries(METRIC_CATEGORY_MAPPING)
    .filter(([_, cat]) => cat === category)
    .map(([metric, _]) => metric);
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  return ['spend-revenue', 'cost-per-show', 'funnel-volume', 'funnel-conversion'];
}
