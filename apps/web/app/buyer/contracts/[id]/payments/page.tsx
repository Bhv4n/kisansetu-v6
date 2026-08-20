"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractPaymentsView } from "@/components/contract-payments-view";

export default function BuyerContractPaymentsPage() {
  return (
    <DashboardShell area="buyer">
      <ContractPaymentsView />
    </DashboardShell>
  );
}
