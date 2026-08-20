"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractQualityView } from "@/components/contract-quality-view";

export default function AdminContractQualityPage() {
  return (
    <DashboardShell area="admin">
      <ContractQualityView />
    </DashboardShell>
  );
}
