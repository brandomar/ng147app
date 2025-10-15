// Enhanced Google Metric Sync Edge Function
// Handles bulk metric synchronization from Google Sheets to enhanced metrics table
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Enhanced interfaces for bulk operations
interface BulkMetricEntry {
  user_id: string;
  client_id: string;
  google_sheet_id: string;
  sheet_name: string;
  tab_name: string;
  tab_gid: string;
  data_source_type: string;
  data_source_id: string;
  metric_name: string;
  category: string;
  metric_type: string;
  value: number;
  date: string;
  created_at: string;
}

interface EnhancedSyncRequest {
  user_id: string;
  client_id: string;
  google_sheet_id: string;
  sheet_name: string;
  tab_name?: string;
  tab_gid?: string;
  sync_type: 'client' | 'undeniable';
  get_columns_only?: boolean;
  discover_sheets_only?: boolean;
}

interface GoogleSheetRow {
  [key: string]: string | number;
}

interface SupabaseClient {
  from: (table: string) => {
    insert: (data: unknown[]) => Promise<{ error: Error | null; data: unknown }>;
    upsert: (data: unknown[], options?: { onConflict?: string }) => Promise<{ error: Error | null }>;
    delete: () => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          eq: (column: string, value: unknown) => Promise<{ error: Error | null }>;
        };
      };
    };
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => Promise<{ error: Error | null; data: unknown[] }>;
      };
    };
  };
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<{ error: Error | null; data: unknown }>;
}

// Enhanced data transformation utilities
class EnhancedDataTransformer {
  static parseValue(value: string, _metricType: string): number {
    if (!value || value === '' || value === '-') return 0;
    
    let stringValue = value.toString().trim();
    
    // Handle negative numbers in parentheses: (1,234) → -1234
    if (stringValue.startsWith('(') && stringValue.endsWith(')')) {
      stringValue = '-' + stringValue.slice(1, -1);
    }
    
    // Handle percentages: 12.5% → 12.5 (store as numeric, not decimal)
    const hasPercent = stringValue.includes('%');
    
    // Remove currency symbols ($, €, £), commas, and percent signs
    const cleaned = stringValue.replace(/[$€£,%]/g, '');
    const parsed = parseFloat(cleaned);
    
    // Return 0 for invalid numbers
    if (isNaN(parsed)) return 0;
    
    // For percentages, return the numeric value (12.5% → 12.5, not 0.125)
    return parsed;
  }

  static formatDate(dateInput: string): string {
    try {
      // Handle Excel serial dates (numbers like 44927)
      if (!isNaN(Number(dateInput))) {
        const excelEpoch = new Date(1899, 11, 30); // Excel's epoch
        const days = parseInt(dateInput);
        const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // Try parsing as date string
      // Supports: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, and ISO formats
      let date = new Date(dateInput);
      
      // If direct parsing fails, try manual parsing for common formats
      if (isNaN(date.getTime())) {
        // Try MM/DD/YYYY or DD/MM/YYYY
        const parts = dateInput.split(/[\/\-]/);
        if (parts.length === 3) {
          // Try YYYY-MM-DD first
          if (parts[0].length === 4) {
            date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            // Try MM/DD/YYYY (US format) - most common
            date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
        }
      }

      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      // Fallback to current date
      return new Date().toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  static detectMetricType(value: string, metricName: string): 'currency' | 'percentage' | 'number' {
    const nameLower = metricName.toLowerCase();

    // Check for currency symbols in value (strongest indicator)
    if (/[$€£]/.test(value)) return "currency";

    // Check for percentage in value (strong indicator)
    if (value.includes("%")) return "percentage";

    // Special cases that should be numbers (not currency)
    if (
      /roas|roi|bounce|click|impression|lead|conversion|call|show|close|email|session/i.test(
        nameLower
      )
    ) {
      // These are counts or ratios, not currency
      return "number";
    }

    // CTR and rate metrics are percentages
    if (/ctr|rate|percent|ratio|opt-in/i.test(nameLower)) {
      return "percentage";
    }

    // Cost and spend metrics are currency
    if (
      /cost|spend|spent|revenue|price|budget|cpm|cpc|cpa|aov/i.test(nameLower)
    ) {
      return "currency";
    }

    // Default to number
    return "number";
  }

  static categorizeMetric(metricName: string): string {
    const name = metricName.toLowerCase();
    
    // Spend & Revenue
    if (name.includes('spend') || name.includes('revenue') || name.includes('cash') || 
        name.includes('roas') || name.includes('roi') || name.includes('budget')) return 'spend-revenue';
    
    // Cost per Show / Cost per Call
    if (name.includes('cost per') || name.includes('cost per show') || name.includes('cost per call')) return 'cost-per-show';
    
    // Funnel Volume
    if (name.includes('lead') || name.includes('sql') || name.includes('calls booked') || 
        name.includes('live calls') || name.includes('shows') || name.includes('closed sales') || 
        name.includes('closes') || name.includes('conversion')) return 'funnel-volume';
    
    // Funnel Conversion Rates
    if (name.includes('rate') || name.includes('opt-in') || name.includes('show rate') || 
        name.includes('offer rate') || name.includes('close rate')) return 'funnel-conversion';
    
    // Legacy mappings for existing metrics
    if (name.includes('click') || name.includes('impression') || name.includes('reach')) return 'spend-revenue';
    if (name.includes('email') || name.includes('outreach') || name.includes('cold')) return 'funnel-volume';
    if (name.includes('spam') || name.includes('unsubscribe')) return 'funnel-volume';
    
    return 'spend-revenue'; // Default to spend-revenue instead of general
  }

  static extractTabNameFromSheetName(sheetName: string): string {
    // If sheet name contains tab info, extract it
    if (sheetName.includes(' - ')) {
      return sheetName.split(' - ')[1];
    }
    return 'Main';
  }
}

// Enhanced Google Sheets API utilities
class EnhancedGoogleSheetsAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getSheetData(spreadsheetId: string, sheetName: string, range: string = 'A:AZ'): Promise<GoogleSheetRow[]> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length < 2) {
      throw new Error('Sheet must have at least a header row and one data row');
    }

    // Convert to objects with header names as keys
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return dataRows.map((row: string[]) => {
      const obj: GoogleSheetRow = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  async getSheetNames(spreadsheetId: string): Promise<Array<{name: string, gid: string}>> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const sheets = data.sheets || [];
    
    return sheets.map((sheet: any) => ({
      name: sheet.properties?.title || 'Untitled',
      gid: sheet.properties?.sheetId?.toString() || '0'
    }));
  }

  static async getAccessToken(): Promise<string> {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { data: secrets, error: secretsError } = await supabaseService
      .from('secrets')
      .select('key, value')
      .in('key', ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY']);

    if (secretsError || !secrets || secrets.length === 0) {
      throw new Error('Google service account credentials not found in secrets table');
    }

    const emailSecret = secrets.find(s => s.key === 'GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const keySecret = secrets.find(s => s.key === 'GOOGLE_PRIVATE_KEY');

    if (!emailSecret || !keySecret) {
      throw new Error('Missing Google credentials in secrets table');
    }

    const serviceAccountEmail = emailSecret.value;
    const privateKey = keySecret.value.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      throw new Error('Google service account credentials are empty');
    }

    // Create JWT for service account authentication
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    const jwt = await this.createJWT(header, payload, privateKey);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  }

  private static async createJWT(header: any, payload: any, privateKey: string): Promise<string> {
    const encoder = new TextEncoder();
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = await this.sign(signatureInput, privateKey);
    
    return `${signatureInput}.${signature}`;
  }

  private static async sign(input: string, privateKey: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(input)
    );

    return btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private static pemToArrayBuffer(pem: string): ArrayBuffer {
    const pemContents = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Enhanced sync processor with bulk operations
class EnhancedMetricSyncProcessor {
  private supabase: SupabaseClient;
  private googleSheets: EnhancedGoogleSheetsAPI;

  constructor(supabase: SupabaseClient, googleSheets: EnhancedGoogleSheetsAPI) {
    this.supabase = supabase;
    this.googleSheets = googleSheets;
  }

  async processSync(request: EnhancedSyncRequest): Promise<{ success: boolean; message: string; metricsProcessed: number }> {
    try {
      console.log('🚀 Enhanced sync starting:', {
        user_id: request.user_id,
        client_id: request.client_id,
        google_sheet_id: request.google_sheet_id,
        sheet_name: request.sheet_name,
        tab_name: request.tab_name
      });

      // Clean up existing metrics for this sheet/tab combination
      await this.cleanupExistingMetrics(request);

      // Get sheet data
      const sheetData = await this.googleSheets.getSheetData(
        request.google_sheet_id,
        request.sheet_name
      );

      if (!sheetData || sheetData.length === 0) {
        return {
          success: false,
          message: 'No data found in sheet',
          metricsProcessed: 0
        };
      }

      // Process data in bulk
      const bulkMetrics = await this.processSheetDataBulk(sheetData, request);
      
      if (bulkMetrics.length === 0) {
        return {
          success: false,
          message: 'No valid metrics found in sheet data',
          metricsProcessed: 0
        };
      }

      // Bulk insert all metrics at once
      // Note: onConflict is omitted to allow PostgreSQL to automatically use the partial unique index
      // metrics_unique_google_sheets will be used since google_sheet_id is NOT NULL
      const { error } = await this.supabase
        .from('metrics')
        .upsert(bulkMetrics);

      if (error) {
        console.error('❌ Bulk insert error:', error);
        return {
          success: false,
          message: `Failed to insert metrics: ${error.message}`,
          metricsProcessed: 0
        };
      }

      console.log(`✅ Enhanced sync completed: ${bulkMetrics.length} metrics processed`);
      
      return {
        success: true,
        message: `Successfully synced ${bulkMetrics.length} metrics`,
        metricsProcessed: bulkMetrics.length
      };

    } catch (error: unknown) {
      console.error('❌ Enhanced sync error:', error);
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metricsProcessed: 0
      };
    }
  }

  private async cleanupExistingMetrics(request: EnhancedSyncRequest): Promise<void> {
    try {
      console.log('🧹 Cleaning up existing metrics for sheet:', request.sheet_name);
      
      const { error } = await this.supabase
        .from('metrics')
        .delete()
        .eq('user_id', request.user_id)
        .eq('client_id', request.client_id)
        .eq('google_sheet_id', request.google_sheet_id)
        .eq('sheet_name', request.sheet_name);

      if (error) {
        console.warn('⚠️ Could not clean up existing metrics:', error);
      } else {
        console.log('✅ Existing metrics cleaned up');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error (continuing):', error);
    }
  }

  private async processSheetDataBulk(sheetData: GoogleSheetRow[], request: EnhancedSyncRequest): Promise<BulkMetricEntry[]> {
    const bulkMetrics: BulkMetricEntry[] = [];
    const tabName = request.tab_name || EnhancedDataTransformer.extractTabNameFromSheetName(request.sheet_name);
    const tabGid = request.tab_gid || '0';

    console.log(`📊 Processing ${sheetData.length} rows for sheet: ${request.sheet_name}, tab: ${tabName}`);

    for (const row of sheetData) {
      try {
        if (typeof row !== 'object' || row === null) {
          console.log(`⚠️ Skipping invalid row:`, row);
          continue;
        }
        
        const rowObj = row as Record<string, unknown>;
        
        // Row-based zero handling: Skip entire row if ALL metric values are zero
        // This filters out future dates and template rows
        const hasNonZeroValue = Object.entries(rowObj).some(([key, val]) => {
          if (key.toLowerCase() === 'date') return false;
          if (!val) return false;
          const parsed = EnhancedDataTransformer.parseValue(val.toString(), 'number');
          return parsed !== 0;
        });
        
        if (!hasNonZeroValue) {
          console.log(`⚠️ Skipping row with all zeros`);
          continue;
        }
        
        const date = EnhancedDataTransformer.formatDate(String(rowObj.Date || rowObj.date || new Date().toISOString()));
        
        // Process each metric in the row
        for (const [metricName, value] of Object.entries(rowObj)) {
          if (metricName.toLowerCase() === 'date' || !value) continue;
          
          const valueStr = value.toString();
          const parsedValue = EnhancedDataTransformer.parseValue(valueStr, 'number');
          
          // Detect metric type based on value and name
          const metricType = EnhancedDataTransformer.detectMetricType(valueStr, metricName);
          const category = EnhancedDataTransformer.categorizeMetric(metricName);
          
          const metricEntry: BulkMetricEntry = {
            user_id: request.user_id,
            client_id: request.client_id,
            google_sheet_id: request.google_sheet_id,
            sheet_name: request.sheet_name,
            tab_name: tabName,
            tab_gid: tabGid,
            data_source_type: 'google_sheets',
            data_source_id: request.google_sheet_id,
            metric_name: metricName,
            category,
            metric_type: metricType,
            value: parsedValue,
            date,
            created_at: new Date().toISOString()
          };

          bulkMetrics.push(metricEntry);
        }
      } catch (rowError: unknown) {
        console.error(`❌ Row processing error:`, rowError);
      }
    }

    console.log(`✅ Processed ${bulkMetrics.length} metrics from ${sheetData.length} rows`);
    return bulkMetrics;
  }
}

// Main handler
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body first (can only be read once)
    const request: EnhancedSyncRequest = await req.json();

    // Debug: Log all headers
    console.log(
      "🔍 Request headers:",
      Object.fromEntries(req.headers.entries())
    );

    // Validate JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("🔍 Authorization header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Missing or invalid Authorization header:", authHeader);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing or invalid Authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("🔍 Extracted token length:", token.length);
    console.log("🔍 Token starts with:", token.substring(0, 20) + "...");

    // Initialize Supabase client for JWT validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    console.log("🔍 Supabase URL:", supabaseUrl);
    console.log("🔍 Anon key exists:", !!supabaseAnonKey);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Validate the JWT token
    console.log("🔍 Attempting JWT validation...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("❌ JWT validation failed:", authError);
      console.error("❌ User data:", user);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid JWT token",
          error: authError?.message || "Unknown error",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ JWT validated for user:", user.id);

    // Check permissions using new permission system
    try {
      const { data: hasSyncPermission, error: permError } = await supabase.rpc(
        "has_permission",
        {
          p_user_id: user.id,
          p_permission: "canSyncData",
        }
      );

      if (permError) {
        console.warn(
          "⚠️ Could not check permissions, continuing with sync:",
          permError
        );
      } else if (!hasSyncPermission) {
        console.error("❌ User does not have permission to sync data");
        return new Response(
          JSON.stringify({
            success: false,
            message: "Insufficient permissions to sync data",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      console.warn("⚠️ Permission check failed, continuing with sync:", error);
    }

    // Validate request
    if (!request.user_id || !request.google_sheet_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters: user_id, google_sheet_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For tab discovery, we don't need sheet_name and sync_type
    if (
      !request.discover_sheets_only &&
      (!request.sheet_name || !request.sync_type)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters: sheet_name, sync_type",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with user's JWT token for database operations
    // This ensures RLS policies work correctly with the authenticated user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Initialize Google Sheets API
    const accessToken = await EnhancedGoogleSheetsAPI.getAccessToken();
    const googleSheets = new EnhancedGoogleSheetsAPI(accessToken);

    // Handle tab discovery case
    if (request.discover_sheets_only) {
      try {
        console.log(
          "🔍 Discovering sheets for spreadsheet:",
          request.google_sheet_id
        );

        // Get all sheets from the spreadsheet
        const sheets = await googleSheets.getSheetNames(
          request.google_sheet_id
        );

        if (!sheets || sheets.length === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "No sheets found in the spreadsheet",
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(
          `✅ Found ${sheets.length} sheets:`,
          sheets.map((s) => s.name)
        );

        return new Response(
          JSON.stringify({
            success: true,
            sheets: sheets,
            message: `Found ${sheets.length} sheets`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error: unknown) {
        console.error("❌ Error discovering sheets:", error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to discover sheets: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Process sync with enhanced bulk operations
    const processor = new EnhancedMetricSyncProcessor(
      supabaseUser as unknown as SupabaseClient,
      googleSheets
    );
    const result = await processor.processSync(request);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error('Enhanced Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
