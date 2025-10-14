import * as XLSX from 'xlsx';
import { logger } from './logger';

/**
 * Excel Parser Utility
 * Reuses the same transformation logic as Google Sheets Edge Function
 */

export interface ExcelParseResult {
  success: boolean;
  data: any[];
  error?: string;
  sheetNames: string[];
}

export interface MetricEntry {
  user_id: string;
  client_id: string;
  category: string;
  metric_name: string;
  value: number;
  date: string;
  data_source: "excel-import";
  google_sheet_id: null; // Not applicable for Excel/CSV
  sheet_name: string; // Filename
  tab_name: string; // Sheet name within Excel file
  tab_gid: string; // Sheet index as string
  data_source_type: "excel_import" | "csv_import";
  data_source_id: string; // Filename or hash for uniqueness
  metric_type: "actual"; // Default metric type
  created_at: string;
  updated_at: string;
}

/**
 * Parse Excel file and extract data from all sheets
 */
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  try {
    logger.debug("📊 Parsing Excel file:", {
      fileName: file.name,
      fileSize: file.size,
    });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetNames = workbook.SheetNames;
    logger.debug("📊 Found Excel sheets:", sheetNames);

    if (sheetNames.length === 0) {
      return {
        success: false,
        data: [],
        error: "No sheets found in Excel file",
        sheetNames: [],
      };
    }

    // Parse the first sheet by default (can be extended to handle multiple sheets)
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      return {
        success: false,
        data: [],
        error: `Sheet "${firstSheetName}" not found`,
        sheetNames,
      };
    }

    // Convert sheet to JSON using the same approach as Google Sheets
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use first row as headers
      defval: "", // Default value for empty cells
      raw: false, // Parse values (dates, numbers, etc.)
    });

    logger.debug("📊 Parsed Excel data:", {
      rows: jsonData.length,
      columns: jsonData[0]?.length || 0,
    });

    return {
      success: true,
      data: jsonData,
      sheetNames,
    };
  } catch (error: any) {
    logger.error("❌ Excel parsing error:", error);
    return {
      success: false,
      data: [],
      error: `Failed to parse Excel file: ${error.message}`,
      sheetNames: [],
    };
  }
}

/**
 * Transform Excel data using the same logic as Google Sheets Edge Function
 * This reuses the parsing and categorization logic from the Edge Function
 */
export function transformExcelData(
  rawData: any[][],
  userId: string,
  clientId: string,
  sheetName: string,
  fileName: string
): MetricEntry[] {
  try {
    if (!rawData || rawData.length < 2) {
      logger.warn("⚠️ Insufficient Excel data for transformation");
      return [];
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    logger.debug("📊 Transforming Excel data:", {
      headers: headers.length,
      rows: dataRows.length,
      sheetName,
    });

    const metricEntries: MetricEntry[] = [];
    const currentDate = new Date().toISOString().split("T")[0];

    // Process each data row
    dataRows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return;

      // Process each column (header)
      headers.forEach((header, colIndex) => {
        if (!header || colIndex >= row.length) return;

        const cellValue = row[colIndex];
        if (!cellValue || cellValue === "") return;

        // Parse the value using the same logic as Google Sheets
        const parsedValue = parseValue(cellValue);
        if (parsedValue === null) return;

        // Create metric name from header (same as Google Sheets)
        const metricName = normalizeMetricName(header);

        // Use smart categorization (same as Google Sheets)
        const category = categorizeMetric(metricName);

        // Determine file type and generate data source ID
        const fileType = fileName.toLowerCase().endsWith(".csv")
          ? "csv_import"
          : "excel_import";
        const dataSourceId = `${fileName}_${Date.now()}`; // Unique identifier for this import

        const metricEntry: MetricEntry = {
          user_id: userId,
          client_id: clientId,
          category,
          metric_name: metricName,
          value: parsedValue,
          date: currentDate,
          data_source: "excel-import",
          google_sheet_id: null, // Not applicable for Excel/CSV
          sheet_name: fileName, // Use filename as sheet name
          tab_name: sheetName, // Sheet name within Excel file
          tab_gid: "0", // Default to 0 for single sheet files
          data_source_type: fileType,
          data_source_id: dataSourceId,
          metric_type: "actual",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        metricEntries.push(metricEntry);
      });
    });

    logger.debug("📊 Transformed Excel data:", {
      totalEntries: metricEntries.length,
      categories: [...new Set(metricEntries.map((e) => e.category))],
      metrics: [...new Set(metricEntries.map((e) => e.metric_name))],
    });

    return metricEntries;
  } catch (error: any) {
    logger.error("❌ Excel data transformation error:", error);
    return [];
  }
}

/**
 * Parse cell value using the same logic as Google Sheets Edge Function
 */
function parseValue(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Handle numbers
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  // Handle strings
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;

    // Try to parse as number
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // Handle percentage values
    if (trimmed.endsWith("%")) {
      const percentValue = parseFloat(trimmed.replace("%", ""));
      return isNaN(percentValue) ? null : percentValue / 100;
    }

    // Handle currency values (remove $ and commas)
    const currencyValue = trimmed.replace(/[$,\s]/g, "");
    const currencyParsed = parseFloat(currencyValue);
    if (!isNaN(currencyParsed)) {
      return currencyParsed;
    }
  }

  return null;
}

/**
 * Normalize metric name using the same logic as Google Sheets Edge Function
 */
function normalizeMetricName(header: string): string {
  if (!header) return "";

  return header
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .trim();
}

/**
 * Categorize metric using the same logic as Google Sheets Edge Function
 */
function categorizeMetric(metricName: string): string {
  if (!metricName) return "other";

  const name = metricName.toLowerCase();

  // Growth metrics
  if (
    name.includes("growth") ||
    name.includes("increase") ||
    name.includes("growth_rate")
  ) {
    return "growth";
  }

  // Performance metrics
  if (
    name.includes("performance") ||
    name.includes("efficiency") ||
    name.includes("roi") ||
    name.includes("roas")
  ) {
    return "performance";
  }

  // Cold email metrics
  if (
    name.includes("cold") ||
    name.includes("email") ||
    name.includes("outreach")
  ) {
    return "cold-email";
  }

  // Ads metrics
  if (
    name.includes("ad") ||
    name.includes("spend") ||
    name.includes("campaign") ||
    name.includes("cpc") ||
    name.includes("cpm")
  ) {
    return "ads";
  }

  // Spam outreach metrics
  if (
    name.includes("spam") ||
    name.includes("automation") ||
    name.includes("sequence")
  ) {
    return "spam-outreach";
  }

  // Revenue metrics
  if (
    name.includes("revenue") ||
    name.includes("sales") ||
    name.includes("income") ||
    name.includes("profit")
  ) {
    return "spend_revenue";
  }

  // Cost metrics
  if (
    name.includes("cost") ||
    name.includes("expense") ||
    name.includes("budget")
  ) {
    return "cost_per_show";
  }

  // Funnel metrics
  if (
    name.includes("funnel") ||
    name.includes("conversion") ||
    name.includes("opt_in") ||
    name.includes("show_rate")
  ) {
    return "funnel_conversion";
  }

  // Default category
  return "other";
}

/**
 * Insert metric entries into the database
 */
export async function insertExcelMetricEntries(
  entries: MetricEntry[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (entries.length === 0) {
      return { success: true };
    }

    const { supabase } = await import("./database");

    const { error } = await supabase.from("metrics").upsert(entries, {
      onConflict:
        "user_id,client_id,data_source_id,date,category,metric_name,metric_type",
    });

    if (error) {
      logger.error("❌ Failed to insert Excel metric entries:", error);
      return { success: false, error: error.message };
    }

    logger.info("✅ Successfully inserted Excel metric entries:", {
      count: entries.length,
    });
    return { success: true };
  } catch (error: any) {
    logger.error("❌ Excel metric insertion error:", error);
    return { success: false, error: error.message };
  }
}
