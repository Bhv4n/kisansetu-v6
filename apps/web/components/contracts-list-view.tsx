"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatINR } from "@/components/ui";

type Contract = { id: string; contract_no: string; product_name: string; quantity: number; unit: string; status: string; total_value: number };

export function ContractsListView({ role }: { role: "buyer" | "seller" }) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);

  useEffect(() => {
    api.get("/api/v1/contracts").then(setContracts).catch(() => setContracts([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-cocoa-500 mb-6">Contracts</h1>
      {!contracts && <LoadingState />}
      {contracts && contracts.length === 0 && <EmptyState title="No contracts yet" subtitle="Contracts are created automatically once a quote is accepted." />}
      {contracts && contracts.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((c) => (
            <Link key={c.id} href={`/${role}/contracts/${c.id}`} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-cocoa-500">{c.contract_no}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-cocoa-400 mb-1">{c.product_name}</p>
              <p className="text-sm text-cocoa-500">{c.quantity.toLocaleString()} {c.unit}</p>
              <p className="text-lg font-bold text-tan-700 mt-2">{formatINR(c.total_value)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
