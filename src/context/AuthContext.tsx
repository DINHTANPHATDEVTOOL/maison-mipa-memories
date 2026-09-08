// ==============================================================================
// Maison MIPA Memories - Production Authentication & RBAC Context
// ==============================================================================
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type { User, UserRole, StaffRole } from '../types';
import type { ProfileRow } from '../types/database';
import { CURRENT_USER_PROFILES } from '../mockData';
import { mapProfileToUser } from './authHelpers';

export interface AuthContextType {
  user: User | null;
  role: UserRole;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (params: { email: string; password: string; fullName: string; phone?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  // Demo-only helper strictly disabled in production
  loginAsDemoRole?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isDemoMode = isDemoModeEnabled();

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Fetch authenticated user's profile from Supabase profiles table
   */
  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Error fetching profile from database:', error.message);
        return null;
      }

      if (data) {
        return mapProfileToUser(data as ProfileRow);
      }
      return null;
    } catch (err: any) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  /**
   * Refresh current profile
   */
  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const freshUser = await fetchProfile(session.user.id);
    if (freshUser) {
      setUser(freshUser);
    }
  }, [session, fetchProfile]);

  /**
   * Initialize Session on Mount & Listen to Supabase Auth State Changes
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          // If Supabase is not configured, finish loading in unauthenticated GUEST state
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Supabase getSession warning:', sessionError.message);
        }

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          const userProfile = await fetchProfile(initialSession.user.id);
          if (isMounted) {
            if (userProfile) {
              setUser(userProfile);
            } else {
              // Fallback if trigger was delayed: extract basic info from auth.user
              setUser({
                id: initialSession.user.id,
                fullName: initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0] || 'Khách Hàng',
                email: initialSession.user.email || '',
                phone: initialSession.user.user_metadata?.phone || '',
                role: 'CUSTOMER', // Default role is strictly CUSTOMER
                status: 'ACTIVE',
              });
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Subscribe to Auth State Changes (Restore session on refresh, handle expiry, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(currentSession);
        if (currentSession?.user) {
          const profile = await fetchProfile(currentSession.user.id);
          if (isMounted) {
            if (profile) {
              setUser(profile);
            } else {
              setUser({
                id: currentSession.user.id,
                fullName: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Khách Hàng',
                email: currentSession.user.email || '',
                phone: currentSession.user.user_metadata?.phone || '',
                role: 'CUSTOMER',
                status: 'ACTIVE',
              });
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Production Login with Email & Password
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        // In Demo Mode only: allow mock login for development testing if Supabase is unconfigured
        if (isDemoMode) {
          const matchedProfile = Object.values(CURRENT_USER_PROFILES).find(
            (p) => p.email.toLowerCase() === email.trim().toLowerCase()
          );
          if (matchedProfile) {
            setUser(matchedProfile);
            setIsLoading(false);
            return { success: true, user: matchedProfile };
          }
          const defaultCustomer: User = {
            id: `demo_${Date.now()}`,
            fullName: email.split('@')[0] || 'Demo Customer',
            email,
            phone: '0908 123 456',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          };
          setUser(defaultCustomer);
          setIsLoading(false);
          return { success: true, user: defaultCustomer };
        }

        const msg = 'Hệ thống xác thực Supabase chưa được cấu hình (Vui lòng thiết lập VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).';
        setAuthError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      // Real Supabase Auth Login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      let resolvedUser: User | undefined;
      if (data.session && data.user) {
        setSession(data.session);
        const profile = await fetchProfile(data.user.id);
        resolvedUser = profile || {
          id: data.user.id,
          fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Khách Hàng',
          email: data.user.email || '',
          phone: data.user.user_metadata?.phone || '',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        };
        setUser(resolvedUser);
      }

      setIsLoading(false);
      return { success: true, user: resolvedUser };
    } catch (err: any) {
      const msg = err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  }, [fetchProfile, isDemoMode]);

  /**
   * Production Registration with Email & Password
   */
  const register = useCallback(async ({
    email,
    password,
    fullName,
    phone,
  }: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        if (isDemoMode) {
          const newDemoUser: User = {
            id: `demo_${Date.now()}`,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone?.trim() || '',
            role: 'CUSTOMER', // Always CUSTOMER
            status: 'ACTIVE',
          };
          setUser(newDemoUser);
          setIsLoading(false);
          return { success: true, user: newDemoUser };
        }

        const msg = 'Hệ thống Supabase chưa được cấu hình cho môi trường này.';
        setAuthError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      // Supabase Sign Up
      // Role is NOT sent in metadata to avoid client tampering; DB trigger forces role='CUSTOMER'
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone?.trim() || '',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      let resolvedUser: User | undefined;
      if (data.session && data.user) {
        setSession(data.session);
        const profile = await fetchProfile(data.user.id);
        resolvedUser = profile || {
          id: data.user.id,
          fullName: fullName.trim(),
          email: data.user.email || email.trim(),
          phone: phone?.trim() || '',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        };
        setUser(resolvedUser);
      }

      setIsLoading(false);
      return { success: true, user: resolvedUser };
    } catch (err: any) {
      const msg = err?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
      setAuthError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  }, [fetchProfile, isDemoMode]);

  /**
   * Production Logout
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.warn('Supabase signOut warning:', err);
    } finally {
      setSession(null);
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Demo Mode Quick Login (STRICTLY disabled unless VITE_ENABLE_DEMO_MODE=true)
   */
  const loginAsDemoRole = useCallback((targetRole: UserRole) => {
    if (!isDemoMode) {
      console.warn('Demo login is strictly disabled in production mode.');
      return;
    }
    const profile = CURRENT_USER_PROFILES[targetRole] || CURRENT_USER_PROFILES.CUSTOMER;
    setUser(profile);
  }, [isDemoMode]);

  const role: UserRole = user?.role || 'GUEST';

  const value = useMemo<AuthContextType>(() => ({
    user,
    role,
    session,
    isLoading,
    authError,
    isDemoMode,
    login,
    register,
    logout,
    refreshProfile,
    clearError,
    loginAsDemoRole,
  }), [user, role, session, isLoading, authError, isDemoMode, login, register, logout, refreshProfile, clearError, loginAsDemoRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
