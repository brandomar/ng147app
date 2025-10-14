import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, X, AlertCircle, Trash2 } from 'lucide-react';
import { logger } from '../../lib/logger';
import { discoverGoogleSheetsTabs } from '../../lib/database';
import { usePermissions } from "../../contexts/PermissionContext";

interface GoogleSheetTab {
  name: string;
  gid: string;
  url: string;
}

interface DataSource {
  id: string;
  url: string;
  name: string;
  type: "google-sheets" | "excel";
  file?: File; // For Excel files
  tabs: GoogleSheetTab[];
  selectedTabs: GoogleSheetTab[];
}

interface MultiSheetSelectorProps {
  onSheetsChanged: (sheets: DataSource[]) => void;
  initialSheets?: DataSource[];
  disabled?: boolean;
  clientType?: "client" | "admin";
  supportedTypes?: ("google-sheets" | "excel")[];
  userId?: string;
  clientId?: string;
}

export const MultiSheetSelector: React.FC<MultiSheetSelectorProps> = ({
  onSheetsChanged,
  initialSheets = [],
  disabled = false,
  supportedTypes = ["google-sheets", "excel"],
  userId,
  clientId,
}) => {
  // Try to get new permission system, but don't fail if not available
  let newPermissions = null;
  try {
    newPermissions = usePermissions();
  } catch (error) {
    // PermissionContext not available, continue with legacy system
  }

  const [sheets, setSheets] = useState<DataSource[]>(initialSheets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSheet, setCurrentSheet] = useState<DataSource | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSheetForTabs, setSelectedSheetForTabs] =
    useState<DataSource | null>(null);

  useEffect(() => {
    onSheetsChanged(sheets);
  }, [sheets, onSheetsChanged]);

  // Update sheets when initialSheets change (e.g., when editing existing client)
  useEffect(() => {
    if (initialSheets.length > 0) {
      logger.debug("📊 Initial sheets updated:", {
        count: initialSheets.length,
        sheets: initialSheets.map((s) => ({
          name: s.name,
          selectedTabsCount: s.selectedTabs.length,
        })),
      });
      setSheets(initialSheets);
    }
  }, [initialSheets]);

  // Auto-discover tabs for existing sheets with URLs but no tabs
  useEffect(() => {
    const autoDiscoverTabs = async () => {
      for (const sheet of sheets) {
        if (
          sheet.type === "google-sheets" &&
          sheet.url &&
          sheet.tabs.length === 0
        ) {
          logger.debug(
            "🔍 Auto-discovering tabs for existing sheet:",
            sheet.url
          );
          try {
            await discoverTabs(sheet);
          } catch (error) {
            logger.error("Failed to auto-discover tabs:", error);
          }
        }
      }
    };

    if (sheets.length > 0) {
      autoDiscoverTabs();
    }
  }, [sheets]);

  // Auto-discover tabs when URL is entered for current sheet
  useEffect(() => {
    if (
      currentSheet &&
      currentSheet.type === "google-sheets" &&
      currentSheet.url &&
      currentSheet.tabs.length === 0
    ) {
      const timeoutId = setTimeout(() => {
        logger.debug(
          "🔍 Auto-discovering tabs for current sheet:",
          currentSheet.url
        );
        discoverTabs(currentSheet);
      }, 500); // Wait 0.5 seconds after URL is entered

      return () => clearTimeout(timeoutId);
    }
  }, [currentSheet?.url]);

  const startAddingSheet = (
    type: "google-sheets" | "excel" = "google-sheets"
  ) => {
    logger.debug("🚀 startAddingSheet called:", { type });
    setCurrentSheet({
      id: `${type}-${Date.now()}`,
      url: "",
      name: "",
      type,
      tabs: [],
      selectedTabs: [],
    });
    setShowAddForm(true);
    logger.debug("🚀 Form should now be visible:", {
      showAddForm: true,
      currentSheet: { type },
    });
  };

  const saveCurrentSheet = () => {
    if (currentSheet) {
      setSheets([...sheets, currentSheet]);
      setCurrentSheet(null);
      setShowAddForm(false);
    }
  };

  const cancelAddingSheet = () => {
    setCurrentSheet(null);
    setShowAddForm(false);
  };

  const selectSheetForTabs = async (sheet: DataSource) => {
    // If the sheet doesn't have tabs discovered yet, discover them first
    if (
      sheet.type === "google-sheets" &&
      sheet.url &&
      sheet.tabs.length === 0
    ) {
      logger.debug(
        "🔍 Discovering tabs for sheet before showing selection:",
        sheet.url
      );
      setLoading(true);
      try {
        // Discover tabs and get the updated sheet
        const updatedSheet = await discoverTabsAndReturn(sheet);
        setSelectedSheetForTabs(updatedSheet);
      } catch (error) {
        logger.error("Failed to discover tabs:", error);
        setError("Failed to discover tabs. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Make sure we have the current sheet data with selectedTabs
      const currentSheet = sheets.find((s) => s.id === sheet.id) || sheet;
      setSelectedSheetForTabs(currentSheet);
    }
  };

  const closeTabSelection = () => {
    setSelectedSheetForTabs(null);
  };

  const updateSheetTabs = (sheetId: string, selectedTabs: GoogleSheetTab[]) => {
    logger.debug("📊 Updating sheet tabs:", {
      sheetId,
      selectedTabsCount: selectedTabs.length,
    });
    setSheets(
      sheets.map((sheet) =>
        sheet.id === sheetId ? { ...sheet, selectedTabs } : sheet
      )
    );
    setSelectedSheetForTabs(null);
  };

  const removeSheet = (sheetId: string) => {
    setSheets(sheets.filter((sheet) => sheet.id !== sheetId));
  };

  const discoverTabsAndReturn = async (
    sheet: DataSource
  ): Promise<DataSource> => {
    setLoading(true);
    setError(null);

    try {
      if (sheet.type === "google-sheets") {
        // Handle Google Sheets
        if (!sheet.url) {
          throw new Error("Google Sheets URL is required");
        }

        const spreadsheetId = extractSpreadsheetId(sheet.url);
        if (!spreadsheetId) {
          throw new Error("Invalid Google Sheets URL");
        }

        const { data, error } = await discoverGoogleSheetsTabs(
          spreadsheetId,
          userId,
          clientId
        );

        if (error) {
          throw error;
        }

        if (data && Array.isArray(data)) {
          const tabs: GoogleSheetTab[] = data.map(
            (tab: { tab_name?: string; name?: string; title?: string }) => ({
              name: tab.tab_name || tab.name || tab.title || "Untitled",
              gid: tab.tab_gid || tab.gid || tab.id || "",
              url:
                tab.tab_url ||
                `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${
                  tab.tab_gid || tab.gid || tab.id || ""
                }`,
            })
          );

          // Keep the user-entered sheet name and preserve existing selectedTabs
          const updatedSheet = {
            ...sheet,
            tabs,
            selectedTabs: sheet.selectedTabs || [],
          };

          // Update the sheet in the sheets array
          setSheets((prevSheets) =>
            prevSheets.map((s) => (s.id === sheet.id ? updatedSheet : s))
          );

          logger.debug("Discovered Google Sheets tabs:", {
            sheetId: sheet.id,
            tabCount: tabs.length,
            sheetName: sheet.name,
          });
          return updatedSheet;
        } else {
          const updatedSheet = {
            ...sheet,
            tabs: [],
            selectedTabs: sheet.selectedTabs || [],
          };
          setSheets((prevSheets) =>
            prevSheets.map((s) => (s.id === sheet.id ? updatedSheet : s))
          );
          logger.debug("No Google Sheets tabs found:", sheet.id);
          return updatedSheet;
        }
      } else if (sheet.type === "excel") {
        // Handle Excel files
        if (!sheet.file) {
          throw new Error("Excel file is required");
        }

        // For Excel files, we'll create a single "sheet" tab
        const tabs: GoogleSheetTab[] = [
          {
            name: "Sheet1",
            gid: "0",
            url: sheet.file.name,
          },
        ];

        const updatedSheet = {
          ...sheet,
          tabs,
          selectedTabs: sheet.selectedTabs || [],
        };
        setSheets((prevSheets) =>
          prevSheets.map((s) => (s.id === sheet.id ? updatedSheet : s))
        );
        logger.debug("Processed Excel file:", {
          sheetId: sheet.id,
          fileName: sheet.file.name,
        });
        return updatedSheet;
      }

      return sheet;
    } catch (err) {
      logger.error("Error discovering tabs:", err);
      setError(
        "Failed to discover tabs. Please check the file/URL and try again."
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const discoverTabs = async (sheet: DataSource) => {
    setLoading(true);
    setError(null);

    try {
      if (sheet.type === "google-sheets") {
        // Handle Google Sheets
        if (!sheet.url) {
          throw new Error("Google Sheets URL is required");
        }

        const spreadsheetId = extractSpreadsheetId(sheet.url);
        if (!spreadsheetId) {
          throw new Error("Invalid Google Sheets URL");
        }

        const { data, error } = await discoverGoogleSheetsTabs(
          spreadsheetId,
          userId,
          clientId
        );

        if (error) {
          throw error;
        }

        if (data && Array.isArray(data)) {
          const tabs: GoogleSheetTab[] = data.map(
            (tab: { tab_name?: string; name?: string; title?: string }) => ({
              name: tab.tab_name || tab.name || tab.title || "Untitled",
              gid: tab.tab_gid || tab.gid || tab.id || "",
              url:
                tab.tab_url ||
                `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${
                  tab.tab_gid || tab.gid || tab.id || ""
                }`,
            })
          );

          // If this is the current sheet being added, update currentSheet
          if (currentSheet && currentSheet.id === sheet.id) {
            setCurrentSheet({
              ...currentSheet,
              tabs,
              selectedTabs: currentSheet.selectedTabs || [],
            });
          } else {
            // Otherwise update the sheets array
            setSheets((prevSheets) =>
              prevSheets.map((s) =>
                s.id === sheet.id
                  ? { ...s, tabs, selectedTabs: s.selectedTabs || [] }
                  : s
              )
            );
          }
          logger.debug("Discovered Google Sheets tabs:", {
            sheetId: sheet.id,
            tabCount: tabs.length,
            sheetName: sheet.name,
          });
        } else {
          if (currentSheet && currentSheet.id === sheet.id) {
            setCurrentSheet({
              ...currentSheet,
              tabs: [],
              selectedTabs: currentSheet.selectedTabs || [],
            });
          } else {
            setSheets((prevSheets) =>
              prevSheets.map((s) =>
                s.id === sheet.id
                  ? { ...s, tabs: [], selectedTabs: s.selectedTabs || [] }
                  : s
              )
            );
          }
          logger.debug("No Google Sheets tabs found:", sheet.id);
        }
      } else if (sheet.type === "excel") {
        // Handle Excel files
        if (!sheet.file) {
          throw new Error("Excel file is required");
        }

        // For Excel files, we'll create a single "sheet" tab
        const tabs: GoogleSheetTab[] = [
          {
            name: "Sheet1",
            gid: "0",
            url: sheet.file.name,
          },
        ];

        if (currentSheet && currentSheet.id === sheet.id) {
          setCurrentSheet({
            ...currentSheet,
            tabs,
            selectedTabs: currentSheet.selectedTabs || [],
          });
        } else {
          setSheets((prevSheets) =>
            prevSheets.map((s) =>
              s.id === sheet.id
                ? { ...s, tabs, selectedTabs: s.selectedTabs || [] }
                : s
            )
          );
        }
        logger.debug("Processed Excel file:", {
          sheetId: sheet.id,
          fileName: sheet.file.name,
        });
      }
    } catch (err) {
      logger.error("Error discovering tabs:", err);
      setError(
        "Failed to discover tabs. Please check the file/URL and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const extractSpreadsheetId = (url: string): string => {
    if (!url.includes("docs.google.com")) return "";
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : "";
  };

  return (
    <div className="multi-sheet-selector">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={16} />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Add New Sheet Form - Only show when no sheets exist or when adding */}
      {(sheets.length === 0 || showAddForm) && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          {!showAddForm ? (
            // Initial form - show add buttons
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-4">
                Add Your First Data Source
              </h5>
              <div className="flex space-x-2">
                {supportedTypes.includes("google-sheets") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      logger.debug("🖱️ Add Google Sheet button clicked");
                      startAddingSheet("google-sheets");
                    }}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    <span>Add Google Sheet</span>
                  </button>
                )}
                {supportedTypes.includes("excel") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      logger.debug("🖱️ Add Excel File button clicked");
                      startAddingSheet("excel");
                    }}
                    disabled={disabled}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    <span>Add Excel File</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Add form - show configuration
            currentSheet && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Add New{" "}
                    {currentSheet.type === "google-sheets"
                      ? "Google Sheet"
                      : "Excel File"}
                  </h5>
                  <button
                    type="button"
                    onClick={cancelAddingSheet}
                    disabled={disabled}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Sheet Name Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sheet Name *
                  </label>
                  <input
                    type="text"
                    value={currentSheet.name}
                    onChange={(e) =>
                      setCurrentSheet({ ...currentSheet, name: e.target.value })
                    }
                    disabled={disabled}
                    placeholder="Enter a friendly name for this sheet (e.g., P.O.W.E.R Magazine)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be the name shown in the dashboard
                  </p>
                </div>

                {/* Sheet Input */}
                <div className="mb-4">
                  {currentSheet.type === "google-sheets" ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Google Sheets URL *
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="url"
                          value={currentSheet.url}
                          onChange={(e) =>
                            setCurrentSheet({
                              ...currentSheet,
                              url: e.target.value,
                            })
                          }
                          disabled={disabled}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        {loading && (
                          <div className="flex items-center px-3 py-2 text-sm text-gray-500">
                            <RefreshCw
                              className="animate-spin mr-2"
                              size={16}
                            />
                            Discovering tabs...
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Excel/CSV File *
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const fileType = file.name
                                .toLowerCase()
                                .endsWith(".csv")
                                ? "csv"
                                : "excel";
                              setCurrentSheet({
                                ...currentSheet,
                                file,
                                name: file.name,
                                url: file.name,
                                type: fileType, // Track file type
                              });
                            }
                          }}
                          disabled={disabled}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        />
                        {loading && (
                          <div className="flex items-center px-3 py-2 text-sm text-gray-500">
                            <RefreshCw
                              className="animate-spin mr-2"
                              size={16}
                            />
                            Processing file...
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Tabs Selection */}
                {currentSheet.tabs.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Available Tabs ({currentSheet.selectedTabs.length}{" "}
                          selected)
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Select which tabs to include from this sheet
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSheet({
                              ...currentSheet,
                              selectedTabs: [...currentSheet.tabs],
                            })
                          }
                          disabled={disabled}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentSheet({
                              ...currentSheet,
                              selectedTabs: [],
                            })
                          }
                          disabled={disabled}
                          className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {currentSheet.tabs.map((tab) => (
                        <label
                          key={tab.gid}
                          className="flex items-center space-x-2 text-sm p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={currentSheet.selectedTabs.some(
                              (t) => t.gid === tab.gid
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCurrentSheet({
                                  ...currentSheet,
                                  selectedTabs: [
                                    ...currentSheet.selectedTabs,
                                    tab,
                                  ],
                                });
                              } else {
                                setCurrentSheet({
                                  ...currentSheet,
                                  selectedTabs:
                                    currentSheet.selectedTabs.filter(
                                      (t) => t.gid !== tab.gid
                                    ),
                                });
                              }
                            }}
                            disabled={disabled}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700 flex-1">
                            {tab.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={cancelAddingSheet}
                    disabled={disabled}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveCurrentSheet}
                    disabled={
                      disabled ||
                      !currentSheet.name ||
                      !currentSheet.url ||
                      currentSheet.selectedTabs.length === 0
                    }
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Sheet
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Sheets List - Show when sheets exist */}
      {sheets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-700">Sheets</h5>
            <div className="flex space-x-2">
              {supportedTypes.includes("google-sheets") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startAddingSheet("google-sheets");
                  }}
                  disabled={disabled}
                  className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <Plus size={12} />
                  <span>Google Sheet</span>
                </button>
              )}
              {supportedTypes.includes("excel") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startAddingSheet("excel");
                  }}
                  disabled={disabled}
                  className="flex items-center space-x-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                >
                  <Plus size={12} />
                  <span>Excel File</span>
                </button>
              )}
            </div>
          </div>

          {sheets.map((sheet, index) => (
            <div
              key={sheet.id}
              className="border border-gray-200 rounded-lg p-3 bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {sheet.name ||
                        `${
                          sheet.type === "google-sheets"
                            ? "Google Sheet"
                            : "Excel File"
                        } ${index + 1}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {sheet.selectedTabs.length} tab
                    {sheet.selectedTabs.length !== 1 ? "s" : ""} selected
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {sheet.type === "google-sheets" && (
                    <button
                      type="button"
                      onClick={() => selectSheetForTabs(sheet)}
                      disabled={disabled}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Select Tabs
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSheet(sheet.id)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Tab Selection - Two Column Layout */}
      {selectedSheetForTabs && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-700">
              Select Tabs for {selectedSheetForTabs.name}
            </h5>
            <button
              type="button"
              onClick={closeTabSelection}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {selectedSheetForTabs.tabs.map((tab) => (
              <label
                key={tab.gid}
                className="flex items-center space-x-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedSheetForTabs.selectedTabs.some(
                    (t) => t.name === tab.name
                  )}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSelectedTabs = [
                        ...selectedSheetForTabs.selectedTabs,
                        tab,
                      ];
                      setSelectedSheetForTabs({
                        ...selectedSheetForTabs,
                        selectedTabs: newSelectedTabs,
                      });
                    } else {
                      const newSelectedTabs =
                        selectedSheetForTabs.selectedTabs.filter(
                          (t) => t.name !== tab.name
                        );
                      setSelectedSheetForTabs({
                        ...selectedSheetForTabs,
                        selectedTabs: newSelectedTabs,
                      });
                    }
                  }}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{tab.name}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-2 mt-3">
            <button
              type="button"
              onClick={closeTabSelection}
              disabled={disabled}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                updateSheetTabs(
                  selectedSheetForTabs.id,
                  selectedSheetForTabs.selectedTabs
                )
              }
              disabled={disabled}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save Tabs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};