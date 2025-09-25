import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, ensureValidSession } from '../lib/supabase';
import { UserProfile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionRefreshInterval, setSessionRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      try {
        // Use the enhanced session validation function
        const validSession = await ensureValidSession();
        
        if (validSession?.user) {
          setSession(validSession);
          setUser(validSession.user);
          await loadUserProfile(validSession.user.id);
          startSessionMonitoring();
        } else {
          // Clear any existing session data
          setSession(null);
          setUser(null);
          setUserProfile(null);
          stopSessionMonitoring();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Session initialization error:', error);
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
          startSessionMonitoring();
        } else {
          setUserProfile(null);
          stopSessionMonitoring();
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSessionMonitoring();
    };
  }, []);

  const startSessionMonitoring = () => {
    // Clear existing interval
    if (sessionRefreshInterval) {
      clearInterval(sessionRefreshInterval);
    }

    // Check session every 5 minutes
    const interval = setInterval(async () => {
      try {
        console.log('Checking session validity...');
        const validSession = await ensureValidSession();
        
        if (!validSession) {
          console.log('Session invalid, signing out...');
          await signOut();
        } else {
          console.log('Session is valid');
          setSession(validSession);
          setUser(validSession.user);
        }
      } catch (error) {
        console.error('Session monitoring error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    setSessionRefreshInterval(interval);
  };

  const stopSessionMonitoring = () => {
    if (sessionRefreshInterval) {
      clearInterval(sessionRefreshInterval);
      setSessionRefreshInterval(null);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        return;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      // Silent error for loading user profile
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
