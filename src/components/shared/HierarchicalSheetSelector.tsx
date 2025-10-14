import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Check,
  RefreshCw,
  X,
} from "lucide-react";
import { useFilters } from "../../contexts/FilterContext";
import { cleanMetricName } from "../../lib/metricCalculations";

interface Tab {
  id: string;
  name: string;
  gid: string;
  url: string;
  isSelected: boolean;
  metrics?: string[];
}

interface Sheet {
  id: string;
  name: string;
  url: string;
  type: "google-sheets" | "excel";
  tabs: Tab[];
  isExpanded: boolean;
  isSelected: boolean;
  metrics?: string[];
}

interface Client {
  id: string;
  name: string;
  sheets: Sheet[];
  isExpanded: boolean;
  isSelected: boolean;
}

interface HierarchicalSheetSelectorProps {
  // Modal props
  isOpen: boolean;
  onClose: () => void;
  onSelectionChange?: (selected: {
    clients: string[];
    sheets: string[];
    tabs: string[];
  }) => void;

  // Data props
  clients?: Client[];
  hierarchicalData?: unknown[];
  currentSelection?: {
    clients: string[];
    sheets: string[];
    tabs: string[];
  };

  // Legacy props for backward compatibility
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
  hideHeader?: boolean;
  onGetCurrentSelection?: (
    getSelection: () => {
      clients: string[];
      sheets: string[];
      tabs: string[];
    }
  ) => void;
  getCurrentSelectionRef?: React.MutableRefObject<
    | (() => {
        clients: string[];
        sheets: string[];
        tabs: string[];
      })
    | null
  >;
}

export const HierarchicalSheetSelector: React.FC<
  HierarchicalSheetSelectorProps
> = ({
  // Modal props
  isOpen,
  onClose,
  onSelectionChange,

  // Data props
  clients: propClients,
  currentSelection,

  // Legacy props
  onRefresh,
  loading = false,
  className = "",
  hideHeader = false,
  onGetCurrentSelection,
  getCurrentSelectionRef,
}) => {
  // Use unified filter system
  const { toggleSheet, clearSheets } = useFilters();

  const [localClients, setLocalClients] = useState<Client[]>(propClients || []);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [lastExpandAction, setLastExpandAction] = useState<
    "expand" | "collapse"
  >("expand");
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalClients(propClients || []);
  }, [propClients]);

  // Apply current selection when component mounts or currentSelection changes
  useEffect(() => {
    if (currentSelection && propClients) {
      setLocalClients((prev) =>
        prev.map((client) => {
          const isClientSelected = currentSelection.clients.includes(
            client.name
          );
          return {
            ...client,
            isSelected: isClientSelected,
            isExpanded: isClientSelected, // Auto-expand selected clients
            sheets: (client.sheets || []).map((sheet) => {
              const isSheetSelected = currentSelection.sheets.includes(
                sheet.name
              );
              return {
                ...sheet,
                isSelected: isSheetSelected,
                isExpanded: isSheetSelected, // Auto-expand selected sheets
                tabs: (sheet.tabs || []).map((tab) => {
                  const isTabSelected = currentSelection.tabs.includes(
                    tab.name
                  );
                  return {
                    ...tab,
                    isSelected: isTabSelected,
                  };
                }),
              };
            }),
          };
        })
      );
    }
  }, [currentSelection, propClients]);

  // Click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset expand action when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLastExpandAction("expand");
    }
  }, [isOpen]);

  // Removed automatic dashboard context updates to prevent circular updates
  // Dashboard context will only be updated when Apply Selection is clicked

  // Calculate selection summary
  const getSelectionSummary = useCallback(() => {
    if (!localClients || localClients.length === 0) {
      return { selectedClients: 0, selectedSheets: 0 };
    }

    const selectedClients = localClients.filter((c) => c.isSelected).length;
    const selectedSheets = localClients.reduce(
      (acc, client) =>
        acc + (client.sheets || []).filter((s) => s.isSelected).length,
      0
    );

    return { selectedClients, selectedSheets };
  }, [localClients]);

  // Handle sheet toggle
  const handleToggleSheet = (clientId: string, sheetId: string) => {
    let sheetNameToToggle: string | null = null;

    setLocalClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          return {
            ...client,
            sheets: (client.sheets || []).map((sheet) => {
              if (sheet.id === sheetId) {
                const newIsSelected = !sheet.isSelected;

                // Store sheet name for FilterContext update (outside of state update)
                if (sheet.name) {
                  sheetNameToToggle = sheet.name;
                }

                return {
                  ...sheet,
                  isSelected: newIsSelected,
                };
              }
              return sheet;
            }),
          };
        }
        return client;
      })
    );

    // Update FilterContext after state update
    if (sheetNameToToggle) {
      toggleSheet(sheetNameToToggle);
    }
  };

  // Handle client selection
  const toggleClient = (clientId: string) => {
    setLocalClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          const newIsSelected = !client.isSelected;
          return {
            ...client,
            isSelected: newIsSelected,
            // When client is selected, select all its sheets
            sheets: (client.sheets || []).map((sheet) => ({
              ...sheet,
              isSelected: newIsSelected,
            })),
          };
        }
        return client;
      })
    );
  };

  // Handle client expand/collapse
  const toggleExpanded = (clientId: string) => {
    setLocalClients((prev) =>
      prev.map((client) => {
        if (client.id === clientId) {
          return { ...client, isExpanded: !client.isExpanded };
        }
        return client;
      })
    );
  };

  // Handle sheet expand/collapse for metrics dropdown
  const toggleSheetExpanded = (sheetId: string) => {
    setExpandedSheets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sheetId)) {
        newSet.delete(sheetId);
      } else {
        newSet.add(sheetId);
      }
      return newSet;
    });
  };

  // Bulk actions
  const toggleSelectAll = () => {
    const hasSelectedItems = localClients.some(
      (client) =>
        client.isSelected ||
        (client.sheets || []).some((sheet) => sheet.isSelected)
    );

    setLocalClients((prev) =>
      prev.map((client) => ({
        ...client,
        // Keep client selection unchanged - only toggle sheets
        isSelected: client.isSelected, // Don't change client selection
        // Don't change isExpanded - keep expansion state separate
        sheets: (client.sheets || []).map((sheet) => ({
          ...sheet,
          isSelected: !hasSelectedItems, // Only toggle sheet selection
          // Don't change isExpanded - keep expansion state separate
        })),
      }))
    );

    // Update FilterContext to reflect the selection change
    if (!hasSelectedItems) {
      // If we're selecting all, we need to add each sheet to FilterContext
      // This will be handled by the onSelectionChange callback when Apply is clicked
    } else {
      // If we're deselecting all, clear the sheets in FilterContext
      clearSheets();
    }
  };

  const toggleExpandAll = () => {
    const hasExpandedItems = localClients.some(
      (client) =>
        client.isExpanded ||
        (client.sheets || []).some((sheet) => sheet.isExpanded)
    );

    const shouldExpand = !hasExpandedItems;
    setLastExpandAction(shouldExpand ? "expand" : "collapse");

    setLocalClients((prev) =>
      prev.map((client) => ({
        ...client,
        isExpanded: shouldExpand,
        sheets: (client.sheets || []).map((sheet) => ({
          ...sheet,
          isExpanded: shouldExpand,
        })),
      }))
    );

    // Update expanded sheets state
    if (shouldExpand) {
      const allSheetIds = localClients.flatMap((client) =>
        (client.sheets || []).map((sheet) => sheet.id)
      );
      setExpandedSheets(new Set(allSheetIds));
    } else {
      setExpandedSheets(new Set());
    }
  };

  // Note: prevSelectionRef removed as we no longer use automatic onSelectionChange calls

  // Get current selection for Apply button - memoized to prevent re-renders
  const getCurrentSelection = useCallback(() => {
    if (!localClients || localClients.length === 0) {
      return { clients: [], sheets: [], tabs: [] };
    }

    const selectedClients = localClients
      .filter((c) => c.isSelected)
      .map((c) => c.name);
    const selectedSheets = localClients
      .filter((c) => c.isSelected)
      .flatMap((c) =>
        (c.sheets || []).filter((s) => s.isSelected).map((s) => s.name)
      );
    return {
      clients: selectedClients,
      sheets: selectedSheets,
      tabs: [], // No more tabs in the new structure
    };
  }, [localClients]);

  const summary = getSelectionSummary();

  // Check if there are any selected items
  const hasSelectedItems = localClients.some(
    (client) =>
      client.isSelected ||
      (client.sheets || []).some((sheet) => sheet.isSelected)
  );

  // Expose getCurrentSelection function to parent - set ref directly to avoid useEffect loops
  if (onGetCurrentSelection) {
    onGetCurrentSelection(getCurrentSelection);
  }
  if (getCurrentSelectionRef) {
    getCurrentSelectionRef.current = getCurrentSelection;
  }

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className={`bg-white border border-gray-200 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col ${className}`}
      >
        {/* Header */}
        {!hideHeader && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Data Sources
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Select clients, spreadsheets, and worksheets to configure your
                  data sources
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-2 text-gray-500 hover:text-red-500 disabled:opacity-50"
                    title="Refresh data"
                  >
                    <RefreshCw
                      size={16}
                      className={loading ? "animate-spin" : ""}
                    />
                  </button>
                )}

                <button
                  onClick={toggleSelectAll}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-red-500 border border-blue-200 hover:border-red-300 rounded"
                >
                  {hasSelectedItems ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={toggleExpandAll}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-red-500 border border-blue-200 hover:border-red-300 rounded"
                >
                  {lastExpandAction === "expand"
                    ? "Collapse All"
                    : "Expand All"}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-red-500"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-3 max-h-96 overflow-y-auto">
          {!localClients || localClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileSpreadsheet
                size={32}
                className="mx-auto mb-2 text-gray-400"
              />
              <p className="text-sm">No data sources configured</p>
              <p className="text-xs text-gray-400 mt-1">
                Configure sheets in Client Management
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(localClients || []).map((client) => (
                <div
                  key={client.id}
                  className="border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm"
                >
                  {/* Client Header */}
                  <div className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-undeniable-violet/5 hover:to-undeniable-mint/5 cursor-pointer transition-all duration-200">
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Client Selection Area */}
                      <div
                        className="flex items-center space-x-2 flex-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleClient(client.id);
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            client.isSelected
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600 shadow-sm"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClient(client.id);
                          }}
                        >
                          {client.isSelected && (
                            <Check size={12} className="text-white font-bold" />
                          )}
                        </div>
                        <div className="font-medium text-gray-900">
                          {client.name}
                        </div>
                      </div>

                      {/* Arrow Area */}
                      <div
                        className="flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer p-2 rounded"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpanded(client.id);
                        }}
                        title="Expand/Collapse Worksheets"
                      >
                        {client.isExpanded ? (
                          <ChevronDown size={16} className="text-gray-600" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sheets */}
                  {client.isExpanded && (
                    <div className="border-t border-gray-100">
                      {(client.sheets || []).map((sheet) => (
                        <div
                          key={sheet.id}
                          className="border-b border-gray-50 last:border-b-0"
                        >
                          {/* Sheet Header */}
                          <div
                            className="flex items-center justify-between p-3 pl-6 hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 cursor-pointer transition-all duration-200 border-l-2 border-transparent hover:border-l-undeniable-violet/30"
                            onClick={() =>
                              handleToggleSheet(client.id, sheet.id)
                            }
                          >
                            <div className="flex items-center bg-gray-50 rounded-full overflow-hidden flex-1 h-12">
                              {/* 90% - Sheet Selection Area */}
                              <div
                                className="flex-1 flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors h-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSheet(client.id, sheet.id);
                                }}
                              >
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                                      sheet.isSelected
                                        ? "bg-gradient-to-r from-green-500 to-green-600 border-green-600 shadow-sm"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSheet(client.id, sheet.id);
                                    }}
                                  >
                                    {sheet.isSelected && (
                                      <Check
                                        size={12}
                                        className="text-white font-bold"
                                      />
                                    )}
                                  </div>
                                  <div className="font-medium text-gray-900 flex items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                    {sheet.name}
                                  </div>
                                </div>
                              </div>

                              {/* 10% - Arrow Area (Separate Button) */}
                              <div
                                className="w-16 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer shadow-inner bg-gray-100/50 h-full"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSheetExpanded(sheet.id);
                                }}
                                title="View metrics"
                              >
                                {expandedSheets.has(sheet.id) ? (
                                  <ChevronDown
                                    size={16}
                                    className="text-gray-600"
                                  />
                                ) : (
                                  <ChevronRight
                                    size={16}
                                    className="text-gray-600"
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Metrics */}
                          {expandedSheets.has(sheet.id) && (
                            <div className="px-6 pb-3 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                                  Metrics:{" "}
                                  {(sheet.metrics || []).length > 0
                                    ? `${
                                        (sheet.metrics || []).length
                                      } available`
                                    : "No metrics"}
                                </h4>

                                {(sheet.metrics || []).length > 0 ? (
                                  <div className="columns-3 gap-1.5 space-y-1.5 max-h-48 overflow-y-auto">
                                    {(sheet.metrics || []).map(
                                      (metric, index) => (
                                        <div
                                          key={index}
                                          className="text-xs text-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 px-1.5 py-1 rounded-md border border-green-100/50 hover:shadow-sm transition-shadow break-inside-avoid"
                                        >
                                          {cleanMetricName(metric)}
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500 italic">
                                    No metrics configured for this worksheet
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Apply button */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {summary.selectedClients} clients, {summary.selectedSheets}{" "}
              worksheets selected
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const selection = getCurrentSelection();
                  if (onSelectionChange) {
                    onSelectionChange(selection);
                  }
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

