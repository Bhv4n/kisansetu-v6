const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ks_token");
}

export function setToken(token: string) {
  localStorage.setItem("ks_token", token);
}

export function clearToken() {
  localStorage.removeItem("ks_token");
  localStorage.removeItem("ks_role");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ks_role");
}

export function setRole(role: string) {
  localStorage.setItem("ks_role", role);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, data?: unknown) => request(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: (path: string, data?: unknown) => request(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
};

export { API_URL };
