import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { Task, TaskQueueState } from '../../lib/taskQueue';

interface TaskQueueDisplayProps {
  state: TaskQueueState;
  currentTask: Task | null;
  progress: number;
  isExecuting: boolean;
  hasErrors: boolean;
  onExecuteNext: () => Promise<boolean>;
  onExecuteAll: () => Promise<void>;
  onSkipTask: (taskId: string) => void;
  onResetTask: (taskId: string) => void;
  onResetAll: () => void;
  className?: string;
}

export const TaskQueueDisplay: React.FC<TaskQueueDisplayProps> = ({
  state,
  currentTask,
  progress,
  isExecuting,
  hasErrors,
  onExecuteNext,
  onExecuteAll,
  onSkipTask,
  onResetTask,
  onResetAll,
  className = ''
}) => {
  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-600 animate-pulse" />;
      case 'skipped':
        return <X size={16} className="text-gray-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'in_progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'skipped':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const tasks = Array.from(state.tasks.values());

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete these steps in order to sync your Google Sheets data
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-blue-600 animate-pulse" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Currently Running</h4>
              <p className="text-sm text-blue-700">{currentTask.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3 mb-6">
        {tasks.map((task, index) => {
          const isBlocked = task.prerequisites.some(prereqId => {
            const prereqTask = state.tasks.get(prereqId);
            return prereqTask?.status !== 'completed';
          });

          return (
            <div
              key={task.id}
              className={`p-4 rounded-lg border transition-all ${
                getStatusColor(task.status)
              } ${isBlocked && task.status === 'pending' ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      {index + 1}.
                    </span>
                    {getStatusIcon(task.status)}
                  </div>
                  <div>
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm opacity-75">{task.description}</p>
                  </div>
                </div>

                {/* Task Actions */}
                <div className="flex items-center gap-2">
                  {task.status === 'failed' && (
                    <button
                      onClick={() => onResetTask(task.id)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Retry task"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  
                  {task.status === 'pending' && !isBlocked && (
                    <button
                      onClick={() => onSkipTask(task.id)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Skip task"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Prerequisites */}
              {task.prerequisites.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">Depends on:</span>{' '}
                  {task.prerequisites.map(prereqId => {
                    const prereqTask = state.tasks.get(prereqId);
                    return prereqTask?.name || prereqId;
                  }).join(', ')}
                </div>
              )}

              {/* Error Message */}
              {task.status === 'failed' && state.errors.has(task.id) && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                  {state.errors.get(task.id)?.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onExecuteNext}
          disabled={isExecuting || !tasks.some(t => t.status === 'pending')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={16} />
          {isExecuting ? 'Running...' : 'Run Next Step'}
        </button>

        <button
          onClick={onExecuteAll}
          disabled={isExecuting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={16} />
          Run All Steps
        </button>

        {hasErrors && (
          <button
            onClick={onResetAll}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={16} />
            Reset All
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>
            Completed: {tasks.filter(t => t.status === 'completed').length} / {tasks.length}
          </span>
          <span>
            {tasks.filter(t => t.status === 'failed').length > 0 && (
              <span className="text-red-600">
                {tasks.filter(t => t.status === 'failed').length} failed
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
