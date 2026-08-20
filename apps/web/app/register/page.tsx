"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"BUYER" | "SELLER">("BUYER");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", org_name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email, password: form.password, full_name: form.full_name, role, phone: form.phone,
      };
      if (role === "BUYER") payload.business_name = form.org_name;
      if (role === "SELLER") payload.display_name = form.org_name;
      const redirect = await register(payload);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PublicNavbar />
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-cocoa-500 mb-1">Create your account</h1>
        <p className="text-cocoa-400 mb-8">Join KISANSETU as a buyer or seller.</p>

        <div className="flex gap-2 mb-6">
          {(["BUYER", "SELLER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                role === r ? "bg-tan-600 text-white border-tan-600" : "bg-white text-cocoa-500 border-tan-200"
              }`}
            >
              I&apos;m a {r === "BUYER" ? "Buyer" : "Seller / Farmer"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="label-field">Full Name</label>
            <input required className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">{role === "BUYER" ? "Business Name" : "Farm / Business Name"}</label>
            <input required className="input-field" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" required className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Phone</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label className="label-field">Password</label>
            <input type="password" required minLength={8} className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-cocoa-400">
          Already have an account?{" "}
          <Link href="/login" className="text-tan-700 font-medium">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
