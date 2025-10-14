import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Unified auth utilities to replace direct supabase.auth calls
 * All auth operations should go through AuthContext, but this provides
 * utility functions for cases where direct access is needed
 */

export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('❌ Error getting current user:', error);
      return null;
    }
    return session?.user || null;
  } catch (err: any) {
    logger.error('❌ Exception getting current user:', err);
    return null;
  }
};

export const getCurrentUserWithSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('❌ Error getting current user with session:', error);
      return null;
    }
    return session;
  } catch (err: any) {
    logger.error('❌ Exception getting current user with session:', err);
    return null;
  }
};

export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('❌ Error getting current session:', error);
      return null;
    }
    return session;
  } catch (err: any) {
    logger.error('❌ Exception getting current session:', err);
    return null;
  }
};

export const isUserAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};
