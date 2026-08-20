"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractDetailView } from "@/components/contract-detail-view";

export default function AdminContractDetailPage() {
  return (
    <DashboardShell area="admin">
      <ContractDetailView role="admin" />
    </DashboardShell>
  );
}
