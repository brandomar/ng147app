/**
 * Sheet Data Debugger - Focused debugging for Google Sheets data flow
 * This utility provides structured logging for sheet data extraction, processing, and configuration
 */

import { logger } from './logger';

export interface SheetDataDebugInfo {
  googleSheetId: string;
  sheetName: string;
  clientId?: string;
  userId?: string;
  headers?: string[];
  sampleRows?: any[];
  metricConfigs?: any[];
  discoveredMetrics?: any[];
  syncStatus?: 'success' | 'error' | 'partial';
  errorMessage?: string;
}

export class SheetDataDebugger {
  private context: string;
  private startTime: number;

  constructor(context: string) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Log the start of a sheet data operation
   */
  startOperation(operation: string, info: Partial<SheetDataDebugInfo>) {
    logger.info(`🚀 [${this.context}] Starting ${operation}:`, {
      operation,
      googleSheetId: info.googleSheetId ? this.maskSheetId(info.googleSheetId) : 'N/A',
      sheetName: info.sheetName || 'N/A',
      clientId: info.clientId || 'N/A',
      userId: info.userId ? this.maskUserId(info.userId) : 'N/A',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log sheet data extraction results
   */
  logSheetDataExtraction(info: SheetDataDebugInfo) {
    logger.debug(`📊 [${this.context}] Sheet data extracted:`, {
      headersCount: info.headers?.length || 0,
      headers: info.headers?.slice(0, 10), // First 10 headers
      sampleRowsCount: info.sampleRows?.length || 0,
      sampleRows: info.sampleRows?.slice(0, 3), // First 3 rows
      hasData: (info.headers?.length || 0) > 0
    });
  }

  /**
   * Log metric configuration discovery
   */
  logMetricDiscovery(info: SheetDataDebugInfo) {
    logger.debug(`🔍 [${this.context}] Metric discovery results:`, {
      discoveredMetricsCount: info.discoveredMetrics?.length || 0,
      discoveredMetrics: info.discoveredMetrics?.map(m => ({
        name: m.name,
        column: m.column,
        type: m.type,
        sampleValue: m.sampleValue
      })) || [],
      hasConfigurations: (info.metricConfigs?.length || 0) > 0
    });
  }

  /**
   * Log metric configuration processing
   */
  logMetricConfigProcessing(info: SheetDataDebugInfo) {
    logger.debug(`⚙️ [${this.context}] Metric configuration processing:`, {
      configsCount: info.metricConfigs?.length || 0,
      configs: info.metricConfigs?.map(c => ({
        id: c.id,
        metricName: c.metric_name,
        sheetColumn: c.sheet_column_name,
        displayName: c.display_name,
        isEnabled: c.is_enabled,
        metricType: c.metric_type
      })) || [],
      enabledConfigs: info.metricConfigs?.filter(c => c.is_enabled).length || 0
    });
  }

  /**
   * Log sync operation results
   */
  logSyncResults(info: SheetDataDebugInfo) {
    const duration = Date.now() - this.startTime;
    
    if (info.syncStatus === 'success') {
      logger.info(`✅ [${this.context}] Sync completed successfully:`, {
        duration: `${duration}ms`,
        metricsProcessed: info.metricConfigs?.length || 0,
        sheetName: info.sheetName,
        googleSheetId: info.googleSheetId ? this.maskSheetId(info.googleSheetId) : 'N/A'
      });
    } else if (info.syncStatus === 'error') {
      logger.error(`❌ [${this.context}] Sync failed:`, {
        duration: `${duration}ms`,
        error: info.errorMessage,
        sheetName: info.sheetName,
        googleSheetId: info.googleSheetId ? this.maskSheetId(info.googleSheetId) : 'N/A'
      });
    } else if (info.syncStatus === 'partial') {
      logger.warn(`⚠️ [${this.context}] Sync completed with issues:`, {
        duration: `${duration}ms`,
        error: info.errorMessage,
        metricsProcessed: info.metricConfigs?.length || 0,
        sheetName: info.sheetName
      });
    }
  }

  /**
   * Log data flow between components
   */
  logDataFlow(from: string, to: string, data: any) {
    logger.debug(`🔄 [${this.context}] Data flow: ${from} → ${to}:`, {
      dataType: typeof data,
      dataSize: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
      sampleData: Array.isArray(data) ? data.slice(0, 2) : data
    });
  }

  /**
   * Log component state changes
   */
  logComponentState(component: string, state: any) {
    logger.debug(`🏗️ [${this.context}] ${component} state:`, {
      component,
      stateKeys: Object.keys(state || {}),
      hasData: Object.keys(state || {}).length > 0
    });
  }

  /**
   * Log errors with context
   */
  logError(operation: string, error: any, context?: any) {
    logger.error(`💥 [${this.context}] Error in ${operation}:`, {
      operation,
      error: error.message || error,
      stack: error.stack,
      context
    });
  }

  /**
   * Mask sensitive information in logs
   */
  private maskSheetId(sheetId: string): string {
    if (sheetId.includes('docs.google.com')) {
      const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const id = match[1];
        return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
      }
    }
    return sheetId.length > 12 ? `${sheetId.substring(0, 8)}...${sheetId.substring(sheetId.length - 4)}` : sheetId;
  }

  private maskUserId(userId: string): string {
    return userId.length > 8 ? `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}` : userId;
  }
}

/**
 * Create a debugger instance for a specific context
 */
export function createSheetDataDebugger(context: string): SheetDataDebugger {
  return new SheetDataDebugger(context);
}

/**
 * Quick debug functions for common operations
 */
export const sheetDebug = {
  /**
   * Debug sheet data extraction
   */
  extraction: (sheetId: string, sheetName: string, headers: string[], sampleRows: any[]) => {
    const sheetDebugger = createSheetDataDebugger('SHEET_EXTRACTION');
    sheetDebugger.logSheetDataExtraction({
      googleSheetId: sheetId,
      sheetName,
      headers,
      sampleRows
    });
  },

  /**
   * Debug metric configuration
   */
  config: (configs: any[], discoveredMetrics: any[]) => {
    const sheetDebugger = createSheetDataDebugger('METRIC_CONFIG');
    sheetDebugger.logMetricConfigProcessing({
      metricConfigs: configs,
      discoveredMetrics
    });
  },

  /**
   * Debug sync operation
   */
  sync: (sheetId: string, sheetName: string, status: 'success' | 'error' | 'partial', error?: string) => {
    const sheetDebugger = createSheetDataDebugger('SYNC_OPERATION');
    sheetDebugger.logSyncResults({
      googleSheetId: sheetId,
      sheetName,
      syncStatus: status,
      errorMessage: error
    });
  }
};
