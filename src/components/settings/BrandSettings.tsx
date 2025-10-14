import React, { useState, useEffect } from 'react';
import { useBrand } from '../../contexts/BrandContext';
import { BrandConfig } from '../../config/branding';
import { logger } from '../../lib/logger';
import {
  Save,
  RefreshCw,
  Palette,
  Building2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export const BrandSettings: React.FC = () => {
  const {
    brandConfig,
    updateBrandConfig,
    resetToDefault,
    refreshBrandConfig,
    isLoading,
  } = useBrand();
  const [activeTab, setActiveTab] = useState<"company" | "colors">("company");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [showToast, setShowToast] = useState(false);
  const [localConfig, setLocalConfig] = useState(brandConfig);

  // Sync local config with brand config when it changes
  useEffect(() => {
    setLocalConfig(brandConfig);
  }, [brandConfig]);

  const handleInputChange = (field: keyof BrandConfig, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      // Save all changes from localConfig
      const updates: Partial<BrandConfig> = {
        companyName: localConfig.companyName || "",
        applicationName: localConfig.applicationName || "",
        supportEmail: localConfig.supportEmail || "",
        primaryColor: localConfig.primaryColor,
        secondaryColor: localConfig.secondaryColor,
        accentColor: localConfig.accentColor,
        textColor: localConfig.textColor,
        ui: localConfig.ui,
      };

      await updateBrandConfig(updates);
      setSaveStatus("saved");
      setShowToast(true);
      setTimeout(() => {
        setSaveStatus("idle");
        setShowToast(false);
      }, 3000);
      logger.info("🎨 Brand settings saved successfully");
    } catch (error) {
      setSaveStatus("error");
      setShowToast(true);
      setTimeout(() => {
        setSaveStatus("idle");
        setShowToast(false);
      }, 5000);
      logger.error("❌ Failed to save brand settings:", error);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all branding to default values?"
      )
    ) {
      resetToDefault();
      logger.info("🎨 Brand settings reset to default");
    }
  };

  const updateConfig = (updates: Partial<BrandConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
  };

  // Helper function to ensure proper hex color format
  const normalizeHexColor = (color: string): string => {
    if (!color) return "#000000";
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return (
          "#" +
          hex
            .split("")
            .map((char) => char + char)
            .join("")
        );
      }
      if (hex.length === 6) {
        return color;
      }
    }
    return "#000000";
  };

  const tabs = [
    { id: "company", label: "Company & Text", icon: Building2 },
    { id: "colors", label: "Colors & Styling", icon: Palette },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Company & Text Settings */}
      {activeTab === "company" && (
        <div className="space-y-8">
          {/* Company Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Company Information
              </h3>
              <p className="text-gray-600">
                Company information used in legal documents, privacy policy, and
                terms of service
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={localConfig.companyName || ""}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Acme Analytics LLC"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Legal company name used in privacy policy, terms, and legal
                  documents
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Support Email *
                </label>
                <input
                  type="email"
                  value={localConfig.supportEmail || ""}
                  onChange={(e) =>
                    handleInputChange("supportEmail", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="support@acmeanalytics.com"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Used in privacy policy, terms, and contact support pages
                </p>
              </div>
            </div>
          </div>

          {/* Application Branding */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Application Branding
              </h3>
              <p className="text-gray-600">
                Application branding shown to users in the interface
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Application Name *
                </label>
                <input
                  type="text"
                  value={localConfig.applicationName || ""}
                  onChange={(e) =>
                    handleInputChange("applicationName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="DataViz Pro"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Application name shown in sidebar and browser titles
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Login Title
                </label>
                <input
                  type="text"
                  value={localConfig.ui?.loginTitle || ""}
                  onChange={(e) =>
                    updateConfig({
                      ui: { ...localConfig.ui, loginTitle: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Welcome to Dashboard"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Title shown on login page and in headers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Welcome Message
                </label>
                <input
                  type="text"
                  value={localConfig.ui?.welcomeMessage || ""}
                  onChange={(e) =>
                    updateConfig({
                      ui: { ...localConfig.ui, welcomeMessage: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Welcome to your dashboard"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Welcome message shown to users after login
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colors & Styling Settings */}
      {activeTab === "colors" && (
        <div className="space-y-8">
          {/* Color Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Color Preview
              </h3>
              <p className="text-gray-600">
                See how your color scheme will appear throughout the application
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Dashboard Header Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Dashboard Header Gradient
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="px-6 py-6 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${
                        localConfig.primaryColor || "#7B61FF"
                      }, ${localConfig.secondaryColor || "#00FFB2"})`,
                    }}
                  >
                    <h1 className="text-xl font-bold">
                      {localConfig.applicationName || "Dashboard"}
                    </h1>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Uses Primary and Secondary colors for the gradient background
                </p>
              </div>

              {/* Button Preview */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Button Colors
                </h4>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="space-y-4">
                    <button
                      className="px-6 py-3 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: localConfig.primaryColor || "#7B61FF",
                        color: localConfig.textColor || "#FFFFFF",
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-6 py-3 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor:
                          localConfig.secondaryColor || "#00FFB2",
                        color: localConfig.textColor || "#000000",
                      }}
                    >
                      Secondary Button
                    </button>
                    <button
                      className="px-6 py-3 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        backgroundColor: localConfig.accentColor || "#F3C969",
                        color: localConfig.textColor || "#000000",
                      }}
                    >
                      Accent Button
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Button colors with text color support
                </p>
              </div>
            </div>
          </div>

          {/* Color Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Color Configuration
              </h3>
              <p className="text-gray-600">
                Configure the color scheme for your dashboard
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Primary Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={normalizeHexColor(localConfig.primaryColor)}
                    onChange={(e) =>
                      updateConfig({ primaryColor: e.target.value })
                    }
                    className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.primaryColor || ""}
                    onChange={(e) =>
                      updateConfig({
                        primaryColor: normalizeHexColor(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="#7B61FF"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Main brand color used in headers and primary buttons
                </p>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={normalizeHexColor(localConfig.secondaryColor)}
                    onChange={(e) =>
                      updateConfig({ secondaryColor: e.target.value })
                    }
                    className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.secondaryColor || ""}
                    onChange={(e) =>
                      updateConfig({
                        secondaryColor: normalizeHexColor(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="#00FFB2"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Secondary brand color used in gradients and secondary buttons
                </p>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Accent Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={normalizeHexColor(localConfig.accentColor)}
                    onChange={(e) =>
                      updateConfig({ accentColor: e.target.value })
                    }
                    className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.accentColor || ""}
                    onChange={(e) =>
                      updateConfig({
                        accentColor: normalizeHexColor(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="#F3C969"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Accent color used for highlights and accent buttons
                </p>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Text Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={normalizeHexColor(localConfig.textColor)}
                    onChange={(e) =>
                      updateConfig({ textColor: e.target.value })
                    }
                    className="w-16 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.textColor || ""}
                    onChange={(e) =>
                      updateConfig({
                        textColor: normalizeHexColor(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="#FFFFFF"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Text color used for buttons and sidebar company name
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={async () => {
              await handleReset();
              await refreshBrandConfig();
            }}
            className="flex items-center space-x-2 px-6 py-3 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
          >
            <RefreshCw size={18} />
            <span>Reset to Default</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={isLoading || saveStatus === "saving"}
            className={`px-8 py-3 rounded-lg font-medium text-sm flex items-center gap-3 transition-colors ${
              saveStatus === "saved"
                ? "bg-green-600 text-white hover:bg-green-700"
                : saveStatus === "error"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            }`}
          >
            {saveStatus === "saving" && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saveStatus === "saved" && <CheckCircle size={18} />}
            {saveStatus === "error" && <AlertCircle size={18} />}
            {saveStatus === "idle" && <Save size={18} />}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Settings Saved!"}
            {saveStatus === "error" && "Save Failed"}
            {saveStatus === "idle" && "Save Settings"}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
              saveStatus === "saved"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {saveStatus === "saved" ? (
              <>
                <CheckCircle size={24} />
                <span className="font-medium">
                  Brand settings saved successfully!
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={24} />
                <span className="font-medium">
                  Failed to save brand settings. Please try again.
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};