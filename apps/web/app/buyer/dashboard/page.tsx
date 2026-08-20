"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, LoadingState, formatINR } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FileText, Package, Handshake, Wallet, ArrowRight } from "lucide-react";

type Requirement = { id: string; product_name: string; quantity: number; unit: string; status: string; created_at: string };
type Contract = { id: string; contract_no: string; product_name: string; status: string; total_value: number };

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<Requirement[] | null>(null);
  const [contracts, setContracts] = useState<Contract[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/buyer-requirements").then(setRequirements).catch(() => setRequirements([]));
    api.get("/api/v1/contracts").then(setContracts).catch(() => setContracts([]));
  }, []);

  if (!requirements || !contracts) return <DashboardShell area="buyer"><LoadingState /></DashboardShell>;

  const activeContracts = contracts.filter((c) => !["COMPLETED", "CANCELLED", "DRAFT"].includes(c.status));
  const openReqs = requirements.filter((r) => r.status === "OPEN" || r.status === "QUOTES_RECEIVED");
  const totalValue = contracts.reduce((s, c) => s + c.total_value, 0);

  return (
    <DashboardShell area="buyer">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-cocoa-500">Welcome back, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-cocoa-400 mt-1">Here&apos;s what&apos;s happening across your requirements and contracts.</p>
        </div>
        <Link href="/buyer/quotes/new" className="btn-primary">Get a Quote</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard icon={FileText} label="Open Requirements" value={openReqs.length} />
        <KpiCard icon={Handshake} label="Active Contracts" value={activeContracts.length} />
        <KpiCard icon={Package} label="Total Requirements" value={requirements.length} />
        <KpiCard icon={Wallet} label="Total Contract Value" value={formatINR(totalValue)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-cocoa-500">Recent Requirements</h2>
            <Link href="/buyer/quotes" className="text-xs text-tan-700 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {requirements.length === 0 ? (
            <p className="text-sm text-cocoa-400">No requirements yet. Post your first Get Quote request.</p>
          ) : (
            <div className="space-y-3">
              {requirements.slice(0, 6).map((r) => (
                <Link key={r.id} href="/buyer/quotes" className="flex items-center justify-between py-2 border-b border-tan-100 last:border-0 hover:bg-cream-200 -mx-2 px-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-cocoa-500">{r.product_name}</p>
                    <p className="text-xs text-cocoa-400">{r.quantity.toLocaleString()} {r.unit}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-cocoa-500">Active Contracts</h2>
            <Link href="/buyer/contracts" className="text-xs text-tan-700 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-sm text-cocoa-400">No contracts yet.</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/buyer/contracts/${c.id}`} className="flex items-center justify-between py-2 border-b border-tan-100 last:border-0 hover:bg-cream-200 -mx-2 px-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-cocoa-500">{c.contract_no}</p>
                    <p className="text-xs text-cocoa-400">{c.product_name} · {formatINR(c.total_value)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
