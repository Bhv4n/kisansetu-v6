"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { StatusBadge, LoadingState, EmptyState, formatDateTime } from "@/components/ui";
import { ShieldCheck } from "lucide-react";

type Result = { parameter: string; measured_value: string; result: string };
type Inspection = { id: string; status: string; notes: string | null; inspected_at: string | null; results: Result[] };

export function ContractQualityView() {
  const params = useParams();
  const [inspections, setInspections] = useState<Inspection[] | null>(null);

  useEffect(() => {
    api.get(`/api/v1/contracts/${params.id}/quality`).then(setInspections).catch(() => setInspections([]));
  }, [params.id]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">Quality Inspections</h1>
      </div>

      {!inspections && <LoadingState />}
      {inspections && inspections.length === 0 && <EmptyState title="No inspections recorded yet" subtitle="Quality inspections are logged once a lot reaches pickup." />}
      {inspections && inspections.length > 0 && (
        <div className="space-y-4">
          {inspections.map((insp) => (
            <div key={insp.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-cocoa-500">{insp.inspected_at ? formatDateTime(insp.inspected_at) : "Pending inspection"}</p>
                <StatusBadge status={insp.status} />
              </div>
              {insp.notes && <p className="text-sm text-cocoa-400 mb-3">{insp.notes}</p>}
              {insp.results.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {insp.results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-cream-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-cocoa-500">{r.parameter}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-cocoa-400">{r.measured_value}</span>
                        <StatusBadge status={r.result} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
