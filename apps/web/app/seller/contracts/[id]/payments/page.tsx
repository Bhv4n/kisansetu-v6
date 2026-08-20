"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ContractPaymentsView } from "@/components/contract-payments-view";

export default function SellerContractPaymentsPage() {
  return (
    <DashboardShell area="seller">
      <ContractPaymentsView />
    </DashboardShell>
  );
}
