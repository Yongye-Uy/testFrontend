"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

export function RoleDetailPage({ id }: { id: string }) {
  const roles = useAsync(() => api.roles.list(), []);
  const permissions = useAsync(() => api.permissions.list(), []);
  const rolePermissions = useAsync(() => api.roles.getPermissions(id), [id]);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const role = roles.data?.roles.find((item) => item.id === id);

  const assignedPermissionIds = useMemo(
    () =>
      new Set((rolePermissions.data?.permissions ?? []).map((item) => item.id)),
    [rolePermissions.data?.permissions],
  );

  async function assignPermission(permissionId: string) {
    setBusyId(permissionId);
    setActionError("");
    setMessage("");
    try {
      await api.roles.assignPermission(id, permissionId);
      setMessage("Permission assigned.");
      await rolePermissions.reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Assign permission failed",
      );
    } finally {
      setBusyId("");
    }
  }

  async function removePermission(permissionId: string) {
    setBusyId(permissionId);
    setActionError("");
    setMessage("");
    try {
      await api.roles.removePermission(id, permissionId);
      setMessage("Permission removed.");
      await rolePermissions.reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Remove permission failed",
      );
    } finally {
      setBusyId("");
    }
  }

  async function removeRole() {
    setActionError("");
    setMessage("");
    if (!window.confirm("Delete this role? System roles cannot be deleted."))
      return;
    try {
      await api.roles.delete(id);
      setMessage("Role deleted. Go back to roles to refresh the list.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete role failed");
    }
  }

  const loading =
    roles.loading || permissions.loading || rolePermissions.loading;
  const error = roles.error || permissions.error || rolePermissions.error;

  return (
    <>
      <BackLink href="/roles" label="Roles" />
      <PageHeader
        title={role?.name ?? "Role detail"}
        description="Role update is not exposed by Backend2.0 yet. Permission assignment and deletion still work."
      />
      {loading && <LoadingState label="Loading role" />}
      {error && <ErrorState message={error} />}
      {!loading && !role && (
        <ErrorState message="Role not found in current list." />
      )}
      {role && (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">
                  {role.name}
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  {role.description || "No description"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    value={role.is_system ? "active" : "pending"}
                    label={role.is_system ? "System role" : "Custom role"}
                  />
                  <span className="rounded-full bg-cream-100 px-3 py-1 text-xs text-ink-600 ring-1 ring-ink-200">
                    {role.member_count} member
                    {role.member_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Role update soon</Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={removeRole}
                  disabled={role.is_system}
                >
                  Delete role
                </Button>
              </div>
            </div>
            <div className="mt-6">
              <CapabilityNotice
                title="Role metadata edit is waiting on a backend endpoint"
                description="The new backend lets Super Admin create and delete roles, but it does not expose update role name, description, or color yet. Permission assignment below is live."
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
                  Permissions
                </p>
                <h3 className="mt-1 text-lg font-semibold text-navy-900">
                  Assign permissions to this role
                </h3>
              </div>
            </div>
            {actionError && (
              <div className="mt-4">
                <ErrorState message={actionError} />
              </div>
            )}
            {message && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                {message}
              </div>
            )}
            {!permissions.data?.permissions.length && (
              <div className="mt-4">
                <EmptyState
                  title="No permissions found"
                  description="Create permissions first, then come back here to attach them to a role."
                />
              </div>
            )}
            {permissions.data && permissions.data.permissions.length > 0 && (
              <div className="mt-5 grid gap-3">
                {permissions.data.permissions.map((permission) => {
                  const assigned = assignedPermissionIds.has(permission.id);
                  return (
                    <div
                      key={permission.id}
                      className="flex flex-col gap-3 rounded-xl border border-ink-100 bg-cream-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-navy-900">
                          {permission.code}
                        </p>
                        <p className="mt-1 text-sm text-ink-600">
                          {permission.resource}.{permission.action}
                        </p>
                        {permission.description && (
                          <p className="mt-1 text-xs text-ink-500">
                            {permission.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={assigned ? "secondary" : "outline"}
                        type="button"
                        loading={busyId === permission.id}
                        onClick={() =>
                          assigned
                            ? removePermission(permission.id)
                            : assignPermission(permission.id)
                        }
                      >
                        {assigned ? "Remove" : "Assign"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
