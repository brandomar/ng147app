import React from 'react';
import { useFilters } from '../../contexts/FilterContext';
import { useConsolidatedData } from '../../hooks/useConsolidatedData';
import { MetricEntry, TimeFrame } from '../../types';
import { logger } from '../../lib/logger';
import { MetricCategorySection } from './MetricCategorySection';

interface MetricsDisplayProps {
  userId: string;
  clientId?: string;
  category?: string;
  timeFrame?: TimeFrame;
  refreshTrigger?: number;
  showDeleteButtons?: boolean;
  limit?: number;
  onMetricsCountChange?: (count: number) => void;
  preloadedMetrics?: MetricEntry[];
  selectedTabs?: string[];
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  userId: _userId,
  clientId: _clientId,
  category,
  timeFrame = "alltime",
  refreshTrigger: _refreshTrigger,
  showDeleteButtons: _showDeleteButtons = false,
  limit,
  onMetricsCountChange,
  preloadedMetrics,
  selectedTabs: _selectedTabs = [],
}) => {
  // Use consolidated data hook
  const {
    dashboardData,
    loading: dataLoading,
    error: dataError,
  } = useConsolidatedData();

  // Use unified filter system
  const { state: filterState, updateDataState } = useFilters();

  // Use only FilterContext for sheet selection
  const selectedSheets = filterState.selectedSheets;
  const selectedSheetsArray = React.useMemo(
    () => Array.from(selectedSheets),
    [selectedSheets]
  );

  // Local state for metrics
  const [allMetrics, setAllMetrics] = React.useState<MetricEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalAvailableDataPoints, setTotalAvailableDataPoints] =
    React.useState<number>(0);
  // Force update counter to guarantee React detects filter changes
  const [filterUpdateCounter, setFilterUpdateCounter] = React.useState(0);

  // Listen for metric configuration changes (from MetricsViewer save)
  React.useEffect(() => {
    const handleMetricConfigChanged = () => {
      logger.info(
        "🔄 MetricsDisplay: Metric configuration changed, forcing refresh"
      );
      setFilterUpdateCounter((prev) => prev + 1); // Force re-render
    };

    window.addEventListener("metricConfigChanged", handleMetricConfigChanged);
    return () => {
      window.removeEventListener(
        "metricConfigChanged",
        handleMetricConfigChanged
      );
    };
  }, []);

  // Map date filter to time frame - Plain function (not memoized to avoid dependency issues)
  const mapDateFilterToTimeFrame = (dateFilter: string): TimeFrame => {
    switch (dateFilter) {
      case "today":
        return "daily";
      case "yesterday":
        return "daily";
      case "7days":
        return "7days";
      case "14days":
        return "14days";
      case "30days":
        return "30days";
      case "90days":
        return "90days";
      case "6months":
        return "90days";
      case "yearly":
        return "1year";
      case "alltime":
        return "alltime";
      default:
        return "alltime";
    }
  };

  // CRITICAL: Use ONLY FilterContext date filter, never fall back to prop
  // This ensures filter state is the single source of truth
  const effectiveTimeFrame = React.useMemo(() => {
    const mapped = mapDateFilterToTimeFrame(filterState.dateFilter);
    logger.essential("🕐 MetricsDisplay: Computing effectiveTimeFrame", {
      dateFilter: filterState.dateFilter,
      effectiveTimeFrame: mapped,
      timestamp: Date.now(),
    });
    return mapped;
  }, [filterState.dateFilter]); // ← Only dependency is filterState.dateFilter

  // Use unified data service for all data loading
  React.useEffect(() => {
    if (preloadedMetrics && preloadedMetrics.length > 0) {
      logger.essential("📊 MetricsDisplay: Using preloaded metrics", {
        totalDataEntries: preloadedMetrics.length,
        sampleDataEntries: preloadedMetrics.slice(0, 5).map((m) => ({
          metricHeader: m.metric_name,
          category: m.category,
          value: m.value,
          date: m.date,
        })),
      });
      setAllMetrics(preloadedMetrics);
      setLoading(false);
      setError(null);
      return;
    }

    // Use unified data service
    if (dashboardData) {
      // Get unique sheet names and metric names from metrics for debugging
      const metricSheetNames = [
        ...new Set(
          dashboardData.metrics
            .map((m: MetricEntry) => m.sheet_name)
            .filter(Boolean)
        ),
      ];
      const uniqueMetricNames = [
        ...new Set(
          dashboardData.metrics
            .map((m: MetricEntry) => m.metric_name)
            .filter(Boolean)
        ),
      ];

      logger.essential("📊 MetricsDisplay: Using unified data service:", {
        metricsCount: dashboardData.metrics.length,
        uniqueSheetNames: metricSheetNames.length,
        uniqueMetricNames: uniqueMetricNames.length,
        metricSheetNames: metricSheetNames,
        selectedSheetsArray: selectedSheetsArray,
        selectedSheetsSize: selectedSheets.size,
      });

      // Filter metrics based on selected sheets
      if (selectedSheets && selectedSheets.size > 0) {
        const filteredMetrics = dashboardData.metrics.filter(
          (metric: MetricEntry) =>
            metric.sheet_name && selectedSheetsArray.includes(metric.sheet_name)
        );

        logger.essential("📊 MetricsDisplay: After filtering by sheets:", {
          beforeFilter: dashboardData.metrics.length,
          afterFilter: filteredMetrics.length,
          selectedSheets: selectedSheetsArray,
          sampleMetricSheetNames: dashboardData.metrics
            .slice(0, 5)
            .map((m: MetricEntry) => m.sheet_name),
        });

        setAllMetrics(filteredMetrics);
        setTotalAvailableDataPoints(filteredMetrics.length);

        logger.essential("📊 MetricsDisplay: Loaded data from DataContext", {
          selectedSheets: selectedSheetsArray,
          totalDataEntries: filteredMetrics.length,
          sampleDataEntries: filteredMetrics
            .slice(0, 5)
            .map((m: MetricEntry) => ({
              metricHeader: m.metric_name,
              category: m.category,
              value: m.value,
              date: m.date,
            })),
        });
      } else {
        // Use all metrics from dashboard data when no sheets are selected
        logger.essential("📊 MetricsDisplay: No sheets selected, showing all metrics:", {
          totalMetrics: dashboardData.metrics.length,
          sampleMetrics: dashboardData.metrics.slice(0, 5).map((m: MetricEntry) => ({
            metricHeader: m.metric_name,
            category: m.category,
            value: m.value,
            date: m.date,
            sheet_name: m.sheet_name,
          })),
        });
        
        setAllMetrics(dashboardData.metrics);
        setTotalAvailableDataPoints(dashboardData.metrics.length);
      }

      setLoading(false);
      setError(null);
    } else if (dataLoading) {
      setLoading(true);
      setError(null);
    } else if (dataError) {
      setError(dataError);
      setLoading(false);
    }
  }, [
    dashboardData,
    dataLoading,
    dataError,
    selectedSheets,
    preloadedMetrics,
    selectedSheetsArray,
  ]);

  // Apply filters to metrics
  const [filteredMetrics, setFilteredMetrics] = React.useState<MetricEntry[]>(
    []
  );

  React.useEffect(() => {
    logger.debug("🔄 MetricsDisplay: Filtering effect triggered", {
      allMetricsCount: allMetrics.length,
      category,
      effectiveTimeFrame,
    });

    if (allMetrics.length === 0) {
      setFilteredMetrics([]);
      return;
    }

    let filtered = [...allMetrics];
    const beforeFilterCount = filtered.length;

    // Apply category filter
    if (category && category !== "all") {
      filtered = filtered.filter((metric) => metric.category === category);
      logger.debug("📊 MetricsDisplay: Applied category filter", {
        category,
        beforeCount: beforeFilterCount,
        afterCount: filtered.length,
      });
    }

    // Apply time frame filter
    if (effectiveTimeFrame !== "alltime") {
      const days: Record<string, number> = {
        daily: 1,
        "3days": 3,
        "7days": 7,
        "14days": 14,
        "30days": 30,
        "90days": 90,
        "1year": 365,
      };
      const dayCount = days[effectiveTimeFrame] || 1;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dayCount);

      const beforeTimeFilter = filtered.length;
      filtered = filtered.filter(
        (metric) => new Date(metric.date) >= cutoffDate
      );

      logger.essential("🕐 MetricsDisplay: Applied time frame filter", {
        effectiveTimeFrame,
        dayCount,
        cutoffDate: cutoffDate.toISOString(),
        beforeCount: beforeTimeFilter,
        afterCount: filtered.length,
        sampleDates: filtered.slice(0, 5).map((m) => m.date),
      });
    } else {
      logger.debug("🕐 MetricsDisplay: No time frame filter (alltime)", {
        metricsCount: filtered.length,
      });
    }

    setFilteredMetrics(filtered);

    logger.essential("✅ MetricsDisplay: Filtering complete", {
      totalMetrics: allMetrics.length,
      filteredMetrics: filtered.length,
      category,
      effectiveTimeFrame,
    });

    // Update data state (total, filtered, loading)
    updateDataState(allMetrics.length, filtered.length, false);

    // Increment force update counter to guarantee React re-renders components
    setFilterUpdateCounter((prev) => prev + 1);

    // Notify parent of metrics count
    if (onMetricsCountChange) {
      onMetricsCountChange(filtered.length);
    }
  }, [
    allMetrics,
    category,
    effectiveTimeFrame,
    updateDataState,
    onMetricsCountChange,
  ]);

  // Group metrics by category, then by name
  const metricsByCategory = React.useMemo(() => {
    logger.essential("🔄 MetricsDisplay: Recalculating metricsByCategory", {
      filteredMetricsCount: filteredMetrics.length,
      sampleDates: filteredMetrics.slice(0, 5).map((m) => m.date),
      uniqueDates: [...new Set(filteredMetrics.map((m) => m.date))].length,
    });

    // Load selected metrics from localStorage (user's saved selection)
    let selectedMetricsFromStorage: Set<string> | null = null;
    try {
      const userId = dashboardData?.userId;
      const clientId = dashboardData?.clientId;
      const configKey = `metric_config_${userId}_${clientId || "staff"}`;
      const savedConfig = localStorage.getItem(configKey);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        selectedMetricsFromStorage = new Set(config.enabled || []);
        logger.debug("📊 Loaded metric selection from localStorage:", {
          configKey,
          selectedCount: selectedMetricsFromStorage.size,
          sampleMetrics: Array.from(selectedMetricsFromStorage).slice(0, 5),
        });
      }
    } catch (error) {
      logger.warn(
        "⚠️ Failed to load metric selection from localStorage:",
        error
      );
    }

    // First group by metric name
    const byName = filteredMetrics.reduce(
      (acc: Record<string, MetricEntry[]>, metric) => {
        const key = metric.metric_name;

        // Filter out metrics that user has deselected
        // If no selection saved, show all metrics (default behavior)
        if (
          selectedMetricsFromStorage &&
          !selectedMetricsFromStorage.has(key)
        ) {
          return acc; // Skip this metric - user deselected it
        }

        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(metric);
        return acc;
      },
      {}
    );

    // DEBUG: Log sample metric entries to understand structure
    const sampleMetric = Object.keys(byName)[0];
    if (sampleMetric && byName[sampleMetric]) {
      logger.essential("🔍 SAMPLE METRIC STRUCTURE:", {
        metricName: sampleMetric,
        entriesCount: byName[sampleMetric].length,
        sampleEntries: byName[sampleMetric].slice(0, 3).map((e) => ({
          value: e.value,
          date: e.date,
          sheet_name: e.sheet_name,
          tab_name: e.tab_name,
          category: e.category,
        })),
        uniqueTabs: [...new Set(byName[sampleMetric].map((e) => e.tab_name))],
        uniqueDates: [
          ...new Set(byName[sampleMetric].map((e) => e.date)),
        ].slice(0, 5),
      });
    }

    // Then group by category
    const byCategory: Record<
      string,
      Array<{
        name: string;
        entries: MetricEntry[];
        latestValue: number;
        type: string;
      }>
    > = {};

    Object.entries(byName).forEach(([name, entries]) => {
      const category = entries[0]?.category || "uncategorized";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }

      // IMPORTANT: Sort entries by date descending to ensure we get the actual latest value
      // This is critical after filtering, as the original sort order may not be maintained
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Get the most recent value (from sorted entries)
      const latestEntry = sortedEntries[0];

      // Calculate aggregate value across all tabs for the latest date
      const latestDate = latestEntry?.date;
      const entriesForLatestDate = sortedEntries.filter(
        (e) => e.date === latestDate
      );
      const aggregatedValue = entriesForLatestDate.reduce(
        (sum, e) => sum + (e.value || 0),
        0
      );

      // Get unique tabs and dates for this metric
      const uniqueTabs = [
        ...new Set(sortedEntries.map((e) => e.tab_name).filter(Boolean)),
      ];
      const dateRange =
        sortedEntries.length > 0
          ? {
              latest: sortedEntries[0].date,
              oldest: sortedEntries[sortedEntries.length - 1].date,
            }
          : null;

      // Log aggregation details for this metric
      logger.essential(`💎 Metric aggregation for "${name}":`, {
        totalEntries: sortedEntries.length,
        dateRange,
        uniqueTabs: uniqueTabs.length,
        tabs: uniqueTabs,
        latestDate,
        entriesOnLatestDate: entriesForLatestDate.length,
        valuesOnLatestDate: entriesForLatestDate.map((e) => ({
          tab: e.tab_name,
          value: e.value,
          date: e.date,
        })),
        aggregatedValue,
        metricType: sortedEntries[0]?.metric_type,
      });

      byCategory[category].push({
        name,
        entries: sortedEntries, // Use sorted entries
        latestValue: aggregatedValue, // Sum across all tabs for latest date
        type: sortedEntries[0]?.metric_type || "number", // Use actual metric_type from database
      });
    });

    return byCategory;
  }, [filteredMetrics, dashboardData?.userId, dashboardData?.clientId]);

  // Get total metrics count
  const totalMetrics = Object.values(metricsByCategory).reduce(
    (sum, metrics) => sum + metrics.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Error loading metrics: {error}</p>
      </div>
    );
  }

  if (totalMetrics === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-600">
          No metrics found for the selected criteria.
        </p>
      </div>
    );
  }

  // DEBUG: Log what we're about to render
  logger.essential("🎨 ABOUT TO RENDER METRICS BY CATEGORY:", {
    categoriesCount: Object.keys(metricsByCategory).length,
    totalMetrics,
    effectiveTimeFrame,
    categories: Object.keys(metricsByCategory),
  });

  // Define category order
  const categoryOrder = [
    "spend-revenue",
    "cost-per-show",
    "funnel-volume",
    "funnel-conversion",
  ];
  const sortedCategories = Object.keys(metricsByCategory).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="space-y-4">
      {sortedCategories.map((category) => {
        // Create a unique key that changes when metric data OR filter state changes
        // Include multiple factors to GUARANTEE key changes on any filter update:
        // 1. effectiveTimeFrame - changes with date filter
        // 2. filteredMetrics.length - changes with any filter
        // 3. filterUpdateCounter - increments on every filter change
        // 4. metricsHash - changes with actual data
        const metricsHash = metricsByCategory[category]
          .map((m) => `${m.name}:${m.latestValue}:${m.entries.length}`)
          .join("|");
        const uniqueKey = `${category}-${effectiveTimeFrame}-${
          filteredMetrics.length
        }-${filterUpdateCounter}-${metricsHash.substring(0, 20)}`;

        logger.essential(`🔑 Rendering category ${category} with key:`, {
          category,
          effectiveTimeFrame,
          filteredMetricsCount: filteredMetrics.length,
          filterUpdateCounter,
          keyPreview: uniqueKey.substring(0, 60),
          metricsCount: metricsByCategory[category].length,
        });

        return (
          <MetricCategorySection
            key={uniqueKey}
            category={category}
            metrics={metricsByCategory[category]}
            defaultExpanded={true}
          />
        );
      })}

      {totalAvailableDataPoints > 0 && (
        <div className="text-sm text-gray-500 text-center py-2">
          Showing {totalMetrics} unique metrics from {totalAvailableDataPoints}{" "}
          total data points
        </div>
      )}
    </div>
  );
};

