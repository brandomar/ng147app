import React, { useState } from "react";
import { MetricEntry } from "../../types";
import {
  formatCalculatedMetric,
  cleanMetricName,
} from "../../lib/metricCalculations";
import { logger } from "../../lib/logger";

interface MetricCategorySectionProps {
  category: string;
  metrics: Array<{
    name: string;
    entries: MetricEntry[];
    latestValue: number;
    type: string;
  }>;
}

const CATEGORY_CONFIG = {
  "spend-revenue": {
    title: "Spend & Revenue",
  },
  "cost-per-show": {
    title: "Cost Metrics",
  },
  "funnel-volume": {
    title: "Funnel Volume",
  },
  "funnel-conversion": {
    title: "Conversion Rates",
  },
};

export const MetricCategorySection: React.FC<MetricCategorySectionProps> = ({
  category,
  metrics,
}) => {
  const [showAll, setShowAll] = useState(false);
  const TRUNCATE_LIMIT = 6;

  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
    title: category,
  };

  // Sort metrics alphabetically by name
  const sortedMetrics = [...metrics].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // Determine which metrics to display
  const displayedMetrics = showAll
    ? sortedMetrics
    : sortedMetrics.slice(0, TRUNCATE_LIMIT);
  const hasMore = sortedMetrics.length > TRUNCATE_LIMIT;

  // Debug logging to track when this component receives new metric data
  React.useEffect(() => {
    logger.essential(
      `🎨 MetricCategorySection (${category}) rendered with metrics:`,
      {
        category,
        metricsCount: metrics.length,
        sampleMetrics: metrics.slice(0, 3).map((m) => ({
          name: m.name,
          latestValue: m.latestValue,
          entriesCount: m.entries.length,
          type: m.type,
        })),
      }
    );
  }, [category, metrics]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Category Header */}
      <div className="w-full px-6 py-2 flex items-center justify-between">
        {/* Left line */}
        <div className="flex-1 h-px bg-gray-300"></div>

        {/* Category name centered */}
        <div className="px-6">
          <h3 className="font-semibold text-sm text-gray-900 whitespace-nowrap">
            {config.title}
          </h3>
        </div>

        {/* Right line */}
        <div className="flex-1 h-px bg-gray-300"></div>

        {/* Metric count */}
        <div className="ml-6">
          <span className="text-xs font-medium text-gray-500">
            {sortedMetrics.length} metrics
          </span>
        </div>
      </div>

      {/* Metrics Grid - Always visible */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedMetrics.map((metric) => {
            const formattedValue = formatCalculatedMetric(
              metric.latestValue,
              metric.type
            );

            logger.debug(`📊 Rendering metric card:`, {
              name: metric.name,
              latestValue: metric.latestValue,
              formattedValue,
              entriesLength: metric.entries.length,
              type: metric.type,
            });

            return (
              <div
                key={metric.name}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {cleanMetricName(metric.name)}
                  </h4>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formattedValue}
                </div>
                <div className="text-xs text-gray-500">
                  {metric.entries.length} data point
                  {metric.entries.length !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More/Less Button */}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {showAll
                ? `Show Less`
                : `Show ${sortedMetrics.length - TRUNCATE_LIMIT} More`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
