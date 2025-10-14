/**
 * Goals Database Functions
 * Service functions for managing client goal targets and projections
 */

import { supabase } from '../supabase';
import { logger } from '../logger';
import { DateFilter } from '../../contexts/FilterContext';

export interface MonthlyTargets {
  ad_spend?: number;
  booked_calls?: number;
  offer_rate?: number;
  closes?: number;
  cpa?: number;
  sales?: number;
}

export interface GoalsConfig {
  monthly_targets: MonthlyTargets;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Get goals configuration for a client
 */
export async function getClientGoals(clientId: string) {
  try {
    logger.debug('📊 Getting client goals', { clientId });

    const { data, error } = await supabase
      .from('clients')
      .select('goals_config')
      .eq('id', clientId)
      .single();

    if (error) {
      logger.error('❌ Error fetching client goals', error);
      return { data: null, error };
    }

    const goalsConfig = data?.goals_config as GoalsConfig || { monthly_targets: {} };
    
    logger.debug('✅ Client goals fetched', { clientId, goalsConfig });
    return { data: goalsConfig, error: null };
  } catch (error) {
    logger.error('❌ Exception fetching client goals', error);
    return { data: null, error };
  }
}

/**
 * Update goals configuration for a client
 */
export async function updateClientGoals(
  clientId: string,
  monthlyTargets: MonthlyTargets,
  userId?: string
) {
  try {
    logger.debug('📊 Updating client goals', { clientId, monthlyTargets });

    const goalsConfig: GoalsConfig = {
      monthly_targets: monthlyTargets,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('clients')
      .update({ goals_config: goalsConfig })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      logger.error('❌ Error updating client goals', error);
      return { data: null, error };
    }

    logger.info('✅ Client goals updated', { clientId, goalsConfig });
    return { data, error: null };
  } catch (error) {
    logger.error('❌ Exception updating client goals', error);
    return { data: null, error };
  }
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(
  currentValue: number,
  goalValue: number,
  dateFilter: DateFilter
): number {
  if (!goalValue || goalValue === 0) return 0;

  // For monthly goals, we need to prorate based on days in month
  // For now, we'll use the simple percentage
  const percentage = (currentValue / goalValue) * 100;
  
  // Cap at 200% for display purposes
  return Math.min(percentage, 200);
}

/**
 * Determine if current value is over or under target
 */
export function isOverTarget(currentValue: number, goalValue: number): boolean {
  return currentValue >= goalValue;
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'green';
  if (percentage >= 80) return 'yellow';
  return 'red';
}

