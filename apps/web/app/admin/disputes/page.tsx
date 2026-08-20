"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, ApiError } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

type Dispute = { id: string; contract_id: string; status: string; reason: string };

export default function AdminDisputesPage() {
  const [rows, setRows] = useState<Dispute[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get("/api/v1/admin/disputes").then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  async function resolve(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/v1/disputes/${id}/resolve`, { resolution: "Resolved by management review." });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resolve dispute.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell area="admin">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Disputes</h1>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
      {!rows && <LoadingState />}
      {rows && rows.length === 0 && <EmptyState title="No disputes" subtitle="All contracts are proceeding without disputes." />}
      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((d) => (
            <div key={d.id} className="card flex items-center justify-between">
              <div>
                <Link href={`/admin/contracts/${d.contract_id}`} className="font-medium text-tan-700">View contract</Link>
                <p className="text-sm text-cocoa-500 mt-1">{d.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                {d.status === "OPEN" && (
                  <button onClick={() => resolve(d.id)} disabled={busy} className="btn-secondary text-xs py-1">Resolve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
