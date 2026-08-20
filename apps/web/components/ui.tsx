"use client";

import { ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  QUOTES_RECEIVED: "bg-amber-100 text-amber-700",
  NEGOTIATING: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-200 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  COUNTERED: "bg-purple-100 text-purple-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-200 text-gray-700",
  GROWING: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-red-100 text-red-700",
  READY: "bg-amber-100 text-amber-700",
  PICKED_UP: "bg-indigo-100 text-indigo-700",
  INSPECTED: "bg-teal-100 text-teal-700",
  DELIVERED: "bg-cyan-100 text-cyan-700",
  PAID: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-200 text-green-800",
  DISPUTED: "bg-red-100 text-red-700",
  ESCALATED: "bg-red-200 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-600",
  PASS: "bg-green-100 text-green-700",
  FAIL: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
  DUE: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || "bg-tan-100 text-tan-700";
  return <span className={`badge ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-cocoa-400">
      <Loader2 className="animate-spin mb-3" size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-tan-200 rounded-xl2 bg-white">
      <Inbox className="text-tan-400 mb-3" size={32} />
      <p className="font-medium text-cocoa-500">{title}</p>
      {subtitle && <p className="text-sm text-cocoa-400 mt-1 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 border border-red-200 rounded-xl2">
      <AlertTriangle className="text-red-500 mb-3" size={28} />
      <p className="text-red-700 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          Retry
        </button>
      )}
    </div>
  );
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
