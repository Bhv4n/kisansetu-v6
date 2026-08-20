"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { StatusBadge, LoadingState, formatINR, formatDateTime } from "@/components/ui";
import { CheckCircle2, Circle, QrCode, ShieldCheck, Truck, Wallet, FileText, ChevronRight } from "lucide-react";

type Milestone = { type: string; status: string; due_at: string | null; completed_at: string | null };
type Lot = { id: string; lot_code: string; qr_token: string; quantity: number; unit: string };
type PaymentT = { id: string; amount: number; status: string; milestone_id: string | null };
type Contract = {
  id: string; contract_no: string; buyer_id: string; seller_id: string; buyer_name: string; seller_name: string;
  product_name: string; quantity: number; unit: string; unit_price: number; total_value: number;
  quality_grade: string | null; delivery_terms: string | null; payment_terms: string | null; status: string;
  milestones: Milestone[]; lots: Lot[]; payments: PaymentT[]; inspections: { id: string; status: string }[];
};

const TIMELINE_STEPS = [
  { type: "CONTRACT_ACCEPTED", label: "Accepted" },
  { type: "PRODUCTION_STARTED", label: "Growing" },
  { type: "READY_FOR_PICKUP", label: "Ready" },
  { type: "PICKUP", label: "Pickup" },
  { type: "QUALITY_INSPECTION", label: "Inspection" },
  { type: "DELIVERY", label: "Delivery" },
  { type: "PAYMENT", label: "Payment" },
];

export function ContractDetailView({ role }: { role: "buyer" | "seller" | "admin" }) {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get(`/api/v1/contracts/${params.id}`).then(setContract).catch(() => setError("Could not load contract."));
  }, [params.id]);

  useEffect(load, [load]);

  async function completeMilestone(type: string) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/v1/contracts/${params.id}/milestones/${type}/complete`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete milestone.");
    } finally {
      setBusy(false);
    }
  }

  async function createLot() {
    if (!contract) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/api/v1/lots", { contract_id: contract.id, quantity: contract.quantity, unit: contract.unit });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create lot.");
    } finally {
      setBusy(false);
    }
  }

  if (!contract) return <LoadingState />;

  const doneCount = contract.milestones.filter((m) => m.status === "DONE").length;
  const nextPending = contract.milestones.find((m) => m.status !== "DONE");
  const basePath = `/${role}`;

  return (
    <div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-cocoa-500">{contract.contract_no}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="text-cocoa-400">{contract.product_name} · {contract.buyer_name} → {contract.seller_name}</p>
        </div>
        <p className="text-2xl font-bold text-tan-700">{formatINR(contract.total_value)}</p>
      </div>

      {/* Key terms */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Quantity", value: `${contract.quantity.toLocaleString()} ${contract.unit}` },
          { label: "Unit Price", value: formatINR(contract.unit_price) },
          { label: "Quality Grade", value: contract.quality_grade || "—" },
          { label: "Payment Terms", value: contract.payment_terms || "—" },
        ].map((f) => (
          <div key={f.label} className="card">
            <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-1">{f.label}</p>
            <p className="font-semibold text-cocoa-500">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Visual timeline */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold text-cocoa-500">Contract Progress</p>
          <p className="text-sm text-cocoa-400">{doneCount} / {TIMELINE_STEPS.length} milestones</p>
        </div>
        <div className="flex items-center overflow-x-auto pb-2">
          {TIMELINE_STEPS.map((step, i) => {
            const m = contract.milestones.find((mm) => mm.type === step.type);
            const done = m?.status === "DONE";
            return (
              <div key={step.type} className="flex items-center shrink-0">
                <div className="flex flex-col items-center w-24">
                  {done ? <CheckCircle2 className="text-tan-600" size={26} /> : <Circle className="text-tan-200" size={26} />}
                  <p className={`text-xs mt-1.5 text-center ${done ? "text-cocoa-500 font-medium" : "text-cocoa-400"}`}>{step.label}</p>
                  {m?.completed_at && <p className="text-[10px] text-cocoa-400">{formatDateTime(m.completed_at)}</p>}
                </div>
                {i < TIMELINE_STEPS.length - 1 && <div className={`h-0.5 w-8 sm:w-12 ${done ? "bg-tan-500" : "bg-tan-100"}`} />}
              </div>
            );
          })}
        </div>
        {nextPending && role !== "admin" && (
          <button onClick={() => completeMilestone(nextPending.type)} disabled={busy} className="btn-primary mt-5">
            Mark &quot;{TIMELINE_STEPS.find((s) => s.type === nextPending.type)?.label}&quot; Complete
          </button>
        )}
      </div>

      {/* Sections grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-3"><QrCode size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Lot & Traceability</p></div>
          {contract.lots.length === 0 ? (
            <>
              <p className="text-sm text-cocoa-400 mb-3">No lot created yet.</p>
              {role !== "admin" && <button onClick={createLot} disabled={busy} className="btn-secondary text-sm">Create Lot</button>}
            </>
          ) : (
            contract.lots.map((lot) => (
              <div key={lot.id} className="flex items-center justify-between text-sm py-1.5">
                <div>
                  <p className="font-medium text-cocoa-500">{lot.lot_code}</p>
                  <p className="text-cocoa-400 text-xs">{lot.quantity.toLocaleString()} {lot.unit}</p>
                </div>
                <Link href={`/lots/${lot.lot_code}`} className="text-tan-700 text-xs flex items-center gap-0.5">View <ChevronRight size={12} /></Link>
              </div>
            ))
          )}
        </div>

        <Link href={`${basePath}/contracts/${contract.id}/quality`} className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Quality</p></div>
          <p className="text-sm text-cocoa-400">{contract.inspections.length} inspection(s) recorded</p>
          <p className="text-tan-700 text-xs flex items-center gap-0.5 mt-2">View details <ChevronRight size={12} /></p>
        </Link>

        <Link href={`${basePath}/contracts/${contract.id}/payments`} className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-3"><Wallet size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Payments</p></div>
          <p className="text-sm text-cocoa-400">{contract.payments.length} payment record(s)</p>
          <p className="text-tan-700 text-xs flex items-center gap-0.5 mt-2">View details <ChevronRight size={12} /></p>
        </Link>
      </div>

      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-3"><FileText size={18} className="text-tan-600" /><p className="font-semibold text-cocoa-500">Delivery Terms</p></div>
        <p className="text-sm text-cocoa-400">{contract.delivery_terms || "Not specified."}</p>
      </div>
    </div>
  );
}
