import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ClipboardList, MessageSquareText, FileSignature, QrCode, Truck, Wallet, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: ClipboardList, title: "Post a Requirement", body: "Buyers browse products or post a 'Get Quote' requirement with quantity, quality and delivery needs." },
  { icon: MessageSquareText, title: "Negotiate", body: "Sellers respond with quotes. Buyers and sellers counter-offer through chat until terms are agreed — every version is recorded." },
  { icon: FileSignature, title: "Contract Created", body: "Accepted terms automatically become a contract with milestones, from production through payment." },
  { icon: QrCode, title: "Lot & Quality", body: "Produce is assigned a lot with a QR code. Field officers record quality inspections against the contract's standard." },
  { icon: Truck, title: "Delivery", body: "Pickup and delivery milestones are tracked in real time, visible to both buyer and seller." },
  { icon: Wallet, title: "Payment", body: "Payments are simulated against contract milestones with clear DUE → PROCESSING → PAID states." },
  { icon: CheckCircle2, title: "Completed & Audited", body: "Every action — from login to payment — is recorded in an append-only audit log visible to management." },
];

export default function HowItWorksPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-3">How KISANSETU Works</h1>
        <p className="text-cocoa-400 mb-12">From discovery to payment, every step of the deal happens on one connected platform.</p>
        <div className="space-y-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-tan-100 text-tan-700 flex items-center justify-center shrink-0">
                  <s.icon size={20} />
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-tan-200 my-2" />}
              </div>
              <div className="pb-6">
                <p className="font-semibold text-cocoa-500 mb-1">{i + 1}. {s.title}</p>
                <p className="text-cocoa-400 text-sm">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
