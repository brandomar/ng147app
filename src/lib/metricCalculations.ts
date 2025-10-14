import { MetricEntry } from '../types';
import { supabase } from './supabase';
import { logger } from './logger';

export interface CalculatedMetric {
  metric_name: string;
  value: number;
  date: string;
  user_id: string;
  client_id?: string;
  category: string;
  is_calculated: boolean;
}

export interface RawMetricData {
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

// Optimized system interfaces
export interface OptimizedRawMetricData {
  id?: string;
  user_id: string;
  client_id?: string;
  date: string;
  spent?: number;
  impressions?: number;
  clicks_all?: number;
  link_clicks?: number;
  applications?: number;
  leads?: number;
  mql?: number;
  sets?: number;
  daily_budget?: number;
}

export interface MetricCategoryAssociation {
  id?: string;
  metric_name: string;
  category: string;
  is_calculated: boolean;
  calculation_formula?: string;
}

export interface SharedCalculation {
  id?: string;
  user_id: string;
  client_id?: string;
  metric_name: string;
  value: number;
  date: string;
  calculation_hash?: string;
}

/**
 * OPTIMIZED: Calculates derived metrics using the new optimized system
 * This eliminates duplication and uses shared calculations
 */
export const calculateDerivedMetrics = async (rawMetrics: MetricEntry[]): Promise<CalculatedMetric[]> => {
  try {
    // Use the optimized system to get metrics by category
    const metricsResult = await supabase.rpc('get_metrics_by_category', {
      p_user_id: rawMetrics[0]?.user_id && rawMetrics[0]?.user_id !== '' ? rawMetrics[0]?.user_id : null,
      p_client_id: rawMetrics[0]?.client_id && rawMetrics[0]?.client_id !== '' ? rawMetrics[0]?.client_id : null,
      p_category: 'ads',
      p_start_date: null,
      p_end_date: null
    });

    if (metricsResult.error) {
      logger.error('Failed to get metrics by category:', metricsResult.error);
      return [];
    }

    // Convert to CalculatedMetric format for backward compatibility
    return metricsResult.data.map(metric => ({
      metric_name: metric.metric_name,
      value: metric.value,
      date: metric.date,
      user_id: rawMetrics[0]?.user_id || '',
      client_id: rawMetrics[0]?.client_id,
      category: 'ads',
      is_calculated: metric.is_calculated
    }));
  } catch (err) {
    logger.error('Error in optimized calculateDerivedMetrics:', err);
    // Fallback to alternative calculation
    return calculateDerivedMetricsFallback(rawMetrics);
  }
};

/**
 * Fallback calculation for when the optimized system is not available
 */
export const calculateDerivedMetricsFallback = (rawMetrics: MetricEntry[]): CalculatedMetric[] => {
  const calculatedMetrics: CalculatedMetric[] = [];
  
  // Group metrics by date
  const dataByDate: RawMetricData = {};
  
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
    const baseMetric = rawMetrics.find(m => m.date === date);
    if (!baseMetric) return;
    
    const { user_id, client_id } = baseMetric;
    
    // CPM (Cost Per Mille) = (Spent / Impressions) * 1000
    if (data.spent && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CPM',
        value: (data.spent / data.impressions) * 1000,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // CPC All (Cost Per Click All) = Spent / Clicks All
    if (data.spent && data.clicks_all && data.clicks_all > 0) {
      calculatedMetrics.push({
        metric_name: 'CPC (All)',
        value: data.spent / data.clicks_all,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // CTR All (Click-Through Rate All) = (Clicks All / Impressions) * 100
    if (data.clicks_all && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CTR (All)',
        value: (data.clicks_all / data.impressions) * 100,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // CPC Link (Cost Per Click Link) = Spent / Link Clicks
    if (data.spent && data.link_clicks && data.link_clicks > 0) {
      calculatedMetrics.push({
        metric_name: 'CPC (Link)',
        value: data.spent / data.link_clicks,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // CTR Link (Click-Through Rate Link) = (Link Clicks / Impressions) * 100
    if (data.link_clicks && data.impressions && data.impressions > 0) {
      calculatedMetrics.push({
        metric_name: 'CTR (Link)',
        value: (data.link_clicks / data.impressions) * 100,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // Cost Per Application = Spent / Applications
    if (data.spent && data.applications && data.applications > 0) {
      calculatedMetrics.push({
        metric_name: 'Cost Per App',
        value: data.spent / data.applications,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // Cost Per MQL = Spent / MQL
    if (data.spent && data.mql && data.mql > 0) {
      calculatedMetrics.push({
        metric_name: 'Cost Per MQL',
        value: data.spent / data.mql,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // MQL Approval Rate = (MQL / Applications) * 100
    if (data.mql && data.applications && data.applications > 0) {
      calculatedMetrics.push({
        metric_name: 'MQL Approval Rate',
        value: (data.mql / data.applications) * 100,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // Budget Utilization = (Spent / Daily Budget) * 100
    if (data.spent && data.daily_budget && data.daily_budget > 0) {
      calculatedMetrics.push({
        metric_name: 'Budget Utilization (%)',
        value: (data.spent / data.daily_budget) * 100,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
    
    // Unique Click to Apps = (Applications / Clicks All) * 100
    if (data.applications && data.clicks_all && data.clicks_all > 0) {
      calculatedMetrics.push({
        metric_name: 'Unique Click to Apps',
        value: (data.applications / data.clicks_all) * 100,
        date,
        user_id,
        client_id,
        category: 'ads',
        is_calculated: true
      });
    }
  });
  
  return calculatedMetrics;
};

/**
 * Validates that raw data has the minimum required fields for calculations
 */
export const validateRawData = (data: RawMetricData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // If no data provided, return valid
  if (!data || Object.keys(data).length === 0) {
    return { isValid: true, errors: [] };
  }
  
  Object.entries(data).forEach(([date, metrics]) => {
    // Only validate if there's actual data for this date
    const hasAnyData = Object.values(metrics).some(value => 
      value !== null && value !== undefined && value !== '' && value !== 0
    );
    
    if (!hasAnyData) {
      // Skip validation for dates with no meaningful data
      return;
    }
    
    // Check for logical consistency only, not missing data
    // Missing data is normal and shouldn't trigger warnings
    
    // Check for logical consistency
    if (metrics.spent && metrics.spent < 0) {
      errors.push(`Invalid 'Spent' value (negative) for ${date}: ${metrics.spent}`);
    }
    
    if (metrics.impressions && metrics.impressions < 0) {
      errors.push(`Invalid 'Impressions' value (negative) for ${date}: ${metrics.impressions}`);
    }
    
    if (metrics.clicks_all && metrics.clicks_all > metrics.impressions) {
      errors.push(`Invalid data for ${date}: Clicks (${metrics.clicks_all}) cannot exceed Impressions (${metrics.impressions})`);
    }
    
    if (metrics.link_clicks && metrics.link_clicks > metrics.clicks_all) {
      errors.push(`Invalid data for ${date}: Link Clicks (${metrics.link_clicks}) cannot exceed Total Clicks (${metrics.clicks_all})`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formats calculated metric values for display
 * @param value - The numeric value to format
 * @param metricTypeOrName - Either the metric_type from database ('currency', 'percentage', 'number') or the metric name
 */
export const formatCalculatedMetric = (value: number, metricTypeOrName: string): string => {
  // First check if this is a database metric_type value
  if (metricTypeOrName === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  if (metricTypeOrName === 'percentage') {
    // For percentage metrics, check if the value looks like it's already in percentage format
    // Values like 5.997 (59.97%) or 2.005 (20.05%) should be displayed as-is
    // Values like 0.5997 (59.97%) should be multiplied by 100
    let displayValue;
    
    if (value < 1) {
      // Decimal format (0.5997) - multiply by 100
      displayValue = value * 100;
    } else if (value < 10 && value > 0) {
      // Likely percentage format (5.997) - use as-is
      displayValue = value;
    } else {
      // Large values - use as-is (might be 100+ percentages)
      displayValue = value;
    }
    
    return `${displayValue.toFixed(1)}%`;
  }
  
  if (metricTypeOrName === 'number') {
    // Plain number with comma separators
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }
  
  // Legacy support: If not a database metric_type, infer from metric name
  const name = metricTypeOrName.toLowerCase();
  
  // Handle percentage metrics - show as whole numbers (9% not 0.09%)
  if (name.includes('percent') || name.includes('%') || name.includes('ctr') || name.includes('rate') || name.includes('collected')) {
    // For CTR and rate metrics, check if the value looks like it's already in percentage format
    // Values like 5.997 (59.97%) or 2.005 (20.05%) should be displayed as-is
    // Values like 0.5997 (59.97%) should be multiplied by 100
    let displayValue;
    
    if (value < 1) {
      // Decimal format (0.5997) - multiply by 100
      displayValue = value * 100;
    } else if (value < 10 && value > 0) {
      // Likely percentage format (5.997) - use as-is
      displayValue = value;
    } else {
      // Large values - use as-is (might be 100+ percentages)
      displayValue = value;
    }
    
    return `${displayValue.toFixed(1)}%`;
  }
  
  // Handle currency metrics with proper comma formatting
  if (name.includes('cost') || name.includes('spent') || name.includes('budget') || 
      name.includes('cpm') || name.includes('cpc') || name.includes('price') ||
      name.includes('revenue') || name.includes('cash') || name.includes('aov') || 
      name.includes('cpa')) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  // Handle ROAS specially - it's a ratio, not currency
  if (name.includes('roas') || name.includes('roi')) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  // Handle count metrics - show as integers with comma formatting
  if (name.includes('clicks') || name.includes('impressions') || name.includes('leads') || 
      name.includes('emails') || name.includes('conversions') || name.includes('sessions') ||
      name.includes('bounces') || name.includes('bounce')) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }
  
  // Default formatting with comma separators
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Clean up metric names for display
 */
export const cleanMetricName = (name: string): string => {
  return name
    .replace(/_/g, ' ')           // Replace underscores with spaces
    .replace(/\n/g, ' ')          // Replace newlines with spaces  
    .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
    .replace(/\ball\b/gi, 'All')  // Capitalize 'all' 
    .replace(/\blink\b/gi, 'Link') // Capitalize 'link'
    .trim()                       // Remove leading/trailing spaces
    .split(' ')                   // Split into words
    .map(word => {
      // Handle special cases and acronyms
      const lowerWord = word.toLowerCase();
      if (['ctr', 'cpc', 'cpm', 'cpa', 'aov', 'roas', 'roi', 'cpl', 'cac', 'ltv', 'mrr', 'arr'].includes(lowerWord)) {
        return lowerWord.toUpperCase();
      }
      if (['ai', 'ml', 'api', 'ui', 'ux', 'seo', 'ppc', 'crm', 'erp'].includes(lowerWord)) {
        return lowerWord.toUpperCase();
      }
      // Handle words with parentheses (like "CTR (Link)")
      if (word.includes('(') || word.includes(')')) {
        return word.split('').map((char, index) => {
          if (char === '(' || char === ')') return char;
          if (index === 0) return char.toUpperCase();
          return char.toLowerCase();
        }).join('');
      }
      // Title case for regular words
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');                   // Join back together
};

/**
 * OPTIMIZED METRIC CALCULATOR
 * Singleton class for optimized metric calculations
 */
export class OptimizedMetricCalculator {
  private static instance: OptimizedMetricCalculator;
  
  private constructor() {}
  
  public static getInstance(): OptimizedMetricCalculator {
    if (!OptimizedMetricCalculator.instance) {
      OptimizedMetricCalculator.instance = new OptimizedMetricCalculator();
    }
    return OptimizedMetricCalculator.instance;
  }

  /**
   * Store raw metric data once per date/user/client combination
   */
  async storeRawMetricData(data: OptimizedRawMetricData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('raw_metric_data')
        .upsert([{
          user_id: data.user_id,
          client_id: data.client_id,
          date: data.date,
          spent: data.spent || 0,
          impressions: data.impressions || 0,
          clicks_all: data.clicks_all || 0,
          link_clicks: data.link_clicks || 0,
          applications: data.applications || 0,
          leads: data.leads || 0,
          mql: data.mql || 0,
          sets: data.sets || 0,
          daily_budget: data.daily_budget || 0
        }], {
          onConflict: 'user_id,client_id,date'
        });

      if (error) {
        logger.error('Failed to store raw metric data:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      logger.error('Error storing raw metric data:', err);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get metrics by category using the optimized system
   */
  async getMetricsByCategory(
    userId: string,
    category: string,
    clientId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_metrics_by_category', {
        p_user_id: userId && userId !== '' ? userId : null,
        p_client_id: clientId && clientId !== '' ? clientId : null,
        p_category: category,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      });

      if (error) {
        logger.error('Failed to get metrics by category:', error);
        return { data: [], error: error.message };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error('Error getting metrics by category:', err);
      return { data: [], error: 'Unexpected error occurred' };
    }
  }

  /**
   * Batch process multiple raw metric entries
   */
  async batchStoreRawMetricData(entries: OptimizedRawMetricData[]): Promise<{ success: boolean; error?: string; processed: number }> {
    try {
      const processedEntries = entries.map(entry => ({
        user_id: entry.user_id,
        client_id: entry.client_id,
        date: entry.date,
        spent: entry.spent || 0,
        impressions: entry.impressions || 0,
        clicks_all: entry.clicks_all || 0,
        link_clicks: entry.link_clicks || 0,
        applications: entry.applications || 0,
        leads: entry.leads || 0,
        mql: entry.mql || 0,
        sets: entry.sets || 0,
        daily_budget: entry.daily_budget || 0
      }));

      const { error } = await supabase
        .from('raw_metric_data')
        .upsert(processedEntries, {
          onConflict: 'user_id,client_id,date'
        });

      if (error) {
        logger.error('Failed to batch store raw metric data:', error);
        return { success: false, error: error.message, processed: 0 };
      }

      return { success: true, processed: entries.length };
    } catch (err) {
      logger.error('Error batch storing raw metric data:', err);
      return { success: false, error: 'Unexpected error occurred', processed: 0 };
    }
  }
}

// Export singleton instance
export const optimizedMetricCalculator = OptimizedMetricCalculator.getInstance();
