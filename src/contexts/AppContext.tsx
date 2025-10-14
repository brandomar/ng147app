/**
 * App Context
 * Only loads essential data on mount, other data loaded conditionally
 */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { logger } from '../lib/logger';
import { useAuth } from './AuthContext';
import { useGlobalPermissions } from '../hooks/useGlobalPermissions';
import { checkDatabaseStatus } from '../lib/databaseStatus';
import { Client, ClientTab } from '../types';

interface AppState {
  // Navigation
  activeSection: 'admin' | 'client' | 'manage-clients' | 'user-management';
  selectedClient: Client | null;
  activeTab: string;
  
  // Essential data only (loaded on mount)
  databaseStatus: any;
  isDatabaseConfigured: boolean;
  user: any; // Add user to the context
  
  // Conditional data (loaded only when needed)
  clientsCache: Client[];
  clientTabsCache: Map<string, ClientTab[]>;
  dashboardData: any;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  setActiveSection: (section: string) => void;
  setSelectedClient: (client: Client | null) => void;
  setActiveTab: (tab: string) => void;
  loadClients: () => Promise<void>;
  loadClientTabs: (clientId: string) => Promise<void>;
  loadDashboardData: () => Promise<void>;
  refreshDashboardData: () => Promise<void>;
  clearCache: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const permissions = useGlobalPermissions();

  // Navigation state
  const [activeSection, setActiveSection] = useState<string>("admin");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Essential data (loaded on mount)
  const [databaseStatus, setDatabaseStatus] = useState<any>(null);
  const [isDatabaseConfigured, setIsDatabaseConfigured] = useState(false);

  // Conditional data (loaded only when needed)
  const [clientsCache, setClientsCache] = useState<Client[]>([]);
  const [clientTabsCache, setClientTabsCache] = useState<
    Map<string, ClientTab[]>
  >(new Map());
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ALL data on mount (Single Source of Truth)
  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        // Load essential data: database status
        const dbStatus = await checkDatabaseStatus(user.id);
        setDatabaseStatus(dbStatus);
        setIsDatabaseConfigured(dbStatus.isConfigured);

        // Load dashboard data via optimized loader
        const { optimizedDataLoader } = await import(
          "../lib/optimizedDataLoader"
        );
        const result = await optimizedDataLoader.loadDashboardData(
          user.id,
          selectedClient?.id
        );

        if (result) {
          setDashboardData(result);
          logger.debug("✅ All data loaded on mount", {
            isConfigured: dbStatus.isConfigured,
            userId: user.id,
            metricsCount: result.metrics?.length || 0,
          });
        }
      } catch (err) {
        logger.error("❌ Failed to load data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user?.id, selectedClient?.id]);

  // Load clients only when management section is active
  const loadClients = useCallback(async () => {
    if (!user?.id || !permissions.isStaff) return;

    setLoading(true);
    setError(null);

    try {
      // Dynamic import to avoid loading unless needed
      const { getClients } = await import("../lib/database");
      const { data, error } = await getClients();
      if (error) throw error;

      setClientsCache(data || []);
      logger.debug("✅ Clients loaded (conditional)", {
        count: data?.length || 0,
      });
    } catch (err) {
      logger.error("❌ Failed to load clients:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, permissions.isStaff]);

  // Load client tabs only when a specific client is selected
  const loadClientTabs = useCallback(
    async (clientId: string) => {
      if (!user?.id || !clientId) return;

      setLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid loading unless needed
        const { getClientTabs } = await import("../lib/database");
        const { data, error } = await getClientTabs(clientId);
        if (error) throw error;

        setClientTabsCache((prev) => new Map(prev.set(clientId, data || [])));
        logger.debug("✅ Client tabs loaded (conditional)", {
          clientId,
          count: data?.length || 0,
        });
      } catch (err) {
        logger.error("❌ Failed to load client tabs:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Load dashboard data only when dashboard is active
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Dynamic import to avoid loading unless needed
      const { getOptimizedDashboardData } = await import("../lib/database");
      const { data, error } = await getOptimizedDashboardData(
        user.id,
        selectedClient?.id
      );
      if (error) throw error;

      setDashboardData(data);
      logger.debug("✅ Dashboard data loaded (conditional)", {
        hasData: !!data,
        clientId: selectedClient?.id,
      });
    } catch (err) {
      logger.error("❌ Failed to load dashboard data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedClient?.id]);

  // Refresh dashboard data (invalidate cache and reload)
  const refreshDashboardData = useCallback(async () => {
    if (!user?.id) return;

    logger.info("🔄 Refreshing dashboard data...");
    setLoading(true);
    setError(null);

    try {
      const { optimizedDataLoader } = await import(
        "../lib/optimizedDataLoader"
      );

      // Invalidate cache first
      const cacheKey = `dashboard_${user.id}_${selectedClient?.id || "staff"}`;
      optimizedDataLoader.invalidateCache(cacheKey);

      // Reload data
      const result = await optimizedDataLoader.loadDashboardData(
        user.id,
        selectedClient?.id
      );

      if (result) {
        setDashboardData(result);
        logger.info("✅ Dashboard data refreshed", {
          metricsCount: result.metrics?.length || 0,
          clientId: selectedClient?.id,
        });
      }
    } catch (err) {
      logger.error("❌ Failed to refresh dashboard data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedClient?.id]);

  // Clear cache when user changes
  useEffect(() => {
    if (!user?.id) {
      setClientsCache([]);
      setClientTabsCache(new Map());
      setDashboardData(null);
    }
  }, [user?.id]);

  const clearCache = useCallback(() => {
    setClientsCache([]);
    setClientTabsCache(new Map());
    setDashboardData(null);
    logger.debug("🧹 App cache cleared");
  }, []);

  const value: AppState = {
    // Navigation
    activeSection: activeSection as any,
    selectedClient,
    activeTab,

    // Essential data
    databaseStatus,
    isDatabaseConfigured,
    user, // Add user to the context value

    // Conditional data
    clientsCache,
    clientTabsCache,
    dashboardData,

    // Loading States
    loading,
    error,

    // Actions
    setActiveSection,
    setSelectedClient,
    setActiveTab,
    loadClients,
    loadClientTabs,
    loadDashboardData,
    refreshDashboardData,
    clearCache,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};