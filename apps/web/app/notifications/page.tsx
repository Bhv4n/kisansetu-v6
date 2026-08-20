"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardNavbar, BUYER_LINKS, SELLER_LINKS, ADMIN_LINKS } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { LoadingState, EmptyState, formatDateTime } from "@/components/ui";
import { Bell } from "lucide-react";

type Notification = { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string };

const NAV_BY_ROLE: Record<string, { navRole: string; links: { href: string; label: string }[] }> = {
  BUYER: { navRole: "buyer", links: BUYER_LINKS },
  SELLER: { navRole: "seller", links: SELLER_LINKS },
  FPO_MANAGER: { navRole: "seller", links: SELLER_LINKS },
  ADMIN: { navRole: "admin", links: ADMIN_LINKS },
  FIELD_OFFICER: { navRole: "admin", links: ADMIN_LINKS },
};

function NotificationsInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/notifications").then(setNotifications).catch(() => setNotifications([]));
  }, []);

  async function openNotification(n: Notification) {
    if (!n.is_read) {
      await api.post(`/api/v1/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  if (!user) return <LoadingState />;
  const nav = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.BUYER;

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar role={nav.navRole} links={nav.links} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="text-tan-600" size={22} />
          <h1 className="text-2xl font-bold text-cocoa-500">Notifications</h1>
        </div>
        {!notifications && <LoadingState />}
        {notifications && notifications.length === 0 && <EmptyState title="No notifications yet" />}
        {notifications && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`w-full text-left card flex items-start justify-between gap-3 ${!n.is_read ? "border-tan-400 bg-tan-50" : ""}`}
              >
                <div>
                  <p className="font-medium text-cocoa-500 text-sm">{n.title}</p>
                  {n.body && <p className="text-xs text-cocoa-400 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-cocoa-400 mt-1">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-tan-600 mt-1.5 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute roles={[]}>
      <NotificationsInner />
    </ProtectedRoute>
  );
}
