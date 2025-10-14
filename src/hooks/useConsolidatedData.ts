import { useMemo, useEffect, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useBrand } from "../contexts/BrandContext";
import { useFilters } from "../contexts/FilterContext";
import { usePermissions } from "../contexts/PermissionContext";
import { logger } from "../lib/logger";

/**
 * Consolidated hook that provides access to all context data
 * This is the single source of truth for accessing app state
 * Applies filters client-side to dashboard data
 */
export const useConsolidatedData = () => {
  const app = useApp();
  const auth = useAuth();
  const brand = useBrand();
  const filters = useFilters();

  // When dashboard data loads, populate FilterContext with available sheets
  // This ensures FilterContext uses already-loaded data instead of making new Supabase calls
  // Use ref to track initialization to prevent infinite loop
  const sheetsInitializedRef = useRef(false);

  useEffect(() => {
    if (app.dashboardData?.metrics && !sheetsInitializedRef.current) {
      logger.debug(
        "🔄 useConsolidatedData: Dashboard data available, updating FilterContext sheets"
      );
      filters.refreshAvailableSheetsFromData(app.dashboardData);
      sheetsInitializedRef.current = true;
    }
  }, [app.dashboardData, filters]);

  // Try to get permissions, but don't fail if PermissionContext is not available
  let permissions = null;
  try {
    permissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue without it
  }

  // Apply filters to metrics data (client-side filtering)
  const filteredDashboardData = useMemo(() => {
    if (!app.dashboardData) return null;

    const { metrics, ...rest } = app.dashboardData;
    if (!metrics || metrics.length === 0) return app.dashboardData;

    // Apply sheet filter
    let filteredMetrics = metrics;
    if (filters.state.selectedSheets.size > 0) {
      filteredMetrics = filteredMetrics.filter(
        (metric: any) =>
          metric.sheet_name &&
          filters.state.selectedSheets.has(metric.sheet_name)
      );
    }

    // Apply category filter
    if (filters.state.selectedMetricCategories.size > 0) {
      filteredMetrics = filteredMetrics.filter(
        (metric: any) =>
          metric.category &&
          filters.state.selectedMetricCategories.has(metric.category)
      );
    }

    // Apply date filter would go here if needed
    // For now, date filtering is handled by time frame in display components

    return {
      ...rest,
      metrics: filteredMetrics,
    };
  }, [
    app.dashboardData,
    filters.state.selectedSheets,
    filters.state.selectedMetricCategories,
  ]);

  return {
    // App data (consolidated from AppContext and DataContext)
    app,

    // Auth data
    auth,

    // Brand data
    brand,

    // Filter data
    filters,

    // Permission data (if available)
    permissions,

    // Convenience accessors
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading || app.loading || permissions?.loading || false,
    error: app.error || permissions?.error,

    // Dashboard data (filtered)
    dashboardData: filteredDashboardData,

    // Navigation
    activeSection: app.activeSection,
    selectedClient: app.selectedClient,
    activeTab: app.activeTab,

    // Database status
    databaseStatus: app.databaseStatus,
    isDatabaseConfigured: app.isDatabaseConfigured,

    // Permission helpers (if available)
    hasPermission: permissions?.hasPermission || (() => false),
    canAccessClient: permissions?.canAccessClient || (() => false),
    isGlobalAdmin: permissions?.isGlobalAdmin || false,
    accessibleClients: permissions?.accessibleClients || [],

    // Actions
    refreshDashboardData: app.refreshDashboardData,
    clearCache: app.clearCache,
    setActiveSection: app.setActiveSection,
    setSelectedClient: app.setSelectedClient,
    setActiveTab: app.setActiveTab,
    refreshPermissions: permissions?.refresh || (() => Promise.resolve()),
  };
};
