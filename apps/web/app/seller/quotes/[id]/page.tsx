"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, formatINR } from "@/components/ui";
import { MessageSquare } from "lucide-react";

type Quote = { id: string; product_name: string; unit_price: number; quantity: number; delivery_terms: string | null; payment_terms: string | null; status: string };

export default function SellerQuoteDetailPage() {
  const params = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    api.get(`/api/v1/quotes/${params.id}`).then(setQuote).catch(() => {});
  }, [params.id]);

  return (
    <DashboardShell area="seller">
      {!quote && <LoadingState />}
      {quote && (
        <div className="max-w-lg">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-cocoa-500">{quote.product_name}</h1>
            <StatusBadge status={quote.status} />
          </div>
          <div className="card space-y-3 text-sm mb-4">
            <div className="flex justify-between"><span className="text-cocoa-400">Price</span><span className="font-medium text-cocoa-500">{formatINR(quote.unit_price)}</span></div>
            <div className="flex justify-between"><span className="text-cocoa-400">Quantity</span><span className="font-medium text-cocoa-500">{quote.quantity.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-cocoa-400">Delivery</span><span className="font-medium text-cocoa-500">{quote.delivery_terms || "—"}</span></div>
            <div className="flex justify-between"><span className="text-cocoa-400">Payment</span><span className="font-medium text-cocoa-500">{quote.payment_terms || "—"}</span></div>
          </div>
          <Link href={`/seller/negotiations/${quote.id}`} className="btn-primary inline-flex items-center gap-2">
            <MessageSquare size={16} /> Open Negotiation
          </Link>
        </div>
      )}
    </DashboardShell>
  );
}
