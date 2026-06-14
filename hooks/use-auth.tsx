"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api-client";
import {
  clearPendingAuth,
  clearStoredSession,
  defaultRouteForUser,
  getRefreshToken,
  getStoredSession,
  storeTokens,
  storeSession,
  updateStoredUser,
} from "@/lib/auth";
import type { User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeSession: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const nextUser = await api.auth.me();
      updateStoredUser(nextUser);
      setUser(nextUser);
    } catch (error) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw error;
      await api.auth.refresh(refreshToken);
      const nextUser = await api.auth.me();
      updateStoredUser(nextUser);
      setUser(nextUser);
    }
  }, []);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setUser(session.user);
    refreshMe()
      .catch(() => clearStoredSession())
      .finally(() => setLoading(false));
  }, [refreshMe]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(
      () => {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return;
        void api.auth.refresh(refreshToken).catch(() => undefined);
      },
      10 * 60 * 1000,
    );

    return () => window.clearInterval(interval);
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.auth.login(email, password);
      storeSession({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        user: result.user,
      });
      setUser(result.user);
      router.replace(defaultRouteForUser(result.user));
    },
    [router],
  );

  const completeSession = useCallback(
    async (accessToken: string, refreshToken: string) => {
      clearStoredSession();
      clearPendingAuth();
      storeTokens({ accessToken, refreshToken });

      try {
        const nextUser = await api.auth.me();
        storeSession({
          accessToken,
          refreshToken,
          user: nextUser,
        });
        setUser(nextUser);
        router.replace(defaultRouteForUser(nextUser));
      } catch (error) {
        clearStoredSession();
        throw error;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.auth.logout(refreshToken).catch(() => undefined);
    }
    clearStoredSession();
    setUser(null);
    router.replace("/auth/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, completeSession, refreshMe, logout }),
    [user, loading, login, completeSession, refreshMe, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
