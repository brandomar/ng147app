/**
 * Unified Filter Controls
 * 
 * UI component for displaying filter status and providing filter controls.
 * Shows active filter count, filter summary, and clear all functionality.
 */

import React from 'react';
import { useFilters } from '../../contexts/FilterContext';
import { logger } from '../../lib/logger';

interface UnifiedFilterControlsProps {
  className?: string;
  showSummary?: boolean;
  showClearAll?: boolean;
  showActiveCount?: boolean;
}

export const UnifiedFilterControls: React.FC<UnifiedFilterControlsProps> = ({
  className = '',
  showSummary = true,
  showClearAll = true,
  showActiveCount = true,
}) => {
  const { state, clearAllFilters, getFilterSummary, getActiveFiltersCount } = useFilters();

  const handleClearAll = () => {
    logger.debug('🔧 UnifiedFilterControls: Clearing all filters');
    clearAllFilters();
  };

  const activeFiltersCount = getActiveFiltersCount();
  const filterSummary = getFilterSummary();
  
  // Debug logging for data points
  logger.debug('🔧 UnifiedFilterControls: Rendering with state', {
    totalDataPoints: state.totalDataPoints,
    filteredDataPoints: state.filteredDataPoints,
    filterSummary,
    activeFiltersCount
  });

  return (
    <div className={`unified-filter-controls ${className}`}>
      <div className="flex items-center justify-between">
        {/* Filter Summary */}
        {showSummary && (
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Filters:</span> {filterSummary}
            </div>
            {state.totalDataPoints > 0 && (
              <div className="text-sm text-gray-500">
                Showing {state.filteredDataPoints.toLocaleString()} of {state.totalDataPoints.toLocaleString()} data points
              </div>
            )}
          </div>
        )}

        {/* Active Filter Count */}
        {showActiveCount && activeFiltersCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Clear All Button */}
        {showClearAll && activeFiltersCount > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Applying filters...
        </div>
      )}
    </div>
  );
};
