import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { logger } from '../lib/logger';
import { trackCall } from '../lib/loopDetection';

// Filter Types
export type DateFilter = 'alltime' | 'yesterday' | '7days' | '14days' | '30days' | '90days' | '6months' | 'yearly';
export type MetricCategory = 
  | 'spend-revenue' 
  | 'cost-per-show' 
  | 'funnel-volume' 
  | 'funnel-conversion';

// Filter State Interface
export interface FilterState {
  // Sheet Filter
  selectedSheets: Set<string>;
  availableSheets: Set<string>;
  
  // Metric Category Filter
  selectedMetricCategories: Set<MetricCategory>;
  availableMetricCategories: Set<MetricCategory>;
  metricCategories: {[category: string]: string[]};
  
  // Date Filter
  dateFilter: DateFilter;
  
  // UI State
  isSheetSelectorOpen: boolean;
  isMetricConfigOpen: boolean;
  
  // Data State
  totalDataPoints: number;
  filteredDataPoints: number;
  isLoading: boolean;
  lastUpdated: Date | null;
  hasUserMadeSelection: boolean;
}

// Filter Actions
export type FilterAction =
  | { type: 'SET_SHEETS'; payload: { selected: Set<string>; available: Set<string> } }
  | { type: 'TOGGLE_SHEET'; payload: string }
  | { type: 'CLEAR_SHEETS' }
  | { type: 'SET_METRIC_CATEGORIES'; payload: { selected: Set<MetricCategory>; available: Set<MetricCategory> } }
  | { type: 'SET_METRIC_CATEGORIES_DATA'; payload: {[category: string]: string[]} }
  | { type: 'TOGGLE_METRIC_CATEGORY'; payload: MetricCategory }
  | { type: 'CLEAR_METRIC_CATEGORIES' }
  | { type: 'SET_DATE_FILTER'; payload: DateFilter }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SET_UI_STATE'; payload: { isSheetSelectorOpen?: boolean; isMetricConfigOpen?: boolean } }
  | { type: 'SET_DATA_STATE'; payload: { totalDataPoints: number; filteredDataPoints: number; isLoading: boolean } }
  | { type: 'MARK_USER_SELECTION' }
  | { type: 'RESET_TO_DEFAULTS' };

// Initial State
const initialState: FilterState = {
  selectedSheets: new Set(),
  availableSheets: new Set(),
  selectedMetricCategories: new Set(),
  availableMetricCategories: new Set(),
  metricCategories: {},
  dateFilter: 'alltime',
  isSheetSelectorOpen: false,
  isMetricConfigOpen: false,
  totalDataPoints: 0,
  filteredDataPoints: 0,
  isLoading: false,
  lastUpdated: null,
  hasUserMadeSelection: false, // Track if user has explicitly made a selection
};

// Filter Reducer
function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_SHEETS":
      // Auto-select all sheets if user hasn't made explicit selection
      const shouldAutoSelect =
        !state.hasUserMadeSelection &&
        action.payload.available.size > 0 &&
        state.selectedSheets.size === 0;

      return {
        ...state,
        selectedSheets: shouldAutoSelect
          ? action.payload.available
          : action.payload.selected,
        availableSheets: action.payload.available,
        lastUpdated: new Date(),
      };

    case "TOGGLE_SHEET":
      const newSelectedSheets = new Set(state.selectedSheets);
      if (newSelectedSheets.has(action.payload)) {
        newSelectedSheets.delete(action.payload);
      } else {
        newSelectedSheets.add(action.payload);
      }
      return {
        ...state,
        selectedSheets: newSelectedSheets,
        hasUserMadeSelection: true, // Mark that user made explicit choice
        lastUpdated: new Date(),
      };

    case "CLEAR_SHEETS":
      return {
        ...state,
        selectedSheets: new Set(),
        lastUpdated: new Date(),
      };

    case "SET_METRIC_CATEGORIES":
      return {
        ...state,
        selectedMetricCategories: action.payload.selected,
        availableMetricCategories: action.payload.available,
        lastUpdated: new Date(),
      };

    case "SET_METRIC_CATEGORIES_DATA":
      return {
        ...state,
        metricCategories: action.payload,
        lastUpdated: new Date(),
      };

    case "TOGGLE_METRIC_CATEGORY":
      const newSelectedCategories = new Set(state.selectedMetricCategories);
      const wasSelected = newSelectedCategories.has(action.payload);
      if (wasSelected) {
        newSelectedCategories.delete(action.payload);
      } else {
        newSelectedCategories.add(action.payload);
      }
      logger.debug("🔧 Filter: TOGGLE_METRIC_CATEGORY reducer", {
        category: action.payload,
        wasSelected,
        willBeSelected: !wasSelected,
        beforeCount: state.selectedMetricCategories.size,
        afterCount: newSelectedCategories.size,
        newSelected: Array.from(newSelectedCategories),
      });
      return {
        ...state,
        selectedMetricCategories: newSelectedCategories,
        hasUserMadeSelection: true, // Mark that user made explicit choice
        lastUpdated: new Date(),
      };

    case "CLEAR_METRIC_CATEGORIES":
      return {
        ...state,
        selectedMetricCategories: new Set(),
        lastUpdated: new Date(),
      };

    case "SET_DATE_FILTER":
      logger.essential("🕐 FilterContext: Date filter updated", {
        previousFilter: state.dateFilter,
        newFilter: action.payload,
        lastUpdated: state.lastUpdated,
      });
      return {
        ...state,
        dateFilter: action.payload,
        lastUpdated: new Date(),
      };

    case "CLEAR_ALL_FILTERS":
      return {
        ...state,
        selectedSheets: new Set(),
        selectedMetricCategories: new Set(),
        dateFilter: "alltime",
        lastUpdated: new Date(),
      };

    case "SET_UI_STATE":
      return {
        ...state,
        isSheetSelectorOpen:
          action.payload.isSheetSelectorOpen ?? state.isSheetSelectorOpen,
        isMetricConfigOpen:
          action.payload.isMetricConfigOpen ?? state.isMetricConfigOpen,
      };

    case "SET_DATA_STATE":
      logger.debug("🔧 Filter: SET_DATA_STATE reducer", {
        totalDataPoints: action.payload.totalDataPoints,
        filteredDataPoints: action.payload.filteredDataPoints,
        isLoading: action.payload.isLoading,
        previousTotal: state.totalDataPoints,
        previousFiltered: state.filteredDataPoints,
      });
      return {
        ...state,
        totalDataPoints: action.payload.totalDataPoints,
        filteredDataPoints: action.payload.filteredDataPoints,
        isLoading: action.payload.isLoading,
        lastUpdated: new Date(),
      };

    case "MARK_USER_SELECTION":
      return {
        ...state,
        hasUserMadeSelection: true,
        lastUpdated: new Date(),
      };

    case "RESET_TO_DEFAULTS":
      return {
        ...initialState,
        availableSheets: state.availableSheets,
        availableMetricCategories: state.availableMetricCategories,
      };

    default:
      return state;
  }
}

// Filter Context
const FilterContext = createContext<{
  state: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  // Sheet Actions
  setSheets: (selected: Set<string>, available: Set<string>) => void;
  toggleSheet: (sheetName: string) => void;
  clearSheets: () => void;
  // Metric Category Actions
  setMetricCategories: (
    selected: Set<MetricCategory>,
    available: Set<MetricCategory>
  ) => void;
  setMetricCategoriesData: (categories: {
    [category: string]: string[];
  }) => void;
  toggleMetricCategory: (category: MetricCategory) => void;
  clearMetricCategories: () => void;
  // Date Actions
  setDateFilter: (filter: DateFilter) => void;
  // UI Actions
  openSheetSelector: () => void;
  closeSheetSelector: () => void;
  openMetricConfig: () => void;
  closeMetricConfig: () => void;
  // Data Actions
  updateDataState: (total: number, filtered: number, loading: boolean) => void;
  refreshAvailableSheets: () => Promise<void>; // DEPRECATED - makes Supabase calls
  refreshAvailableSheetsFromData: (dashboardData: any) => void; // NEW - uses AppContext data
  // Utility Actions
  clearAllFilters: () => void;
  resetToDefaults: () => void;
  // Computed Properties
  getFilterSummary: () => string;
  getActiveFiltersCount: () => number;
} | null>(null);

// Global initialization flag to prevent multiple FilterContext initializations
let filterContextInitialized = false;

// Filter Provider
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Sheet Actions
  const setSheets = useCallback(
    (selected: Set<string>, available: Set<string>) => {
      dispatch({ type: "SET_SHEETS", payload: { selected, available } });
      logger.debug("🔧 Filter: Sheets updated", {
        selected: Array.from(selected),
        available: Array.from(available),
      });
    },
    []
  );

  const toggleSheet = useCallback((sheetName: string) => {
    dispatch({ type: "TOGGLE_SHEET", payload: sheetName });
    dispatch({ type: "MARK_USER_SELECTION" }); // Mark that user has made a selection
    logger.debug("🔧 Filter: Sheet toggled", { sheetName });
  }, []);

  const clearSheets = useCallback(() => {
    dispatch({ type: "CLEAR_SHEETS" });
    dispatch({ type: "MARK_USER_SELECTION" }); // Mark that user has made a selection
    logger.debug("🔧 Filter: Sheets cleared");
  }, []);

  // Metric Category Actions
  const setMetricCategories = useCallback(
    (selected: Set<MetricCategory>, available: Set<MetricCategory>) => {
      dispatch({
        type: "SET_METRIC_CATEGORIES",
        payload: { selected, available },
      });
      logger.debug("🔧 Filter: Metric categories updated", {
        selected: selected ? Array.from(selected) : [],
        available: available ? Array.from(available) : [],
      });
    },
    []
  );

  const setMetricCategoriesData = useCallback(
    (categories: { [category: string]: string[] }) => {
      dispatch({ type: "SET_METRIC_CATEGORIES_DATA", payload: categories });
      logger.debug("🔧 Filter: Metric categories data updated", {
        categories: Object.keys(categories),
        totalMetrics: Object.values(categories).flat().length,
      });
    },
    []
  );

  const toggleMetricCategory = useCallback(
    (category: MetricCategory) => {
      dispatch({ type: "TOGGLE_METRIC_CATEGORY", payload: category });
      logger.debug("🔧 Filter: Metric category toggled", {
        category,
        currentSelected: Array.from(state.selectedMetricCategories),
        willBeSelected: !state.selectedMetricCategories.has(category),
      });
    },
    [state.selectedMetricCategories]
  );

  const clearMetricCategories = useCallback(() => {
    dispatch({ type: "CLEAR_METRIC_CATEGORIES" });
    logger.debug("🔧 Filter: Metric categories cleared");
  }, []);

  // Date Actions
  const setDateFilter = useCallback((filter: DateFilter) => {
    dispatch({ type: "SET_DATE_FILTER", payload: filter });
    logger.debug("🔧 Filter: Date filter updated", { filter });
  }, []);

  // UI Actions
  const openSheetSelector = useCallback(() => {
    dispatch({ type: "SET_UI_STATE", payload: { isSheetSelectorOpen: true } });
  }, []);

  const closeSheetSelector = useCallback(() => {
    dispatch({ type: "SET_UI_STATE", payload: { isSheetSelectorOpen: false } });
  }, []);

  const openMetricConfig = useCallback(() => {
    dispatch({ type: "SET_UI_STATE", payload: { isMetricConfigOpen: true } });
  }, []);

  const closeMetricConfig = useCallback(() => {
    dispatch({ type: "SET_UI_STATE", payload: { isMetricConfigOpen: false } });
  }, []);

  // Data Actions
  const updateDataState = useCallback(
    (total: number, filtered: number, loading: boolean) => {
      logger.debug("🔧 Filter: updateDataState called", {
        total,
        filtered,
        loading,
      });
      dispatch({
        type: "SET_DATA_STATE",
        payload: {
          totalDataPoints: total,
          filteredDataPoints: filtered,
          isLoading: loading,
        },
      });
    },
    []
  );

  // Function to extract available sheets from already-loaded dashboard data
  // This DOES NOT make Supabase calls - it uses the data from AppContext
  const refreshAvailableSheetsFromData = useCallback(
    (dashboardData: any) => {
      try {
        logger.debug("🔄 Filter: Extracting sheets from dashboard data", {
          hasData: !!dashboardData,
          metricsCount: dashboardData?.metrics?.length || 0,
        });

        if (!dashboardData?.metrics || dashboardData.metrics.length === 0) {
          logger.info("🔄 Filter: No metrics in dashboard data yet");
          return;
        }

        // Extract unique sheet names from already-loaded metrics
        const availableSheets = Array.from(
          new Set(
            dashboardData.metrics
              .map((m: any) => m.sheet_name)
              .filter((name: string) => name != null && name !== "")
          )
        );

        if (availableSheets.length === 0) {
          logger.info("🔄 Filter: No sheets found in metrics");
          setSheets(new Set(), new Set());
          return;
        }

        // Only auto-select all sheets if this is the very first load AND user hasn't made any explicit selections
        const isVeryFirstLoad =
          state.availableSheets.size === 0 && !state.hasUserMadeSelection;
        const currentSelected = isVeryFirstLoad
          ? new Set(availableSheets)
          : state.selectedSheets;

        setSheets(currentSelected, new Set(availableSheets));

        logger.info(
          "🔄 Filter: Available sheets extracted from dashboard data",
          {
            availableSheets: availableSheets.length,
            selectedSheets: currentSelected.size,
            sheets: availableSheets,
          }
        );
      } catch (error) {
        logger.error(
          "❌ Filter: Failed to extract sheets from dashboard data",
          error
        );
      }
    },
    [
      setSheets,
      state.availableSheets.size,
      state.hasUserMadeSelection,
      state.selectedSheets,
    ]
  );

  // DEPRECATED: Old function that made direct Supabase calls
  // Kept for backwards compatibility but should not be used
  const refreshAvailableSheets = useCallback(async () => {
    logger.warn(
      "⚠️ refreshAvailableSheets() called - this makes direct Supabase calls and should be avoided"
    );
    logger.warn(
      "⚠️ Use refreshAvailableSheetsFromData() with AppContext data instead"
    );

    // Loop detection
    if (!trackCall("refreshAvailableSheets", 3)) {
      logger.warn("🚫 refreshAvailableSheets blocked due to loop detection");
      return;
    }

    try {
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        logger.warn("🔄 Filter: No user found, cannot refresh sheets");
        return;
      }

      const { data: metricsData, error } = await supabase
        .from("metrics")
        .select("sheet_name")
        .eq("user_id", user.id)
        .not("sheet_name", "is", null);

      if (error) {
        logger.error("❌ Filter: Failed to fetch available sheets", error);
        return;
      }

      if (metricsData && metricsData.length > 0) {
        const availableSheets = Array.from(
          new Set(metricsData.map((d: { sheet_name: string }) => d.sheet_name))
        );

        const isVeryFirstLoad =
          state.availableSheets.size === 0 && !state.hasUserMadeSelection;
        const currentSelected = isVeryFirstLoad
          ? new Set(availableSheets)
          : state.selectedSheets;

        setSheets(currentSelected, new Set(availableSheets));

        logger.info("🔄 Filter: Available sheets refreshed (from Supabase)", {
          availableSheets: availableSheets.length,
          selectedSheets: currentSelected.size,
          sheets: availableSheets,
        });
      } else {
        setSheets(new Set(), new Set());
      }
    } catch (error) {
      logger.error("❌ Filter: Failed to refresh available sheets", error);
    }
  }, [
    setSheets,
    state.availableSheets.size,
    state.hasUserMadeSelection,
    state.selectedSheets,
  ]);

  // REMOVED: No longer initialize sheets on mount
  // Sheets will be populated when AppContext loads dashboard data
  // and calls refreshAvailableSheetsFromData()
  useEffect(() => {
    if (!filterContextInitialized) {
      filterContextInitialized = true;
      logger.debug(
        "🚀 FilterContext: Initialized (sheets will be populated from AppContext data)"
      );
    }
  }, []);

  // Utility Actions
  const clearAllFilters = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_FILTERS" });
    logger.debug("🔧 Filter: All filters cleared");
  }, []);

  const resetToDefaults = useCallback(() => {
    // Reset to defaults: select all sheets, all categories, alltime date
    const allSheets = state.availableSheets;
    const allCategories = state.availableMetricCategories;

    dispatch({
      type: "SET_SHEETS",
      payload: { selected: allSheets, available: allSheets },
    });
    dispatch({
      type: "SET_METRIC_CATEGORIES",
      payload: { selected: allCategories, available: allCategories },
    });
    dispatch({ type: "SET_DATE_FILTER", payload: "alltime" });

    logger.debug("🔧 Filter: Reset to defaults", {
      sheets: Array.from(allSheets),
      categories: Array.from(allCategories),
    });
  }, [state.availableSheets, state.availableMetricCategories]);

  // Computed Properties
  const getFilterSummary = useCallback(() => {
    const sheetCount = state.selectedSheets.size;
    const categoryCount = state.selectedMetricCategories.size;
    const dateFilter = state.dateFilter;

    return `${sheetCount} sheets, ${categoryCount} categories, ${dateFilter}`;
  }, [
    state.selectedSheets.size,
    state.selectedMetricCategories.size,
    state.dateFilter,
  ]);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (state.selectedSheets?.size < state.availableSheets?.size) count++;
    if (
      state.selectedMetricCategories?.size <
      state.availableMetricCategories?.size
    )
      count++;
    if (state.dateFilter !== "alltime") count++;
    return count;
  }, [
    state.selectedSheets?.size,
    state.availableSheets?.size,
    state.selectedMetricCategories?.size,
    state.availableMetricCategories?.size,
    state.dateFilter,
  ]);

  const value = {
    state,
    dispatch,
    setSheets,
    toggleSheet,
    clearSheets,
    setMetricCategories,
    setMetricCategoriesData,
    toggleMetricCategory,
    clearMetricCategories,
    setDateFilter,
    openSheetSelector,
    closeSheetSelector,
    openMetricConfig,
    closeMetricConfig,
    updateDataState,
    refreshAvailableSheets, // DEPRECATED - makes Supabase calls
    refreshAvailableSheetsFromData, // NEW - uses AppContext data
    clearAllFilters,
    resetToDefaults,
    getFilterSummary,
    getActiveFiltersCount,
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

// Filter Hook
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
