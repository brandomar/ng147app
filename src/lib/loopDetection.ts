/**
 * Loop Detection System
 * 
 * Prevents infinite loops by tracking function calls and blocking excessive calls
 */

interface CallTracker {
  [key: string]: {
    count: number;
    lastCall: number;
    blocked: boolean;
  };
}

const callTracker: CallTracker = {};
const MAX_CALLS_PER_SECOND = 10;
const BLOCK_DURATION_MS = 5000; // Block for 5 seconds if limit exceeded

/**
 * Track a function call and prevent loops
 * @param functionName - Name of the function being called
 * @param maxCallsPerSecond - Maximum calls allowed per second (default: 10)
 * @returns true if call is allowed, false if blocked
 */
export const trackCall = (functionName: string, maxCallsPerSecond: number = MAX_CALLS_PER_SECOND): boolean => {
  const now = Date.now();
  const key = functionName;
  
  if (!callTracker[key]) {
    callTracker[key] = {
      count: 0,
    lastCall: now,
      blocked: false
    };
  }
  
  const tracker = callTracker[key];
  
  // Reset count if more than 1 second has passed
  if (now - tracker.lastCall > 1000) {
    tracker.count = 0;
    tracker.blocked = false;
  }
  
  // Check if we're in a blocked state
  if (tracker.blocked) {
    if (now - tracker.lastCall > BLOCK_DURATION_MS) {
      // Unblock after timeout
      tracker.blocked = false;
      tracker.count = 0;
    } else {
      console.warn(`🚫 Loop detected: ${functionName} is blocked due to excessive calls`);
      return false;
    }
  }
  
  // Increment call count
  tracker.count++;
  tracker.lastCall = now;
  
  // Check if we've exceeded the limit
  if (tracker.count > maxCallsPerSecond) {
    tracker.blocked = true;
    console.error(`🚨 INFINITE LOOP DETECTED: ${functionName} called ${tracker.count} times in 1 second! Blocking for ${BLOCK_DURATION_MS}ms`);
    return false;
  }
  
  return true;
};

/**
 * Reset tracking for a specific function
 */
export const resetTracking = (functionName: string): void => {
  delete callTracker[functionName];
};

/**
 * Get current tracking stats
 */
export const getTrackingStats = (): CallTracker => {
  return { ...callTracker };
};
