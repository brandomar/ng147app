/**
 * Conditional Data Loading Hooks
 * Only load data when it's actually needed
 */
import { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

interface ConditionalDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

/**
 * Hook for loading data only when a condition is met
 */
export const useConditionalData = <T>(
  loadFunction: () => Promise<T>,
  condition: boolean,
  dependencies: any[] = []
): ConditionalDataState<T> => {
  const [state, setState] = useState<ConditionalDataState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false
  });

  const loadData = useCallback(async () => {
    if (!condition || state.loaded) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await loadFunction();
      setState({ data, loading: false, error: null, loaded: true });
      logger.debug('✅ Conditional data loaded', { dataType: typeof data });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      logger.error('❌ Conditional data load failed:', error);
    }
  }, [condition, state.loaded, ...dependencies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return state;
};

/**
 * Hook for loading data only when user performs an action
 */
export const useActionTriggeredData = <T>(
  loadFunction: () => Promise<T>,
  trigger: boolean,
  dependencies: any[] = []
): ConditionalDataState<T> & { triggerLoad: () => void } => {
  const [state, setState] = useState<ConditionalDataState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false
  });

  const triggerLoad = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await loadFunction();
      setState({ data, loading: false, error: null, loaded: true });
      logger.debug('✅ Action-triggered data loaded', { dataType: typeof data });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      logger.error('❌ Action-triggered data load failed:', error);
    }
  }, dependencies);

  useEffect(() => {
    if (trigger) {
      triggerLoad();
    }
  }, [trigger, triggerLoad]);

  return { ...state, triggerLoad };
};

/**
 * Hook for loading data only when a tab/section is active
 */
export const useTabBasedData = <T>(
  loadFunction: () => Promise<T>,
  isActive: boolean,
  dependencies: any[] = []
): ConditionalDataState<T> => {
  return useConditionalData(loadFunction, isActive, dependencies);
};
