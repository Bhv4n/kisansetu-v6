"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { NegotiationView } from "@/components/negotiation-view";

export default function BuyerNegotiationPage() {
  return (
    <DashboardShell area="buyer">
      <NegotiationView role="buyer" />
    </DashboardShell>
  );
}
