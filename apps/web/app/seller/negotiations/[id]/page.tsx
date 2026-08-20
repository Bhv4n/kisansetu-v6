"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { NegotiationView } from "@/components/negotiation-view";

export default function SellerNegotiationPage() {
  return (
    <DashboardShell area="seller">
      <NegotiationView role="seller" />
    </DashboardShell>
  );
}
