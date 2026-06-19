"use client";

import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";

export function RoleDetailPage({ id }: { id: string }) {
  const roles = useAsync(() => api.roles.list(), []);
  const permissions = useAsync(() => api.permissions.list(), []);
  const rolePermissions = useAsync(() => api.roles.getPermissions(id), [id]);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [search, setSearch] = useState("");
  const role = roles.data?.roles.find((item) => item.id === id);

  const assignedPermissionIds = useMemo(
    () =>
      new Set((rolePermissions.data?.permissions ?? []).map((item) => item.id)),
    [rolePermissions.data?.permissions],
  );

  // Group all permissions by resource name, sorted alphabetically
  const groupedPermissions = useMemo(() => {
    const perms = permissions.data?.permissions ?? [];
    const grouped = perms.reduce<Record<string, typeof perms>>((acc, perm) => {
      const key = perm.resource;
      acc[key] = [...(acc[key] ?? []), perm];
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions.data?.permissions]);

  // Filter groups and their permissions by search query
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groupedPermissions;
    return groupedPermissions
      .map(
        ([resource, perms]) =>
          [
            resource,
            perms.filter(
              (p) =>
                p.code.toLowerCase().includes(q) ||
                resource.toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q),
            ),
          ] as [string, typeof perms],
      )
      .filter(([, perms]) => perms.length > 0);
  }, [groupedPermissions, search]);

  // Auto-expand matching groups when searching
  useEffect(() => {
    if (!search.trim()) return;
    setExpandedGroups((current) => {
      const next = { ...current };
      filteredGroups.forEach(([resource]) => {
        next[resource] = true;
      });
      return next;
    });
  }, [search, filteredGroups]);

  function toggleGroup(resource: string) {
    setExpandedGroups((current) => ({
      ...current,
      [resource]: !current[resource],
    }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    groupedPermissions.forEach(([resource]) => {
      next[resource] = true;
    });
    setExpandedGroups(next);
  }

  function collapseAll() {
    setExpandedGroups({});
  }

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
      {loading && <SkeletonCard />}
      {error && <ErrorState message={error} />}
      {!loading && !role && (
        <ErrorState message="Role not found in current list." />
      )}
      {role && (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h2 className="text-[1.1rem] font-semibold leading-7 text-navy-900">
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
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
                  Permissions
                </p>
                <h3 className="mt-1 text-[1rem] font-semibold text-navy-900">
                  Assign permissions to this role
                </h3>
                <p className="mt-1 text-sm text-ink-500">
                  Click a group header to expand it, or use search to find a
                  specific permission.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-600 transition hover:bg-cream-100 hover:text-navy-900"
                >
                  <UnfoldMoreRoundedIcon sx={{ fontSize: 16 }} />
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-600 transition hover:bg-cream-100 hover:text-navy-900"
                >
                  <UnfoldLessRoundedIcon sx={{ fontSize: 16 }} />
                  Collapse all
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="relative mt-4">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
                <SearchRoundedIcon sx={{ fontSize: 18 }} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search permissions by code, resource, or description…"
                className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-sm text-navy-900 placeholder:text-ink-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-ink-400 hover:text-navy-700"
                >
                  Clear
                </button>
              )}
            </div>
            {role.is_system && (
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                <strong>System role</strong> — existing permissions are locked
                and cannot be removed. You can still assign additional
                permissions.
              </div>
            )}
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
            {groupedPermissions.length > 0 && filteredGroups.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  title="No permissions match"
                  description={`Nothing found for "${search}". Try a different keyword or clear the search.`}
                />
              </div>
            )}
            {filteredGroups.length > 0 && (
              <div className="mt-5 space-y-2">
                {filteredGroups.map(([resource, perms]) => {
                  const isExpanded = expandedGroups[resource] ?? false;
                  const assignedCount = perms.filter((p) =>
                    assignedPermissionIds.has(p.id),
                  ).length;

                  return (
                    <div
                      key={resource}
                      className="overflow-hidden rounded-xl border border-ink-200"
                    >
                      {/* Group header — click to expand/collapse */}
                      <button
                        type="button"
                        className="flex w-full items-center justify-between bg-cream-50 px-5 py-3.5 text-left transition hover:bg-cream-100"
                        onClick={() => toggleGroup(resource)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold capitalize text-navy-900">
                            {resource}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${
                              assignedCount > 0
                                ? "bg-navy-50 text-navy-700 ring-navy-200"
                                : "bg-cream-100 text-ink-500 ring-ink-200"
                            }`}
                          >
                            {assignedCount}/{perms.length} assigned
                          </span>
                        </div>
                        {isExpanded ? (
                          <KeyboardArrowDownRoundedIcon
                            className="text-ink-400"
                            fontSize="small"
                          />
                        ) : (
                          <KeyboardArrowRightRoundedIcon
                            className="text-ink-400"
                            fontSize="small"
                          />
                        )}
                      </button>

                      {/* Permission rows — visible when expanded */}
                      {isExpanded && (
                        <div className="divide-y divide-ink-100 border-t border-ink-200">
                          {perms.map((permission) => {
                            const assigned = assignedPermissionIds.has(
                              permission.id,
                            );
                            return (
                              <div
                                key={permission.id}
                                className={`flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between ${
                                  assigned ? "bg-navy-50/40" : "bg-white"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-semibold text-navy-900">
                                    {permission.code}
                                  </p>
                                  {permission.description && (
                                    <p className="mt-0.5 text-xs text-ink-500">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant={assigned ? "secondary" : "outline"}
                                  type="button"
                                  loading={busyId === permission.id}
                                  disabled={assigned && role.is_system}
                                  title={
                                    assigned && role.is_system
                                      ? "Permissions on system roles are managed by the system administrator and cannot be removed here."
                                      : undefined
                                  }
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
