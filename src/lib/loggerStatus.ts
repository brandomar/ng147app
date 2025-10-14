/**
 * Logger Status Check and Tamper Protection Utility
 * Provides secure access to logger status and prevents tampering
 */

import { logger } from './logger';

export interface LoggerStatusInfo {
  status: {
    clientDebugEnabled: boolean;
    debugLevel: string;
    isProduction: boolean;
    devLoggingEnabled: boolean;
    verboseLoggingEnabled: boolean;
    tamperProtectionActive: boolean;
    logBufferSize: number;
    maxBufferSize: number;
  };
  security: {
    isTamperProtected: boolean;
    consoleIntact: boolean;
    loggerStateIntact: boolean;
  };
  recommendations: string[];
}

/**
 * Get comprehensive logger status information
 */
export function getLoggerStatusInfo(): LoggerStatusInfo {
  const status = logger.getLoggerStatus();
  const isTamperProtected = logger.isTamperProtected();
  
  // Check individual security components
  const consoleIntact = checkConsoleIntegrity();
  const loggerStateIntact = checkLoggerStateIntegrity();
  
  // Generate recommendations
  const recommendations = generateRecommendations(status, isTamperProtected);
  
  return {
    status,
    security: {
      isTamperProtected,
      consoleIntact,
      loggerStateIntact
    },
    recommendations
  };
}

/**
 * Check if console methods have been tampered with
 */
function checkConsoleIntegrity(): boolean {
  try {
    // Check if console methods are still functions
    const methods = ['log', 'warn', 'error', 'info', 'debug'];
    return methods.every(method => typeof console[method as keyof Console] === 'function');
  } catch {
    return false;
  }
}

/**
 * Check if logger state has been tampered with
 */
function checkLoggerStateIntegrity(): boolean {
  try {
    const status = logger.getLoggerStatus();
    // Check if critical values are within expected ranges
    return (
      typeof status.clientDebugEnabled === 'boolean' &&
      ['debug', 'info', 'warn', 'error'].includes(status.debugLevel) &&
      typeof status.isProduction === 'boolean' &&
      status.logBufferSize >= 0 &&
      status.logBufferSize <= status.maxBufferSize
    );
  } catch {
    return false;
  }
}

/**
 * Generate security and performance recommendations
 */
function generateRecommendations(
  status: any, 
  isTamperProtected: boolean
): string[] {
  const recommendations: string[] = [];
  
  // Security recommendations
  if (!isTamperProtected) {
    recommendations.push('🚨 CRITICAL: Logger has been tampered with - investigate immediately');
  }
  
  if (!status.tamperProtectionActive) {
    recommendations.push('⚠️ Tamper protection is disabled - enable for production');
  }
  
  // Performance recommendations
  if (status.logBufferSize > status.maxBufferSize * 0.8) {
    recommendations.push('📊 Log buffer is 80% full - consider clearing or increasing size');
  }
  
  if (status.clientDebugEnabled && status.isProduction) {
    recommendations.push('🔧 Client debugging is enabled in production - disable for performance');
  }
  
  if (status.verboseLoggingEnabled && status.isProduction) {
    recommendations.push('📝 Verbose logging is enabled in production - disable for performance');
  }
  
  // Best practices
  if (status.debugLevel === 'debug' && status.isProduction) {
    recommendations.push('🎯 Debug level is set to "debug" in production - use "info" or higher');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Logger configuration is optimal');
  }
  
  return recommendations;
}

/**
 * Print logger status to console in a formatted way
 */
export function printLoggerStatus(): void {
  const info = getLoggerStatusInfo();
  
  console.group('🔍 Logger Status Report');
  
  console.group('📊 Status');
  console.log('Client Debug:', info.status.clientDebugEnabled ? '✅ Enabled' : '❌ Disabled');
  console.log('Debug Level:', info.status.debugLevel);
  console.log('Production:', info.status.isProduction ? '✅ Yes' : '❌ No');
  console.log('Dev Logging:', info.status.devLoggingEnabled ? '✅ Enabled' : '❌ Disabled');
  console.log('Verbose Logging:', info.status.verboseLoggingEnabled ? '✅ Enabled' : '❌ Disabled');
  console.log('Tamper Protection:', info.status.tamperProtectionActive ? '✅ Active' : '❌ Inactive');
  console.log('Log Buffer:', `${info.status.logBufferSize}/${info.status.maxBufferSize}`);
  console.groupEnd();
  
  console.group('🛡️ Security');
  console.log('Tamper Protected:', info.security.isTamperProtected ? '✅ Yes' : '❌ No');
  console.log('Console Intact:', info.security.consoleIntact ? '✅ Yes' : '❌ No');
  console.log('Logger State Intact:', info.security.loggerStateIntact ? '✅ Yes' : '❌ No');
  console.groupEnd();
  
  console.group('💡 Recommendations');
  info.recommendations.forEach(rec => console.log(rec));
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * Quick status check for development
 */
export function quickLoggerCheck(): boolean {
  const info = getLoggerStatusInfo();
  const isHealthy = info.security.isTamperProtected && info.security.consoleIntact;
  
  if (!isHealthy) {
    console.warn('⚠️ Logger health check failed:', info.recommendations);
  }
  
  return isHealthy;
}
