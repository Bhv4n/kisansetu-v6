"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatINR } from "@/components/ui";
import { Wallet } from "lucide-react";

type Pay = { id: string; contract_id: string; amount: number; status: string };

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Pay[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/payments").then(setRows).catch(() => setRows([]));
  }, []);

  const total = rows ? rows.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0) : 0;

  return (
    <DashboardShell area="admin">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="text-tan-600" size={22} />
          <h1 className="text-2xl font-bold text-cocoa-500">Payments</h1>
        </div>
        {rows && <p className="text-sm text-cocoa-400">Total collected: <span className="font-semibold text-cocoa-500">{formatINR(total)}</span></p>}
      </div>
      {!rows && <LoadingState />}
      {rows && rows.length === 0 && <EmptyState title="No payments recorded yet" />}
      {rows && rows.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Contract</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-tan-100 hover:bg-cream-200">
                  <td className="px-4 py-3"><Link href={`/admin/contracts/${r.contract_id}/payments`} className="text-tan-700 font-medium">View contract</Link></td>
                  <td className="px-4 py-3 text-cocoa-500">{formatINR(r.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
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
