"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatINR } from "@/components/ui";

type Quote = { id: string; product_name: string; unit_price: number; quantity: number; status: string; created_at: string };

export default function SellerQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/quotes").then(setQuotes).catch(() => setQuotes([]));
  }, []);

  return (
    <DashboardShell area="seller">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-6">My Quotes</h1>
      {!quotes && <LoadingState />}
      {quotes && quotes.length === 0 && <EmptyState title="No quotes submitted yet" subtitle="Respond to a buyer opportunity to submit your first quote." />}
      {quotes && quotes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-tan-100 hover:bg-cream-200 cursor-pointer" onClick={() => (window.location.href = `/seller/negotiations/${q.id}`)}>
                  <td className="px-4 py-3 font-medium text-cocoa-500">{q.product_name}</td>
                  <td className="px-4 py-3 text-cocoa-500">{formatINR(q.unit_price)}</td>
                  <td className="px-4 py-3 text-cocoa-500">{q.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
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
