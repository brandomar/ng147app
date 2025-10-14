/**
 * Task Queue System for Dashboard Undeniable
 * 
 * This system enforces proper order of operations to prevent steps from happening out of order.
 * Each task has prerequisites that must be completed before the task can be executed.
 */

export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  prerequisites: string[]; // Array of task IDs that must be completed first
  execute: () => Promise<void>;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  maxRetries?: number;
}

export interface TaskQueueState {
  tasks: Map<string, Task>;
  executionOrder: string[];
  currentTaskIndex: number;
  isExecuting: boolean;
  errors: Map<string, Error>;
}

export class TaskQueue {
  private state: TaskQueueState;
  private listeners: Set<(state: TaskQueueState) => void> = new Set();

  constructor() {
    this.state = {
      tasks: new Map(),
      executionOrder: [],
      currentTaskIndex: 0,
      isExecuting: false,
      errors: new Map()
    };
  }

  /**
   * Add a task to the queue
   */
  addTask(task: Task): void {
    this.state.tasks.set(task.id, {
      ...task,
      status: 'pending',
      retryCount: 0,
      maxRetries: task.maxRetries || 3
    });
    
    this.recalculateExecutionOrder();
    this.notifyListeners();
  }

  /**
   * Remove a task from the queue
   */
  removeTask(taskId: string): void {
    this.state.tasks.delete(taskId);
    this.recalculateExecutionOrder();
    this.notifyListeners();
  }

  /**
   * Get the current state of the queue
   */
  getState(): TaskQueueState {
    return { ...this.state };
  }

  /**
   * Get a specific task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.state.tasks.get(taskId);
  }

  /**
   * Get all tasks that are ready to execute (prerequisites met)
   */
  getReadyTasks(): Task[] {
    return this.state.executionOrder
      .map(id => this.state.tasks.get(id))
      .filter((task): task is Task => {
        if (!task || task.status !== 'pending') return false;
        
        // Check if all prerequisites are completed
        return task.prerequisites.every(prereqId => {
          const prereqTask = this.state.tasks.get(prereqId);
          return prereqTask?.status === 'completed';
        });
      });
  }

  /**
   * Get the next task that should be executed
   */
  getNextTask(): Task | null {
    const readyTasks = this.getReadyTasks();
    if (readyTasks.length === 0) return null;

    // Return the first ready task in execution order
    for (const taskId of this.state.executionOrder) {
      const task = this.state.tasks.get(taskId);
      if (task && readyTasks.includes(task)) {
        return task;
      }
    }
    
    return null;
  }

  /**
   * Execute the next task in the queue
   */
  async executeNext(): Promise<boolean> {
    if (this.state.isExecuting) {
      console.warn('⚠️ Task queue is already executing');
      return false;
    }

    const nextTask = this.getNextTask();
    if (!nextTask) {
      console.log('✅ No more tasks to execute');
      return false;
    }

    this.state.isExecuting = true;
    this.updateTaskStatus(nextTask.id, 'in_progress');
    this.notifyListeners();

    try {
      console.log(`🚀 Executing task: ${nextTask.name}`);
      await nextTask.execute();
      
      this.updateTaskStatus(nextTask.id, 'completed');
      console.log(`✅ Task completed: ${nextTask.name}`);
      
      if (nextTask.onComplete) {
        nextTask.onComplete();
      }
      
      this.notifyListeners();
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Task failed: ${nextTask.name}`, err);
      
      this.state.errors.set(nextTask.id, err);
      
      // Check if we should retry
      const task = this.state.tasks.get(nextTask.id);
      if (task && task.retryCount! < task.maxRetries!) {
        task.retryCount!++;
        this.updateTaskStatus(nextTask.id, 'pending');
        console.log(`🔄 Retrying task: ${nextTask.name} (attempt ${task.retryCount}/${task.maxRetries})`);
      } else {
        this.updateTaskStatus(nextTask.id, 'failed');
        console.error(`💥 Task failed permanently: ${nextTask.name}`);
      }
      
      if (nextTask.onError) {
        nextTask.onError(err);
      }
      
      this.notifyListeners();
      return false;
    } finally {
      this.state.isExecuting = false;
    }
  }

  /**
   * Execute all tasks in the queue
   */
  async executeAll(): Promise<void> {
    console.log('🚀 Starting task queue execution');
    
    while (true) {
      const hasMore = await this.executeNext();
      if (!hasMore) break;
    }
    
    console.log('🏁 Task queue execution completed');
  }

  /**
   * Skip a task (mark as skipped)
   */
  skipTask(taskId: string): void {
    this.updateTaskStatus(taskId, 'skipped');
    this.notifyListeners();
  }

  /**
   * Reset a task to pending status
   */
  resetTask(taskId: string): void {
    const task = this.state.tasks.get(taskId);
    if (task) {
      task.status = 'pending';
      task.retryCount = 0;
      this.state.errors.delete(taskId);
      this.notifyListeners();
    }
  }

  /**
   * Reset all tasks to pending status
   */
  resetAll(): void {
    this.state.tasks.forEach(task => {
      task.status = 'pending';
      task.retryCount = 0;
    });
    this.state.errors.clear();
    this.state.currentTaskIndex = 0;
    this.state.isExecuting = false;
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: TaskQueueState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update task status and notify listeners
   */
  private updateTaskStatus(taskId: string, status: Task['status']): void {
    const task = this.state.tasks.get(taskId);
    if (task) {
      task.status = status;
    }
  }

  /**
   * Recalculate the execution order based on prerequisites
   */
  private recalculateExecutionOrder(): void {
    const taskIds = Array.from(this.state.tasks.keys());
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (taskId: string) => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }
      if (visited.has(taskId)) return;

      visiting.add(taskId);
      
      const task = this.state.tasks.get(taskId);
      if (task) {
        // Visit all prerequisites first
        for (const prereqId of task.prerequisites) {
          if (!this.state.tasks.has(prereqId)) {
            throw new Error(`Prerequisite task not found: ${prereqId} (required by ${taskId})`);
          }
          visit(prereqId);
        }
      }

      visiting.delete(taskId);
      visited.add(taskId);
      order.push(taskId);
    };

    // Visit all tasks
    for (const taskId of taskIds) {
      if (!visited.has(taskId)) {
        visit(taskId);
      }
    }

    this.state.executionOrder = order;
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in task queue listener:', error);
      }
    });
  }
}

/**
 * Predefined task types for common operations
 */
export const TaskTypes = {
  // Client setup tasks
  VALIDATE_GOOGLE_SHEET: 'validate_google_sheet',
  CONFIGURE_METRICS: 'configure_metrics',
  SYNC_GOOGLE_SHEETS: 'sync_google_sheets',
  
  // Staff setup tasks
  VALIDATE_STAFF_GOOGLE_SHEET: 'validate_staff_google_sheet',
  CONFIGURE_STAFF_METRICS: 'configure_staff_metrics',
  SYNC_STAFF_GOOGLE_SHEETS: 'sync_staff_google_sheets',
} as const;

/**
 * Create a task queue for client setup
 */
export function createClientSetupQueue(
  clientId: string,
  googleSheetId: string,
  onComplete?: () => void,
  onError?: (error: Error) => void
): TaskQueue {
  const queue = new TaskQueue();

  // Task 1: Validate Google Sheet connection
  queue.addTask({
    id: TaskTypes.VALIDATE_GOOGLE_SHEET,
    name: 'Validate Google Sheet Connection',
    description: 'Verify that the Google Sheet is accessible and has the correct format',
    prerequisites: [],
    execute: async () => {
      // This would call the edge function with get_columns_only: true
      // to validate the sheet without requiring metric configurations
      console.log(`🔍 Validating Google Sheet for client ${clientId}`);
      // Implementation would go here
    }
  });

  // Task 2: Configure metrics (depends on validation)
  queue.addTask({
    id: TaskTypes.CONFIGURE_METRICS,
    name: 'Configure Metrics',
    description: 'Set up which metrics to track from the Google Sheet',
    prerequisites: [TaskTypes.VALIDATE_GOOGLE_SHEET],
    execute: async () => {
      console.log(`⚙️ Configuring metrics for client ${clientId}`);
      // This would open the metric configuration modal
      // Implementation would go here
    }
  });

  // Task 3: Sync Google Sheets (depends on metric configuration)
  queue.addTask({
    id: TaskTypes.SYNC_GOOGLE_SHEETS,
    name: 'Sync Google Sheets Data',
    description: 'Import data from Google Sheets using the configured metrics',
    prerequisites: [TaskTypes.CONFIGURE_METRICS],
    execute: async () => {
      console.log(`🔄 Syncing Google Sheets for client ${clientId}`);
      // This would call the full sync function
      // Implementation would go here
    },
    onComplete: onComplete,
    onError: onError
  });

  return queue;
}

/**
 * Create a task queue for staff setup
 */
export function createStaffSetupQueue(
  userId: string,
  googleSheetId: string,
  onComplete?: () => void,
  onError?: (error: Error) => void
): TaskQueue {
  const queue = new TaskQueue();

  // Task 1: Validate Google Sheet connection
  queue.addTask({
    id: TaskTypes.VALIDATE_STAFF_GOOGLE_SHEET,
    name: 'Validate Staff Google Sheet Connection',
    description: 'Verify that the Google Sheet is accessible and has the correct format',
    prerequisites: [],
    execute: async () => {
      console.log(`🔍 Validating Google Sheet for staff user ${userId}`);
      // Implementation would go here
    }
  });

  // Task 2: Configure staff metrics (depends on validation)
  queue.addTask({
    id: TaskTypes.CONFIGURE_STAFF_METRICS,
    name: 'Configure Staff Metrics',
    description: 'Set up which metrics to track from the Google Sheet',
    prerequisites: [TaskTypes.VALIDATE_STAFF_GOOGLE_SHEET],
    execute: async () => {
      console.log(`⚙️ Configuring metrics for staff user ${userId}`);
      // Implementation would go here
    }
  });

  // Task 3: Sync staff Google Sheets (depends on metric configuration)
  queue.addTask({
    id: TaskTypes.SYNC_STAFF_GOOGLE_SHEETS,
    name: 'Sync Staff Google Sheets Data',
    description: 'Import data from Google Sheets using the configured metrics',
    prerequisites: [TaskTypes.CONFIGURE_STAFF_METRICS],
    execute: async () => {
      console.log(`🔄 Syncing Google Sheets for staff user ${userId}`);
      // Implementation would go here
    },
    onComplete: onComplete,
    onError: onError
  });

  return queue;
}
