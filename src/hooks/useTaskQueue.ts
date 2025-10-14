import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TaskQueue, TaskQueueState, Task } from '../lib/taskQueue';

export interface UseTaskQueueOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
  autoExecute?: boolean;
}

export interface UseTaskQueueReturn {
  queue: TaskQueue;
  state: TaskQueueState;
  isExecuting: boolean;
  currentTask: Task | null;
  progress: number;
  executeNext: () => Promise<boolean>;
  executeAll: () => Promise<void>;
  skipTask: (taskId: string) => void;
  resetTask: (taskId: string) => void;
  resetAll: () => void;
  getTask: (taskId: string) => Task | undefined;
  getReadyTasks: () => Task[];
  hasErrors: boolean;
  errors: Map<string, Error>;
}

/**
 * React hook for managing task queues
 */
export function useTaskQueue(options: UseTaskQueueOptions = {}): UseTaskQueueReturn {
  const { onComplete, onError, autoExecute = false } = options;
  
  const [state, setState] = useState<TaskQueueState>({
    tasks: new Map(),
    executionOrder: [],
    currentTaskIndex: 0,
    isExecuting: false,
    errors: new Map()
  });

  const queueRef = useRef<TaskQueue | null>(null);
  const [queue] = useState(() => {
    const newQueue = new TaskQueue();
    queueRef.current = newQueue;
    return newQueue;
  });

  // Subscribe to queue state changes
  useEffect(() => {
    const unsubscribe = queue.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [queue]);

  // Auto-execute if enabled
  useEffect(() => {
    if (autoExecute && !state.isExecuting) {
      const readyTasks = queue.getReadyTasks();
      if (readyTasks.length > 0) {
        executeNext();
      }
    }
  }, [autoExecute, state.isExecuting, queue]);

  const executeNext = useCallback(async (): Promise<boolean> => {
    if (!queueRef.current) return false;
    
    try {
      const result = await queueRef.current.executeNext();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      return false;
    }
  }, [onError]);

  const executeAll = useCallback(async (): Promise<void> => {
    if (!queueRef.current) return;
    
    try {
      await queueRef.current.executeAll();
      onComplete?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, [onComplete, onError]);

  const skipTask = useCallback((taskId: string) => {
    queueRef.current?.skipTask(taskId);
  }, []);

  const resetTask = useCallback((taskId: string) => {
    queueRef.current?.resetTask(taskId);
  }, []);

  const resetAll = useCallback(() => {
    queueRef.current?.resetAll();
  }, []);

  const getTask = useCallback((taskId: string) => {
    return queueRef.current?.getTask(taskId);
  }, []);

  const getReadyTasks = useCallback(() => {
    return queueRef.current?.getReadyTasks() || [];
  }, []);

  // Calculate progress
  const progress = useMemo(() => {
    const totalTasks = state.tasks.size;
    if (totalTasks === 0) return 0;
    
    const completedTasks = Array.from(state.tasks.values()).filter(
      task => task.status === 'completed' || task.status === 'skipped'
    ).length;
    
    return (completedTasks / totalTasks) * 100;
  }, [state.tasks]);

  // Get current task
  const currentTask = useMemo(() => {
    return Array.from(state.tasks.values()).find(task => task.status === 'in_progress') || null;
  }, [state.tasks]);

  // Check if there are any errors
  const hasErrors = state.errors.size > 0;

  return {
    queue,
    state,
    isExecuting: state.isExecuting,
    currentTask,
    progress,
    executeNext,
    executeAll,
    skipTask,
    resetTask,
    resetAll,
    getTask,
    getReadyTasks,
    hasErrors,
    errors: state.errors
  };
}

