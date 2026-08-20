"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingState, EmptyState, formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { Plus } from "lucide-react";

type Product = { id: string; name: string; category: string; unit: string; indicative_price: number | null; available_quantity: number | null; grade: string | null; seller_id: string };

export default function SellerProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  return (
    <DashboardShell area="seller">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-cocoa-500">My Products</h1>
        <Link href="/seller/products/new" className="btn-primary flex items-center gap-1"><Plus size={16} /> List Product</Link>
      </div>
      {!products && <LoadingState />}
      {products && products.length === 0 && (
        <EmptyState title="No products listed yet" subtitle="List your first product so buyers can discover it." action={<Link href="/seller/products/new" className="btn-primary">List a Product</Link>} />
      )}
      {products && products.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <div key={p.id} className="card">
              <div className="h-24 rounded-lg bg-cream-200 mb-3 p-2"><ProductImage name={p.name} className="w-full h-full" /></div>
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-cocoa-500">{p.name}</p>
                {p.grade && <span className="badge bg-tan-100 text-tan-700">Grade {p.grade}</span>}
              </div>
              <p className="text-xs text-cocoa-400 mb-2">{p.category}</p>
              <p className="text-sm font-semibold text-tan-700">{p.indicative_price ? `${formatINR(p.indicative_price)} / ${p.unit}` : "No price set"}</p>
              {p.available_quantity && <p className="text-xs text-cocoa-400 mt-1">{p.available_quantity.toLocaleString()} {p.unit} available</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
