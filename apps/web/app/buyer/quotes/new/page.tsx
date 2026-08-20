"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, ApiError } from "@/lib/api";

type Product = { id: string; name: string; unit: string; indicative_price: number | null };

function NewQuoteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get("product_id");
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    product_name: "", quantity: "", unit: "kg", target_price: "", delivery_location: "",
    delivery_from: "", delivery_to: "", grade: "A", notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      api.get(`/api/v1/products/${productId}`).then((p) => {
        setProduct(p);
        setForm((f) => ({ ...f, product_name: p.name, unit: p.unit, target_price: p.indicative_price ? String(p.indicative_price) : "" }));
      });
    }
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const req = await api.post("/api/v1/buyer-requirements", {
        product_id: productId || undefined,
        product_name: form.product_name,
        quantity: Number(form.quantity),
        unit: form.unit,
        target_price: form.target_price ? Number(form.target_price) : undefined,
        delivery_location: form.delivery_location,
        delivery_from: form.delivery_from || undefined,
        delivery_to: form.delivery_to || undefined,
        quality_requirement: { grade: form.grade },
        notes: form.notes,
      });
      router.push(`/buyer/quotes/${req.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell area="buyer">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-1">Get a Quote</h1>
      <p className="text-cocoa-400 mb-8">Tell sellers what you need — matching sellers will see this as an opportunity.</p>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        {product && <div className="bg-tan-50 border border-tan-200 rounded-lg px-3 py-2 text-sm text-cocoa-500">Requesting a quote for <strong>{product.name}</strong></div>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Product Name</label>
            <input required disabled={!!product} className="input-field" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Required Grade</label>
            <select className="input-field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Quantity</label>
            <input required type="number" min="1" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Unit</label>
            <select className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="kg">kg</option><option value="quintal">quintal</option><option value="tonne">tonne</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-field">Target Price (₹ per unit)</label>
          <input type="number" step="0.01" className="input-field" value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} />
        </div>

        <div>
          <label className="label-field">Delivery Location</label>
          <input required className="input-field" value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })} placeholder="e.g. Pune" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Delivery From</label>
            <input type="date" className="input-field" value={form.delivery_from} onChange={(e) => setForm({ ...form, delivery_from: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Delivery To</label>
            <input type="date" className="input-field" value={form.delivery_to} onChange={(e) => setForm({ ...form, delivery_to: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label-field">Additional Notes</label>
          <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Submitting..." : "Submit Request"}</button>
      </form>
    </DashboardShell>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={null}>
      <NewQuoteForm />
    </Suspense>
  );
}
