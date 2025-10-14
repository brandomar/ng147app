import { MetricEntry } from '../types';

export interface SimpleCalculatedMetric {
  metric_name: string;
  value: number;
  date: string;
  client_id: string;
  is_calculated: boolean;
}

export interface ClientMetricData {
  [date: string]: {
    spent?: number;
    impressions?: number;
    clicks_all?: number;
    link_clicks?: number;
    applications?: number;
    leads?: number;
    mql?: number;
    sets?: number;
    daily_budget?: number;
  };
}

/**
 * Simplified metric calculator for per-client calculations only
 * No cross-client aggregation, no large dataset limits
 */
export const calculateClientMetrics = (rawMetrics: MetricEntry[], clientId: string): SimpleCalculatedMetric[] => {
  const calculatedMetrics: SimpleCalculatedMetric[] = [];
  
  // Group metrics by date for this specific client
  const dataByDate: ClientMetricData = {};
  
  rawMetrics.forEach(metric => {
    if (!dataByDate[metric.date]) {
      dataByDate[metric.date] = {};
    }
    
    const metricName = metric.metric_name.toLowerCase();
    const value = typeof metric.value === 'string' ? parseFloat(metric.value) || 0 : metric.value;
    
    // Map metric names to standardized keys
    if (metricName.includes('spent')) {
      dataByDate[metric.date].spent = value;
    } else if (metricName.includes('impressions')) {
      dataByDate[metric.date].impressions = value;
    } else if (metricName.includes('clicks') && metricName.includes('all')) {
      dataByDate[metric.date].clicks_all = value;
    } else if (metricName.includes('link clicks')) {
      dataByDate[metric.date].link_clicks = value;
    } else if (metricName.includes('applications')) {
      dataByDate[metric.date].applications = value;
    } else if (metricName.includes('leads')) {
      dataByDate[metric.date].leads = value;
    } else if (metricName.includes('mql')) {
      dataByDate[metric.date].mql = value;
    } else if (metricName.includes('sets')) {
      dataByDate[metric.date].sets = value;
    } else if (metricName.includes('daily budget')) {
      dataByDate[metric.date].daily_budget = value;
    }
  });
  
  // Calculate derived metrics for each date
  Object.entries(dataByDate).forEach(([date, data]) => {
    // CPM (Cost Per Mille) = (Spent / Impressions) * 1000
    if (data.spent && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CPM',
        value: (data.spent / data.impressions) * 1000,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // CPC All (Cost Per Click All) = Spent / Clicks All
    if (data.spent && data.clicks_all && data.clicks_all > 0) {
      calculatedMetrics.push({
        metric_name: 'CPC (All)',
        value: data.spent / data.clicks_all,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // CTR All (Click-Through Rate All) = (Clicks All / Impressions) * 100
    if (data.clicks_all && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CTR (All)',
        value: (data.clicks_all / data.impressions) * 100,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // CPC Link (Cost Per Click Link) = Spent / Link Clicks
    if (data.spent && data.link_clicks && data.link_clicks > 0) {
      calculatedMetrics.push({
        metric_name: 'CPC (Link)',
        value: data.spent / data.link_clicks,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // CTR Link (Click-Through Rate Link) = (Link Clicks / Impressions) * 100
    if (data.link_clicks && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CTR (Link)',
        value: (data.link_clicks / data.impressions) * 100,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // Cost Per Application = Spent / Applications
    if (data.spent && data.applications && data.applications > 0) {
      calculatedMetrics.push({
        metric_name: 'Cost Per App',
        value: data.spent / data.applications,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // Cost Per MQL = Spent / MQL
    if (data.spent && data.mql && data.mql > 0) {
      calculatedMetrics.push({
        metric_name: 'Cost Per MQL',
        value: data.spent / data.mql,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // MQL Approval Rate = (MQL / Applications) * 100
    if (data.mql && data.applications && data.applications > 0) {
      calculatedMetrics.push({
        metric_name: 'MQL Approval Rate',
        value: (data.mql / data.applications) * 100,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // Budget Utilization = (Spent / Daily Budget) * 100
    if (data.spent && data.daily_budget && data.daily_budget > 0) {
      calculatedMetrics.push({
        metric_name: 'Budget Utilization (%)',
        value: (data.spent / data.daily_budget) * 100,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
    
    // Unique Click to Apps = (Applications / Clicks All) * 100
    if (data.applications && data.clicks_all && data.clicks_all > 0) {
      calculatedMetrics.push({
        metric_name: 'Unique Click to Apps',
        value: (data.applications / data.clicks_all) * 100,
        date,
        client_id: clientId,
        is_calculated: true
      });
    }
  });
  
  return calculatedMetrics;
};

/**
 * Simple validation for client data
 */
export const validateClientData = (data: ClientMetricData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || Object.keys(data).length === 0) {
    return { isValid: true, errors: [] };
  }
  
  Object.entries(data).forEach(([date, metrics]) => {
    // Check for logical consistency
    if (metrics.spent && metrics.spent < 0) {
      errors.push(`Invalid 'Spent' value (negative) for ${date}: ${metrics.spent}`);
    }
    
    if (metrics.impressions && metrics.impressions < 0) {
      errors.push(`Invalid 'Impressions' value (negative) for ${date}: ${metrics.impressions}`);
    }
    
    if (metrics.clicks_all && metrics.impressions && metrics.clicks_all > metrics.impressions) {
      errors.push(`Invalid data for ${date}: Clicks (${metrics.clicks_all}) cannot exceed Impressions (${metrics.impressions})`);
    }
    
    if (metrics.link_clicks && metrics.clicks_all && metrics.link_clicks > metrics.clicks_all) {
      errors.push(`Invalid data for ${date}: Link Clicks (${metrics.link_clicks}) cannot exceed Total Clicks (${metrics.clicks_all})`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format calculated metric values for display
 */
export const formatSimpleMetric = (value: number, metricName: string): string => {
  const name = metricName.toLowerCase();
  
  // Handle percentage metrics
  if (name.includes('percent') || name.includes('%') || name.includes('ctr') || name.includes('rate')) {
    // For CTR and rate metrics, values are typically in decimal format (0.6 = 60%)
    // Only multiply by 100 if the value is less than 1 (indicating decimal format)
    const displayValue = value < 1 ? value * 100 : value;
    return `${displayValue.toFixed(2)}%`;
  }
  
  // Handle currency metrics
  if (name.includes('cost') || name.includes('spent') || name.includes('budget') || 
      name.includes('cpm') || name.includes('cpc') || name.includes('price')) {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  // Handle count metrics (integers)
  if (name.includes('clicks') || name.includes('impressions') || name.includes('leads') || 
      name.includes('emails') || name.includes('conversions') || name.includes('sessions')) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  
  // Default formatting for other numeric values
  if (value >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (value >= 1) {
    return value.toFixed(2);
  } else {
    return value.toFixed(4);
  }
};
