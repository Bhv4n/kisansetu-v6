"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, formatINR } from "@/components/ui";
import { BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Report = { total_contract_value: number; contracts_by_product: Record<string, number> };

const COLORS = ["#C08552", "#8C5A3C", "#CD9A6D", "#A96F3F", "#4B2E2B", "#E3C7A8", "#D8B38A", "#734A31"];

export default function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/reports").then(setReport).catch(() => {});
  }, []);

  if (!report) return <DashboardShell area="admin"><LoadingState /></DashboardShell>;

  const pieData = Object.entries(report.contracts_by_product).map(([name, value]) => ({ name, value }));

  return (
    <DashboardShell area="admin">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Reports</h1>
      </div>

      <div className="card mb-6">
        <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-1">Total Contract Value</p>
        <p className="text-3xl font-bold text-tan-700">{formatINR(report.total_contract_value)}</p>
      </div>

      <div className="card">
        <p className="font-semibold text-cocoa-500 mb-4">Contracts by Product</p>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </DashboardShell>
  );
}
