"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, EmptyState, formatINR } from "@/components/ui";
import { Sparkles, Search, TrendingUp, TrendingDown, Minus, ShieldCheck, Truck } from "lucide-react";

type Intelligence = {
  product_name: string; unit: string; current_price: number; avg_7day: number; avg_30day: number;
  trend: "UP" | "DOWN" | "FLAT"; demand: string;
  forecast?: { forecast_3day: number; forecast_7day: number; pct_change_7day: number; confidence: string };
  buyer_recommendation?: { action: string; target_price_low: number; target_price_high: number; reason: string };
};
type Supplier = {
  seller_id: string; seller_name: string; city: string | null; state: string | null;
  overall_score: number; quality_score: number; fulfillment_rate: number; delivery_score: number;
  suggested_price: number | null;
};

const COMMON_CROPS = ["Tomato", "Onion", "Potato", "Basmati Rice", "Wheat", "Cotton", "Alphonso Mango", "Turmeric"];

const ACTION_STYLE: Record<string, string> = {
  NEGOTIATE: "bg-amber-100 text-amber-700", WAIT: "bg-blue-100 text-blue-700", BUY_NOW: "bg-green-100 text-green-700",
};

export default function BuyerCopilotPage() {
  const [query, setQuery] = useState("Tomato");
  const [product, setProduct] = useState("Tomato");
  const [intel, setIntel] = useState<Intelligence | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setIntel(null);
    setSuppliers(null);
    api.get(`/api/v1/intelligence/price/${encodeURIComponent(product)}`).then(setIntel).catch(() => setError("No market data for this product yet."));
    api.get(`/api/v1/intelligence/suppliers?product_name=${encodeURIComponent(product)}&limit=5`).then(setSuppliers).catch(() => setSuppliers([]));
  }, [product]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) setProduct(query.trim());
  }

  const TrendIcon = intel ? { UP: TrendingUp, DOWN: TrendingDown, FLAT: Minus }[intel.trend] : Minus;

  return (
    <DashboardShell area="buyer">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Procurement Copilot</h1>
      </div>
      <p className="text-cocoa-400 mb-6">What should I buy, what should I pay, and who should I buy it from — answered from live market and supplier data.</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400" size={18} />
          <input className="input-field pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a crop, e.g. Tomato" />
        </div>
        <button type="submit" className="btn-primary">Search</button>
      </form>
      <div className="flex flex-wrap gap-2 mb-8">
        {COMMON_CROPS.map((c) => (
          <button key={c} onClick={() => { setQuery(c); setProduct(c); }} className={`text-xs px-3 py-1 rounded-full border ${product === c ? "bg-tan-600 text-white border-tan-600" : "bg-white border-tan-200 text-cocoa-500 hover:bg-tan-50"}`}>
            {c}
          </button>
        ))}
      </div>

      {error && <EmptyState title={error} subtitle="Try one of the crops above, or check back once more market data is seeded." />}

      {intel && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cocoa-500">{intel.product_name}</h2>
              <span className="badge bg-cream-200 text-cocoa-500">Demand: {intel.demand.replace("_", " ")}</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-xs text-cocoa-400 uppercase tracking-wide">Market Price</p>
                <p className="text-2xl font-bold text-tan-700">{formatINR(intel.current_price)}<span className="text-sm text-cocoa-400">/{intel.unit}</span></p>
              </div>
              {intel.forecast && (
                <div>
                  <p className="text-xs text-cocoa-400 uppercase tracking-wide">7-Day Forecast</p>
                  <p className="text-2xl font-bold text-cocoa-500 flex items-center gap-1">
                    {formatINR(intel.forecast.forecast_7day)} <TrendIcon size={18} className={intel.trend === "UP" ? "text-red-500" : intel.trend === "DOWN" ? "text-green-600" : "text-cocoa-400"} />
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-cocoa-400 uppercase tracking-wide">30-Day Average</p>
                <p className="text-2xl font-bold text-cocoa-500">{formatINR(intel.avg_30day)}</p>
              </div>
            </div>
            {intel.buyer_recommendation && (
              <div className="border-t border-tan-100 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${ACTION_STYLE[intel.buyer_recommendation.action]}`}>{intel.buyer_recommendation.action.replace("_", " ")}</span>
                  <p className="text-sm text-cocoa-500">
                    Recommended target: <span className="font-semibold">{formatINR(intel.buyer_recommendation.target_price_low)} – {formatINR(intel.buyer_recommendation.target_price_high)}</span>
                  </p>
                </div>
                <p className="text-xs text-cocoa-400">{intel.buyer_recommendation.reason}</p>
              </div>
            )}
          </div>

          <div className="card">
            <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-2">Forecast Confidence</p>
            {intel.forecast ? (
              <>
                <p className="text-lg font-bold text-cocoa-500 mb-1">{intel.forecast.confidence}</p>
                <p className="text-xs text-cocoa-400">Based on a linear trend across this product&apos;s real price history — a DEMO estimate, not financial advice.</p>
                <div className="mt-4 pt-4 border-t border-tan-100 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-cocoa-400">3-day estimate</span><span className="font-medium text-cocoa-500">{formatINR(intel.forecast.forecast_3day)}</span></div>
                  <div className="flex justify-between"><span className="text-cocoa-400">7-day estimate</span><span className="font-medium text-cocoa-500">{formatINR(intel.forecast.forecast_7day)}</span></div>
                  <div className="flex justify-between"><span className="text-cocoa-400">7-day change</span><span className={`font-medium ${intel.forecast.pct_change_7day > 0 ? "text-red-600" : "text-green-600"}`}>{intel.forecast.pct_change_7day > 0 ? "+" : ""}{intel.forecast.pct_change_7day}%</span></div>
                </div>
              </>
            ) : (
              <p className="text-sm text-cocoa-400">Not enough price history for a forecast yet.</p>
            )}
          </div>
        </div>
      )}

      <p className="font-semibold text-cocoa-500 mb-3">Top Suppliers{intel ? ` for ${intel.product_name}` : ""}</p>
      {!suppliers && intel && <LoadingState label="Ranking suppliers..." />}
      {suppliers && suppliers.length === 0 && <EmptyState title="No suppliers found for this product yet" />}
      {suppliers && suppliers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {suppliers.map((s) => (
            <div key={s.seller_id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-cocoa-500">{s.seller_name}</p>
                  <p className="text-xs text-cocoa-400">{s.city}{s.state ? `, ${s.state}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-cocoa-400 uppercase tracking-wide">Deal Score</p>
                  <p className="text-xl font-bold text-tan-700">{s.overall_score}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="flex items-center gap-1"><ShieldCheck size={12} className="text-tan-600" /> Quality: {s.quality_score}%</div>
                <div className="flex items-center gap-1"><Truck size={12} className="text-tan-600" /> Fulfillment: {s.fulfillment_rate}%</div>
              </div>
              {s.suggested_price && (
                <p className="text-sm text-cocoa-500">Suggested price: <span className="font-semibold text-tan-700">{formatINR(s.suggested_price)}</span></p>
              )}
              <Link href="/buyer/quotes/new" className="btn-secondary w-full text-center text-sm mt-3 block">Request Quote</Link>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
