"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { LoadingState, StatusBadge } from "@/components/ui";
import { User2 } from "lucide-react";

export function ProfileView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.get("/api/v1/me/profile").then(setProfile).catch(() => setProfile({}));
  }, []);

  if (!user || !profile) return <LoadingState />;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <User2 className="text-tan-600" size={22} />
        <h1 className="text-2xl font-bold text-cocoa-500">My Profile</h1>
      </div>
      <div className="card space-y-4">
        <Row label="Full Name" value={user.full_name || "—"} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role.replace("_", " ")} />
        {typeof profile.business_name === "string" && <Row label="Business Name" value={profile.business_name} />}
        {typeof profile.display_name === "string" && <Row label="Display Name" value={profile.display_name} />}
        {typeof profile.city === "string" && <Row label="City" value={profile.city} />}
        {typeof profile.state === "string" && <Row label="State" value={profile.state} />}
        {typeof profile.verification_status === "string" && (
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-cocoa-400">Verification</span>
            <StatusBadge status={profile.verification_status} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-tan-100 last:border-0">
      <span className="text-sm text-cocoa-400">{label}</span>
      <span className="text-sm font-medium text-cocoa-500">{value}</span>
    </div>
  );
}
