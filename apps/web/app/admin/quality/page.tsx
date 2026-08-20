"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

type Insp = { id: string; contract_id: string; status: string; notes: string | null };

export default function AdminQualityPage() {
  const [rows, setRows] = useState<Insp[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/quality").then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <DashboardShell area="admin">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Quality Inspections</h1>
      </div>
      {!rows && <LoadingState />}
      {rows && rows.length === 0 && <EmptyState title="No inspections recorded yet" />}
      {rows && rows.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/contracts/${r.contract_id}/quality`} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-cocoa-500">Inspection</p>
                <StatusBadge status={r.status} />
              </div>
              {r.notes && <p className="text-xs text-cocoa-400">{r.notes}</p>}
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
