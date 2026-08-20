"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractQualityView } from "@/components/contract-quality-view";

export default function SellerContractQualityPage() {
  return (
    <DashboardShell area="seller">
      <ContractQualityView />
    </DashboardShell>
  );
}
