"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatDate } from "@/components/ui";
import { Plus } from "lucide-react";

type Requirement = {
  id: string; product_name: string; quantity: number; unit: string; target_price: number | null;
  delivery_location: string | null; status: string; created_at: string;
};

export default function BuyerQuotesPage() {
  const [requirements, setRequirements] = useState<Requirement[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/buyer-requirements").then(setRequirements).catch(() => setRequirements([]));
  }, []);

  return (
    <DashboardShell area="buyer">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cocoa-500">My Quote Requests</h1>
          <p className="text-cocoa-400 mt-1">Requirements you&apos;ve posted and the quotes they&apos;ve received.</p>
        </div>
        <Link href="/buyer/quotes/new" className="btn-primary flex items-center gap-1"><Plus size={16} /> New Request</Link>
      </div>

      {!requirements && <LoadingState />}
      {requirements && requirements.length === 0 && (
        <EmptyState title="No quote requests yet" subtitle="Post a requirement to start receiving quotes from sellers." action={<Link href="/buyer/quotes/new" className="btn-primary">Get a Quote</Link>} />
      )}
      {requirements && requirements.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Target Price</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Posted</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.id} className="border-t border-tan-100 hover:bg-cream-200 cursor-pointer" onClick={() => (window.location.href = `/buyer/quotes/${r.id}`)}>
                  <td className="px-4 py-3 font-medium text-cocoa-500">{r.product_name}</td>
                  <td className="px-4 py-3 text-cocoa-500">{r.quantity.toLocaleString()} {r.unit}</td>
                  <td className="px-4 py-3 text-cocoa-500">{r.target_price ? `₹${r.target_price}` : "—"}</td>
                  <td className="px-4 py-3 text-cocoa-500">{r.delivery_location || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-cocoa-400">{formatDate(r.created_at)}</td>
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
