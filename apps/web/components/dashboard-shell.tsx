"use client";

import { ProtectedRoute } from "./protected-route";
import { DashboardNavbar, BUYER_LINKS, SELLER_LINKS, ADMIN_LINKS } from "./navbar";

const ROLE_CONFIG: Record<string, { roles: string[]; navRole: string; links: { href: string; label: string }[] }> = {
  buyer: { roles: ["BUYER"], navRole: "buyer", links: BUYER_LINKS },
  seller: { roles: ["SELLER", "FPO_MANAGER"], navRole: "seller", links: SELLER_LINKS },
  admin: { roles: ["ADMIN", "FIELD_OFFICER"], navRole: "admin", links: ADMIN_LINKS },
};

export function DashboardShell({ area, children }: { area: "buyer" | "seller" | "admin"; children: React.ReactNode }) {
  const config = ROLE_CONFIG[area];
  return (
    <ProtectedRoute roles={config.roles}>
      <div className="min-h-screen flex flex-col">
        <DashboardNavbar role={config.navRole} links={config.links} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
