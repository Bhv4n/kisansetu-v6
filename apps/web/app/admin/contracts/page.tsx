"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, formatINR } from "@/components/ui";

type Contract = { id: string; contract_no: string; product_name: string; status: string; total_value: number };

function AdminContractsInner() {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("status") || "");

  useEffect(() => {
    api.get("/api/v1/admin/contracts").then(setContracts).catch(() => setContracts([]));
  }, []);

  const statuses = contracts ? Array.from(new Set(contracts.map((c) => c.status))) : [];
  const filtered = contracts ? (filter ? contracts.filter((c) => c.status === filter) : contracts) : [];

  return (
    <DashboardShell area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-cocoa-500">All Contracts</h1>
        <select className="input-field w-56" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      {!contracts && <LoadingState />}
      {contracts && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Contract No.</th>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-tan-100 hover:bg-cream-200">
                  <td className="px-4 py-3"><Link href={`/admin/contracts/${c.id}`} className="font-medium text-tan-700">{c.contract_no}</Link></td>
                  <td className="px-4 py-3 text-cocoa-500">{c.product_name}</td>
                  <td className="px-4 py-3 text-cocoa-500">{formatINR(c.total_value)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default function AdminContractsPage() {
  return (
    <Suspense fallback={null}>
      <AdminContractsInner />
    </Suspense>
  );
}
