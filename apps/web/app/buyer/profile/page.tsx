"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileView } from "@/components/profile-view";

export default function BuyerProfilePage() {
  return (
    <DashboardShell area="buyer">
      <ProfileView />
    </DashboardShell>
  );
}
