"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingState } from "./ui";

export function ProtectedRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [user, loading, roles, router, pathname]);

  if (loading || !user || (roles.length > 0 && !roles.includes(user.role))) {
    return <LoadingState label="Checking access..." />;
  }

  return <>{children}</>;
}
