"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractPaymentsView } from "@/components/contract-payments-view";

export default function AdminContractPaymentsPage() {
  return (
    <DashboardShell area="admin">
      <ContractPaymentsView />
    </DashboardShell>
  );
}
