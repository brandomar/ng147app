import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useFilters, DateFilter as FilterDateFilter } from '../../contexts/FilterContext';
import { logger } from "../../lib/logger";

interface DateFilterProps {
  timeFrame?: FilterDateFilter;
  onTimeFrameChange?: (timeFrame: FilterDateFilter) => void;
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "header" | "compact"; // Add variant for different styling
}

const timeFrameOptions = [
  {
    value: "yesterday" as FilterDateFilter,
    label: "Yesterday",
    description: "Previous day",
  },
  {
    value: "7days" as FilterDateFilter,
    label: "Last 7 Days",
    description: "Past week",
  },
  {
    value: "14days" as FilterDateFilter,
    label: "Last 14 Days",
    description: "Past 2 weeks",
  },
  {
    value: "30days" as FilterDateFilter,
    label: "Last 30 Days",
    description: "Past month",
  },
  {
    value: "90days" as FilterDateFilter,
    label: "Last 90 Days",
    description: "Past 3 months",
  },
  {
    value: "yearly" as FilterDateFilter,
    label: "Last Year",
    description: "Past 12 months",
  },
  {
    value: "alltime" as FilterDateFilter,
    label: "All Time",
    description: "All historical data",
  },
];

export const DateFilter: React.FC<DateFilterProps> = ({
  timeFrame,
  onTimeFrameChange,
  className = "",
  showLabel = true,
  variant = "default",
}) => {
  // For header variant, don't show label by default
  const shouldShowLabel = variant === "header" ? false : showLabel;
  // Use unified filter system
  const { state: filterState, setDateFilter } = useFilters();

  const isHeader = variant === "header";
  const isCompact = variant === "compact";

  // Use filter state if available, otherwise use props
  const currentTimeFrame = filterState.dateFilter || timeFrame || "alltime";
  const handleTimeFrameChange = (newTimeFrame: FilterDateFilter) => {
    logger.essential("🕐 DateFilter: User changed date filter", {
      previousFilter: currentTimeFrame,
      newFilter: newTimeFrame,
      variant,
    });
    setDateFilter(newTimeFrame);
    if (onTimeFrameChange) {
      onTimeFrameChange(newTimeFrame);
    }
  };
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {shouldShowLabel && (
        <div className="flex items-center gap-2">
          <Calendar
            size={16}
            className={isHeader ? "text-white/80" : "text-neutral-600"}
          />
          <span
            className={`text-sm font-medium ${
              isHeader ? "text-white" : "text-neutral-700"
            }`}
          >
            Time Period:
          </span>
        </div>
      )}

      <div className="relative">
        <select
          value={currentTimeFrame}
          onChange={(e) =>
            handleTimeFrameChange(e.target.value as FilterDateFilter)
          }
          className={`appearance-none rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-undeniable-violet focus:border-transparent cursor-pointer transition-colors ${
            isHeader
              ? "bg-white/80 border border-gray-300 text-gray-800 hover:bg-white"
              : "bg-white border border-neutral-300 hover:border-neutral-400"
          }`}
        >
          {timeFrameOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-neutral-800"
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <Clock
            size={14}
            className={isHeader ? "text-gray-600" : "text-neutral-500"}
          />
        </div>
      </div>

      {/* Time frame description */}
      {!isHeader && !isCompact && (
        <div className="hidden sm:block">
          <span className="text-xs text-neutral-500">
            {
              timeFrameOptions.find((opt) => opt.value === currentTimeFrame)
                ?.description
            }
          </span>
        </div>
      )}
    </div>
  );
};

// Hook for managing date filter state
export const useDateFilter = (defaultTimeFrame: TimeFrame = "alltime") => {
  const [timeFrame, setTimeFrame] = React.useState<TimeFrame>(defaultTimeFrame);

  const resetToDefault = () => setTimeFrame(defaultTimeFrame);

  return {
    timeFrame,
    setTimeFrame,
    resetToDefault,
  };
};
