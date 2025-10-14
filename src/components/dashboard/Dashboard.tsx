import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Building2, X, FileText, AlertCircle, Filter, Eye } from "lucide-react";
import { Client } from "../../types";
import { MetricsDisplay } from "../shared/MetricsDisplay";
import { DateFilter } from "../shared/DateFilter";
import { HierarchicalSheetSelector } from "../shared/HierarchicalSheetSelector";
import { MetricsViewer } from "../shared/MetricsViewer";
import { UnifiedFilterControls } from "../shared/UnifiedFilterControls";
import { SetupGuidance, useSetupGuidance } from "../shared/SetupGuidance";
import { ProjectionsPacingSection } from "../shared/ProjectionsPacingSection";
// DatabaseStatusBanner removed
// TaskQueueDisplay removed - no longer needed
// OverviewTab removed - functionality consolidated into Dashboard
import {
  getHierarchicalDataStructure,
  getStaffMetricConfigurations,
} from "../../lib/database";
import { getMetricConfigurations } from "../../lib/whitelabelDatabase";
import { logger } from "../../lib/logger";
// useTaskQueue removed - no longer needed
import { useFilters } from "../../contexts/FilterContext";
import { useGlobalPermissions } from "../../hooks/useGlobalPermissions";
import { useBrand } from "../../contexts/BrandContext";
import { useConsolidatedData } from "../../hooks/useConsolidatedData";
import {
  ensureUndeniableUsesDynamicSync,
  ensureClientUsesDynamicSync,
} from "../../lib/migration";

interface DashboardProps {
  userId: string;
  client?: Client; // Optional - only for client users
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, client }) => {
  const permissions = useGlobalPermissions();
  const { brandConfig, isLoading: brandLoading } = useBrand();
  const { issues } = useSetupGuidance();
  const { refreshDashboardData } = useConsolidatedData();
  // No tabs needed - single overview page
  const [metricsRefreshTrigger, setMetricsRefreshTrigger] = useState(0);

  // Filter system (for undeniable users)
  const {
    state: filterState,
    setSheets,
    openSheetSelector,
    closeSheetSelector,
    resetToDefaults,
    getActiveFiltersCount,
  } = useFilters();

  // Hierarchical system state (for undeniable users)
  const [hierarchicalData, setHierarchicalData] = useState<any[]>([]);

  // Track selected tabs for persistence
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);

  // Load selected tabs from localStorage on mount
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem("selected_tabs");
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        setSelectedTabs(parsedTabs);
        // Removed debug logging to reduce clutter
      }
    } catch (error) {
      logger.warn("⚠️ Error loading selected tabs from localStorage:", error);
    }
  }, []);

  // Save selected tabs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem("selected_tabs", JSON.stringify(selectedTabs));
      // Removed debug logging to reduce clutter
    } catch (error) {
      logger.warn("⚠️ Error saving selected tabs to localStorage:", error);
    }
  }, [selectedTabs]);

  // Get current selection from hierarchical data - memoized to prevent re-renders
  const currentSelection = useMemo(() => {
    if (!hierarchicalData || hierarchicalData.length === 0) {
      return { clients: [], sheets: [], tabs: [] };
    }

    // Get the first client from hierarchical data (the configured client)
    const configuredClient = hierarchicalData[0];
    if (!configuredClient) {
      return { clients: [], sheets: [], tabs: [] };
    }

    // Get selected sheets from FilterContext (preferred) or DashboardContext (fallback)
    const selectedSheets = Array.from(filterState.selectedSheets);

    // Get selected tabs from the configured client's sheets
    const selectedTabsFromHierarchy = [];
    if (configuredClient.sheets) {
      for (const sheet of configuredClient.sheets) {
        if (selectedSheets.includes(sheet.name) && sheet.tabs) {
          for (const tab of sheet.tabs) {
            if (tab.isSelected) {
              selectedTabsFromHierarchy.push(tab.name);
            }
          }
        }
      }
    }

    const result = {
      clients: [configuredClient.name], // Use the configured client from hierarchical data
      sheets: selectedSheets,
      tabs:
        selectedTabsFromHierarchy.length > 0
          ? selectedTabsFromHierarchy
          : selectedTabs,
    };

    // DEBUG: Log the current selection
    logger.debug("🔍 Current Selection:", {
      hierarchicalDataLength: hierarchicalData.length,
      configuredClient: configuredClient?.name,
      configuredClientSpreadsheets: configuredClient?.sheets?.length,
      selectedSpreadsheets: selectedSheets,
      selectedWorksheetsFromHierarchy: selectedTabsFromHierarchy,
      selectedWorksheets: selectedTabs,
      result,
    });

    return result;
  }, [hierarchicalData, filterState.selectedSheets, selectedTabs]);
  const [, setLoading] = useState(false);

  // Task queue removed - no longer needed

  // Configured metrics state
  const [, setConfiguredMetrics] = useState<any[]>([]);

  // Load hierarchical data for undeniable users
  const loadHierarchicalData = useCallback(async () => {
    if (permissions.loading || !permissions.isAdmin) return;

    try {
      setLoading(true);
      const { data, error } = await getHierarchicalDataStructure(userId);
      if (error) throw error;

      // DEBUG: Log the hierarchical data structure
      logger.debug("🔍 Hierarchical Data Structure:", {
        dataLength: data?.length || 0,
        data: data,
        firstClient: data?.[0],
        firstClientSpreadsheets: data?.[0]?.sheets,
        firstClientWorksheets: (data?.[0]?.sheets?.[0] as any)?.tabs || [],
      });

      setHierarchicalData(data || []);
    } catch (error) {
      logger.error("❌ Error loading hierarchical data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, permissions.isAdmin]);

  // No tab handling needed - single overview page

  // Load configured metrics
  const loadConfiguredMetrics = useCallback(async () => {
    if (permissions.loading) return;

    try {
      if (permissions.isAdmin) {
        const { data, error } = await getStaffMetricConfigurations(userId);
        if (error) throw error;
        setConfiguredMetrics(data || []);
      } else if (permissions.isClient && client) {
        // For client users, we'll load metrics through the normal flow
        setConfiguredMetrics([]);
      }
    } catch (error) {
      logger.error("❌ Error loading configured metrics:", error);
      setConfiguredMetrics([]);
    }
  }, [userId, permissions.isAdmin, permissions.isClient, client]);

  // Initialize dashboard based on role
  useEffect(() => {
    const initializeDashboard = async () => {
      // Wait for permissions to finish loading before initializing
      if (userId && !permissions.loading) {
        try {
          if (permissions.isAdmin) {
            // Initialize undeniable dashboard
            await loadConfiguredMetrics();
            await ensureUndeniableUsesDynamicSync(userId);

            // No default sheet selection - let user configure sheets
          } else if (permissions.isClient && client) {
            // Initialize client dashboard
            await ensureClientUsesDynamicSync(client.id);
          }

          logger.debug("✅ Unified dashboard initialization completed", {
            role: permissions.role,
            clientId: client?.id,
          });
        } catch (error) {
          logger.error("❌ Dashboard initialization failed:", error);
        }
      }
    };

    initializeDashboard();
  }, [
    userId,
    permissions.role,
    permissions.loading,
    permissions.isAdmin,
    permissions.isClient,
    client?.id,
    loadConfiguredMetrics,
  ]);

  // Load hierarchical data on dashboard initialization for undeniable users
  useEffect(() => {
    if (!permissions.loading && permissions.isAdmin) {
      loadHierarchicalData();
    }
  }, [permissions.isAdmin, permissions.loading]); // Removed loadHierarchicalData to prevent loop

  // Listen for sync completion events to reload all dashboard data
  useEffect(() => {
    const handleSyncCompleted = () => {
      if (permissions.isAdmin) {
        logger.info("🔄 Dashboard: Sync completed, refreshing all data");
        // Reload hierarchical structure
        loadHierarchicalData();

        // Refresh dashboard data from AppContext (metrics, clients, etc.)
        refreshDashboardData();

        // Trigger metrics refresh in child components
        setMetricsRefreshTrigger((prev) => prev + 1);
      }
    };

    const handleReloadHierarchicalData = () => {
      if (permissions.isAdmin) {
        logger.info("🔄 Dashboard: Reloading hierarchical data from sync");
        loadHierarchicalData();
        // Also trigger metrics refresh
        refreshDashboardData();
        setMetricsRefreshTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener("dashboard-sync-completed", handleSyncCompleted);
    window.addEventListener(
      "reload-hierarchical-data",
      handleReloadHierarchicalData
    );

    return () => {
      window.removeEventListener(
        "dashboard-sync-completed",
        handleSyncCompleted
      );
      window.removeEventListener(
        "reload-hierarchical-data",
        handleReloadHierarchicalData
      );
    };
  }, [loadHierarchicalData, permissions.isAdmin, refreshDashboardData]);

  // No tabs needed - single overview page

  // Render content - single overview page
  const renderContent = () => {
    // Role-based content rendering
    if (permissions.isAdmin) {
      return renderUndeniableContent();
    } else if (permissions.isClient && client) {
      return renderClientContent();
    } else {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Access
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have access to any client data.
            </p>
          </div>
        </div>
      );
    }
  };

  // Render undeniable user content
  const renderUndeniableContent = () => {
    if (filterState.availableSheets.size === 0) {
      return (
        <div className="flex items-center justify-center min-h-64">
          <div className="w-full max-w-2xl">
            {/* Setup Guidance as main content instead of "No Google Sheets Configured" */}
            <SetupGuidance
              issues={issues}
              onDismiss={(issueId) => {
                logger.debug("🔧 Setup guidance dismissed:", issueId);
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <UnifiedFilterControls
          className="bg-white rounded-lg shadow-sm border p-4"
          showSummary={true}
          showClearAll={false}
          showActiveCount={true}
        />
        <ProjectionsPacingSection userId={userId} />
        <MetricsDisplay
          userId={userId}
          refreshTrigger={metricsRefreshTrigger}
          selectedTabs={selectedTabs}
        />
      </div>
    );
  };

  // Render client user content
  const renderClientContent = () => {
    if (!client) return null;

    return (
      <div className="space-y-6">
        <ProjectionsPacingSection userId={userId} clientId={client.id} />
        <MetricsDisplay
          userId={userId}
          clientId={client.id}
          selectedTabs={selectedTabs}
        />
      </div>
    );
  };

  // Show loading state while brand config is loading
  if (brandLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading state while permissions are loading
  if (permissions.loading) {
    logger.debug("🔄 Dashboard: Showing loading screen", {
      permissionsLoading: permissions.loading,
      role: permissions.role,
      error: permissions.error,
    });
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Render based on role - restore original UI structure
  if (permissions.isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-100">
        {/* Container with equal width margins */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with padding from top */}
          <div className="pt-6">
            <div className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint border-b rounded-t-xl">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">
                    {brandConfig.applicationName} Dashboard
                  </h1>

                  <div className="flex items-center space-x-6">
                    {/* Data Points Counter - Removed orphaned metricsCount reference */}

                    {/* Reset to Defaults Button - resets all filters, sheets, metrics, and date to All Time */}
                    <button
                      onClick={resetToDefaults}
                      className="flex items-center justify-center p-2 text-gray-900 hover:text-black hover:bg-white/10 rounded-lg transition-all duration-200 group relative"
                      title="Reset to Defaults"
                    >
                      <div className="relative">
                        <Filter className="h-4 w-4 text-gray-900 group-hover:text-black" />
                        <X className="h-3 w-3 text-gray-900 group-hover:text-black absolute -top-1 -right-1" />
                      </div>
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        Reset to Defaults (All Time, All Sheets, All Metrics)
                      </div>
                    </button>

                    {/* Date Filter with header variant */}
                    <DateFilter variant="header" />

                    <button
                      onClick={() => {
                        logger.debug(
                          "Opening sheet selector, current state:",
                          filterState.isSheetSelectorOpen
                        );
                        openSheetSelector();
                      }}
                      className="flex items-center justify-center p-2 text-gray-900 hover:text-black hover:bg-white/10 rounded-lg transition-all duration-200 group relative"
                      title="Sheet Selector"
                    >
                      <FileText className="h-4 w-4 text-gray-900 group-hover:text-black" />
                      {/* Tooltip */}
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        Sheet Selector
                      </div>
                    </button>

                    {/* Metrics Viewer */}
                    <MetricsViewer
                      variant="dropdown"
                      clientId={undefined} // Undeniable users don't have a specific client
                      userId={userId}
                      onConfigurationComplete={() => {
                        setMetricsRefreshTrigger((prev) => prev + 1);
                      }}
                      buttonIcon={
                        <Eye className="h-4 w-4 text-gray-900 group-hover:text-black" />
                      }
                      buttonClassName="flex items-center justify-center p-2 text-gray-900 hover:text-black hover:bg-white/10 rounded-lg transition-all duration-200 group relative"
                      buttonText=""
                    />
                  </div>
                </div>
                {/* Single Overview Page - No tabs needed */}
              </div>
            </div>
          </div>

          {/* Database Status Banner removed per UX: show only empty sheets state */}

          {/* Content with same container width */}
          <div className="py-6">{renderContent()}</div>
        </div>

        {/* Undeniable-specific components */}
        {filterState.isSheetSelectorOpen && (
          <HierarchicalSheetSelector
            isOpen={filterState.isSheetSelectorOpen}
            onClose={closeSheetSelector}
            onSelectionChange={(selected) => {
              // Update FilterContext (for UnifiedMetricsDisplay)
              setSheets(new Set(selected.sheets), new Set(selected.sheets));

              // Update hierarchical data to reflect selections
              setHierarchicalData((prevData) => {
                if (!prevData || prevData.length === 0) return prevData;

                return prevData.map((client) => {
                  // Keep client selected if it was previously selected, even if no sheets are selected
                  const wasClientSelected = client.isSelected;
                  const isClientInSelection = selected.clients.includes(
                    client.name
                  );

                  return {
                    ...client,
                    // Keep client selected if it was previously selected OR if it's in the new selection
                    isSelected: wasClientSelected || isClientInSelection,
                    sheets:
                      client.sheets?.map((sheet: any) => ({
                        ...sheet,
                        isSelected: selected.sheets.includes(sheet.name),
                        tabs: sheet.tabs?.map((tab: any) => ({
                          ...tab,
                          isSelected: selected.tabs.includes(tab.name),
                        })),
                      })) || [],
                  };
                });
              });

              setSelectedTabs(selected.tabs); // Track selected tabs for persistence
            }}
            clients={hierarchicalData}
            currentSelection={{
              clients: currentSelection.clients,
              sheets: currentSelection.sheets,
              tabs: currentSelection.tabs,
            }}
          />
        )}

        {/* TaskQueueDisplay removed - no longer needed */}
      </div>
    );
  } else if (permissions.isClient && client) {
    return (
      <div className="min-h-screen bg-neutral-100">
        {/* Container with equal width margins */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with padding from top */}
          <div className="pt-6">
            <div className="bg-gradient-to-r from-undeniable-violet to-undeniable-mint border-b rounded-t-xl">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">
                    {client.name} Dashboard
                  </h1>

                  <div className="flex items-center space-x-4">
                    {/* Date Filter with header variant */}
                    <DateFilter variant="header" />

                    {/* Metrics Viewer for client users */}
                    <MetricsViewer
                      variant="dropdown"
                      clientId={client.id}
                      userId={userId}
                      onConfigurationComplete={() => {
                        setMetricsRefreshTrigger((prev) => prev + 1);
                      }}
                      buttonIcon={
                        <Eye className="h-4 w-4 text-gray-900 group-hover:text-black" />
                      }
                      buttonClassName="flex items-center justify-center p-2 text-gray-900 hover:text-black hover:bg-white/10 rounded-lg transition-all duration-200 group relative"
                      buttonText=""
                    />
                  </div>
                </div>
                {/* Single Overview Page - No tabs needed */}
              </div>
            </div>
          </div>

          {/* Content with same container width */}
          <div className="py-6">{renderContent()}</div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Access</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have access to any client data.
          </p>
        </div>
      </div>
    );
  }
};
