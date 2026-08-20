"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractDetailView } from "@/components/contract-detail-view";

export default function SellerContractDetailPage() {
  return (
    <DashboardShell area="seller">
      <ContractDetailView role="seller" />
    </DashboardShell>
  );
}
