import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RoleName } from '../types';
import { api, setAuthTokens, setUnauthorizedCallback, getAuthToken } from '../services/api';
import { clientFallbackLogin, clientFallbackGetCurrentUser } from '../services/clientFallbackService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: RoleName | null;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAs: (role: RoleName) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationCode: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  dismissSessionExpired: () => void;
  hasRole: (roles: RoleName | RoleName[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset test user credentials for convenient testing
export const DEMO_CREDENTIALS: Record<RoleName, { email: string; label: string; description: string }> = {
  SUPER_ADMIN: {
    email: 'superadmin@keystone.io',
    label: 'Super Admin',
    description: 'Full global system control across all organizations and facilities'
  },
  ADMIN: {
    email: 'admin@keystone.io',
    label: 'Apex Operations Admin',
    description: 'Tenant admin with user management, facility config, and reporting'
  },
  DISPATCHER: {
    email: 'dispatcher@keystone.io',
    label: 'Operations Dispatcher',
    description: 'Work order creation, tech dispatching, and triage management'
  },
  TECHNICIAN: {
    email: 'tech.davis@keystone.io',
    label: 'Field Technician',
    description: 'Assigned work order execution, time tracking, and parts logging'
  },
  CUSTOMER: {
    email: 'facilitymgr@globalfin.com',
    label: 'Facility Customer',
    description: 'Service request submission, progress tracking, and verification'
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const handleUnauthorized = useCallback(() => {
    const currentToken = getAuthToken();
    if (currentToken?.startsWith('keystone_client_jwt_')) {
      return;
    }
    setUser(null);
    setToken(null);
    setAuthTokens(null, null);
    setSessionExpired(true);
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(handleUnauthorized);
  }, [handleUnauthorized]);

  // Load user profile on mount if token exists
  useEffect(() => {
    async function initAuth() {
      const savedToken = getAuthToken();
      if (savedToken) {
        try {
          const profile = await api.getCurrentUser();
          setUser(profile);
          setToken(savedToken);
        } catch (err) {
          console.warn('[Auth] Remote session verification failed, attempting client fallback:', err);
          const fallbackUser = clientFallbackGetCurrentUser();
          if (fallbackUser) {
            setUser(fallbackUser);
            setToken(savedToken);
          } else {
            setAuthTokens(null, null);
            setToken(null);
            setUser(null);
          }
        }
      } else {
        // Auto-login as DISPATCHER for instant preview showcase if no token saved
        try {
          const res = await api.login({ email: 'dispatcher@keystone.io', password: 'password123' });
          const authData = (res as any)?.data || res;
          if (authData?.token) {
            setAuthTokens(authData.token, authData.refreshToken);
            setToken(authData.token);
            setUser(authData.user);
          }
        } catch (e) {
          console.warn('[Auth] Remote default demo login failed, using local client session:', e);
          const fallback = clientFallbackLogin('dispatcher@keystone.io', 'password123');
          if (fallback?.data?.token) {
            setAuthTokens(fallback.data.token, fallback.data.token);
            setToken(fallback.data.token);
            setUser(fallback.data.user);
          }
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      const authData = (res as any)?.data || res;
      const token = authData?.token || authData?.accessToken;
      if (!token) {
        throw new Error('Authentication succeeded but session token was not received.');
      }
      setAuthTokens(token, authData.refreshToken || token);
      setToken(token);
      setUser(authData.user);
      setSessionExpired(false);
    } catch (err: any) {
      console.warn('[Auth] Remote login error, attempting fallback session for:', email, err?.message);
      const fallbackResult = clientFallbackLogin(email, password);
      if (fallbackResult?.data?.token && fallbackResult?.data?.user) {
        const token = fallbackResult.data.token;
        const user = fallbackResult.data.user;
        setAuthTokens(token, token);
        setToken(token);
        setUser(user);
        setSessionExpired(false);
        return;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAs = async (role: RoleName) => {
    const creds = DEMO_CREDENTIALS[role];
    if (!creds) throw new Error(`Unknown role ${role}`);
    await login(creds.email, 'password123');
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationCode: string;
    role?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      const authData = (res as any)?.data || res;
      if (authData?.token) {
        setAuthTokens(authData.token, authData.refreshToken);
        setToken(authData.token);
        setUser(authData.user);
        setSessionExpired(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      setAuthTokens(null, null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.changePassword({ currentPassword, newPassword });
    // After password change, backend revokes previous tokens
    // We re-login with the new password
    if (user?.email) {
      await login(user.email, newPassword);
    }
  };

  const dismissSessionExpired = () => {
    setSessionExpired(false);
  };

  const hasRole = (roles: RoleName | RoleName[]): boolean => {
    if (!user) return false;
    const required = Array.isArray(roles) ? roles : [roles];
    return user.roles.some(r => required.includes(r));
  };

  const activeRole = user?.roles?.[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        activeRole,
        sessionExpired,
        login,
        loginAs,
        register,
        logout,
        changePassword,
        dismissSessionExpired,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
