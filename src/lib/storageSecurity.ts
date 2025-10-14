/**
 * Secure localStorage utilities for financial dashboard
 * Ensures no sensitive data is stored in localStorage
 */

// Storage size limits
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB limit
const STORAGE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Sensitive data patterns to never store
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
  /social/i,
  /financial/i,
  /revenue/i,
  /cost/i,
  /profit/i,
  /expense/i,
  /income/i,
  /balance/i,
  /amount/i,
  /value/i,
  /price/i,
  /salary/i,
  /wage/i
];

/**
 * Sanitize data before storing in localStorage
 * Removes any potentially sensitive information
 */
export const sanitizeForStorage = (data: any): any => {
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
        sanitized[key] = sanitizeForStorage(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Secure localStorage setItem with validation
 */
export const secureSetItem = (key: string, value: any): boolean => {
  try {
    // Sanitize data before storing
    const sanitizedValue = sanitizeForStorage(value);
    const stringValue = JSON.stringify(sanitizedValue);
    
    // Check storage size
    if (stringValue.length > MAX_STORAGE_SIZE) {
      console.warn(`Storage size too large for key ${key}: ${stringValue.length} bytes`);
      return false;
    }
    
    // Add timestamp for expiration
    const dataWithTimestamp = {
      data: sanitizedValue,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
    return true;
  } catch (error) {
    console.warn(`Error storing data for key ${key}:`, error);
    return false;
  }
};

/**
 * Secure localStorage getItem with validation
 */
export const secureGetItem = (key: string): any => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Check if data has expired
    if (parsed.timestamp && Date.now() - parsed.timestamp > STORAGE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.warn(`Error retrieving data for key ${key}:`, error);
    localStorage.removeItem(key); // Clean up corrupted data
    return null;
  }
};

/**
 * Clean up expired storage
 */
export const cleanupExpiredStorage = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith('staff_') || key.startsWith('client_') || key.startsWith('metric_config_')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.timestamp && now - parsed.timestamp > STORAGE_EXPIRY) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Error cleaning up expired storage:', error);
  }
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = (): { used: number; total: number; percentage: number } => {
  try {
    let used = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
    });
    
    const total = 5 * 1024 * 1024; // 5MB typical limit
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  } catch {
    return { used: 0, total: 0, percentage: 0 };
  }
};
