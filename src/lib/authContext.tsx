import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  connectionError: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Get initial session
    console.log('AuthProvider: Initializing and checking for existing session');
    
    // Add timeout to detect connection failures
    const timeoutId = setTimeout(() => {
      // If we're still loading after 10 seconds, assume connection error
      if (loading) {
        console.warn('Auth connection timeout - could not connect to Supabase');
        setConnectionError(true);
        setLoading(false);
      }
    }, 10000);
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error getting session:', error);
        if (error.message && error.message.includes('Failed to fetch')) {
          setConnectionError(true);
        }
      }
      
      console.log('Initial session check:', session ? 'Session found' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(error => {
      clearTimeout(timeoutId);
      console.error('Auth provider init error:', error);
      setConnectionError(true);
      setLoading(false);
    });

    // Only set up auth change listener on non-web platforms if network is available
    // This prevents connection errors on mobile
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (Platform.OS !== 'web' || !connectionError) {
      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('Auth state changed:', _event, session ? 'User logged in/updated' : 'User logged out');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
        subscription = data.subscription;
      } catch (error) {
        console.error('Error setting up auth subscription:', error);
        setConnectionError(true);
      }
    }

    return () => {
      console.log('Cleaning up auth subscription');
      if (subscription) subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signOut = async () => {
    console.log('Signing out user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      isLoading: loading,
      signOut,
      connectionError 
    }}>
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