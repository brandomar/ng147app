import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandConfig } from '../config/branding';
import { logger } from '../lib/logger';
import { getBrandSettings, updateBrandSettings, resetBrandSettings } from '../lib/brandDatabase';
import { getDefaultBrandConfig } from "../lib/brandDefaults";

interface BrandContextType {
  brandConfig: BrandConfig;
  updateBrandConfig: (updates: Partial<BrandConfig>) => void;
  resetToDefault: () => void;
  refreshBrandConfig: () => void;
  isLoading: boolean;
  error: string | null;
  hasBrandSettings: boolean;
  needsSetup: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

interface BrandProviderProps {
  children: ReactNode;
  initialConfig?: Partial<BrandConfig>;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({
  children,
  initialConfig,
}) => {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(
    getDefaultBrandConfig()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasBrandSettings, setHasBrandSettings] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Load brand config from database
  const loadBrandConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug("🎨 Loading brand config from database");
      const { data, error: dbError } = await getBrandSettings();

      if (dbError) {
        // Handle specific error codes gracefully
        if (dbError.code === 'PGRST116' || dbError.message?.includes('0 rows')) {
          logger.debug("🎨 No brand settings found in database, using defaults");
          setHasBrandSettings(false);
          setNeedsSetup(true);
          // Keep default config
        } else {
          logger.warn(
            "⚠️ Failed to load brand config from database, using defaults:",
            dbError
          );
          setError("Failed to load brand settings from database");
          setHasBrandSettings(false);
          setNeedsSetup(true);
        }
      } else if (data) {
        logger.debug("🎨 Brand config loaded from database:", data);
        setBrandConfig(data);
        setHasBrandSettings(true);
        setNeedsSetup(false);
        // Save to localStorage for dynamicBranding.ts and other utilities
        try {
          localStorage.setItem('brand-config', JSON.stringify(data));
          logger.debug("🎨 Brand config saved to localStorage");
        } catch (e) {
          logger.warn("⚠️ Failed to save brand config to localStorage:", e);
        }
      } else {
        logger.debug("🎨 No brand config found in database, using defaults");
        setHasBrandSettings(false);
        setNeedsSetup(true);
        // Keep default config without creating database record
      }
    } catch (error) {
      logger.error("❌ Error loading brand config:", error);
      setError("Failed to load brand settings");
      setHasBrandSettings(false);
      setNeedsSetup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Load brand config from database on mount
  useEffect(() => {
    loadBrandConfig();
  }, []);

  const updateBrandConfig = async (updates: Partial<BrandConfig>) => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug("🎨 Updating brand config in database:", updates);
      const { data, error: dbError } = await updateBrandSettings(updates);

      if (dbError) {
        logger.error("❌ Failed to update brand config in database:", dbError);
        setError("Failed to save brand settings");
        return;
      }

      if (data) {
        setBrandConfig(data);
        setHasBrandSettings(true);
        setNeedsSetup(false);
        // Save to localStorage for dynamicBranding.ts and other utilities
        try {
          localStorage.setItem('brand-config', JSON.stringify(data));
          logger.debug("🎨 Brand config saved to localStorage");
        } catch (e) {
          logger.warn("⚠️ Failed to save brand config to localStorage:", e);
        }
        logger.info("🎨 Brand config updated successfully:", updates);
      }
    } catch (error) {
      logger.error("❌ Error updating brand config:", error);
      setError("Failed to save brand settings");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.debug("🎨 Resetting brand config to default in database");
      const { data, error: dbError } = await resetBrandSettings();

      if (dbError) {
        logger.error("❌ Failed to reset brand config in database:", dbError);
        setError("Failed to reset brand settings");
        return;
      }

      if (data) {
        setBrandConfig(data);
        setHasBrandSettings(true);
        setNeedsSetup(false);
        // Save to localStorage for dynamicBranding.ts and other utilities
        try {
          localStorage.setItem('brand-config', JSON.stringify(data));
          logger.debug("🎨 Brand config saved to localStorage");
        } catch (e) {
          logger.warn("⚠️ Failed to save brand config to localStorage:", e);
        }
        logger.info("🎨 Brand config reset to default successfully");
      }
    } catch (error) {
      logger.error("❌ Error resetting brand config:", error);
      setError("Failed to reset brand settings");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBrandConfig = () => {
    loadBrandConfig();
  };

  const value: BrandContextType = {
    brandConfig,
    updateBrandConfig,
    resetToDefault,
    refreshBrandConfig,
    isLoading,
    error,
    hasBrandSettings,
    needsSetup,
  };

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
};

