"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractQualityView } from "@/components/contract-quality-view";

export default function BuyerContractQualityPage() {
  return (
    <DashboardShell area="buyer">
      <ContractQualityView />
    </DashboardShell>
  );
}
