// ==============================================================================
// Maison MIPA Memories - Production Authentication & RBAC Context
// Hardened for Issue #7 and #17:
// - Denies login/session for SUSPENDED and DISABLED accounts
// - Authoritative Supabase Auth integration
// - Password reset & update password support
// - Verification email resend support
// - Strict fail-closed production behavior
// ==============================================================================
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type { User, UserRole } from '../types';
import type { ProfileRow } from '../types/database';
import { CURRENT_USER_PROFILES } from '../mockData';
import { mapProfileToUser } from './authHelpers';

export interface AuthContextType {
  user: User | null;
  role: UserRole;
  isRootOwner: boolean;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (params: { email: string; password: string; fullName: string; phone?: string }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  // Demo-only helper strictly disabled in production
  loginAsDemoRole?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isRootOwner, setIsRootOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isDemoMode = isDemoModeEnabled();

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Check if user is authoritative root owner
   */
  const checkRootOwner = useCallback(async (userId?: string): Promise<boolean> => {
    if (!userId) return false;
    if (isDemoMode) {
      // In demo mode, only designated demo owner is root owner, NEVER general ADMIN alone
      return userId === 'demo_owner' || userId === 'user_owner';
    }
    if (!isSupabaseConfigured()) return false;
    try {
      const { data, error } = await supabase.rpc('is_root_owner');
      if (error) {
        console.warn('is_root_owner check warning:', error.message);
        return false;
      }
      return data === true;
    } catch {
      return false;
    }
  }, [isDemoMode]);

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

    // Security check: email verification is authoritative
    if (!isDemoMode && !session.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setAuthError('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.');
      return;
    }

    const freshUser = await fetchProfile(session.user.id);
    if (freshUser) {
      if (freshUser.status === 'SUSPENDED' || freshUser.status === 'DISABLED') {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setAuthError('Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động.');
        return;
      }
      setUser(freshUser);
    }
  }, [session, fetchProfile, isDemoMode]);

  /**
   * Initialize Session on Mount & Listen to Supabase Auth State Changes
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Supabase getSession warning:', sessionError.message);
        }

        if (initialSession?.user && isMounted) {
          // Security gate: Email verification is mandatory in production
          if (!isDemoMode && !initialSession.user.email_confirmed_at) {
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setIsRootOwner(false);
              setAuthError('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.');
            }
            return;
          }

          const userProfile = await fetchProfile(initialSession.user.id);
          const isOwner = await checkRootOwner(initialSession.user.id);

          // Security check: Deny suspended/disabled accounts
          if (userProfile && (userProfile.status === 'SUSPENDED' || userProfile.status === 'DISABLED')) {
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setIsRootOwner(false);
              setAuthError('Tài khoản của bạn đã bị khóa hoặc tạm ngưng.');
            }
            return;
          } else if (isMounted) {
            setSession(initialSession);
            setIsRootOwner(isOwner);
            if (userProfile) {
              setUser({ ...userProfile, isRootOwner: isOwner });
            } else {
              setUser({
                id: initialSession.user.id,
                fullName: initialSession.user.user_metadata?.full_name || initialSession.user.email?.split('@')[0] || 'Khách Hàng',
                email: initialSession.user.email || '',
                phone: initialSession.user.user_metadata?.phone || '',
                role: 'CUSTOMER',
                status: 'ACTIVE',
                isRootOwner: isOwner,
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        if (currentSession?.user) {
          // Security gate: Email verification is mandatory in production
          if (!isDemoMode && !currentSession.user.email_confirmed_at) {
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setIsRootOwner(false);
              setAuthError('Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.');
            }
            return;
          }

          const profile = await fetchProfile(currentSession.user.id);
          const isOwner = await checkRootOwner(currentSession.user.id);

          if (profile && (profile.status === 'SUSPENDED' || profile.status === 'DISABLED')) {
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setIsRootOwner(false);
              setAuthError('Tài khoản của bạn đã bị khóa hoặc tạm ngưng.');
            }
            return;
          }

          setSession(currentSession);
          if (isMounted) {
            setIsRootOwner(isOwner);
            if (profile) {
              setUser({ ...profile, isRootOwner: isOwner });
            } else {
              setUser({
                id: currentSession.user.id,
                fullName: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Khách Hàng',
                email: currentSession.user.email || '',
                phone: currentSession.user.user_metadata?.phone || '',
                role: 'CUSTOMER',
                status: 'ACTIVE',
                isRootOwner: isOwner,
              });
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsRootOwner(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, isDemoMode, checkRootOwner]);

  /**
   * Production Login with Email & Password
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (!isSupabaseConfigured()) {
        if (isDemoMode) {
          const matchedProfile = Object.values(CURRENT_USER_PROFILES).find(
            (p) => p.email.toLowerCase() === email.trim().toLowerCase()
          );
          if (matchedProfile) {
            if (matchedProfile.status === 'SUSPENDED' || matchedProfile.status === 'DISABLED') {
              const msg = 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng.';
              setAuthError(msg);
              setIsLoading(false);
              return { success: false, error: msg };
            }
            const isOwner = matchedProfile.id === 'demo_owner' || matchedProfile.id === 'user_owner';
            setIsRootOwner(isOwner);
            const enrichedProfile = { ...matchedProfile, isRootOwner: isOwner };
            setUser(enrichedProfile);
            setIsLoading(false);
            return { success: true, user: enrichedProfile };
          }
          const defaultCustomer: User = {
            id: `demo_${Date.now()}`,
            fullName: email.split('@')[0] || 'Demo Customer',
            email,
            phone: '0908 123 456',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            isRootOwner: false,
          };
          setIsRootOwner(false);
          setUser(defaultCustomer);
          setIsLoading(false);
          return { success: true, user: defaultCustomer };
        }

        const msg = 'Hệ thống xác thực Supabase chưa được cấu hình.';
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

      // Authoritative check: Reject unconfirmed users in production
      if (!isDemoMode && data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsRootOwner(false);
        const unconfirmedMsg = 'Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư và bấm vào liên kết xác thực trước khi đăng nhập.';
        setAuthError(unconfirmedMsg);
        setIsLoading(false);
        return { success: false, error: unconfirmedMsg };
      }

      let resolvedUser: User | undefined;
      if (data.session && data.user) {
        const profile = await fetchProfile(data.user.id);
        const isOwner = await checkRootOwner(data.user.id);
        setIsRootOwner(isOwner);

        // Security gate: Deny suspended/disabled
        if (profile && (profile.status === 'SUSPENDED' || profile.status === 'DISABLED')) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsRootOwner(false);
          const denyMsg = 'Tài khoản này đã bị tạm ngưng hoặc khóa. Vui lòng liên hệ quản lý studio.';
          setAuthError(denyMsg);
          setIsLoading(false);
          return { success: false, error: denyMsg };
        }

        setSession(data.session);
        resolvedUser = profile ? { ...profile, isRootOwner: isOwner } : {
          id: data.user.id,
          fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Khách Hàng',
          email: data.user.email || '',
          phone: data.user.user_metadata?.phone || '',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          isRootOwner: isOwner,
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
  }, [fetchProfile, isDemoMode, checkRootOwner]);

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
            role: 'CUSTOMER',
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

      // FAIL CLOSED:
      // In production registration, email verification is mandatory.
      // If data.session is unexpectedly returned before email verification, FAIL CLOSED:
      // - signOut immediately
      // - do not set session
      // - do not set user
      // - return/display production configuration error
      if (!isDemoMode && data.session && !data.user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        const configError = 'Cấu hình bảo mật yêu cầu xác thực email bắt buộc. Vui lòng kiểm tra hộp thư để xác thực tài khoản trước khi đăng nhập.';
        setAuthError(configError);
        setIsLoading(false);
        return { success: false, error: configError };
      }

      // In production, registration never authenticates before verification
      if (!isDemoMode) {
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return { success: true };
      }

      // Demo mode only fallback
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
   * Password Reset Request
   */
  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isSupabaseConfigured()) {
        const redirectTo = `${window.location.origin}/auth/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Không thể gửi email đặt lại mật khẩu.' };
    }
  }, []);

  /**
   * Update Password (used on /auth/reset-password)
   */
  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Không thể cập nhật mật khẩu.' };
    }
  }, []);

  /**
   * Resend Verification Email
   */
  const resendVerificationEmail = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Không thể gửi lại email xác thực.' };
    }
  }, []);

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
      setIsRootOwner(false);
      setAuthError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Demo Mode Quick Login
   */
  const loginAsDemoRole = useCallback((targetRole: UserRole) => {
    if (!isDemoMode) {
      console.warn('Demo quick-login is strictly disabled in production mode.');
      return;
    }

    const demoProfile = CURRENT_USER_PROFILES[targetRole];
    if (demoProfile) {
      const isOwner = demoProfile.id === 'demo_owner' || demoProfile.id === 'user_owner';
      setIsRootOwner(isOwner);
      setUser({ ...demoProfile, isRootOwner: isOwner });
    }
  }, [isDemoMode]);

  const value = useMemo(() => ({
    user,
    role: user?.role || 'GUEST',
    isRootOwner,
    session,
    isLoading,
    authError,
    isDemoMode,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    refreshProfile,
    clearError,
    loginAsDemoRole,
  }), [
    user,
    isRootOwner,
    session,
    isLoading,
    authError,
    isDemoMode,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    refreshProfile,
    clearError,
    loginAsDemoRole,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
