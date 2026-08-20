"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractsListView } from "@/components/contracts-list-view";

export default function BuyerContractsPage() {
  return (
    <DashboardShell area="buyer">
      <ContractsListView role="buyer" />
    </DashboardShell>
  );
}
