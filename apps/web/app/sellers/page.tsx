import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, Wallet, Users2, BarChart3 } from "lucide-react";

export default function SellersPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-3">For Sellers & FPOs</h1>
        <p className="text-cocoa-400 mb-10 max-w-2xl">
          Reach verified buyers directly, negotiate fair terms, and get paid on time — backed by
          transparent contracts and quality records that protect your produce&apos;s value.
        </p>
        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {[
            { icon: Users2, title: "Direct Buyer Access", body: "List your produce and respond to real buyer requirements — no intermediaries." },
            { icon: BarChart3, title: "Market Insight", body: "See live market prices before you quote, so you never undersell your harvest." },
            { icon: Wallet, title: "On-Time Payments", body: "Track payment status against every contract milestone in real time." },
          ].map((f) => (
            <div key={f.title} className="card">
              <f.icon className="text-tan-600 mb-3" size={24} />
              <p className="font-semibold text-cocoa-500 mb-1">{f.title}</p>
              <p className="text-sm text-cocoa-400">{f.body}</p>
            </div>
          ))}
        </div>
        <Link href="/register" className="btn-primary inline-flex items-center gap-2">
          Register as a Seller <ArrowRight size={16} />
        </Link>
      </div>
      <Footer />
    </div>
  );
}
