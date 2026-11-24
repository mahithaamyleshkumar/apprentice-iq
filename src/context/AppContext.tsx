import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { PublicUser, UserRole } from '../types.ts';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextValue {
  user: PublicUser | null;
  token: string | null;
  theme: 'dark' | 'light';
  route: string;
  toasts: ToastItem[];
  isLoadingAuth: boolean;
  navigate: (to: string) => void;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<PublicUser>;
  demoLogin: (role: UserRole) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: Exclude<UserRole, 'admin'>;
    tradeId: string;
    institution: string;
  }) => Promise<PublicUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  apiFetch: <T>(url: string, options?: RequestInit) => Promise<T>;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function defaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'apprentice':
      return '/apprentice/dashboard';
    case 'mentor':
      return '/mentor/dashboard';
    case 'assessor':
      return '/assessor/dashboard';
    case 'employer':
      return '/employer/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/apprentice/dashboard';
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
    }
    setRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast],
  );

  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data as T;
    },
    [token],
  );

  const login = useCallback(async (email: string, password: string): Promise<PublicUser> => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const demoLogin = useCallback(async (role: UserRole): Promise<PublicUser> => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      setUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: Exclude<UserRole, 'admin'>;
      tradeId: string;
      institution: string;
    }): Promise<PublicUser> => {
      setIsLoadingAuth(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setUser(data.user);
        setToken(data.token);
        return data.user;
      } finally {
        setIsLoadingAuth(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    navigate('/');
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{ user: PublicUser }>('/api/auth/me');
    setUser(data.user);
  }, [token, apiFetch]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        theme,
        route,
        toasts,
        isLoadingAuth,
        navigate,
        toggleTheme,
        login,
        demoLogin,
        register,
        logout,
        refreshUser,
        apiFetch,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
