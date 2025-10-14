import React, { useMemo } from 'react';
import { MetricEntry } from '../../types';
import { formatCalculatedMetric } from '../../lib/metricCalculations';
import { logger } from '../../lib/logger';

interface PerformanceSummaryProps {
  metrics: MetricEntry[];
  className?: string;
}

export const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({
  metrics,
  className = '',
}) => {
  // Calculate summary metrics
  const summaryData = useMemo(() => {
    // Helper to find and sum metric values
    const findMetricValue = (metricNames: string[]): number => {
      const entries = metrics.filter((m) =>
        metricNames.some((name) =>
          m.metric_name.toLowerCase().includes(name.toLowerCase())
        )
      );

      if (entries.length === 0) return 0;

      // Get the most recent values and sum them
      const latestDate = entries.reduce((latest, entry) => {
        const entryDate = new Date(entry.date);
        return entryDate > latest ? entryDate : latest;
      }, new Date(0));

      const latestEntries = entries.filter(
        (e) => new Date(e.date).getTime() === latestDate.getTime()
      );

      return latestEntries.reduce((sum, e) => sum + (e.value || 0), 0);
    };

    // Calculate metrics
    const totalSpend = findMetricValue([
      "spent",
      "ad spend",
      "spend",
      "total spend",
    ]);
    const revenue = findMetricValue([
      "revenue",
      "sales revenue",
      "total revenue",
      "gross sale",
    ]);
    const cashCollected = findMetricValue(["cash collected", "cash"]);
    // Use only "Closes" for transaction count (not "Sales closed" which might be currency)
    const transactions = findMetricValue(["closes"]);

    // Get ROAS metrics from stored data (synced from Google Sheets)
    const revenueROAS = findMetricValue(["rev roas", "revenue roas"]);
    const cashROAS = findMetricValue(["cash roas"]);

    // Calculate ATV (Average Transaction Value)
    const atv = transactions > 0 ? revenue / transactions : 0;

    // Get CPA metric (Cost Per Acquisition)
    const cpa = findMetricValue(["cpa", "cost per acquisition"]);

    return {
      totalSpend,
      revenue,
      revenueROAS,
      cashROAS,
      atv,
      cpa,
    };
  }, [metrics]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-2 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          Performance Summary
        </h3>
      </div>

      {/* Metrics Grid */}
      <div className="px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Total Spend */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Spend</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCalculatedMetric(summaryData.totalSpend, "currency")}
            </div>
          </div>

          {/* Revenue Generated */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Revenue Generated</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCalculatedMetric(summaryData.revenue, "currency")}
            </div>
          </div>

          {/* CPA */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">CPA</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCalculatedMetric(summaryData.cpa, "currency")}
            </div>
          </div>

          {/* Revenue ROAS */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Revenue ROAS</div>
            <div className="text-2xl font-bold text-gray-900">
              {summaryData.revenueROAS.toFixed(2)}x
            </div>
          </div>

          {/* Cash ROAS */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Cash ROAS</div>
            <div className="text-2xl font-bold text-gray-900">
              {summaryData.cashROAS.toFixed(2)}x
            </div>
          </div>

          {/* ATV */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">
              ATV (Avg Transaction Value)
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCalculatedMetric(summaryData.atv, "currency")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

