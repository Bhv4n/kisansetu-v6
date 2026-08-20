"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge, LoadingState, EmptyState, formatINR, formatDateTime } from "@/components/ui";
import { Wallet } from "lucide-react";

type PaymentT = { id: string; amount: number; status: string; provider_ref: string | null; paid_at: string | null; created_at: string };
type Contract = { id: string; total_value: number; status: string };

export function ContractPaymentsView() {
  const params = useParams();
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentT[] | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get(`/api/v1/contracts/${params.id}/payments`).then(setPayments).catch(() => setPayments([]));
    api.get(`/api/v1/contracts/${params.id}`).then(setContract).catch(() => {});
  }, [params.id]);

  useEffect(load, [load]);

  async function simulatePayment() {
    if (!contract) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/api/v1/payments/simulate", { contract_id: contract.id, amount: contract.total_value });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not initiate payment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayment(id: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/v1/payments/${id}/confirm`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm payment.");
    } finally {
      setBusy(false);
    }
  }

  const isBuyer = user?.role === "BUYER";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet className="text-tan-600" size={22} />
          <h1 className="text-2xl font-bold text-cocoa-500">Payments</h1>
        </div>
        {isBuyer && contract && (
          <button onClick={simulatePayment} disabled={busy} className="btn-primary">
            Pay {formatINR(contract.total_value)}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      {!payments && <LoadingState />}
      {payments && payments.length === 0 && <EmptyState title="No payments yet" subtitle="Payments appear here once initiated against this contract." />}
      {payments && payments.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-200 text-cocoa-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-tan-100">
                  <td className="px-4 py-3 text-cocoa-500 font-mono text-xs">{p.provider_ref}</td>
                  <td className="px-4 py-3 text-cocoa-500 font-medium">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-cocoa-400">{formatDateTime(p.paid_at || p.created_at)}</td>
                  <td className="px-4 py-3">
                    {p.status === "PROCESSING" && isBuyer && (
                      <button onClick={() => confirmPayment(p.id)} disabled={busy} className="btn-secondary text-xs py-1">Confirm</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
