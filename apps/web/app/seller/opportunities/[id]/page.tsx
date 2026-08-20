"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, ApiError } from "@/lib/api";
import { StatusBadge, LoadingState, formatINR, formatDate } from "@/components/ui";

type Requirement = {
  id: string; product_name: string; quantity: number; unit: string; target_price: number | null;
  delivery_location: string | null; delivery_from: string | null; delivery_to: string | null;
  quality_requirement: { grade?: string } | null; notes: string | null; status: string; created_at: string;
};

export default function SellerOpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [req, setReq] = useState<Requirement | null>(null);
  const [form, setForm] = useState({ unit_price: "", quantity: "", delivery_terms: "", payment_terms: "Payment within 3 days of delivery" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/buyer-requirements/${params.id}`).then((r) => {
      setReq(r);
      setForm((f) => ({ ...f, quantity: String(r.quantity), unit_price: r.target_price ? String(r.target_price) : "" }));
    });
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const quote = await api.post("/api/v1/quotes", {
        requirement_id: params.id, unit_price: Number(form.unit_price), quantity: Number(form.quantity),
        delivery_terms: form.delivery_terms, payment_terms: form.payment_terms,
      });
      router.push(`/seller/negotiations/${quote.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell area="seller">
      {!req && <LoadingState />}
      {req && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-cocoa-500">{req.product_name}</h1>
              <StatusBadge status={req.status} />
            </div>
            <div className="card space-y-3 text-sm">
              <Row label="Quantity" value={`${req.quantity.toLocaleString()} ${req.unit}`} />
              <Row label="Target Price" value={req.target_price ? formatINR(req.target_price) : "Not specified"} />
              <Row label="Required Grade" value={req.quality_requirement?.grade || "—"} />
              <Row label="Delivery Location" value={req.delivery_location || "—"} />
              <Row label="Delivery Window" value={req.delivery_from ? `${formatDate(req.delivery_from)} – ${req.delivery_to ? formatDate(req.delivery_to) : "—"}` : "—"} />
              <Row label="Posted" value={formatDate(req.created_at)} />
              {req.notes && <div><p className="text-cocoa-400 mb-1">Notes</p><p className="text-cocoa-500">{req.notes}</p></div>}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-cocoa-500 mb-4">Submit Your Quote</h2>
            <form onSubmit={handleSubmit} className="card space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="label-field">Unit Price (₹)</label>
                <input required type="number" step="0.01" className="input-field" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Quantity You Can Supply</label>
                <input required type="number" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label className="label-field">Delivery Terms</label>
                <input required className="input-field" value={form.delivery_terms} onChange={(e) => setForm({ ...form, delivery_terms: e.target.value })} placeholder="e.g. Pickup from Nashik" />
              </div>
              <div>
                <label className="label-field">Payment Terms</label>
                <input className="input-field" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Submitting..." : "Submit Quote"}</button>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-cocoa-400">{label}</span>
      <span className="font-medium text-cocoa-500 text-right">{value}</span>
    </div>
  );
}
