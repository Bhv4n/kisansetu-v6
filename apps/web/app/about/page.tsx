import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function AboutPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-cocoa-500 mb-6">About KISANSETU</h1>
        <p className="text-cocoa-400 mb-4">
          KISANSETU (&quot;Farmer Bridge&quot;) is a digital agricultural procurement and contract
          platform connecting buyers with farmers, sellers and Farmer Producer Organisations (FPOs).
        </p>
        <p className="text-cocoa-400 mb-4">
          The platform brings the entire deal lifecycle — discovery, negotiation, contracting, quality
          inspection, delivery and payment — onto one connected system, backed by a real SQL database
          and full audit trail.
        </p>
        <p className="text-cocoa-400">
          This build was assembled as a hackathon-ready demonstration, with realistic seed data clearly
          marked as such throughout the application.
        </p>
      </div>
      <Footer />
    </div>
  );
}
