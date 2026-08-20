import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, ShieldCheck, TrendingDown, QrCode } from "lucide-react";

export default function BuyersPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-3">For Buyers</h1>
        <p className="text-cocoa-400 mb-10 max-w-2xl">
          Source directly from verified farmers and FPOs. Negotiate transparently, track quality at every
          lot, and pay only against completed milestones.
        </p>
        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {[
            { icon: TrendingDown, title: "Better Pricing", body: "Cut out middlemen with direct farmer sourcing and live market benchmarks." },
            { icon: ShieldCheck, title: "Verified Contracts", body: "Every accepted term is locked into an immutable, versioned contract." },
            { icon: QrCode, title: "Full Traceability", body: "Track each lot from farm to delivery with QR-linked quality inspections." },
          ].map((f) => (
            <div key={f.title} className="card">
              <f.icon className="text-tan-600 mb-3" size={24} />
              <p className="font-semibold text-cocoa-500 mb-1">{f.title}</p>
              <p className="text-sm text-cocoa-400">{f.body}</p>
            </div>
          ))}
        </div>
        <Link href="/register" className="btn-primary inline-flex items-center gap-2">
          Register as a Buyer <ArrowRight size={16} />
        </Link>
      </div>
      <Footer />
    </div>
  );
}
