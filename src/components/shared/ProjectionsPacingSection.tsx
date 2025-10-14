import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  ArrowUp,
  ArrowDown,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { GoalsSettingsModal } from "./GoalsSettingsModal";
import { PerformanceSummary } from "./PerformanceSummary";
import {
  getClientGoals,
  calculateGoalProgress,
  isOverTarget,
  getProgressColor,
  MonthlyTargets,
} from "../../lib/database";
import { useConsolidatedData } from "../../hooks/useConsolidatedData";
import { useFilters } from "../../contexts/FilterContext";
import { useGlobalPermissions } from "../../hooks/useGlobalPermissions";
import { formatCalculatedMetric } from "../../lib/metricCalculations";
import { logger } from "../../lib/logger";
import { MetricEntry } from "../../types";

interface ProjectionsPacingSectionProps {
  userId: string;
  clientId?: string;
}

interface GoalMetric {
  name: string;
  key: keyof MonthlyTargets;
  currentValue: number;
  goalValue: number;
  type: "currency" | "number" | "percentage";
  metricNames: string[]; // Possible metric names to search for
}

export const ProjectionsPacingSection: React.FC<
  ProjectionsPacingSectionProps
> = ({ userId, clientId }) => {
  const permissions = useGlobalPermissions();
  const { dashboardData } = useConsolidatedData();
  const { state: filterState } = useFilters();

  const [goals, setGoals] = useState<MonthlyTargets>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine which client to use
  const targetClientId = useMemo(() => {
    if (clientId) return clientId;

    // For staff/admin, use the first client from dashboard data
    if (dashboardData?.clients && dashboardData.clients.length > 0) {
      return dashboardData.clients[0].id;
    }

    return null;
  }, [clientId, dashboardData?.clients]);

  // Load goals on mount
  useEffect(() => {
    const loadGoals = async () => {
      if (!targetClientId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await getClientGoals(targetClientId);
        if (data?.monthly_targets) {
          setGoals(data.monthly_targets);
        }
      } catch (error) {
        logger.error("❌ Error loading goals", error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [targetClientId]);

  // Get filtered metrics based on current filter state
  const filteredMetrics = useMemo(() => {
    if (!dashboardData?.metrics) return [];

    const metrics = dashboardData.metrics as MetricEntry[];

    // Apply sheet filter
    const selectedSheets = Array.from(filterState.selectedSheets);
    let filtered = metrics;

    if (selectedSheets.length > 0) {
      filtered = metrics.filter((m) =>
        m.sheet_name ? selectedSheets.includes(m.sheet_name) : true
      );
    }

    logger.debug("📊 Filtered metrics for projections", {
      total: metrics.length,
      filtered: filtered.length,
      selectedSheets: selectedSheets.length,
    });

    return filtered;
  }, [dashboardData?.metrics, filterState.selectedSheets]);

  // Helper to find metric current value
  const findMetricValue = (metricNames: string[]): number => {
    const entries = filteredMetrics.filter((m) =>
      metricNames.some((name) =>
        m.metric_name.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (entries.length === 0) return 0;

    // Get the most recent values
    const latestDate = entries.reduce((latest, entry) => {
      const entryDate = new Date(entry.date);
      return entryDate > latest ? entryDate : latest;
    }, new Date(0));

    const latestEntries = entries.filter(
      (e) => new Date(e.date).getTime() === latestDate.getTime()
    );

    return latestEntries.reduce((sum, e) => sum + (e.value || 0), 0);
  };

  // Define goal metrics configuration
  const goalMetrics: GoalMetric[] = useMemo(() => {
    return [
      {
        name: "Ad Spend",
        key: "ad_spend",
        currentValue: findMetricValue([
          "spent",
          "ad spend",
          "spend",
          "total spend",
        ]),
        goalValue: goals.ad_spend || 0,
        type: "currency",
        metricNames: ["spent", "ad spend", "spend", "total spend"],
      },
      {
        name: "Booked Calls",
        key: "booked_calls",
        currentValue: findMetricValue([
          "calls booked",
          "booked calls",
          "appointments booked",
        ]),
        goalValue: goals.booked_calls || 0,
        type: "number",
        metricNames: ["calls booked", "booked calls", "appointments booked"],
      },
      {
        name: "Offer Rate",
        key: "offer_rate",
        currentValue: findMetricValue(["offer rate"]),
        goalValue: goals.offer_rate || 0,
        type: "percentage",
        metricNames: ["offer rate"],
      },
      {
        name: "Closes",
        key: "closes",
        currentValue: findMetricValue(["closes"]),
        goalValue: goals.closes || 0,
        type: "number",
        metricNames: ["closes"],
      },
      {
        name: "CPA",
        key: "cpa",
        currentValue: findMetricValue(["cpa"]),
        goalValue: goals.cpa || 0,
        type: "currency",
        metricNames: ["cpa"],
      },
      {
        name: "Sales",
        key: "sales",
        currentValue: findMetricValue([
          "revenue",
          "sales revenue",
          "total revenue",
          "gross sale",
        ]),
        goalValue: goals.sales || 0,
        type: "currency",
        metricNames: [
          "revenue",
          "sales revenue",
          "total revenue",
          "gross sale",
        ],
      },
    ];
  }, [goals, filteredMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle modal save
  const handleGoalsSaved = async () => {
    if (!targetClientId) return;

    // Reload goals
    try {
      const { data } = await getClientGoals(targetClientId);
      if (data?.monthly_targets) {
        setGoals(data.monthly_targets);
      }
    } catch (error) {
      logger.error("❌ Error reloading goals", error);
    }
  };

  // Check if user can edit goals
  const canEditGoals = permissions.isAdmin || permissions.isStaff;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Projections & Pacing Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header */}
          <div className="px-6 py-2 border-b bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              {canEditGoals && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                >
                  Set Goals
                </button>
              )}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1 border-t border-gray-300"></div>
                <h3 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                  Projections & Pacing
                </h3>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:opacity-70 transition-opacity flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Metrics Grid - Only show when expanded */}
          {isExpanded && (
            <div className="px-6 py-3">
              {Object.keys(goals).length === 0 ||
              goalMetrics.every((m) => !m.goalValue) ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No Goals Set
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Set monthly goal targets to track progress and pacing.
                  </p>
                  {canEditGoals && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Set Goals
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goalMetrics
                    .filter((metric) => metric.goalValue > 0)
                    .map((metric) => {
                      const progress = calculateGoalProgress(
                        metric.currentValue,
                        metric.goalValue,
                        filterState.dateFilter
                      );
                      const overTarget = isOverTarget(
                        metric.currentValue,
                        metric.goalValue
                      );
                      const progressColor = getProgressColor(progress);

                      // Color classes
                      const colorClasses = {
                        green: "bg-green-500",
                        yellow: "bg-yellow-500",
                        red: "bg-red-500",
                      };

                      const arrowColorClasses = {
                        green: "text-green-600",
                        red: "text-red-600",
                      };

                      return (
                        <div
                          key={metric.key}
                          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          {/* Metric Header */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              {metric.name}
                            </h4>
                            {overTarget ? (
                              <ArrowUp
                                className={`h-5 w-5 ${arrowColorClasses.green}`}
                              />
                            ) : (
                              <ArrowDown
                                className={`h-5 w-5 ${arrowColorClasses.red}`}
                              />
                            )}
                          </div>

                          {/* Current vs Goal */}
                          <div className="mb-3">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCalculatedMetric(
                                metric.currentValue,
                                metric.type
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              of{" "}
                              {formatCalculatedMetric(
                                metric.goalValue,
                                metric.type
                              )}{" "}
                              goal
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colorClasses[progressColor]} transition-all duration-300`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Progress Percentage */}
                          <div className="text-xs text-gray-600 text-right">
                            {progress.toFixed(1)}% complete
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <PerformanceSummary metrics={filteredMetrics} />
      </div>

      {/* Goals Settings Modal */}
      {canEditGoals && targetClientId && (
        <GoalsSettingsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clientId={targetClientId}
          currentGoals={goals}
          userId={userId}
          onSave={handleGoalsSaved}
        />
      )}
    </>
  );
};

