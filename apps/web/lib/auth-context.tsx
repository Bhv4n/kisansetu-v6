"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken, setRole } from "./api";

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type AuthContextType = {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (payload: Record<string, unknown>) => Promise<string>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_REDIRECT: Record<string, string> = {
  BUYER: "/buyer/dashboard",
  SELLER: "/seller/dashboard",
  FPO_MANAGER: "/seller/dashboard",
  FIELD_OFFICER: "/admin/quality",
  ADMIN: "/admin/dashboard",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/v1/me")
      .then((data) => setUser(data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post("/api/v1/auth/login", { email, password });
    setToken(data.access_token);
    setRole(data.role);
    const me = await api.get("/api/v1/me");
    setUser(me);
    return ROLE_REDIRECT[data.role] || "/";
  }

  async function register(payload: Record<string, unknown>) {
    const data = await api.post("/api/v1/auth/register", payload);
    setToken(data.access_token);
    setRole(data.role);
    const me = await api.get("/api/v1/me");
    setUser(me);
    return ROLE_REDIRECT[data.role] || "/";
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push("/");
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
