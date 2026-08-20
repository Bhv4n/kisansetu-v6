"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, ApiError } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "Vegetable", variety: "", unit: "kg", quantity: "", grade: "A",
    indicative_price: "", location: "", description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/v1/products", {
        name: form.name, category: form.category, variety: form.variety || undefined, unit: form.unit,
        quantity: form.quantity ? Number(form.quantity) : undefined, grade: form.grade,
        indicative_price: form.indicative_price ? Number(form.indicative_price) : undefined,
        location: form.location, description: form.description,
      });
      router.push("/seller/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not list product.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell area="seller">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-1">List a Product</h1>
      <p className="text-cocoa-400 mb-8">Add your produce so buyers can discover and request quotes.</p>

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Product Name</label>
            <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tomato" />
          </div>
          <div>
            <label className="label-field">Category</label>
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Vegetable", "Grain", "Pulses", "Cash Crop", "Fruit"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Variety</label>
            <input className="input-field" value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Grade</label>
            <select className="input-field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Quantity</label>
            <input type="number" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label-field">Unit</label>
            <select className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="kg">kg</option><option value="quintal">quintal</option><option value="tonne">tonne</option>
            </select>
          </div>
          <div>
            <label className="label-field">Price (₹/unit)</label>
            <input type="number" step="0.01" className="input-field" value={form.indicative_price} onChange={(e) => setForm({ ...form, indicative_price: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label-field">Location</label>
          <input required className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Nashik" />
        </div>

        <div>
          <label className="label-field">Description</label>
          <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Listing..." : "List Product"}</button>
      </form>
    </DashboardShell>
  );
}
