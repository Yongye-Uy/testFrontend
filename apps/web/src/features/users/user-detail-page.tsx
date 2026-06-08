"use client";

import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

export function UserDetailPage({ id }: { id: string }) {
  const { data: user, loading, error } = useAsync(() => api.users.get(id), [id]);

  return (
    <>
      <BackLink href="/users" label="Users" />
      <PageHeader title={user?.full_name ?? "User detail"} description="General account information only. Academic class, batch, and semester details are intentionally not shown here." />
      {loading && <LoadingState label="Loading user" />}
      {error && <ErrorState message={error} />}
      {user && (
        <Card className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <div>
              <h2 className="text-xl font-semibold text-navy-900">{user.full_name}</h2>
              <p className="mt-1 text-sm text-ink-600">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge value={user.status} />
                {user.roles.map((role) => <StatusBadge key={role} value={role} label={role.replace("_", " ")} />)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled>Status change soon</Button><Button variant="gold" disabled>Reset password soon</Button></div>
          </div>
          <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <Info label="User ID" value={user.id} />
            <Info label="Auth provider" value={user.auth_provider} />
            <Info label="Email verified" value={user.email_verified ? "Yes" : "No"} />
            <Info label="Super Admin" value={user.is_super_admin ? "Yes" : "No"} />
            <Info label="Created" value={new Date(user.created_at).toLocaleString()} />
            <Info label="Updated" value={new Date(user.updated_at).toLocaleString()} />
          </dl>
          <div className="mt-6">
            <CapabilityNotice
              title="Status change and password reset are waiting on Backend2.0 admin endpoints"
              description="User detail read is working. The older admin-only status change and reset-password actions are not exposed by the new backend contract yet, so they stay visible but disabled instead of failing."
            />
          </div>
        </Card>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream-100 p-3 ring-1 ring-ink-100">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 break-all font-medium text-navy-900">{value}</dd>
    </div>
  );
}
