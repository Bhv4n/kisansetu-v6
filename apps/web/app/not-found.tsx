import Link from "next/link";
import { PublicNavbar } from "@/components/navbar";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <div>
      <PublicNavbar />
      <div className="max-w-lg mx-auto px-4 py-32 text-center">
        <Sprout className="mx-auto text-tan-400 mb-4" size={40} />
        <h1 className="text-3xl font-bold text-cocoa-500 mb-2">Page not found</h1>
        <p className="text-cocoa-400 mb-6">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <Link href="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
