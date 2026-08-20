"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, EmptyState, formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { Search } from "lucide-react";

type Product = {
  id: string; name: string; category: string; unit: string; location: string | null;
  indicative_price: number | null; seller_name: string | null; grade: string | null;
};

export default function BuyerProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    api.get(`/api/v1/products?${params.toString()}`).then(setProducts).catch(() => setProducts([]));
  }, [q]);

  return (
    <DashboardShell area="buyer">
      <h1 className="text-2xl font-bold text-cocoa-500 mb-6">Browse Products</h1>
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400" size={18} />
        <input className="input-field pl-10" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!products && <LoadingState />}
      {products && products.length === 0 && <EmptyState title="No products found" />}
      {products && products.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <Link key={p.id} href={`/buyer/products/${p.id}`} className="card hover:shadow-lg transition-shadow">
              <div className="h-28 rounded-lg bg-cream-200 mb-3 p-2"><ProductImage name={p.name} className="w-full h-full" /></div>
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-cocoa-500">{p.name}</p>
                {p.grade && <span className="badge bg-tan-100 text-tan-700">Grade {p.grade}</span>}
              </div>
              <p className="text-xs text-cocoa-400 mb-2">{p.category} · {p.location}</p>
              <p className="text-sm font-semibold text-tan-700">{p.indicative_price ? `${formatINR(p.indicative_price)} / ${p.unit}` : "Price on request"}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
