import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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

  useEffect(() => {
    // Auto-login for testing purposes - REMOVE IN PRODUCTION!
    const autoLogin = async () => {
      try {
        // Check if already logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Already logged in
          setSession(session);
          setUser(session.user);
          await loadUserProfile(session.user.id);
          setLoading(false);
          return;
        }

        // Auto-login with test credentials - REPLACE WITH YOUR TEST CREDENTIALS
        console.log('Auto-logging in for testing...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: 'your-test-email@example.com',
          password: 'your-test-password',
        });

        if (loginError) {
          console.error('Auto-login error:', loginError);
          setLoading(false);
          return;
        }

        if (loginData.session && loginData.user) {
          setSession(loginData.session);
          setUser(loginData.user);
          await loadUserProfile(loginData.user.id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Auto-login exception:', err);
        setLoading(false);
      }
    };

    // For production, use this instead:
    // const initializeAuth = async () => {
    //   const { data: { session }, error } = await supabase.auth.getSession();
    //   if (session?.user) {
    //     setSession(session);
    //     setUser(session.user);
    //     await loadUserProfile(session.user.id);
    //   }
    //   setLoading(false);
    // };

    autoLogin();
    // initializeAuth(); // Use this in production

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (err) {
      console.error('Exception loading user profile:', err);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
