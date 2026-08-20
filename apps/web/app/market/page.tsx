"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { api } from "@/lib/api";
import { LoadingState, formatINR } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Minus, Search, Sparkles } from "lucide-react";

type Summary = { product_name: string; current_price: number; unit: string; avg_7day: number; trend: string; location: string | null };
type PriceRow = { product_name: string; price: number; observed_at: string; location: string | null };
type Intelligence = {
  avg_30day: number; min_30day: number; max_30day: number; demand: string;
  forecast?: { forecast_3day: number; forecast_7day: number; pct_change_7day: number; confidence: string };
};

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function MarketPage() {
  const [summary, setSummary] = useState<Summary[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [history, setHistory] = useState<PriceRow[]>([]);
  const [intel, setIntel] = useState<Intelligence | null>(null);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    api.get("/api/v1/market-prices/summary").then((rows) => {
      setSummary(rows);
      if (rows.length) setSelected(rows[0].product_name);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/api/v1/market-prices?product_name=${encodeURIComponent(selected)}&limit=${rangeDays}`).then((rows) => {
      setHistory([...rows].reverse());
    });
    api.get(`/api/v1/intelligence/price/${encodeURIComponent(selected)}`).then(setIntel).catch(() => setIntel(null));
  }, [selected, rangeDays]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    summary?.forEach((s) => s.location && set.add(s.location));
    return Array.from(set).sort();
  }, [summary]);

  const filteredSummary = useMemo(() => {
    if (!summary) return [];
    return summary.filter((s) => {
      const matchesSearch = !search || s.product_name.toLowerCase().includes(search.toLowerCase());
      const matchesLocation = !location || s.location === location;
      return matchesSearch && matchesLocation;
    });
  }, [summary, search, location]);

  const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus }[
    summary?.find((s) => s.product_name === selected)?.trend || "flat"
  ];

  return (
    <div>
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-2">Market Intelligence</h1>
        <p className="text-cocoa-400 mb-8">Live prices and forecasts sourced from the KISANSETU database, updated across markets and locations.</p>

        {!summary && <LoadingState label="Loading market data..." />}

        {summary && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400" size={18} />
                <input className="input-field pl-10" placeholder="Search a product..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="input-field sm:w-56" value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">All locations</option>
                {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {filteredSummary.map((s) => {
                const Icon = { up: TrendingUp, down: TrendingDown, flat: Minus }[s.trend];
                return (
                  <button
                    key={s.product_name}
                    onClick={() => setSelected(s.product_name)}
                    className={`card text-left transition-all ${selected === s.product_name ? "ring-2 ring-tan-500" : "hover:shadow-lg"}`}
                  >
                    <p className="text-sm font-semibold text-cocoa-500">{s.product_name}</p>
                    <p className="text-xs text-cocoa-400 mb-2">{s.location}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-lg font-bold text-tan-700">{formatINR(s.current_price)}</p>
                      <Icon className={s.trend === "up" ? "text-green-600" : s.trend === "down" ? "text-red-600" : "text-cocoa-400"} size={18} />
                    </div>
                    <p className="text-xs text-cocoa-400">7-day avg: {formatINR(s.avg_7day)} / {s.unit}</p>
                  </button>
                );
              })}
              {filteredSummary.length === 0 && <p className="text-sm text-cocoa-400 col-span-full">No products match your filters.</p>}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-cocoa-500">{selected} — price trend</h2>
                    {TrendIcon && <TrendIcon size={18} className="text-tan-600" />}
                  </div>
                  <div className="flex gap-1">
                    {RANGE_OPTIONS.map((r) => (
                      <button
                        key={r.days}
                        onClick={() => setRangeDays(r.days)}
                        className={`text-xs px-2.5 py-1 rounded-full border ${rangeDays === r.days ? "bg-tan-600 text-white border-tan-600" : "bg-white border-tan-200 text-cocoa-500"}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F6E9DD" />
                    <XAxis dataKey="observed_at" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} tick={{ fontSize: 11, fill: "#8C5A3C" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#8C5A3C" }} />
                    <Tooltip
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN")}
                      formatter={(v: number) => [formatINR(v), "Price"]}
                      contentStyle={{ borderRadius: 8, borderColor: "#EEDBC6" }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#C08552" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-tan-600" />
                  <p className="font-semibold text-cocoa-500">Price Intelligence</p>
                </div>
                {intel ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-cocoa-400">30-day average</span><span className="font-medium text-cocoa-500">{formatINR(intel.avg_30day)}</span></div>
                    <div className="flex justify-between"><span className="text-cocoa-400">30-day range</span><span className="font-medium text-cocoa-500">{formatINR(intel.min_30day)} – {formatINR(intel.max_30day)}</span></div>
                    <div className="flex justify-between"><span className="text-cocoa-400">Demand</span><span className="font-medium text-cocoa-500">{intel.demand.replace("_", " ")}</span></div>
                    {intel.forecast && (
                      <>
                        <div className="border-t border-tan-100 pt-3">
                          <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-1">7-Day Forecast</p>
                          <p className="text-xl font-bold text-tan-700">{formatINR(intel.forecast.forecast_7day)}</p>
                          <p className={`text-xs ${intel.forecast.pct_change_7day > 0 ? "text-red-600" : "text-green-600"}`}>
                            {intel.forecast.pct_change_7day > 0 ? "+" : ""}{intel.forecast.pct_change_7day}% · {intel.forecast.confidence} confidence
                          </p>
                        </div>
                        <p className="text-xs text-cocoa-400">DEMO estimate from a linear trend over real price history — not financial advice.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-cocoa-400">Not enough history for intelligence on this product yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
