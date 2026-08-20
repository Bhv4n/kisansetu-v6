"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LoadingState, ErrorState, formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { MapPin, User2, Package } from "lucide-react";

type Product = {
  id: string; name: string; category: string; variety: string | null; unit: string; location: string | null;
  indicative_price: number | null; seller_name: string | null; seller_id: string; grade: string | null;
  available_quantity: number | null; description: string | null;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/v1/products/${params.id}`)
      .then(setProduct)
      .catch(() => setError("Product not found."));
  }, [params.id]);

  function handleRequestQuote() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/buyer/quotes/new?product_id=${params.id}`)}`);
      return;
    }
    router.push(`/buyer/quotes/new?product_id=${params.id}`);
  }

  return (
    <div>
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {!product && !error && <LoadingState />}
        {error && <ErrorState message={error} />}
        {product && (
          <div className="grid md:grid-cols-2 gap-10">
            <div className="h-72 rounded-xl2 bg-cream-200 p-8">
              <ProductImage name={product.name} className="w-full h-full" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-tan-600 font-semibold mb-1">{product.category}</p>
              <h1 className="text-3xl font-bold text-cocoa-500 mb-1">{product.name}</h1>
              {product.variety && <p className="text-cocoa-400 mb-4">Variety: {product.variety}</p>}

              <p className="text-2xl font-bold text-tan-700 mb-6">
                {product.indicative_price ? `${formatINR(product.indicative_price)} / ${product.unit}` : "Price on request"}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-cocoa-500">
                  <User2 size={16} className="text-tan-600" /> Sold by <span className="font-medium">{product.seller_name}</span>
                </div>
                {product.location && (
                  <div className="flex items-center gap-2 text-sm text-cocoa-500">
                    <MapPin size={16} className="text-tan-600" /> {product.location}
                  </div>
                )}
                {product.available_quantity && (
                  <div className="flex items-center gap-2 text-sm text-cocoa-500">
                    <Package size={16} className="text-tan-600" /> {product.available_quantity.toLocaleString()} {product.unit} available
                    {product.grade && ` · Grade ${product.grade}`}
                  </div>
                )}
              </div>

              {product.description && <p className="text-cocoa-400 mb-6">{product.description}</p>}

              <button onClick={handleRequestQuote} className="btn-primary">
                Request Quote
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
