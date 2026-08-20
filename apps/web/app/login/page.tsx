"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const redirect = await login(email, password);
      const next = params.get("next");
      router.push(next || redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: string) {
    setEmail(`${role}@kisansetu.demo`);
    setPassword("Password123!");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-1">Welcome back</h1>
      <p className="text-cocoa-400 mb-8">Log in to your KISANSETU account.</p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label className="label-field">Email</label>
          <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label-field">Password</label>
          <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-cocoa-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-tan-700 font-medium">
          Register
        </Link>
      </div>

      <div className="mt-8 card bg-cream-200 border-tan-200">
        <p className="text-xs font-semibold text-cocoa-500 mb-2 uppercase tracking-wide">Demo Accounts</p>
        <div className="flex flex-wrap gap-2">
          {["buyer", "seller", "admin", "quality", "fpo"].map((r) => (
            <button key={r} type="button" onClick={() => fillDemo(r)} className="text-xs px-2.5 py-1 rounded-full bg-white border border-tan-200 hover:bg-tan-50 capitalize">
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-cocoa-400 mt-2">Click a role to autofill demo credentials (password: Password123!)</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div>
      <PublicNavbar />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
