"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicNavbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, StatusBadge, formatDateTime } from "@/components/ui";
import {
  QrCode, MapPin, User2, ShieldCheck, Package, Sprout, ClipboardCheck, FileSignature,
  Truck, Wallet, Circle, UserCheck,
} from "lucide-react";

type TimelineStep = { milestone: string; status: string; completed_at: string | null };
type InspectionResult = { parameter: string; measured_value: string; result: string };
type Inspection = {
  status: string; notes: string | null; inspected_at: string | null;
  inspector_name: string | null; results: InspectionResult[];
};
type Delivery = {
  status: string; origin: string | null; destination: string | null;
  dispatch_date: string | null; expected_delivery_date: string | null;
  actual_delivery_date: string | null; delay_reason: string | null;
};
type Passport = {
  lot_code: string; quantity: number; unit: string; product_name: string; quality_grade: string | null;
  contract_no: string; buyer_name: string | null; seller_name: string | null; seller_location: string | null;
  seller_state: string | null; farm_name: string | null; farm_area_acres: number | null;
  contract_status: string; timeline: TimelineStep[]; inspections: Inspection[];
  delivery: Delivery | null; payment_status: string | null; created_at: string;
};

const TIMELINE_ICONS: Record<string, typeof Sprout> = {
  CONTRACT_ACCEPTED: FileSignature, PRODUCTION_STARTED: Sprout, READY_FOR_PICKUP: Package,
  PICKUP: Truck, QUALITY_INSPECTION: ClipboardCheck, DELIVERY: Truck, PAYMENT: Wallet,
};
const TIMELINE_LABELS: Record<string, string> = {
  CONTRACT_ACCEPTED: "Contract", PRODUCTION_STARTED: "Harvest", READY_FOR_PICKUP: "Ready",
  PICKUP: "Dispatch", QUALITY_INSPECTION: "Inspection", DELIVERY: "Delivery", PAYMENT: "Payment",
};

export default function LotPassportPage() {
  const params = useParams();
  const [lot, setLot] = useState<Passport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/v1/lots/${params.lotCode}`).then(setLot).catch(() => setError("Lot not found. Check the code and try again."));
  }, [params.lotCode]);

  return (
    <div>
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {!lot && !error && <LoadingState />}
        {error && <ErrorState message={error} />}
        {lot && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="text-tan-600" size={24} />
              <p className="text-xs uppercase tracking-wide text-tan-600 font-semibold">Digital Produce Passport</p>
            </div>
            <h1 className="text-3xl font-bold text-cocoa-500 mb-1">{lot.lot_code}</h1>
            <p className="text-cocoa-400 mb-6">Contract {lot.contract_no}</p>

            <div className="card space-y-4 mb-6">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Package size={16} className="text-tan-600" />
                <span className="text-cocoa-500">{lot.quantity.toLocaleString()} {lot.unit} of {lot.product_name}</span>
                {lot.quality_grade && <StatusBadge status={`Grade ${lot.quality_grade}`} />}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User2 size={16} className="text-tan-600" />
                <span className="text-cocoa-500">Grown by {lot.seller_name}{lot.farm_name ? ` — ${lot.farm_name}` : ""}</span>
              </div>
              {lot.farm_area_acres && (
                <div className="flex items-center gap-2 text-sm">
                  <Sprout size={16} className="text-tan-600" />
                  <span className="text-cocoa-500">{lot.farm_area_acres} acre farm</span>
                </div>
              )}
              {lot.seller_location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-tan-600" />
                  <span className="text-cocoa-500">{lot.seller_location}{lot.seller_state ? `, ${lot.seller_state}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck size={16} className="text-tan-600" />
                <span className="text-cocoa-500">Contract status:</span>
                <StatusBadge status={lot.contract_status} />
              </div>
              <p className="text-xs text-cocoa-400">Lot created {formatDateTime(lot.created_at)}</p>
            </div>

            <div className="card mb-6">
              <p className="font-semibold text-cocoa-500 mb-5">Traceability Timeline</p>
              <div className="flex items-start overflow-x-auto pb-2">
                {lot.timeline.map((step, i) => {
                  const Icon = TIMELINE_ICONS[step.milestone] || Circle;
                  const done = step.status === "DONE";
                  return (
                    <div key={step.milestone} className="flex items-start shrink-0">
                      <div className="flex flex-col items-center w-24">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? "bg-tan-600 text-white" : "bg-tan-100 text-tan-300"}`}>
                          <Icon size={18} />
                        </div>
                        <p className={`text-xs mt-2 text-center font-medium ${done ? "text-cocoa-500" : "text-cocoa-400"}`}>
                          {TIMELINE_LABELS[step.milestone] || step.milestone}
                        </p>
                        {step.completed_at && <p className="text-[10px] text-cocoa-400 text-center mt-0.5">{formatDateTime(step.completed_at)}</p>}
                      </div>
                      {i < lot.timeline.length - 1 && <div className={`h-0.5 w-8 sm:w-10 mt-5 ${done ? "bg-tan-500" : "bg-tan-100"}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {lot.delivery && (
              <div className="card mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Truck size={18} className="text-tan-600" />
                  <p className="font-semibold text-cocoa-500">Delivery</p>
                  <StatusBadge status={lot.delivery.status} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-cocoa-400">From</span> <span className="text-cocoa-500 font-medium">{lot.delivery.origin || "—"}</span></div>
                  <div><span className="text-cocoa-400">To</span> <span className="text-cocoa-500 font-medium">{lot.delivery.destination || "—"}</span></div>
                  {lot.delivery.dispatch_date && <div><span className="text-cocoa-400">Dispatched</span> <span className="text-cocoa-500 font-medium">{formatDateTime(lot.delivery.dispatch_date)}</span></div>}
                  {lot.delivery.actual_delivery_date ? (
                    <div><span className="text-cocoa-400">Delivered</span> <span className="text-cocoa-500 font-medium">{formatDateTime(lot.delivery.actual_delivery_date)}</span></div>
                  ) : lot.delivery.expected_delivery_date ? (
                    <div><span className="text-cocoa-400">Expected</span> <span className="text-cocoa-500 font-medium">{formatDateTime(lot.delivery.expected_delivery_date)}</span></div>
                  ) : null}
                </div>
                {lot.delivery.delay_reason && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">{lot.delivery.delay_reason}</p>}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="card">
                <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-1">Buyer</p>
                <p className="font-semibold text-cocoa-500">{lot.buyer_name || "—"}</p>
              </div>
              <div className="card">
                <p className="text-xs text-cocoa-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Wallet size={12} /> Payment Status</p>
                {lot.payment_status ? <StatusBadge status={lot.payment_status} /> : <p className="text-sm text-cocoa-400">Not yet initiated</p>}
              </div>
            </div>

            <p className="font-semibold text-cocoa-500 mb-3">Quality Inspections</p>
            {lot.inspections.length === 0 ? (
              <p className="text-sm text-cocoa-400">No inspections recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {lot.inspections.map((insp, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm text-cocoa-500 font-medium">{insp.inspected_at ? formatDateTime(insp.inspected_at) : "Pending"}</p>
                        {insp.inspector_name && (
                          <p className="text-xs text-cocoa-400 flex items-center gap-1 mt-0.5"><UserCheck size={12} /> Inspected by {insp.inspector_name}</p>
                        )}
                      </div>
                      <StatusBadge status={insp.status} />
                    </div>
                    {insp.notes && <p className="text-xs text-cocoa-400 mb-2">{insp.notes}</p>}
                    {insp.results.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        {insp.results.map((r, ri) => (
                          <div key={ri} className="flex items-center justify-between bg-cream-200 rounded-lg px-3 py-1.5 text-xs">
                            <span className="text-cocoa-500">{r.parameter}</span>
                            <span className="flex items-center gap-1.5">
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
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
