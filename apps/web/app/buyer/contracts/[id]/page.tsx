"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractDetailView } from "@/components/contract-detail-view";

export default function BuyerContractDetailPage() {
  return (
    <DashboardShell area="buyer">
      <ContractDetailView role="buyer" />
    </DashboardShell>
  );
}
