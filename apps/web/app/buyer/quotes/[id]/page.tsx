"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatINR, formatDate } from "@/components/ui";
import { MessageSquare } from "lucide-react";

type Requirement = {
  id: string; product_name: string; quantity: number; unit: string; target_price: number | null;
  delivery_location: string | null; status: string; notes: string | null; created_at: string;
};
type Quote = { id: string; seller_name: string | null; unit_price: number; quantity: number; status: string; created_at: string };

export default function BuyerRequirementDetailPage() {
  const params = useParams();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    api.get(`/api/v1/buyer-requirements/${params.id}`).then(setRequirement).catch(() => {});
    api.get("/api/v1/quotes").then((all: Quote[] & { requirement_id?: string }[]) => {
      setQuotes(all.filter((q: any) => q.requirement_id === params.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  }, [params.id]);

  return (
    <DashboardShell area="buyer">
      {!requirement && <LoadingState />}
      {requirement && (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-cocoa-500">{requirement.product_name}</h1>
              <p className="text-cocoa-400 mt-1">
                {requirement.quantity.toLocaleString()} {requirement.unit} · Target {requirement.target_price ? formatINR(requirement.target_price) : "—"} · Posted {formatDate(requirement.created_at)}
              </p>
            </div>
            <StatusBadge status={requirement.status} />
          </div>

          <h2 className="font-semibold text-cocoa-500 mb-3">Quotes Received</h2>
          {quotes.length === 0 && <EmptyState title="No quotes yet" subtitle="Sellers matching this requirement will submit quotes here." />}
          {quotes.length > 0 && (
            <div className="space-y-3">
              {quotes.map((q) => (
                <Link key={q.id} href={`/buyer/negotiations/${q.id}`} className="card flex items-center justify-between hover:shadow-lg transition-shadow">
                  <div>
                    <p className="font-medium text-cocoa-500">{q.seller_name}</p>
                    <p className="text-sm text-cocoa-400">{formatINR(q.unit_price)} / unit · {q.quantity.toLocaleString()} units</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={q.status} />
                    <MessageSquare size={16} className="text-tan-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
