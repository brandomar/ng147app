import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Trash2, Building2, RefreshCw } from "lucide-react";
import { logger } from "../../lib/logger";
import {
  addClient,
  updateClient,
  deleteClient,
  getClients,
} from "../../lib/database";
import { Client } from "../../types";
import { MultiSheetSelector } from "../shared/MultiSheetSelector";
import { useGlobalPermissions } from "../../hooks/useGlobalPermissions";
// import { useApp } from '../../contexts/AppContext'; // Removed - no longer needed
import { useAuth } from "../../contexts/AuthContext";
import { useBrand } from "../../contexts/BrandContext";
import { useFilters } from "../../contexts/FilterContext";
import {
  getClientTypeOptions,
  getSheetTypeForClientType,
  getAdminCompanyName,
  getAdminCompanySlug,
} from "../../lib/dynamicBranding";
import {
  parseExcelFile,
  transformExcelData,
  insertExcelMetricEntries,
} from "../../lib/excelParser";
import { NEW_METRIC_CATEGORIES } from "../../types/dataSource";

interface ClientManagementProps {
  onClientAdded?: (client: Client) => void;
}

interface DataSource {
  id: string;
  url: string;
  name: string;
  type: "google-sheets" | "excel";
  file?: File;
  tabs: Array<{
    name: string;
    gid: string;
    url: string;
  }>;
  selectedTabs: Array<{
    name: string;
    gid: string;
    url: string;
  }>;
}

interface FormData {
  company_name: string;
  slug: string;
  logo_url: string;
  client_type: "client" | "primary";
  sheet_type: "client-dashboard" | "admin-dashboard";
  data_source: "google-sheets" | "excel-import";
  google_sheets_url: string;
  google_sheets_tabs: string[];
  selected_sheets: string[];
  allowed_categories: string[];
  showDataSource: boolean;
  // New fields for better UX
  form_mode: "new_client" | "add_sheet";
  selected_existing_client: string;
  sheet_name: string;
  // Multi-sheet support
  google_sheets: DataSource[];
}

// Convert NEW_METRIC_CATEGORIES to the format expected by the UI
const categories = Object.values(NEW_METRIC_CATEGORIES).map((category) => ({
  key: category.id,
  name: category.name,
}));

export const ClientManagement: React.FC<ClientManagementProps> = ({
  onClientAdded,
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [adminConfig, setAdminConfig] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    company_name: "",
    slug: "",
    logo_url: "",
    client_type: "client",
    sheet_type: "client-dashboard",
    data_source: "google-sheets", // Default to google-sheets
    google_sheets_url: "",
    google_sheets_tabs: [],
    selected_sheets: [],
    allowed_categories: [],
    showDataSource: false,
    // New fields
    form_mode: "new_client", // Will be set based on dropdown selection
    selected_existing_client: "",
    sheet_name: "",
    // Multi-sheet support
    google_sheets: [],
  });

  // Debug form state
  useEffect(() => {
    logger.debug("🔍 Form state in ClientManagement:", {
      showForm,
      formMode: formData.form_mode,
      selectedExistingClient: formData.selected_existing_client,
      clientType: formData.client_type,
      companyName: formData.company_name,
    });
  }, [
    showForm,
    formData.form_mode,
    formData.selected_existing_client,
    formData.client_type,
    formData.company_name,
  ]);

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const permissions = useGlobalPermissions();
  const { brandConfig } = useBrand();
  const { refreshAvailableSheets } = useFilters();

  // Debug brand config loading and auto-populate company name for admin clients
  useEffect(() => {
    logger.debug("🔍 Brand config in ClientManagement:", {
      brandConfig,
      companyName: brandConfig?.companyName,
      roles: brandConfig?.roles,
      hasBrandConfig: !!brandConfig,
      currentClientType: formData.client_type,
      currentCompanyName: formData.company_name,
    });

    // Auto-populate company name if we have a brand config and the client type is admin
    if (brandConfig?.companyName && formData.client_type === "primary") {
      const adminCompanyName = getAdminCompanyName(brandConfig);
      const adminCompanySlug = getAdminCompanySlug(brandConfig);

      // Only update if the current values are different
      if (
        formData.company_name !== adminCompanyName ||
        formData.slug !== adminCompanySlug
      ) {
        logger.debug("🔍 Auto-populating company name and slug:", {
          companyName: { from: formData.company_name, to: adminCompanyName },
          slug: { from: formData.slug, to: adminCompanySlug },
        });
        setFormData((prev) => ({
          ...prev,
          company_name: adminCompanyName,
          slug: adminCompanySlug,
        }));
      }
    }
  }, [brandConfig, formData.client_type, formData.company_name, formData.slug]);
  // const app = useApp(); // Removed - no longer needed since we removed app.clearCache()

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getClients();
      if (error) throw error;

      logger.debug("📊 RAW clients data from getClients():", {
        count: data?.length,
        rawData: data,
        firstClient: data?.[0],
      });

      logger.debug(
        "📊 Loaded clients:",
        data?.map((client: Client) => ({
          name: client.name,
          data_source: client.data_source,
          google_sheets_url: client.google_sheets_url,
          google_sheets_tabs: client.google_sheets_tabs,
          client_type: client.client_type,
          full_client: client,
        }))
      );

      // Check if any clients need data_source field update
      const clientsNeedingUpdate = data?.filter(
        (client: Client) => !client.data_source
      );
      if (clientsNeedingUpdate && clientsNeedingUpdate.length > 0) {
        logger.debug(
          "📊 Clients missing data_source field:",
          clientsNeedingUpdate.map((c: Client) => c.name)
        );
      }

      // Filter out admin clients from the client list (they shouldn't appear as client dashboards)
      // Undeniable clients sync to the existing Undeniable Dashboard, not separate client dashboards
      const filteredClients =
        data?.filter((client: Client) => client.client_type !== "primary") ||
        [];
      const adminClients =
        data?.filter((client: Client) => client.client_type === "primary") ||
        [];

      logger.debug("📊 Filtered out admin clients:", {
        total: data?.length || 0,
        filtered: filteredClients.length,
        adminClients: adminClients.length,
        clientTypes: data?.map((c: Client) => ({
          name: c.name,
          client_type: c.client_type,
          typeOf: typeof c.client_type,
        })),
      });

      // Set the first admin client as the configuration (if any)
      const newUndeniableConfig =
        adminClients.length > 0 ? adminClients[0] : null;

      // Add detailed debugging to see what's happening
      logger.debug("🔍 About to set adminConfig:", {
        adminClients: adminClients.length,
        newConfig: newUndeniableConfig,
        currentConfig: adminConfig,
        willChange: adminConfig !== newUndeniableConfig,
        currentConfigType: typeof adminConfig,
        newConfigType: typeof newUndeniableConfig,
      });

      setAdminConfig(newUndeniableConfig);

      // Log after state update to verify it changed
      setTimeout(() => {
        logger.debug("🔍 adminConfig after setState:", {
          adminConfig,
          isNull: adminConfig === null,
          isUndefined: adminConfig === undefined,
        });
      }, 100);
      setClients(filteredClients);
      setError(null); // Clear any previous errors on successful load
    } catch (err) {
      logger.error("❌ Error loading clients:", err);
      console.error("Full error details:", err);
      setError(`Failed to load clients: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []); // Remove adminConfig dependency to prevent circular dependency

  // Initialize clients on component mount
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: FormData[typeof field]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSheetsChanged = useCallback(
    (sheets: DataSource[]) => {
      logger.debug("📊 Google Sheets changed:", {
        sheetCount: sheets.length,
        sheets,
      });
      handleInputChange("google_sheets", sheets);
    },
    [handleInputChange]
  );

  const resetForm = () => {
    setFormData({
      company_name: "",
      slug: "",
      logo_url: "",
      client_type: "client",
      sheet_type: "client-dashboard",
      data_source: "google-sheets", // Default to google-sheets
      google_sheets_url: "",
      google_sheets_tabs: [],
      selected_sheets: [],
      allowed_categories: [],
      showDataSource: false,
      // New fields
      form_mode: "new_client",
      selected_existing_client: "",
      sheet_name: "",
      // Multi-sheet support
      google_sheets: [],
    });
    setEditingClient(null);
    setShowForm(false);
    setExcelFile(null);
    setError(null); // Clear any error messages
  };

  // Process Excel file and insert metric entries
  const processExcelFile = async (file: File, clientId: string) => {
    try {
      logger.debug("📊 Processing Excel file:", {
        fileName: file.name,
        clientId,
      });

      // Parse Excel file
      const parseResult = await parseExcelFile(file);
      if (!parseResult.success) {
        throw new Error(parseResult.error || "Failed to parse Excel file");
      }

      // Get current user
      const { supabase } = await import("../../lib/supabase");
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Transform data using the same logic as Google Sheets
      const metricEntries = transformExcelData(
        parseResult.data,
        user.id,
        clientId,
        parseResult.sheetNames[0] || "Sheet1",
        file.name
      );

      if (metricEntries.length === 0) {
        logger.warn("⚠️ No metric entries generated from Excel file");
        return;
      }

      // Insert metric entries into database
      const insertResult = await insertExcelMetricEntries(metricEntries);
      if (!insertResult.success) {
        throw new Error(
          insertResult.error || "Failed to insert metric entries"
        );
      }

      logger.info("✅ Excel file processed successfully:", {
        entries: metricEntries.length,
        clientId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("❌ Excel processing error:", error);
      setError(`Excel processing failed: ${errorMessage}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on form mode
    if (formData.form_mode === "new_client" && !formData.company_name.trim())
      return;
    if (
      formData.form_mode === "add_sheet" &&
      !formData.selected_existing_client
    )
      return;

    // Prevent submission if there are no sheets and we're in Google Sheets mode
    if (
      formData.data_source === "google-sheets" &&
      formData.google_sheets.length === 0
    ) {
      setError("Please add at least one Google Sheet before saving");
      return;
    }

    // Debug logging for validation
    logger.debug("🔍 Validation check:", {
      dataSource: formData.data_source,
      sheetsLength: formData.google_sheets.length,
      sheets: formData.google_sheets,
    });

    // Validate that each sheet has at least one selected tab
    if (formData.data_source === "google-sheets") {
      const hasValidSheets = formData.google_sheets.every(
        (sheet) => sheet.url.trim() && sheet.selectedTabs.length > 0
      );
      if (!hasValidSheets) {
        setError("Each Google Sheet must have at least one selected tab");
        return;
      }
    }

    // For Excel import, file is required
    if (formData.data_source === "excel-import" && !excelFile) {
      setError("Excel file is required for Excel import");
      return;
    }

    // Additional validation for client selection
    if (
      !formData.selected_existing_client &&
      formData.form_mode !== "new_client"
    )
      return;

    try {
      setLoading(true);
      setError(null);

      if (formData.form_mode === "new_client") {
        // Create new client logic
        // Process multi-sheet data for Google Sheets
        let processedSheets: Array<{
          url: string;
          tabs: string[];
          sheetName: string;
        }> = [];
        if (
          formData.data_source === "google-sheets" &&
          formData.google_sheets.length > 0
        ) {
          processedSheets = formData.google_sheets.map((sheet) => ({
            url: sheet.url,
            tabs: sheet.selectedTabs.map((tab) => tab.name),
            sheetName: sheet.name,
          }));
        }

        const clientData = {
          name: formData.company_name.trim(),
          company_name: formData.company_name.trim(),
          slug:
            formData.slug.trim() ||
            formData.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          logo_url: formData.logo_url.trim(),
          client_type: formData.client_type,
          sheet_type: formData.sheet_type,
          data_source: formData.data_source,
          google_sheets_url:
            formData.data_source === "google-sheets" &&
            formData.google_sheets.length > 0
              ? formData.google_sheets[0].url
              : formData.google_sheets_url.trim(),
          google_sheets_tabs:
            formData.data_source === "google-sheets" &&
            formData.google_sheets.length > 0
              ? formData.google_sheets[0].selectedTabs.map((tab) => tab.name)
              : formData.google_sheets_tabs,
          allowed_categories: formData.allowed_categories,
          tabs: [],
          // Multi-sheet support - pass the original DataSource[] format for multi-sheet sync
          google_sheets:
            formData.data_source === "google-sheets" &&
            formData.google_sheets.length > 0
              ? formData.google_sheets
              : processedSheets,
        };

        logger.debug("📊 Submitting client data:", {
          data_source: clientData.data_source,
          google_sheets_url: clientData.google_sheets_url,
          google_sheets_tabs: clientData.google_sheets_tabs,
          selected_sheets: formData.selected_sheets,
          google_sheets: clientData.google_sheets,
          google_sheets_count: clientData.google_sheets?.length || 0,
          client_type: clientData.client_type,
          formData: {
            data_source: formData.data_source,
            google_sheets_url: formData.google_sheets_url,
            google_sheets_tabs: formData.google_sheets_tabs,
            selected_sheets: formData.selected_sheets,
            google_sheets: formData.google_sheets,
            google_sheets_count: formData.google_sheets?.length || 0,
            client_type: formData.client_type,
          },
        });

        let result;
        if (editingClient) {
          result = await updateClient(editingClient.id, clientData);
        } else {
          result = await addClient(clientData);
        }

        if (result.error) throw result.error;

        // Refresh clients data without clearing entire cache
        await loadClients();
        resetForm();

        // Show special message for admin clients
        if (formData.client_type === "primary") {
          setError(null); // Clear any previous errors
          logger.info(
            "✅ Undeniable Company configured - data will populate the existing Undeniable Dashboard"
          );
          // Note: The client won't appear in the clients list as it's marked as internal-only

          // Trigger automatic sync for admin clients
          try {
            if (clientData.google_sheets_url) {
              logger.info("🔄 Triggering automatic sync for admin client...");
              const { syncGoogleSheetsDynamic } = await import(
                "../../lib/dynamicSync"
              );
              const syncResult = await syncGoogleSheetsDynamic(
                result.data?.id || "admin-client",
                clientData.google_sheets_url,
                false // getColumnsOnly = false (full sync)
              );

              if (syncResult.success) {
                logger.info("✅ Automatic sync completed successfully", {
                  tabsProcessed: syncResult.data?.tabs_processed || 0,
                  metricsProcessed:
                    syncResult.data?.total_metrics_processed || 0,
                });
                setError(
                  `✅ Client created and synced successfully! Processed ${
                    syncResult.data?.tabs_processed || 0
                  } tabs with ${
                    syncResult.data?.total_metrics_processed || 0
                  } metrics.`
                );
              } else {
                logger.warn("⚠️ Automatic sync failed:", syncResult.error);
                setError(
                  `Client created successfully, but sync failed: ${syncResult.error}`
                );
              }
            }
          } catch (syncError) {
            logger.error("❌ Error during automatic sync:", syncError);
            setError(
              `Client created successfully, but sync failed: ${
                syncError instanceof Error ? syncError.message : "Unknown error"
              }`
            );
          }

          // Refresh filter context to load newly discovered sheets
          try {
            await refreshAvailableSheets();
            logger.info("🔄 Filter context refreshed with new sheets");
          } catch (refreshError) {
            logger.warn("⚠️ Failed to refresh filter context:", refreshError);
          }
        }

        // Process Excel file if Excel import is selected
        if (
          formData.data_source === "excel-import" &&
          excelFile &&
          result.data
        ) {
          await processExcelFile(excelFile, result.data.id);
        }

        if (onClientAdded && result.data) {
          onClientAdded(result.data);
        }
      } else if (formData.form_mode === "add_sheet") {
        // Add sheet to existing client logic
        let selectedClient = clients.find(
          (c) => c.id === formData.selected_existing_client
        );

        // If not found in regular clients, check if it's an admin client
        if (
          !selectedClient &&
          adminConfig &&
          adminConfig.id === formData.selected_existing_client
        ) {
          selectedClient = adminConfig;
        }

        if (!selectedClient) {
          throw new Error("Selected client not found");
        }

        // Update the client with the new sheet using multi-sheet format
        const updatedTabs = [
          ...(selectedClient.google_sheets_tabs || []),
          formData.sheet_name.trim(),
        ];
        const updatedClient = {
          ...selectedClient,
          google_sheets_tabs: updatedTabs,
          google_sheets_url:
            formData.google_sheets_url.trim() ||
            selectedClient.google_sheets_url,
          // Add the google_sheets array for multi-sheet sync
          google_sheets:
            formData.google_sheets && formData.google_sheets.length > 0
              ? formData.google_sheets
              : [],
        };

        logger.debug("📊 Add sheet - Submitting client data:", {
          clientId: selectedClient.id,
          google_sheets: updatedClient.google_sheets,
          google_sheets_count: updatedClient.google_sheets?.length || 0,
          formData_google_sheets: formData.google_sheets,
          formData_google_sheets_count: formData.google_sheets?.length || 0,
        });

        const result = await updateClient(selectedClient.id, updatedClient);
        if (result.error) throw result.error;

        // Refresh clients data without clearing entire cache
        await loadClients();
        resetForm();

        logger.info(
          `✅ Added sheet "${formData.sheet_name}" to ${selectedClient.name}`
        );
      }
    } catch (err) {
      logger.error("Error saving client:", err);

      // Check for duplicate slug error
      const error = err as { code?: string; message?: string };
      if (
        error?.code === "23505" &&
        error?.message?.includes("clients_slug_key")
      ) {
        setError(
          `A dashboard with the slug "${formData.slug}" already exists. Please delete the existing dashboard first or use a different name.`
        );
      } else {
        setError(error?.message || "Failed to save client");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUndeniableConfig = (adminClient: Client) => {
    logger.debug("🔍 Editing admin configuration:", adminClient);

    const existingTabs = adminClient.google_sheets_tabs || [];
    const uniqueTabs = [...new Set(existingTabs)] as string[];
    logger.debug("🔍 Existing tabs (raw):", existingTabs);
    logger.debug("🔍 Existing tabs (deduplicated):", uniqueTabs);
    logger.debug("🔍 Google Sheets URL:", adminClient.google_sheets_url);

    // Convert existing single-sheet data to multi-sheet format
    // We'll let the MultiSheetSelector discover the real tabs
    const existingSheets: DataSource[] = adminClient.google_sheets_url
      ? [
          {
            id: "existing-sheet-1",
            url: adminClient.google_sheets_url,
            name: adminClient.company_name || "Existing Sheet", // Use company name as default - will be updated when tabs are discovered
            type: "google-sheets",
            tabs: [], // Let MultiSheetSelector discover the real tabs
            selectedTabs: Array.from(
              new Set(adminClient.google_sheets_tabs || [])
            ).map((tabName: string, index: number) => ({
              name: tabName,
              gid: `${index}`, // We'll need to get actual GIDs from the sync process
              url: `${adminClient.google_sheets_url}#gid=${index}`,
            })), // Preserve existing selected tabs (deduplicated)
          },
        ]
      : [];

    setFormData({
      company_name: adminClient.company_name || adminClient.name || "",
      slug: adminClient.slug || "",
      logo_url: adminClient.logo_url || "",
      client_type: "primary", // Always primary for this edit
      sheet_type: "admin-dashboard", // Always admin dashboard
      data_source: adminClient.data_source || "google-sheets",
      google_sheets_url: adminClient.google_sheets_url || "",
      google_sheets_tabs: uniqueTabs,
      selected_sheets: uniqueTabs, // Make sure selected_sheets matches google_sheets_tabs
      allowed_categories: adminClient.allowed_categories || [],
      showDataSource: false,
      // For admin config editing, we're editing the existing client
      form_mode: "new_client", // Use main form submission flow
      selected_existing_client: "", // Clear this since we're editing, not adding to existing
      sheet_name: existingTabs[0] || "", // Show the first sheet name
      // Multi-sheet support
      google_sheets: existingSheets,
    });
    setEditingClient(adminClient);
    setShowForm(true);
  };

  const handleEdit = (client: Client) => {
    logger.debug("🔍 Editing client:", client);
    logger.debug("🔍 Available clients:", clients);
    logger.debug("🔍 Client ID:", client.id);
    logger.debug("🔍 Client name:", client.name);

    // Convert existing single-sheet data to multi-sheet format
    // We'll let the MultiSheetSelector discover the real tabs
    const existingSheets: DataSource[] = client.google_sheets_url
      ? [
          {
            id: "existing-sheet-1",
            url: client.google_sheets_url,
            name: client.company_name || client.name || "Existing Sheet", // Use company name as default
            type: "google-sheets",
            tabs: [], // Let MultiSheetSelector discover the real tabs
            selectedTabs: Array.from(
              new Set(client.google_sheets_tabs || [])
            ).map((tabName: string, index: number) => ({
              name: tabName,
              gid: `${index}`, // We'll need to get actual GIDs from the sync process
              url: `${client.google_sheets_url}#gid=${index}`,
            })), // Preserve existing selected tabs (deduplicated)
          },
        ]
      : [];

    setFormData({
      company_name: client.company_name || client.name || "",
      slug: client.slug || "",
      logo_url: client.logo_url || "",
      client_type: client.client_type || "client",
      sheet_type: client.sheet_type || "client-dashboard",
      data_source: client.data_source || "google-sheets", // Default to google-sheets instead of excel-import
      google_sheets_url: client.google_sheets_url || "",
      google_sheets_tabs: client.google_sheets_tabs || [],
      selected_sheets: client.google_sheets_tabs || [],
      allowed_categories: client.allowed_categories || [],
      showDataSource: false,
      // New fields - set to edit mode for existing client
      form_mode: "new_client", // Use main form submission flow for editing
      selected_existing_client: "", // Clear this since we're editing, not adding to existing
      sheet_name: "",
      // Multi-sheet support
      google_sheets: existingSheets,
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client: Client) => {
    logger.debug("🗑️ Attempting to delete client:", {
      client,
      hasId: !!client?.id,
      id: client?.id,
      name: client?.name,
    });

    if (!client?.id) {
      setError("Cannot delete client: Invalid client ID");
      logger.error("❌ Cannot delete client - no ID:", client);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${client.name}?`))
      return;

    try {
      setLoading(true);
      const { error } = await deleteClient(client.id);
      if (error) throw error;

      // Refresh clients data without clearing entire cache
      await loadClients();
    } catch (err) {
      logger.error("Error deleting client:", err);
      setError("Failed to delete client");
    } finally {
      setLoading(false);
    }
  };

  // Handle sync functionality for Undeniable Dashboard
  const handleSyncUndeniable = async () => {
    if (!adminConfig?.google_sheets_url) {
      setError("No Google Sheet configured for Undeniable Dashboard");
      // Clear the error after 3 seconds
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!user?.id) {
      setError("User not authenticated. Please log in.");
      // Clear the error after 3 seconds
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSyncing(true);
    setError(null); // Clear any existing errors

    try {
      logger.sync("🔄 Starting Undeniable sync from Client Management");
      logger.sync("📊 Undeniable config:", adminConfig);

      // Extract spreadsheet ID from URL
      const spreadsheetId = adminConfig.google_sheets_url.includes(
        "docs.google.com"
      )
        ? adminConfig.google_sheets_url.match(
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
          )?.[1]
        : adminConfig.google_sheets_url;

      if (!spreadsheetId) {
        setError("Invalid Google Sheets URL format");
        logger.error(
          "❌ Invalid Google Sheets URL:",
          adminConfig.google_sheets_url
        );
        return;
      }

      logger.sync("🔧 About to call syncGoogleSheetsEnhanced with:", {
        clientId: adminConfig.id || "admin-client",
        spreadsheetId,
        sheetName: adminConfig.google_sheets_tabs?.[0] || "Sheet1",
        tabName: adminConfig.google_sheets_tabs?.[0] || "Sheet1",
        tabGid: adminConfig.google_sheets_tabs?.[0] ? "0" : undefined,
      });

      // Use the dynamic sync function to process ALL tabs for the client
      const { syncGoogleSheetsDynamic } = await import("../../lib/dynamicSync");
      const result = await syncGoogleSheetsDynamic(
        adminConfig.id || "admin-client",
        spreadsheetId,
        false // getColumnsOnly = false (full sync)
      );

      logger.sync("📊 syncGoogleSheetsDynamic result:", result);

      if (result.success) {
        setError(
          `Dynamic sync completed successfully - processed ${
            result.data?.tabs_processed || 0
          } tabs with ${result.data?.total_metrics_processed || 0} metrics`
        );
        logger.info("✅ Dynamic sync completed from Client Management");

        // Refresh filter context to load newly synced metrics
        try {
          await refreshAvailableSheets();
          logger.info("🔄 Filter context refreshed with new sheets");
        } catch (refreshError) {
          logger.warn("⚠️ Failed to refresh filter context:", refreshError);
        }

        // Also trigger hierarchical data reload for sheet selector
        try {
          window.dispatchEvent(new CustomEvent("reload-hierarchical-data"));
          logger.info("🔄 Dispatched hierarchical data reload event");
        } catch (eventError) {
          logger.warn(
            "⚠️ Failed to dispatch hierarchical data reload event:",
            eventError
          );
        }

        // Dispatch a custom event to notify dashboard components (no redirect)
        try {
          window.dispatchEvent(
            new CustomEvent("dashboard-sync-completed", {
              detail: {
                success: true,
                metricsProcessed: result.data?.total_metrics_processed || 0,
                tabsProcessed: result.data?.tabs_processed || 0,
                sheetName: adminConfig.google_sheets_tabs?.[0] || "Sheet1",
              },
            })
          );
        } catch (eventError) {
          logger.warn(
            "⚠️ Could not dispatch sync completion event:",
            eventError
          );
        }

        // Clear success message after 5 seconds
        setTimeout(() => setError(null), 5000);
      } else {
        setError(`Dynamic sync failed: ${result.error}`);
        logger.error(
          "❌ Dynamic sync failed from Client Management:",
          result.error
        );
        // Clear error message after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Sync failed: ${errorMessage}`);
      logger.error("❌ Undeniable sync error from Client Management:", error);
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading clients...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sheet Management</h2>
          <p className="text-gray-600">
            Manage your clients and their configurations
          </p>
        </div>
        <div className="relative">
          <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
            {/* Main button area (80%) */}
            <button
              type="button"
              onClick={() => {
                logger.debug("🔍 Create new client clicked");
                setFormData((prev) => ({
                  ...prev,
                  form_mode: "new_client",
                  selected_existing_client: "create_new",
                }));
                setShowForm(true);
              }}
              className="flex-1 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            >
              <span>Add Client</span>
            </button>

            {/* Dropdown area (15%) */}
            <div
              className={`w-10 border-l border-gray-300 flex items-center justify-center relative ${
                clients.length === 0
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-gray-50"
              }`}
              title={
                clients.length === 0
                  ? "No existing clients to select from"
                  : "Select existing client"
              }
            >
              <select
                onChange={(e) => {
                  logger.debug("🔍 Dropdown changed to:", e.target.value);
                  const value = e.target.value;
                  if (value === "") {
                    setFormData((prev) => ({
                      ...prev,
                      form_mode: "new_client",
                      selected_existing_client: "",
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      form_mode: "add_sheet",
                      selected_existing_client: value,
                    }));
                    // Auto-populate client type based on selected client
                    const selectedClient = clients.find((c) => c.id === value);
                    if (selectedClient) {
                      setFormData((prev) => ({
                        ...prev,
                        client_type: selectedClient.client_type || "client",
                      }));
                    }
                  }
                  setShowForm(true);
                }}
                disabled={clients.length === 0}
                className={`w-full h-full bg-transparent border-0 text-transparent focus:outline-none focus:ring-0 appearance-none ${
                  clients.length === 0 ? "cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{ color: "transparent" }}
              >
                <option key="default-option" value="">
                  {clients.length === 0 ? "No clients" : "Select existing..."}
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} (
                    {client.client_type === "primary" ? "Internal" : "External"}
                    )
                  </option>
                ))}
              </select>
              <svg
                className={`w-4 h-4 pointer-events-none absolute ${
                  clients.length === 0 ? "text-gray-300" : "text-gray-400"
                }`}
                style={{
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={`border rounded-md p-4 mb-6 ${
            error.includes("completed successfully") ||
            error.includes("successfully")
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p
            className={`${
              error.includes("completed successfully") ||
              error.includes("successfully")
                ? "text-green-800"
                : "text-red-800"
            }`}
          >
            {error}
          </p>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Side - Form */}
        <div className="xl:col-span-2">
          {showForm && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingClient
                      ? "Edit Client"
                      : formData.form_mode === "new_client"
                      ? "Add New Client"
                      : formData.selected_existing_client
                      ? "Add Sheet to Client"
                      : "Select Client or Create New"}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Type - Only visible to admin role and when creating new client */}
                  {permissions.isAdmin &&
                    formData.form_mode === "new_client" &&
                    formData.selected_existing_client === "create_new" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Type
                        </label>
                        <select
                          value={formData.client_type}
                          onChange={(e) => {
                            const clientType = e.target.value;
                            logger.debug("🔄 Client type changed:", {
                              oldValue: formData.client_type,
                              newValue: clientType,
                            });
                            handleInputChange("client_type", clientType);
                            // Automatically set sheet type based on client type
                            handleInputChange(
                              "sheet_type",
                              getSheetTypeForClientType(clientType, brandConfig)
                            );

                            // Auto-populate company name for primary clients
                            if (clientType === "primary") {
                              handleInputChange(
                                "company_name",
                                getAdminCompanyName(brandConfig)
                              );
                              handleInputChange(
                                "slug",
                                getAdminCompanySlug(brandConfig)
                              );
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {getClientTypeOptions(brandConfig).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          {formData.client_type === "primary"
                            ? "Primary dashboard with full access"
                            : "External client dashboard with limited access"}
                        </p>
                      </div>
                    )}

                  {/* Dashboard Name - Only for new clients */}
                  {formData.form_mode === "new_client" &&
                    formData.selected_existing_client === "create_new" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dashboard Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) =>
                            handleInputChange("company_name", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formData.client_type === "primary"
                              ? "bg-gray-100 border-gray-300 text-gray-600"
                              : "border-gray-300"
                          }`}
                          placeholder="Enter company name"
                          required
                          readOnly={formData.client_type === "primary"}
                        />
                        {formData.client_type === "primary" && (
                          <p className="text-sm text-gray-500 mt-1">
                            Company Name is set from Brand Settings
                          </p>
                        )}
                      </div>
                    )}

                  {/* Logo URL */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) =>
                        handleInputChange("logo_url", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                {/* Metric Categories */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Metric Categories
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allCategories = categories.map((cat) => cat.key);
                        const isAllSelected =
                          formData.allowed_categories.length ===
                          allCategories.length;
                        handleInputChange(
                          "allowed_categories",
                          isAllSelected ? [] : allCategories
                        );
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {formData.allowed_categories.length === categories.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <label
                        key={category.key}
                        className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.allowed_categories.includes(
                            category.key
                          )}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...formData.allowed_categories, category.key]
                              : formData.allowed_categories.filter(
                                  (cat) => cat !== category.key
                                );
                            handleInputChange(
                              "allowed_categories",
                              newCategories
                            );
                          }}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Data Source - Collapsible Section */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        showDataSource: !prev.showDataSource,
                      }))
                    }
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Data Source
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.data_source === "google-sheets"
                          ? "Google Sheets"
                          : "Excel Import"}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {formData.showDataSource ? "−" : "+"}
                    </div>
                  </button>

                  {formData.showDataSource && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <div className="pt-4">
                        {/* Data Source Options - Side by Side */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Google Sheets Option */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="dataSource"
                                value="google-sheets"
                                checked={
                                  formData.data_source === "google-sheets"
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    "data_source",
                                    e.target.value
                                  )
                                }
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Google Sheets
                              </span>
                            </label>
                          </div>

                          {/* Excel Import Option */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="dataSource"
                                value="excel-import"
                                checked={
                                  formData.data_source === "excel-import"
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    "data_source",
                                    e.target.value
                                  )
                                }
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Excel Import
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Multi-Sheet Selector - Show for both Google Sheets and Excel */}
                        {(formData.data_source === "google-sheets" ||
                          formData.data_source === "excel-import") && (
                          <div className="mb-4">
                            <MultiSheetSelector
                              onSheetsChanged={handleSheetsChanged}
                              initialSheets={formData.google_sheets}
                              disabled={loading}
                              supportedTypes={
                                formData.data_source === "google-sheets"
                                  ? ["google-sheets"]
                                  : ["excel"]
                              }
                              userId={user?.id}
                              clientId={
                                formData.selected_existing_client || undefined
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                  {editingClient && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <Building2 size={16} />
                        <span>{editingClient ? "Update Client" : "Add"}</span>
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side - Client List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Undeniable Configuration Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Undeniable Configuration
              </h3>
              {adminConfig ? (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Building2 size={16} className="text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {adminConfig?.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            {adminConfig?.data_source === "google-sheets"
                              ? "Google Sheets"
                              : "Excel"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={handleSyncUndeniable}
                        disabled={isSyncing}
                        className={`p-1 transition-colors ${
                          isSyncing
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-400 hover:text-green-600"
                        }`}
                        title={isSyncing ? "Syncing..." : "Sync Google Sheets"}
                      >
                        <RefreshCw
                          size={14}
                          className={isSyncing ? "animate-spin" : ""}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminConfig && handleEditUndeniableConfig(adminConfig)
                        }
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        disabled={!adminConfig}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => adminConfig && handleDelete(adminConfig)}
                        disabled={!adminConfig}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Building2 size={20} className="text-gray-500" />
                  </div>
                  <p className="text-gray-500 mb-1 text-sm">
                    No clients configured yet
                  </p>
                  <p className="text-xs text-gray-400">
                    Add your first client to get started
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Regular Clients Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Client Dashboards
              </h3>
              {clients.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm">No clients found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={client.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Building2 size={16} className="text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">
                            {client.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {client.company_name}
                          </p>
                          <div className="flex items-center space-x-1 mt-1">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                client.client_type === "primary"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {client.client_type === "primary"
                                ? "Internal"
                                : "External"}
                            </span>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                              {client.data_source === "google-sheets"
                                ? "Sheets"
                                : "Excel"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(client)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(client)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
