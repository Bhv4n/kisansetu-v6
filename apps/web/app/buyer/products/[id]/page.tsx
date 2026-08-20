"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { api } from "@/lib/api";
import { LoadingState, formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { MapPin, User2, Package } from "lucide-react";

type Product = {
  id: string; name: string; category: string; variety: string | null; unit: string; location: string | null;
  indicative_price: number | null; seller_name: string | null; grade: string | null; available_quantity: number | null; description: string | null;
};

export default function BuyerProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    api.get(`/api/v1/products/${params.id}`).then(setProduct).catch(() => {});
  }, [params.id]);

  return (
    <DashboardShell area="buyer">
      {!product && <LoadingState />}
      {product && (
        <div className="grid md:grid-cols-2 gap-10">
          <div className="h-72 rounded-xl2 bg-cream-200 p-8"><ProductImage name={product.name} className="w-full h-full" /></div>
          <div>
            <p className="text-xs uppercase tracking-wide text-tan-600 font-semibold mb-1">{product.category}</p>
            <h1 className="text-3xl font-bold text-cocoa-500 mb-1">{product.name}</h1>
            {product.variety && <p className="text-cocoa-400 mb-4">Variety: {product.variety}</p>}
            <p className="text-2xl font-bold text-tan-700 mb-6">{product.indicative_price ? `${formatINR(product.indicative_price)} / ${product.unit}` : "Price on request"}</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-cocoa-500"><User2 size={16} className="text-tan-600" /> Sold by <span className="font-medium">{product.seller_name}</span></div>
              {product.location && <div className="flex items-center gap-2 text-sm text-cocoa-500"><MapPin size={16} className="text-tan-600" /> {product.location}</div>}
              {product.available_quantity && (
                <div className="flex items-center gap-2 text-sm text-cocoa-500">
                  <Package size={16} className="text-tan-600" /> {product.available_quantity.toLocaleString()} {product.unit} available {product.grade && `· Grade ${product.grade}`}
                </div>
              )}
            </div>
            {product.description && <p className="text-cocoa-400 mb-6">{product.description}</p>}
            <button onClick={() => router.push(`/buyer/quotes/new?product_id=${product.id}`)} className="btn-primary">Request Quote</button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
