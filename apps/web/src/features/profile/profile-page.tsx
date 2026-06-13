"use client";

import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.full_name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your account information across the EPPLMS platform."
        breadcrumbs={[{ label: "Home" }, { label: "Profile" }]}
      />
      <Card className="mb-5 border-ink-100 bg-white px-5 py-4">
        <div className="flex items-center gap-3 text-sm text-ink-600">
          <LockOutlinedIcon fontSize="small" className="text-ink-400" />
          <p>
            Your profile is read-only. Account information is managed by the
            institution. To update your password, visit{" "}
            <strong>Settings</strong>.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.55fr]">
        <Card className="overflow-hidden p-0">
          <div className="h-28 bg-gradient-to-r from-navy-900 to-navy-700" />
          <div className="px-6 pb-6">
            <div className="-mt-14 inline-flex h-24 w-24 items-center justify-center rounded-[1.6rem] border-4 border-white bg-navy-800 text-[1.7rem] font-bold text-cream-50 shadow-soft">
              {initials}
            </div>
            <h2 className="mt-4 font-serif-display text-[1.5rem] font-semibold leading-8 text-navy-900">
              {user.full_name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <StatusBadge
                  key={role}
                  value={role}
                  label={role.replaceAll("_", " ")}
                />
              ))}
              <StatusBadge value={user.status} />
            </div>
            <div className="mt-5 space-y-3 text-sm text-ink-600">
              <div className="flex items-center gap-3">
                <EmailOutlinedIcon fontSize="small" className="text-ink-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <BadgeOutlinedIcon fontSize="small" className="text-ink-400" />
                <span>ID · {user.id}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-serif-display text-[1.5rem] font-semibold leading-8 text-navy-900">
            Account details
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ProfileField label="Full name" value={user.full_name} />
            <ProfileField label="Email address" value={user.email} />
            <ProfileField
              label="Role"
              value={user.roles
                .map((role) => role.replaceAll("_", " "))
                .join(", ")}
            />
            <ProfileField label="Account ID" value={user.id} />
            <ProfileField
              label="Account status"
              value={<StatusBadge value={user.status} />}
            />
            <ProfileField
              label="Auth provider"
              value={user.auth_provider || "local"}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-4 py-4 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
        {label}
      </p>
      <div className="mt-2 text-[1rem] font-semibold text-navy-900">
        {value}
      </div>
    </div>
  );
}
