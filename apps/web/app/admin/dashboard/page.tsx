"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, LoadingState, formatINR, formatDateTime } from "@/components/ui";
import { api } from "@/lib/api";
import { Users, Handshake, Wallet, ShieldCheck, AlertTriangle, ScrollText, CheckCircle2, FileText, TrendingUp, Gauge, AlertOctagon, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Dashboard = {
  kpis: Record<string, number>;
  procurement_overview: {
    total_procurement_value: number; fulfillment_rate: number; avg_quality: number;
    at_risk_value: number; avg_deal_score: number | null;
  };
  contract_status_distribution: Record<string, number>;
  recent_contracts: { id: string; contract_no: string; product_name: string; status: string; total_value: number }[];
  recent_audit_logs: { id: string; action: string; entity_type: string; created_at: string }[];
  risk_alerts: { id: string; event_type: string; severity: string; description: string | null }[];
};
type AttentionItem = { severity: "critical" | "warning" | "good"; title: string; detail: string; link: string };

const SEVERITY_STYLE: Record<string, { icon: typeof AlertOctagon; dot: string; border: string }> = {
  critical: { icon: AlertOctagon, dot: "bg-red-500", border: "border-red-200 bg-red-50" },
  warning: { icon: AlertTriangle, dot: "bg-amber-500", border: "border-amber-200 bg-amber-50" },
  good: { icon: CheckCircle2, dot: "bg-green-500", border: "border-green-200 bg-green-50" },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [attention, setAttention] = useState<AttentionItem[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get("/api/v1/admin/dashboard").then(setData).catch(() => {});
    api.get("/api/v1/admin/attention").then(setAttention).catch(() => setAttention([]));
  }, []);

  if (!data) return <DashboardShell area="admin"><LoadingState /></DashboardShell>;

  const chartData = Object.entries(data.contract_status_distribution).map(([status, count]) => ({ status: status.replace(/_/g, " "), count }));
  const po = data.procurement_overview;

  return (
    <DashboardShell area="admin">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-1">Operations Command Center</h1>
      <p className="text-cocoa-400 mb-6">Live, SQL-backed overview of the entire platform.</p>

      {/* Requires Attention */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-cocoa-500 mb-3 uppercase tracking-wide">Requires Attention</p>
        {!attention && <LoadingState label="Checking for issues..." />}
        {attention && attention.length === 0 && (
          <div className="card border-green-200 bg-green-50 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={18} /> Nothing needs attention right now.
          </div>
        )}
        {attention && attention.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {attention.map((item, i) => {
              const style = SEVERITY_STYLE[item.severity];
              const Icon = style.icon;
              return (
                <button
                  key={i}
                  onClick={() => router.push(item.link)}
                  className={`card text-left hover:shadow-lg transition-shadow border ${style.border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={item.severity === "critical" ? "text-red-600" : item.severity === "warning" ? "text-amber-600" : "text-green-600"} />
                    <p className="text-sm font-semibold text-cocoa-500">{item.title}</p>
                  </div>
                  <p className="text-xs text-cocoa-400">{item.detail}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Procurement Overview */}
      <p className="text-sm font-semibold text-cocoa-500 mb-3 uppercase tracking-wide">Procurement Overview</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KpiCard icon={Wallet} label="Total Procurement Value" value={formatINR(po.total_procurement_value)} />
        <KpiCard icon={Handshake} label="Fulfillment Rate" value={`${po.fulfillment_rate}%`} />
        <KpiCard icon={ShieldCheck} label="Avg. Quality" value={`${po.avg_quality}%`} />
        <KpiCard icon={AlertTriangle} label="At-Risk Value" value={formatINR(po.at_risk_value)} />
        <KpiCard icon={Gauge} label="Avg. Deal Score" value={po.avg_deal_score !== null ? `${po.avg_deal_score}/100` : "—"} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users} label="Total Users" value={data.kpis.total_users} sub={`${data.kpis.buyers} buyers · ${data.kpis.sellers} sellers`} />
        <KpiCard icon={Handshake} label="Active Contracts" value={data.kpis.active_contracts} sub={`${data.kpis.completed_contracts} completed`} />
        <KpiCard icon={Wallet} label="Payments Collected" value={formatINR(data.kpis.total_payments_value)} sub={`${data.kpis.pending_payments} pending`} />
        <KpiCard icon={ShieldCheck} label="Quality Inspections" value={data.kpis.inspections_total} sub={`${data.kpis.open_disputes} open disputes`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card lg:col-span-2">
          <p className="font-semibold text-cocoa-500 mb-4">Contract Status Distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F6E9DD" />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#8C5A3C" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "#8C5A3C" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#EEDBC6" }} />
              <Bar dataKey="count" fill="#C08552" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-tan-600" />
            <p className="font-semibold text-cocoa-500">Risk Alerts</p>
          </div>
          {data.risk_alerts.length === 0 ? (
            <p className="text-sm text-cocoa-400">No active risk alerts.</p>
          ) : (
            <div className="space-y-3">
              {data.risk_alerts.map((r) => (
                <div key={r.id} className="text-sm border-l-2 border-red-400 pl-3">
                  <p className="font-medium text-cocoa-500">{r.event_type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-cocoa-400">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><FileText size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Recent Contracts</p></div>
            <Link href="/admin/contracts" className="text-xs text-tan-700">View all</Link>
          </div>
          <div className="space-y-2">
            {data.recent_contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-tan-100 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-cocoa-500">{c.contract_no}</p>
                  <p className="text-xs text-cocoa-400">{c.product_name} · {formatINR(c.total_value)}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><ScrollText size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Recent Audit Activity</p></div>
            <Link href="/admin/audit-logs" className="text-xs text-tan-700">View all</Link>
          </div>
          <div className="space-y-2">
            {data.recent_audit_logs.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-tan-100 last:border-0 text-sm">
                <CheckCircle2 size={14} className="text-tan-500 shrink-0" />
                <span className="text-cocoa-500">{a.action.replace(/_/g, " ")}</span>
                <span className="text-cocoa-400 text-xs">on {a.entity_type}</span>
                <span className="text-cocoa-400 text-xs ml-auto">{formatDateTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
