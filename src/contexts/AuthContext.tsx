import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getUserProfile, createUserProfile } from '../lib/database/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  updatePassword: (newPassword: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Error getting initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          setIsAuthenticated(!!session?.user);
          if (session?.user) {
            logger.info('✅ User authenticated:', session.user.id);
            // Don't call ensureUserProfile here - let onAuthStateChange handle it
          }
        }
      } catch (error) {
        logger.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only log significant auth changes, not routine checks
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          logger.debug('Auth state changed:', event, session?.user?.email);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setLoading(false);
        
        // Only ensure user profile for SIGNED_IN event, not INITIAL_SESSION
        if (event === 'SIGNED_IN' && session?.user) {
          // Only log actual sign-ins, not routine session checks
          if (event === 'SIGNED_IN') {
            logger.info('✅ User signed in:', session.user.id);
          }
          // Ensure user has a profile (only for actual sign-in, not initial session)
          const profileKey = `profile_ensured_${session.user.id}`;
          const lastEnsured = sessionStorage.getItem(profileKey);
          const now = Date.now();
          
          if (!lastEnsured || (now - parseInt(lastEnsured)) > 5000) { // 5 second throttle
            // Ensure user profile exists in new permission system
            const ensureProfile = async () => {
              try {
                logger.debug('🔄 Checking user profile in new permission system');
                
                // Check if profile exists in new system
                const profileResult = await getUserProfile(session.user.id);
                
                if (profileResult.error && profileResult.error.code !== 'PGRST116') {
                  logger.warn('⚠️ User profile check failed:', profileResult.error);
                  return;
                }
                
                if (!profileResult.data) {
                  // Create profile in new system
                  const createResult = await createUserProfile({
                    user_id: session.user.id,
                    email: session.user.email || '',
                    first_name: session.user.user_metadata?.first_name || null,
                    last_name: session.user.user_metadata?.last_name || null,
                    avatar_url: session.user.user_metadata?.avatar_url || null,
                    preferences: {}
                  });
                  
                  if (createResult.error) {
                    logger.warn('⚠️ Failed to create user profile:', createResult.error);
                    return;
                  }
                  
                  logger.info('✅ User profile created in new permission system');
                } else {
                  logger.debug('✅ User profile already exists');
                }
              } catch (error) {
                logger.error('❌ Error in ensureProfile:', error);
              }
            };
            
            ensureProfile();
            sessionStorage.setItem(profileKey, now.toString());
          }
        } else if (event === 'SIGNED_OUT') {
          logger.info('👋 User signed out');
          // Clear profile ensured flag on sign out
          if (user?.id) {
            sessionStorage.removeItem(`profile_ensured_${user.id}`);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logger.error('❌ Sign in failed:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      console.error('Full Supabase auth error:', error);
    } else {
      logger.info('✅ Sign in successful');
    }
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { data, error };
    } catch (networkError: any) {
      console.error('Password reset network error:', networkError);
      
      if (networkError.message?.includes('Failed to fetch') ||
          networkError.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        return {
          data: null,
          error: {
            message: 'Unable to send password reset email. Please check your internet connection and try again. If the problem persists, contact your administrator.'
          }
        };
      }
      
      throw networkError;
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
