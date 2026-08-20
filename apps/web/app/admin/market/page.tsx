"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, formatINR, formatDate } from "@/components/ui";
import { TrendingUp } from "lucide-react";

type Row = { id: string; product_name: string; price: number; location: string | null; observed_at: string };

export default function AdminMarketPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/market").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DashboardShell area="admin">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Market Data</h1>
      </div>
      <p className="text-cocoa-400 mb-6">Latest observations across the seeded market feed.</p>
      {!rows && <LoadingState />}
      {rows && (
        <div className="card p-0 overflow-hidden max-h-[600px] overflow-y-auto">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Observed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-tan-100">
                  <td className="px-4 py-3 font-medium text-cocoa-500">{r.product_name}</td>
                  <td className="px-4 py-3 text-cocoa-500">{formatINR(r.price)}</td>
                  <td className="px-4 py-3 text-cocoa-500">{r.location}</td>
                  <td className="px-4 py-3 text-cocoa-400">{formatDate(r.observed_at)}</td>
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
