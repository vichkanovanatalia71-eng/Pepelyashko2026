import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import api from "../api/client";
import type { User } from "../types";

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
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
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
