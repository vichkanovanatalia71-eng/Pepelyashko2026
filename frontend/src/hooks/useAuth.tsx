import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import api from "../api/client";
import type { User } from "../types";

interface AuthContextType {
  token: string | null;
  user: User | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Check JWT expiry client-side (no network call needed). */
function isTokenExpired(t: string): boolean {
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token → treat as expired
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Validate token on mount — check JWT expiry locally, then load user data
  useEffect(() => {
    const t = localStorage.getItem("token");

    // No token → ready immediately
    if (!t) {
      setIsReady(true);
      return;
    }

    // Token expired → clear silently, no API call needed
    if (isTokenExpired(t)) {
      localStorage.removeItem("token");
      setToken(null);
      setIsReady(true);
      return;
    }

    // Token valid → load user data via fetch (bypasses axios 401 interceptor)
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
    fetch(`${backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setToken(t);
      })
      .catch(() => {
        // Token revoked server-side → clear
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setIsReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email.trim().toLowerCase());
    form.append("password", password);
    const { data } = await api.post("/auth/login", form);
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);

    const meRes = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    setUser(meRes.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const { data } = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${t}` },
    });
    setUser(data);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isReady, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
