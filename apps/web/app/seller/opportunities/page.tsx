"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatINR, formatDate } from "@/components/ui";

type Opportunity = {
  id: string; product_name: string; quantity: number; unit: string; target_price: number | null;
  delivery_location: string | null; status: string; created_at: string;
};

export default function SellerOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/buyer-requirements").then(setOpportunities).catch(() => setOpportunities([]));
  }, []);

  return (
    <DashboardShell area="seller">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-1">Buyer Opportunities</h1>
      <p className="text-cocoa-400 mb-8">Open requirements from buyers matching your products.</p>

      {!opportunities && <LoadingState />}
      {opportunities && opportunities.length === 0 && <EmptyState title="No opportunities right now" subtitle="Check back soon — new buyer requirements appear here." />}
      {opportunities && opportunities.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {opportunities.map((o) => (
            <Link key={o.id} href={`/seller/opportunities/${o.id}`} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-cocoa-500">{o.product_name}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-sm text-cocoa-500 mb-1">{o.quantity.toLocaleString()} {o.unit}</p>
              <p className="text-sm text-tan-700 font-medium mb-1">{o.target_price ? `Target ${formatINR(o.target_price)}` : "No target price"}</p>
              <p className="text-xs text-cocoa-400">{o.delivery_location} · Posted {formatDate(o.created_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
