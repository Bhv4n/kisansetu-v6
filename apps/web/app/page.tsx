"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { api } from "@/lib/api";
import { formatINR } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { ArrowRight, ShieldCheck, FileCheck2, QrCode, TrendingUp } from "lucide-react";

type Product = {
  id: string; name: string; category: string; unit: string; location: string | null;
  indicative_price: number | null; seller_name: string | null;
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get("/api/v1/products").then((rows) => setProducts(rows.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div>
      <PublicNavbar />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="badge bg-tan-100 text-tan-700 mb-4">Agricultural Procurement, Reimagined</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-cocoa-500 leading-tight mb-5">
            Fair contracts between buyers and farmers, from quote to payment.
          </h1>
          <p className="text-cocoa-400 text-lg mb-8 max-w-lg">
            KISANSETU connects agricultural buyers with farmers and FPOs through transparent
            negotiation, verified contracts, quality traceability and secure payments.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary flex items-center gap-2">
              Explore Products <ArrowRight size={16} />
            </Link>
            <Link href="/register" className="btn-secondary">
              Get Started
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: ShieldCheck, label: "Verified Contracts", sub: "Immutable, versioned terms" },
            { icon: QrCode, label: "Lot Traceability", sub: "QR-linked quality passport" },
            { icon: FileCheck2, label: "Quality Inspections", sub: "Field-verified grading" },
            { icon: TrendingUp, label: "Live Market Data", sub: "Real prices, real trends" },
          ].map((f) => (
            <div key={f.label} className="card">
              <f.icon className="text-tan-600 mb-3" size={26} />
              <p className="font-semibold text-cocoa-500 text-sm">{f.label}</p>
              <p className="text-xs text-cocoa-400 mt-1">{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products for Buyers */}
      <section className="bg-white py-16 border-y border-tan-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-cocoa-500">For Buyers</h2>
              <p className="text-cocoa-400 mt-1">Discover fresh produce and grain directly from verified sellers.</p>
            </div>
            <Link href="/products" className="btn-ghost flex items-center gap-1 text-sm">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="card hover:shadow-lg transition-shadow group">
                <div className="h-28 rounded-lg bg-cream-200 mb-3 p-2">
                  <ProductImage name={p.name} className="w-full h-full" />
                </div>
                <p className="font-semibold text-cocoa-500 group-hover:text-tan-700">{p.name}</p>
                <p className="text-xs text-cocoa-400 mb-2">{p.location}</p>
                <p className="text-sm font-medium text-tan-700">
                  {p.indicative_price ? `${formatINR(p.indicative_price)} / ${p.unit}` : "Price on request"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1 grid grid-cols-2 gap-4">
          {["Rajesh Farms", "Green Valley Farms", "Nashik Growers FPO", "Sunrise Organics"].map((n) => (
            <div key={n} className="card">
              <p className="text-2xl mb-2">🚜</p>
              <p className="font-semibold text-sm text-cocoa-500">{n}</p>
              <p className="text-xs text-cocoa-400">Verified seller</p>
            </div>
          ))}
        </div>
        <div className="order-1 md:order-2">
          <h2 className="text-2xl font-bold text-cocoa-500 mb-3">For Sellers & FPOs</h2>
          <p className="text-cocoa-400 mb-6">
            List your produce, respond to buyer requirements, negotiate transparently, and get paid on
            time — all backed by verified contracts and quality records.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            Register as a Seller <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Market section */}
      <section className="bg-white py-16 border-y border-tan-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-cocoa-500 mb-3">Live Market Data</h2>
          <p className="text-cocoa-400 mb-8 max-w-xl mx-auto">
            Track real prices across markets and locations, sourced directly from the KISANSETU database.
          </p>
          <Link href="/market" className="btn-primary inline-flex items-center gap-2">
            View Market Prices <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
