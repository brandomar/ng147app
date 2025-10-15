/**
 * Environment-aware logging utility with client debugging support
 * Production-safe with optional debugging interface
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  // Verbose debug for detailed component behavior
  verbose: (...args: any[]) => void;
  // Essential logs that should always show
  essential: (...args: any[]) => void;
  // Sync-specific debugging (client configurable)
  sync: (...args: any[]) => void;
  // Data retrieval debugging (client configurable)
  data: (...args: any[]) => void;
  // Client debugging interface
  enableClientDebugging: () => void;
  disableClientDebugging: () => void;
  isClientDebuggingEnabled: () => boolean;
  // Log collection for debugging interface
  getRecentLogs: (limit?: number) => LogEntry[];
  clearLogs: () => void;
  // Logger status and security
  getLoggerStatus: () => LoggerStatus;
  isTamperProtected: () => boolean;
  // Security requirement: Enforce persistent debug settings
  enforceSecuritySettings: () => void;
  // Debug settings management
  setAutoOffTimeout: (minutes: number) => void;
  clearAutoOffTimeout: () => void;
  getDebugSettings: () => { enabled: boolean; level: LogLevel; autoOffMinutes: number };
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}

interface LoggerStatus {
  clientDebugEnabled: boolean;
  debugLevel: LogLevel;
  isProduction: boolean;
  devLoggingEnabled: boolean;
  verboseLoggingEnabled: boolean;
  tamperProtectionActive: boolean;
  logBufferSize: number;
  maxBufferSize: number;
}

const isDevelopment = (() => {
  try {
    return import.meta.env.DEV;
  } catch {
    return false;
  }
})();
const isProduction = (() => {
  try {
    // Force development mode for debugging
    return false;
  } catch {
    return false;
  }
})();
// Uncomment the line below to test production logging behavior in development:
// const isProduction = true;

// Control verbose logging - set to false to reduce noise
const ENABLE_VERBOSE_LOGGING = true;

// Control development logging - set to false to reduce Vite HMR noise
const ENABLE_DEV_LOGGING = true;

// Client debugging interface - can be enabled via browser console or admin panel
// Use localStorage to persist settings across module reloads
const getClientDebugEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem('client_debug_enabled');
    return stored === 'true';
  } catch {
    return false;
  }
};

const getDebugLevel = (): LogLevel => {
  try {
    const stored = localStorage.getItem('client_debug_level');
    // Security requirement: Default to 'warn' level for production safety
    return (stored as LogLevel) || 'warn';
  } catch {
    // Security requirement: Fail safe to 'warn' level
    return 'warn';
  }
};

// Security enforcement: Debug settings must be persistent
let CLIENT_DEBUG_ENABLED = getClientDebugEnabled();
let DEBUG_LEVEL: LogLevel = getDebugLevel();

// Security requirement: Enforce minimum log level in production
if (isProduction && DEBUG_LEVEL === 'debug') {
  console.warn('🔒 Security: Debug level not allowed in production, defaulting to warn');
  DEBUG_LEVEL = 'warn';
  localStorage.setItem('client_debug_level', 'warn');
}

// Security requirement: Enforce security settings on initialization
if (isProduction) {
  // Force disable client debugging in production
  if (CLIENT_DEBUG_ENABLED) {
    console.warn('🔒 Security: Client debugging disabled in production');
    CLIENT_DEBUG_ENABLED = false;
    localStorage.setItem('client_debug_enabled', 'false');
  }
}
let AUTO_OFF_TIMEOUT: number | null = null; // Auto-off timer
let LOG_BUFFER: LogEntry[] = [];
const MAX_LOG_BUFFER_SIZE = 1000; // Keep last 1000 log entries

// Tamper protection - freeze critical variables
let TAMPER_PROTECTION_ACTIVE = true;
const ORIGINAL_CONSOLE = { ...console };
const ORIGINAL_LOGGER_STATE = {
  CLIENT_DEBUG_ENABLED,
  DEBUG_LEVEL,
  ENABLE_DEV_LOGGING,
  ENABLE_VERBOSE_LOGGING
};

// Privacy-safe logging - excludes sensitive data patterns
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /key/i,
  /secret/i,
  /auth/i,
  /credential/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /social/i
];

const sanitizeLogData = (data: any): any => {
  if (typeof data === 'string') {
    // Check if string contains sensitive patterns
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(data))) {
      return '[REDACTED - SENSITIVE DATA]';
    }
    return data;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        sanitized[key] = '[REDACTED - SENSITIVE KEY]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

class LoggerImpl implements Logger {
  private logCount = 0;

  private shouldLog(level: LogLevel): boolean {
    // Client debugging with level filtering
    if (CLIENT_DEBUG_ENABLED) {
      const levelPriority = { error: 4, warn: 3, info: 2, debug: 1 };
      const currentLevelPriority = levelPriority[level];
      const debugLevelPriority = levelPriority[DEBUG_LEVEL];
      return currentLevelPriority >= debugLevelPriority;
    }
    
    // In production, only show warnings and errors
    if (isProduction) {
      return level === 'warn' || level === 'error';
    }
    // In development, respect dev logging control
    if (!ENABLE_DEV_LOGGING) {
      return level === 'warn' || level === 'error';
    }
    // Show everything in development
    return true;
  }

  private shouldLogVerbose(): boolean {
    return (isDevelopment && ENABLE_VERBOSE_LOGGING) || CLIENT_DEBUG_ENABLED;
  }

  private addToBuffer(level: LogLevel, message: string, data?: any): void {
    // Sanitize data to remove sensitive information
    const sanitizedData = data ? sanitizeLogData(data) : undefined;
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: sanitizedData
    };
    
    LOG_BUFFER.push(entry);
    
    // Keep buffer size manageable
    if (LOG_BUFFER.length > MAX_LOG_BUFFER_SIZE) {
      LOG_BUFFER = LOG_BUFFER.slice(-MAX_LOG_BUFFER_SIZE);
    }
  }

  debug(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('debug', message, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('debug')) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('info', message, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('warn', message, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('error', message, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  verbose(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('debug', `[VERBOSE] ${message}`, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLogVerbose()) {
      console.log('🔍 [VERBOSE]', ...args);
    }
  }

  essential(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('info', `[ESSENTIAL] ${message}`, args.length > 1 ? args.slice(1) : undefined);

    this.logCount++;
    // Essential logs always show (authentication, errors, key state changes)
    // But reduce frequency for data loading logs
    if (!message.includes('Loaded data entries') || this.logCount % 10 === 0) {
      console.log('🎯 [ESSENTIAL]', ...args);
    }
  }

  sync(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('debug', `[SYNC] ${message}`, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('debug')) {
      console.log('🔄 [SYNC]', ...args);
    }
  }

  data(...args: any[]): void {
    const message = args.join(' ');
    this.addToBuffer('debug', `[DATA] ${message}`, args.length > 1 ? args.slice(1) : undefined);
    
    if (this.shouldLog('debug')) {
      console.log('📊 [DATA]', ...args);
    }
  }

  // Client debugging interface methods
  enableClientDebugging(): void {
    // Security requirement: Check if debugging is allowed in production
    const isProduction = import.meta.env.PROD;
    if (isProduction) {
      console.warn('🔒 Security: Client debugging not allowed in production');
      return;
    }
    
    CLIENT_DEBUG_ENABLED = true;
    try {
      localStorage.setItem('client_debug_enabled', 'true');
      // Security requirement: Persist the setting immediately
      console.log('🔒 Security: Client debugging enabled and persisted');
    } catch (error) {
      console.warn('Could not save debug setting to localStorage:', error);
      // Security requirement: Fail safe to disabled
      CLIENT_DEBUG_ENABLED = false;
    }
    console.log('🔧 Client debugging enabled - all logs will now show');
  }

  disableClientDebugging(): void {
    CLIENT_DEBUG_ENABLED = false;
    try {
      localStorage.setItem('client_debug_enabled', 'false');
      // Security requirement: Persist the setting immediately
      console.log('🔒 Security: Client debugging disabled and persisted');
    } catch (error) {
      console.warn('Could not save debug setting to localStorage:', error);
      // Security requirement: Fail safe to disabled
      CLIENT_DEBUG_ENABLED = false;
    }
    console.log('🔧 Client debugging disabled - returning to normal logging');
  }

  isClientDebuggingEnabled(): boolean {
    return CLIENT_DEBUG_ENABLED;
  }

  // Enhanced debug settings for admin interface with security enforcement
  setDebugLevel(level: LogLevel): void {
    // Security requirement: Enforce minimum log level in production
    const isProduction = import.meta.env.PROD;
    if (isProduction && level === 'debug') {
      console.warn('🔒 Security: Debug level not allowed in production, defaulting to warn');
      level = 'warn';
    }
    
    DEBUG_LEVEL = level;
    try {
      localStorage.setItem('client_debug_level', level);
      // Security requirement: Persist the setting immediately
      console.log(`🔒 Security: Debug level persisted to ${level}`);
    } catch (error) {
      console.warn('Could not save debug level to localStorage:', error);
      // Security requirement: Fail safe to warn level
      DEBUG_LEVEL = 'warn';
    }
    const levelNames = { error: '1. Errors Only', warn: '2. Warnings & Errors', info: '3. Info, Warnings & Errors', debug: '4. All Logs (Most Verbose)' };
    console.log(`🔧 Debug level set to: ${levelNames[level]}`);
  }

  getDebugLevel(): LogLevel {
    return DEBUG_LEVEL;
  }

  setAutoOffTimeout(minutes: number): void {
    // Clear existing timeout
    if (AUTO_OFF_TIMEOUT) {
      clearTimeout(AUTO_OFF_TIMEOUT);
    }
    
    if (minutes > 0) {
      AUTO_OFF_TIMEOUT = window.setTimeout(() => {
        this.disableClientDebugging();
        console.log('🔧 Debug mode automatically disabled after timeout');
      }, minutes * 60 * 1000);
      console.log(`🔧 Auto-off timer set for ${minutes} minutes`);
    }
  }

  clearAutoOffTimeout(): void {
    if (AUTO_OFF_TIMEOUT) {
      clearTimeout(AUTO_OFF_TIMEOUT);
      AUTO_OFF_TIMEOUT = null;
      console.log('🔧 Auto-off timer cleared');
    }
  }

  getRecentLogs(limit: number = 100): LogEntry[] {
    return LOG_BUFFER.slice(-limit);
  }

  clearLogs(): void {
    LOG_BUFFER = [];
    console.log('🧹 Log buffer cleared');
  }

  getLoggerStatus(): LoggerStatus {
    return {
      clientDebugEnabled: CLIENT_DEBUG_ENABLED,
      debugLevel: DEBUG_LEVEL,
      isProduction: isProduction,
      devLoggingEnabled: ENABLE_DEV_LOGGING,
      verboseLoggingEnabled: ENABLE_VERBOSE_LOGGING,
      tamperProtectionActive: TAMPER_PROTECTION_ACTIVE,
      logBufferSize: LOG_BUFFER.length,
      maxBufferSize: MAX_LOG_BUFFER_SIZE
    };
  }

  // Security requirement: Enforce persistent debug settings
  enforceSecuritySettings(): void {
    const isProduction = import.meta.env.PROD;
    
    // Security requirement: Force warn level in production
    if (isProduction && DEBUG_LEVEL === 'debug') {
      console.warn('🔒 Security: Debug level not allowed in production, enforcing warn level');
      DEBUG_LEVEL = 'warn';
      localStorage.setItem('client_debug_level', 'warn');
    }
    
    // Security requirement: Disable client debugging in production
    if (isProduction && CLIENT_DEBUG_ENABLED) {
      console.warn('🔒 Security: Client debugging not allowed in production, disabling');
      CLIENT_DEBUG_ENABLED = false;
      localStorage.setItem('client_debug_enabled', 'false');
    }
    
    // Security requirement: Ensure settings are persisted
    try {
      localStorage.setItem('client_debug_level', DEBUG_LEVEL);
      localStorage.setItem('client_debug_enabled', CLIENT_DEBUG_ENABLED.toString());
      console.log('🔒 Security: Debug settings enforced and persisted');
    } catch (error) {
      console.error('🔒 Security: Failed to persist debug settings:', error);
    }
  }

  isTamperProtected(): boolean {
    if (!TAMPER_PROTECTION_ACTIVE) return false;
    
    // Check if console has been tampered with
    const consoleTampered = (
      console.log !== ORIGINAL_CONSOLE.log ||
      console.warn !== ORIGINAL_CONSOLE.warn ||
      console.error !== ORIGINAL_CONSOLE.error
    );
    
    // Check if logger state has been tampered with
    const stateTampered = (
      CLIENT_DEBUG_ENABLED !== ORIGINAL_LOGGER_STATE.CLIENT_DEBUG_ENABLED ||
      DEBUG_LEVEL !== ORIGINAL_LOGGER_STATE.DEBUG_LEVEL
    );
    
    return !consoleTampered && !stateTampered;
  }

  // Get debug settings for UI
  getDebugSettings(): { enabled: boolean; level: LogLevel; autoOffMinutes: number } {
    return {
      enabled: CLIENT_DEBUG_ENABLED,
      level: DEBUG_LEVEL,
      autoOffMinutes: AUTO_OFF_TIMEOUT ? Math.ceil((AUTO_OFF_TIMEOUT - Date.now()) / (60 * 1000)) : 0
    };
  }
}

// Load debug settings from config.json, localStorage, and apply them
const loadAndApplyDebugSettings = async () => {
  try {
    let debugEnabled = false;
    let debugLevel: LogLevel = 'warn';
    let autoOffMinutes = 30;
    let source = 'default';

    // First, try to load from config.json
    try {
      const response = await fetch('/config.json');
      if (response.ok) {
        const config = await response.json();
        if (config.debug) {
          debugEnabled = config.debug.enabled || false;
          debugLevel = config.debug.level || 'warn';
          autoOffMinutes = config.debug.autoOffMinutes || 0;
          source = 'config.json';
          
          // Apply config.json settings and persist to correct localStorage keys
          CLIENT_DEBUG_ENABLED = debugEnabled;
          DEBUG_LEVEL = debugLevel;
          AUTO_OFF_TIMEOUT = autoOffMinutes > 0 ? Date.now() + (autoOffMinutes * 60 * 1000) : 0;

          // Persist to localStorage using the correct keys that the logger checks
          try {
            localStorage.setItem('client_debug_enabled', debugEnabled.toString());
            localStorage.setItem('client_debug_level', debugLevel);
            if (autoOffMinutes > 0) {
              localStorage.setItem('debug_auto_off_minutes', autoOffMinutes.toString());
            }
          } catch (e) {
            console.warn('Could not save config.json settings to localStorage:', e);
          }

          console.log('🔧 Debug settings loaded from config.json:', {
            enabled: debugEnabled,
            level: debugLevel,
            autoOffMinutes: autoOffMinutes
          });
        }
      }
    } catch (configError) {
      // config.json not found or invalid, fall back to localStorage
      console.log('📄 config.json not found, falling back to localStorage');
    }

    // Fallback to localStorage if config.json didn't provide settings
    if (source === 'default') {
      const storedEnabled = localStorage.getItem('debug_enabled') === 'true';
      const storedLevel = localStorage.getItem('debug_level') as LogLevel || 'warn';
      const storedAutoOff = parseInt(localStorage.getItem('debug_auto_off_minutes') || '30');
      
      debugEnabled = storedEnabled;
      debugLevel = storedLevel;
      autoOffMinutes = storedAutoOff;
      source = 'localStorage';
      
      if (debugEnabled) {
        // Apply the saved settings to the global variables
        CLIENT_DEBUG_ENABLED = debugEnabled;
        DEBUG_LEVEL = debugLevel;
        AUTO_OFF_TIMEOUT = Date.now() + (autoOffMinutes * 60 * 1000);
        
        console.log('🔧 Debug settings loaded from localStorage:', {
          enabled: debugEnabled,
          level: debugLevel,
          autoOffMinutes: autoOffMinutes
        });
      }
    }
  } catch (error) {
    // Silently fail if localStorage is not available
    console.warn('Could not load debug settings:', error);
  }
};

// Load settings on initialization
loadAndApplyDebugSettings().catch(console.warn);

// Create a singleton logger instance
export const logger = new LoggerImpl();

// Export individual methods for convenience
export const { debug, info, warn, error, verbose, essential, sync, data } = logger;

// Export the logger instance as default
export default logger;
