import { createClient } from '@supabase/supabase-js';

// Lazy environment variable access to avoid import.meta issues
const getSupabaseConfig = () => {
  // Try to get from import.meta.env first (Vite's standard way)
  let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Debug logging
  console.log('Supabase config check:', {
    url: supabaseUrl || 'MISSING',
    keyPresent: supabaseAnonKey ? 'YES' : 'NO',
    allEnvKeys: Object.keys(import.meta.env)
  });

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  }

  return { supabaseUrl, supabaseAnonKey };
};

// Create Supabase client with lazy initialization
let _supabaseClient: any = null;
const getSupabaseClient = () => {
  if (!_supabaseClient) {
    const config = getSupabaseConfig();
    _supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true, // Enable auto-refresh for session persistence
        persistSession: true, // Enable session persistence across page refreshes
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key);
            } catch (error) {
              console.warn('Error reading from localStorage:', error);
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
            } catch (error) {
              console.warn('Error writing to localStorage:', error);
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn('Error removing from localStorage:', error);
            }
          }
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'dashboard-app'
        }
      }
    });
  }
  return _supabaseClient;
};

// Export the supabase client with lazy initialization
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    const client = getSupabaseClient();
    return client[prop];
  }
});

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    return { data, error };
  } catch (networkError: any) {
    console.error('Password reset network error:', networkError);
    
    // If it's a network error, provide a helpful message
    if (networkError.message?.includes('Failed to fetch') || 
        networkError.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      return {
        data: null,
        error: {
          message: 'Unable to send password reset email. Please check your internet connection and try again. If the problem persists, contact your administrator.'
        }
      };
    }
    
    // Re-throw other errors
    throw networkError;
  }
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  return { data, error };
};