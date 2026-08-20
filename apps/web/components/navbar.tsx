"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sprout, Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-cocoa-500">
      <Sprout className="text-tan-600" size={24} />
      KISANSETU
    </Link>
  );
}

export function PublicNavbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const links = [
    { href: "/products", label: "Products" },
    { href: "/market", label: "Market" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/buyers", label: "For Buyers" },
    { href: "/sellers", label: "For Sellers" },
    { href: "/about", label: "About" },
  ];
  const roleHome: Record<string, string> = {
    BUYER: "/buyer/dashboard",
    SELLER: "/seller/dashboard",
    FPO_MANAGER: "/seller/dashboard",
    FIELD_OFFICER: "/admin/quality",
    ADMIN: "/admin/dashboard",
  };
  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-tan-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-cocoa-400">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "text-tan-700" : "hover:text-tan-700 transition-colors"}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href={roleHome[user.role] || "/"} className="btn-primary text-sm">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                Login
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    api
      .get("/api/v1/notifications")
      .then((rows) => setCount(rows.filter((n: { is_read: boolean }) => !n.is_read).length))
      .catch(() => {});
  }, []);
  return (
    <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-tan-50 text-cocoa-500">
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-tan-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function DashboardNavbar({ role, links }: { role: string; links: { href: string; label: string }[] }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-tan-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-cocoa-400">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname === l.href || pathname?.startsWith(l.href + "/") ? "text-tan-700" : "hover:text-tan-700 transition-colors"}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-tan-50">
              <div className="w-8 h-8 rounded-full bg-tan-500 text-white flex items-center justify-center text-sm font-semibold">
                {(user?.full_name || "?")[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-cocoa-500">{user?.full_name}</span>
              <ChevronDown size={16} className="text-cocoa-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-tan-100 rounded-lg shadow-card py-1">
                <Link
                  href={`/${role}/profile`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-cocoa-500 hover:bg-cream-200"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export const BUYER_LINKS = [
  { href: "/buyer/dashboard", label: "Dashboard" },
  { href: "/buyer/copilot", label: "Copilot" },
  { href: "/buyer/products", label: "Products" },
  { href: "/buyer/quotes", label: "Quotes" },
  { href: "/buyer/contracts", label: "Contracts" },
  { href: "/market", label: "Market" },
];

export const SELLER_LINKS = [
  { href: "/seller/dashboard", label: "Dashboard" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/opportunities", label: "Opportunities" },
  { href: "/seller/quotes", label: "Quotes" },
  { href: "/seller/contracts", label: "Contracts" },
  { href: "/market", label: "Market" },
];

export const ADMIN_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/contracts", label: "Contracts" },
  { href: "/admin/quality", label: "Quality" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/market", label: "Market" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];
