"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, formatDate } from "@/components/ui";

type UserRow = { id: string; email: string; full_name: string | null; role: string; status: string; created_at: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/admin/users").then(setUsers).catch(() => setUsers([]));
  }, []);

  return (
    <DashboardShell area="admin">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-6">Users</h1>
      {!users && <LoadingState />}
      {users && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-tan-100">
                  <td className="px-4 py-3 font-medium text-cocoa-500">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-cocoa-500">{u.email}</td>
                  <td className="px-4 py-3 text-cocoa-500">{u.role.replace("_", " ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-cocoa-400">{formatDate(u.created_at)}</td>
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
