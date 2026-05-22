"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { clearAuth, getStoredToken, getStoredUser, saveAuth } from "@/lib/client-auth";
import { roleRoutes } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import type { User } from "@/types/app";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshMe: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshMe = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const me = await apiRequest<{ user: User }>("/auth/me");
      const currentUser = me.user;
      saveAuth(currentToken, currentUser);
      setUser(currentUser);
      setToken(currentToken);
      return currentUser;
    } catch {
      clearAuth();
      setUser(null);
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
      refreshMe().finally(() => setReady(true));
    } else {
      setReady(true);
    }

    apiRequest<{ rate: number }>("/exchange-rate")
      .then((data) => {
        if (data?.rate) setExchangeRate(data.rate);
      })
      .catch(() => undefined);
  }, [refreshMe, setExchangeRate]);

  const login = useCallback((nextToken: string, nextUser: User) => {
    saveAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    router.replace(roleRoutes[nextUser.role]);
  }, [router]);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    router.replace("/");
  }, [router]);

  const value = useMemo(
    () => ({ user, token, ready, login, logout, refreshMe }),
    [user, token, ready, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth faqat Providers ichida ishlaydi");
  }
  return context;
}
