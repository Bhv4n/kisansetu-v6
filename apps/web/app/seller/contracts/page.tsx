"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractsListView } from "@/components/contracts-list-view";

export default function SellerContractsPage() {
  return (
    <DashboardShell area="seller">
      <ContractsListView role="seller" />
    </DashboardShell>
  );
}
