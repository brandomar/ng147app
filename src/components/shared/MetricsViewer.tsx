import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  ChevronDown,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { logger } from "../../lib/logger";
import { getConfiguredMetricEntries } from "../../lib/database";
import { useFilters, MetricCategory } from "../../contexts/FilterContext";
import { usePermissions } from "../../contexts/PermissionContext";

interface MetricsViewerProps {
  // Configuration
  clientId?: string;
  userId?: string;

  // Callbacks
  onConfigurationComplete: () => void;

  // UI customization
  variant?: "dropdown" | "modal";
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;

  // Refresh trigger
  refreshTrigger?: number;
}

export const MetricsViewer: React.FC<MetricsViewerProps> = ({
  clientId,
  userId,
  onConfigurationComplete,
  variant = "dropdown",
  buttonText = "Show/Hide Metrics",
  buttonIcon,
  className = "",
  buttonClassName = "",
  refreshTrigger,
}) => {
  // Use unified filter system
  const {
    state: filterState,
    setMetricCategoriesData,
    setMetricCategories,
    toggleMetricCategory,
  } = useFilters();

  // Try to get new permission system, but don't fail if not available
  let newPermissions = null;
  try {
    newPermissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue with legacy system
  }

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set()
  );
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});

  // Update FilterContext category selection only when Save is pressed
  const updateCategorySelection = useCallback(() => {
    if (
      selectedMetrics.size > 0 &&
      Object.keys(filterState.metricCategories).length > 0
    ) {
      logger.debug("🔧 selectedMetrics changed, updating category selection", {
        selectedMetricsSize: selectedMetrics.size,
        selectedMetrics: Array.from(selectedMetrics),
        availableCategories: Object.keys(filterState.metricCategories),
      });

      // Update FilterContext with selected metrics
      Object.keys(filterState.metricCategories).forEach((category) => {
        const categoryMetrics = filterState.metricCategories[category];
        const hasSelectedMetrics = categoryMetrics.some((metric) =>
          selectedMetrics.has(metric)
        );

        if (
          hasSelectedMetrics &&
          !filterState.selectedMetricCategories.has(category as MetricCategory)
        ) {
          toggleMetricCategory(category as MetricCategory);
        }
      });
    }
  }, [
    selectedMetrics,
    filterState.metricCategories,
    filterState.selectedMetricCategories,
    toggleMetricCategory,
  ]);

  // Load available metrics using optimized service function
  const loadAvailableMetrics = async () => {
    if (!userId && !clientId) {
      setError("No user or client ID provided");
      return;
    }

    // Skip if already loading or if we already have metrics
    if (loading || availableMetrics.length > 0) {
      logger.debug("🔧 Skipping metric load - already loaded or loading:", {
        loading,
        availableMetricsCount: availableMetrics.length,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug("🔧 Loading available metrics using service function:", {
        clientId,
        userId,
      });

      // Use optimized service function instead of direct Supabase calls
      const { data: metricsData, error } = await getConfiguredMetricEntries(
        "alltime",
        userId,
        clientId
      );

      if (error) {
        logger.error("❌ Error fetching metrics from service:", error);
        setError("Failed to load metrics");
        return;
      }

      // Get unique metric names from service data
      const metricNames: string[] = (metricsData || []).map(
        (m: { metric_name: string }) => m.metric_name
      );
      const uniqueMetricNames: string[] = [...new Set(metricNames)];
      setAvailableMetrics(uniqueMetricNames);

      // Initialize all metrics as selected by default (show everything)
      setSelectedMetrics(new Set(uniqueMetricNames));

      // Group metrics by their actual categories from service data
      const categories: { [category: string]: string[] } = {};

      // Use service data instead of additional query
      const metricsWithCategories = (metricsData || []).filter(
        (m: { category?: string }) => m.category
      );

      if (metricsWithCategories && metricsWithCategories.length > 0) {
        // Group by actual categories from database
        metricsWithCategories.forEach(
          (metric: { category?: string; metric_name: string }) => {
            const category = metric.category || "Uncategorized";
            if (!categories[category]) {
              categories[category] = [];
            }
            if (!categories[category].includes(metric.metric_name)) {
              categories[category].push(metric.metric_name);
            }
          }
        );

        // Add any metrics that weren't found in the category query
        const categorizedMetrics = new Set(Object.values(categories).flat());
        const uncategorizedMetrics = uniqueMetricNames.filter(
          (name: string) => !categorizedMetrics.has(name)
        );
        if (uncategorizedMetrics.length > 0) {
          categories["Uncategorized"] = uncategorizedMetrics;
        }
      } else {
        // Fallback if no category data found
        categories["All Metrics"] = uniqueMetricNames;
      }

      setMetricCategoriesData(categories);

      // Auto-select all available categories for the filter system
      const allCategories = Object.keys(categories);
      const availableCategoriesSet = new Set(allCategories as MetricCategory[]);
      setMetricCategories(availableCategoriesSet, availableCategoriesSet);

      logger.debug("✅ Loaded available metrics from service:", {
        uniqueMetricNames: uniqueMetricNames.length,
        enabled: selectedMetrics.size,
        sampleMetrics: uniqueMetricNames.slice(0, 5),
        categories: Object.keys(categories),
      });
    } catch (error) {
      logger.error("❌ Error loading available metrics:", error);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  // Save metric configurations to localStorage (for now)
  const saveMetricConfigurations = async () => {
    if (!userId && !clientId) {
      setError("No user or client ID provided");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      logger.debug("💾 Saving metric configurations to localStorage:", {
        clientId,
        userId,
        selectedCount: selectedMetrics.size,
      });

      // Save to localStorage for now (simple approach)
      const configKey = `metric_config_${userId}_${clientId || "staff"}`;
      const configData = {
        enabled: Array.from(selectedMetrics), // Array of enabled metric names
        lastUpdated: new Date().toISOString(),
        userId,
        clientId,
      };

      localStorage.setItem(configKey, JSON.stringify(configData));

      // Update FilterContext category selection based on saved metrics
      updateCategorySelection();

      setSuccess("Metric configurations saved successfully!");
      logger.debug("✅ Saved metric configurations to localStorage:", {
        configKey,
        enabled: selectedMetrics.size,
      });

      // Dispatch custom event to notify other components
      window.dispatchEvent(
        new CustomEvent("metricConfigChanged", {
          detail: { configKey, selectedCount: selectedMetrics.size },
        })
      );

      // Call completion callback after a short delay
      setTimeout(() => {
        onConfigurationComplete();
        setIsOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      logger.error("❌ Exception saving metric configurations:", err);
      setError("Failed to save metric configurations");
    } finally {
      setSaving(false);
    }
  };

  // Load metrics when component mounts, clientId/userId changes, or refreshTrigger changes
  useEffect(() => {
    if (userId || clientId) {
      loadAvailableMetrics();
    }
  }, [userId, clientId, refreshTrigger]);

  // Load saved configurations
  useEffect(() => {
    if (!userId && !clientId) return;

    const configKey = `metric_config_${userId}_${clientId || "staff"}`;
    const savedConfig = localStorage.getItem(configKey);

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.selectedMetrics && Array.isArray(config.selectedMetrics)) {
          setSelectedMetrics(new Set(config.selectedMetrics));
          logger.debug("📦 Loaded saved metric configurations:", {
            configKey,
            count: config.selectedMetrics.length,
          });
        }
      } catch (err) {
        logger.warn("⚠️ Failed to parse saved metric configurations:", err);
      }
    }
  }, [userId, clientId]);

  // Handle metric selection
  const toggleMetric = (metricName: string) => {
    setSelectedMetrics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(metricName)) {
        newSet.delete(metricName);
      } else {
        newSet.add(metricName);
      }
      return newSet;
    });
  };

  // Handle category selection
  const toggleCategory = (category: string) => {
    const categoryMetrics = filterState.metricCategories[category] || [];
    const allSelected = categoryMetrics.every((metric) =>
      selectedMetrics.has(metric)
    );

    if (allSelected) {
      // Deselect all metrics in this category
      categoryMetrics.forEach((metric) => {
        setSelectedMetrics((prev) => {
          const newSet = new Set(prev);
          newSet.delete(metric);
          return newSet;
        });
      });
    } else {
      // Select all metrics in this category
      categoryMetrics.forEach((metric) => {
        setSelectedMetrics((prev) => new Set(prev).add(metric));
      });
    }
  };

  // Check if all metrics in a category are selected
  const isCategoryFullySelected = (category: string) => {
    const categoryMetrics = filterState.metricCategories[category] || [];
    return (
      categoryMetrics.length > 0 &&
      categoryMetrics.every((metric) => selectedMetrics.has(metric))
    );
  };

  // Check if some (but not all) metrics in a category are selected
  const isCategoryPartiallySelected = (category: string) => {
    const categoryMetrics = filterState.metricCategories[category] || [];
    const selectedCount = categoryMetrics.filter((metric) =>
      selectedMetrics.has(metric)
    ).length;
    return selectedCount > 0 && selectedCount < categoryMetrics.length;
  };

  // Dropdown variant
  if (variant === "dropdown") {
    return (
      <div className={`relative ${className}`}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={
            buttonClassName ||
            `flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors`
          }
          title={buttonText}
        >
          {buttonIcon || <Eye size={16} />}
          {buttonText && (
            <span className="text-sm font-medium">{buttonText}</span>
          )}
          {buttonText && (
            <ChevronDown
              size={16}
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Configure Metrics</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="animate-spin text-gray-400" size={24} />
                  <span className="ml-2 text-gray-600">Loading metrics...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Selection */}
                  {Object.keys(filterState.metricCategories).map((category) => {
                    // Sort metrics alphabetically
                    const sortedMetrics = [
                      ...(filterState.metricCategories[category] || []),
                    ].sort((a, b) =>
                      a.localeCompare(b, undefined, { sensitivity: "base" })
                    );

                    // Truncation logic per category
                    const MENU_TRUNCATE_LIMIT = 5;
                    const shouldTruncate =
                      sortedMetrics.length > MENU_TRUNCATE_LIMIT;
                    const isExpanded = expandedCategories[category];
                    const displayedMetrics =
                      shouldTruncate && !isExpanded
                        ? sortedMetrics.slice(0, MENU_TRUNCATE_LIMIT)
                        : sortedMetrics;

                    return (
                      <div
                        key={category}
                        className="border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCategory(category)}
                              className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1"
                            >
                              <div className="flex items-center gap-2">
                                {isCategoryFullySelected(category) ? (
                                  <Check className="text-green-600" size={16} />
                                ) : isCategoryPartiallySelected(category) ? (
                                  <div className="w-4 h-4 border-2 border-blue-500 bg-blue-100 rounded" />
                                ) : (
                                  <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                                )}
                                <span className="font-medium text-sm">
                                  {category}
                                </span>
                              </div>
                            </button>
                          </div>
                          <span className="text-xs text-gray-500">
                            {sortedMetrics.length} metrics
                          </span>
                        </div>

                        {/* Individual Metrics */}
                        <div className="p-3 space-y-2">
                          {displayedMetrics.map((metric) => (
                            <label
                              key={metric}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMetrics.has(metric)}
                                onChange={() => toggleMetric(metric)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {metric}
                              </span>
                            </label>
                          ))}

                          {/* Show More/Less for menu */}
                          {shouldTruncate && (
                            <button
                              onClick={() =>
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }))
                              }
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium w-full text-center py-1"
                            >
                              {isExpanded
                                ? "Show Less"
                                : `Show ${
                                    sortedMetrics.length - MENU_TRUNCATE_LIMIT
                                  } More`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {selectedMetrics.size} of {availableMetrics.length}{" "}
                      metrics selected
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveMetricConfigurations}
                        disabled={saving}
                        className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="text-green-600" size={16} />
                    <span className="text-green-700 text-sm">{success}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modal variant
  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={buttonClassName || `p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors`}
        title={buttonText}
      >
        {buttonIcon || <Eye size={20} />}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <Eye className="text-undeniable-violet" size={24} />
                  <h2 className="text-xl font-semibold text-undeniable-black">
                    Metric Visibility
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-600" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw
                      className="animate-spin text-undeniable-violet"
                      size={32}
                    />
                    <span className="ml-3 text-lg text-undeniable-black">
                      Loading metrics...
                    </span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="text-red-500" size={20} />
                    <span className="text-red-700">{error}</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Category Selection */}
                    {Object.keys(filterState.metricCategories).map(
                      (category) => (
                        <div
                          key={category}
                          className="border border-neutral-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between p-4 bg-neutral-50">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-3 hover:bg-neutral-100 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-3">
                                  {isCategoryFullySelected(category) ? (
                                    <Check
                                      className="text-green-600"
                                      size={20}
                                    />
                                  ) : isCategoryPartiallySelected(category) ? (
                                    <div className="w-5 h-5 border-2 border-undeniable-violet bg-undeniable-violet/10 rounded" />
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-neutral-300 rounded" />
                                  )}
                                  <span className="font-semibold text-undeniable-black">
                                    {category}
                                  </span>
                                </div>
                              </button>
                            </div>
                            <span className="text-sm text-neutral-500">
                              {filterState.metricCategories[category]?.length ||
                                0}{" "}
                              metrics
                            </span>
                          </div>

                          {/* Individual Metrics */}
                          <div className="p-4 space-y-3">
                            {filterState.metricCategories[category]?.map(
                              (metric) => (
                                <label
                                  key={metric}
                                  className="flex items-center gap-3 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedMetrics.has(metric)}
                                    onChange={() => toggleMetric(metric)}
                                    className="w-5 h-5 text-undeniable-violet border-neutral-300 rounded focus:ring-undeniable-violet"
                                  />
                                  <span className="text-undeniable-black">
                                    {metric}
                                  </span>
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {/* Summary */}
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-undeniable-black">
                          Selected Metrics
                        </span>
                        <span className="text-sm text-neutral-600">
                          {selectedMetrics.size} of {availableMetrics.length}{" "}
                          metrics
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-neutral-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMetricConfigurations}
                  disabled={saving}
                  className="px-6 py-2 bg-undeniable-violet text-white rounded-lg hover:bg-undeniable-violet/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};