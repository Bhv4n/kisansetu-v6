"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, LoadingState, formatINR } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Package, Handshake, Wallet, Inbox, ArrowRight, Sparkles } from "lucide-react";

type Opportunity = { id: string; product_name: string; quantity: number; unit: string; status: string };
type Quote = { id: string; product_name: string; unit_price: number; status: string };
type Contract = { id: string; contract_no: string; product_name: string; status: string; total_value: number };
type Product = { id: string; name: string };
type Recommendation = {
  product_name: string; current_price: number; unit: string; forecast_7day: number | null;
  trend: string; demand: string; recommended_action: string; reason: string;
};

const ACTION_STYLE: Record<string, string> = {
  SELL_NOW: "bg-green-100 text-green-700", HOLD_3_DAYS: "bg-amber-100 text-amber-700",
};

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/buyer-requirements").then(setOpportunities).catch(() => setOpportunities([]));
    api.get("/api/v1/quotes").then(setQuotes).catch(() => setQuotes([]));
    api.get("/api/v1/contracts").then(setContracts).catch(() => setContracts([]));
    api.get("/api/v1/products").then((all) => setProducts(all)).catch(() => setProducts([]));
    api.get("/api/v1/intelligence/farmer/recommendations").then(setRecommendations).catch(() => setRecommendations([]));
  }, []);

  if (!opportunities || !quotes || !contracts || !products) return <DashboardShell area="seller"><LoadingState /></DashboardShell>;

  const activeContracts = contracts.filter((c) => !["COMPLETED", "CANCELLED", "DRAFT"].includes(c.status));
  const pendingQuotes = quotes.filter((q) => q.status === "SUBMITTED" || q.status === "COUNTERED");
  const totalValue = contracts.reduce((s, c) => s + c.total_value, 0);

  return (
    <DashboardShell area="seller">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-cocoa-500">Welcome back, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-cocoa-400 mt-1">Here&apos;s what&apos;s happening with your products and deals.</p>
        </div>
        <Link href="/seller/products/new" className="btn-primary">List a Product</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard icon={Inbox} label="Open Opportunities" value={opportunities.length} />
        <KpiCard icon={Handshake} label="Active Contracts" value={activeContracts.length} />
        <KpiCard icon={Package} label="Products Listed" value={products.length} />
        <KpiCard icon={Wallet} label="Total Contract Value" value={formatINR(totalValue)} />
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-tan-600" size={18} />
            <p className="font-semibold text-cocoa-500">What Should I Sell?</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((r) => (
              <div key={r.product_name} className="card">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-cocoa-500">{r.product_name}</p>
                  <span className={`badge ${ACTION_STYLE[r.recommended_action] || "bg-tan-100 text-tan-700"}`}>{r.recommended_action.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm text-cocoa-500 mb-1">Current: <span className="font-semibold">{formatINR(r.current_price)}/{r.unit}</span></p>
                {r.forecast_7day && <p className="text-xs text-cocoa-400 mb-2">7-day forecast: {formatINR(r.forecast_7day)} · Demand: {r.demand.replace("_", " ")}</p>}
                <p className="text-xs text-cocoa-400">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-cocoa-500">Buyer Opportunities</h2>
            <Link href="/seller/opportunities" className="text-xs text-tan-700 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-cocoa-400">No open opportunities right now.</p>
          ) : (
            <div className="space-y-3">
              {opportunities.slice(0, 6).map((o) => (
                <Link key={o.id} href={`/seller/opportunities/${o.id}`} className="flex items-center justify-between py-2 border-b border-tan-100 last:border-0 hover:bg-cream-200 -mx-2 px-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-cocoa-500">{o.product_name}</p>
                    <p className="text-xs text-cocoa-400">{o.quantity.toLocaleString()} {o.unit}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-cocoa-500">Active Contracts</h2>
            <Link href="/seller/contracts" className="text-xs text-tan-700 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-sm text-cocoa-400">No contracts yet.</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/seller/contracts/${c.id}`} className="flex items-center justify-between py-2 border-b border-tan-100 last:border-0 hover:bg-cream-200 -mx-2 px-2 rounded">
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
