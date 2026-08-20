import Link from "next/link";
import { Sprout } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-cocoa-500 text-cream-100 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-bold text-lg text-white mb-2">
            <Sprout className="text-tan-400" size={22} />
            KISANSETU
          </div>
          <p className="text-sm text-tan-100/70">Connecting buyers and farmers through transparent contracts and traceable quality.</p>
        </div>
        <div>
          <p className="font-semibold text-white mb-3 text-sm">Platform</p>
          <ul className="space-y-2 text-sm text-tan-100/70">
            <li><Link href="/products" className="hover:text-white">Products</Link></li>
            <li><Link href="/market" className="hover:text-white">Market Data</Link></li>
            <li><Link href="/how-it-works" className="hover:text-white">How It Works</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-3 text-sm">Community</p>
          <ul className="space-y-2 text-sm text-tan-100/70">
            <li><Link href="/buyers" className="hover:text-white">For Buyers</Link></li>
            <li><Link href="/sellers" className="hover:text-white">For Sellers</Link></li>
            <li><Link href="/about" className="hover:text-white">About</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-3 text-sm">Account</p>
          <ul className="space-y-2 text-sm text-tan-100/70">
            <li><Link href="/login" className="hover:text-white">Login</Link></li>
            <li><Link href="/register" className="hover:text-white">Register</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-tan-100/50">
        © {new Date().getFullYear()} KISANSETU. Hackathon demo build.
      </div>
    </footer>
  );
}
