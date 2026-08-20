import { LucideIcon } from "lucide-react";

export function KpiCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-cocoa-400 uppercase tracking-wide">{label}</p>
        <Icon size={18} className="text-tan-500" />
      </div>
      <p className="text-2xl font-bold text-cocoa-500">{value}</p>
      {sub && <p className="text-xs text-cocoa-400 mt-1">{sub}</p>}
    </div>
  );
}
