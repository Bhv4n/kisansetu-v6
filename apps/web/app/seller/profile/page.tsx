"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileView } from "@/components/profile-view";

export default function SellerProfilePage() {
  return (
    <DashboardShell area="seller">
      <ProfileView />
    </DashboardShell>
  );
}
