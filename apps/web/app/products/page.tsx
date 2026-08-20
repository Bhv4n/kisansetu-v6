"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { api } from "@/lib/api";
import { LoadingState, EmptyState, ErrorState, formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { Search } from "lucide-react";

type Product = {
  id: string; name: string; category: string; unit: string; location: string | null;
  indicative_price: number | null; seller_name: string | null; grade: string | null; available_quantity: number | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  function load() {
    setError("");
    setProducts(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    api
      .get(`/api/v1/products?${params.toString()}`)
      .then(setProducts)
      .catch(() => setError("Could not load products."));
  }

  useEffect(load, [q, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = ["Vegetable", "Grain", "Pulses", "Cash Crop", "Fruit"];

  return (
    <div>
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-2">Product Discovery</h1>
        <p className="text-cocoa-400 mb-8">Browse fresh produce and grain from verified sellers and FPOs.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400" size={18} />
            <input className="input-field pl-10" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input-field sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {products === null && !error && <LoadingState label="Loading products..." />}
        {error && <ErrorState message={error} onRetry={load} />}
        {products && products.length === 0 && <EmptyState title="No products found" subtitle="Try a different search or category." />}
        {products && products.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="card hover:shadow-lg transition-shadow group">
                <div className="h-32 rounded-lg bg-cream-200 mb-3 p-2">
                  <ProductImage name={p.name} className="w-full h-full" />
                </div>
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-cocoa-500 group-hover:text-tan-700">{p.name}</p>
                  {p.grade && <span className="badge bg-tan-100 text-tan-700">Grade {p.grade}</span>}
                </div>
                <p className="text-xs text-cocoa-400 mb-2">{p.category} · {p.location}</p>
                <p className="text-xs text-cocoa-400 mb-2">Sold by {p.seller_name}</p>
                <p className="text-sm font-semibold text-tan-700">
                  {p.indicative_price ? `${formatINR(p.indicative_price)} / ${p.unit}` : "Price on request"}
                </p>
                {p.available_quantity && <p className="text-xs text-cocoa-400 mt-1">{p.available_quantity.toLocaleString()} {p.unit} available</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
