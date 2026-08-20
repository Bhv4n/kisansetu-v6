"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, formatDateTime } from "@/components/ui";
import { ScrollText } from "lucide-react";

type Log = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/audit-logs?limit=200").then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <DashboardShell area="admin">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ScrollText className="text-tan-600" size={22} />
          <h1 className="text-2xl font-bold text-cocoa-500">Audit Logs</h1>
        </div>
        {logs && <p className="text-sm text-cocoa-400">{logs.length} entries (append-only)</p>}
      </div>
      {!logs && <LoadingState />}
      {logs && (
        <div className="card p-0 overflow-hidden max-h-[650px] overflow-y-auto">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-tan-100">
                  <td className="px-4 py-3 font-medium text-cocoa-500">{l.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-cocoa-500">{l.entity_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-cocoa-400">{formatDateTime(l.created_at)}</td>
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
