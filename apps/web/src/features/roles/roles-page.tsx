"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import type { Permission } from "@/types/permission";
import type { Role } from "@/types/role";
import type { User } from "@/types/user";
import { useAsync } from "@/features/shared/use-async";

type PanelTab = "display" | "permissions" | "members";

const COLOR_SWATCHES = [
  { id: "rose", hex: "#E11D48" },
  { id: "gold", hex: "#D4A017" },
  { id: "emerald", hex: "#059669" },
  { id: "navy", hex: "#0F2C5C" },
  { id: "sky", hex: "#0284C7" },
  { id: "violet", hex: "#7C3AED" },
  { id: "amber", hex: "#D97706" },
  { id: "ink", hex: "#475569" },
];

const SYSTEM_ROLE_NAMES = new Set([
  "super_admin",
  "super admin",
  "director",
  "lecturer",
  "student",
]);

function normalizeRoleKey(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ");
}

function isSystemRole(role: Role) {
  return role.is_system || SYSTEM_ROLE_NAMES.has(normalizeRoleKey(role.name));
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-emerald-400" : "bg-ink-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-cream-50">
      {initials || "?"}
    </div>
  );
}

export function RolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [tab, setTab] = useState<PanelTab>("permissions");
  const [createOpen, setCreateOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftColor, setDraftColor] = useState(COLOR_SWATCHES[3].hex);
  const [draftPermissionIds, setDraftPermissionIds] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberBusyId, setMemberBusyId] = useState("");

  const rolesAsync = useAsync(() => api.roles.list(), []);
  const permissionsAsync = useAsync(() => api.permissions.list(), []);

  const roles = useMemo(
    () => rolesAsync.data?.roles ?? [],
    [rolesAsync.data?.roles],
  );
  const activeRole =
    roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;

  const rolePermissions = useAsync(
    () =>
      activeRole
        ? api.roles.getPermissions(activeRole.id)
        : Promise.resolve({ permissions: [] }),
    [activeRole?.id],
  );
  const membersAsync = useAsync(
    () =>
      activeRole
        ? api.users.listByRole(activeRole.name)
        : Promise.resolve({ users: [], total: 0, page: 1, limit: 500 }),
    [activeRole?.id],
  );

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!activeRole) return;
    setDraftName(activeRole.name);
    setDraftDescription(activeRole.description ?? "");
    setDraftColor(activeRole.color || COLOR_SWATCHES[3].hex);
    setDraftPermissionIds([]);
    setSaveError("");
    setSaveMessage("");
    setMemberError("");
  }, [activeRole]);

  useEffect(() => {
    setDraftPermissionIds(
      (rolePermissions.data?.permissions ?? []).map(
        (permission) => permission.id,
      ),
    );
  }, [activeRole?.id, rolePermissions.data?.permissions]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissionsAsync.data?.permissions ?? []) {
      const label = permission.resource
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
      groups.set(label, [...(groups.get(label) ?? []), permission]);
    }
    return Array.from(groups.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [permissionsAsync.data?.permissions]);

  const assignedPermissionSet = useMemo(
    () =>
      new Set(
        (rolePermissions.data?.permissions ?? []).map(
          (permission) => permission.id,
        ),
      ),
    [rolePermissions.data?.permissions],
  );
  const draftPermissionSet = useMemo(
    () => new Set(draftPermissionIds),
    [draftPermissionIds],
  );

  const roleDirty = useMemo(() => {
    if (!activeRole) return false;
    if (draftName.trim() !== activeRole.name) return true;
    if ((draftDescription.trim() || "") !== (activeRole.description ?? ""))
      return true;
    if ((draftColor || "") !== (activeRole.color || "")) return true;
    if (draftPermissionSet.size !== assignedPermissionSet.size) return true;
    for (const permissionId of draftPermissionSet) {
      if (!assignedPermissionSet.has(permissionId)) return true;
    }
    return false;
  }, [
    activeRole,
    assignedPermissionSet,
    draftColor,
    draftDescription,
    draftName,
    draftPermissionSet,
  ]);

  const loading =
    rolesAsync.loading ||
    permissionsAsync.loading ||
    rolePermissions.loading ||
    membersAsync.loading;
  const error =
    rolesAsync.error ||
    permissionsAsync.error ||
    rolePermissions.error ||
    membersAsync.error;

  async function saveChanges() {
    if (!activeRole || !roleDirty) return;
    setSaveLoading(true);
    setSaveError("");
    setSaveMessage("");

    try {
      if (
        draftName.trim() !== activeRole.name ||
        draftDescription.trim() !== (activeRole.description ?? "") ||
        draftColor !== (activeRole.color || "")
      ) {
        await api.roles.update(activeRole.id, {
          name: draftName.trim(),
          description: draftDescription.trim(),
          color: draftColor,
        });
      }

      const toAssign = draftPermissionIds.filter(
        (permissionId) => !assignedPermissionSet.has(permissionId),
      );
      const toRemove = Array.from(assignedPermissionSet).filter(
        (permissionId) => !draftPermissionSet.has(permissionId),
      );

      for (const permissionId of toAssign) {
        await api.roles.assignPermission(activeRole.id, permissionId);
      }
      for (const permissionId of toRemove) {
        await api.roles.removePermission(activeRole.id, permissionId);
      }

      await Promise.all([
        rolesAsync.reload(),
        rolePermissions.reload(),
        membersAsync.reload(),
      ]);
      setSaveMessage("Role changes saved.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaveLoading(false);
    }
  }

  async function deleteRole() {
    if (!activeRole || isSystemRole(activeRole)) return;
    if (!window.confirm(`Delete role "${activeRole.name}"?`)) return;
    setSaveError("");
    setSaveMessage("");
    try {
      await api.roles.delete(activeRole.id);
      await rolesAsync.reload();
      setSelectedRoleId(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Delete role failed");
    }
  }

  async function removeMember(user: User) {
    if (!activeRole) return;
    if (!window.confirm(`Remove ${user.full_name} from ${activeRole.name}?`))
      return;

    setMemberBusyId(user.id);
    setMemberError("");
    try {
      await api.roles.removeFromUser(user.id, activeRole.id);
      await Promise.all([membersAsync.reload(), rolesAsync.reload()]);
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Remove member failed",
      );
    } finally {
      setMemberBusyId("");
    }
  }

  function resetDraft() {
    if (!activeRole) return;
    setDraftName(activeRole.name);
    setDraftDescription(activeRole.description ?? "");
    setDraftColor(activeRole.color || COLOR_SWATCHES[3].hex);
    setDraftPermissionIds(
      (rolePermissions.data?.permissions ?? []).map(
        (permission) => permission.id,
      ),
    );
    setSaveError("");
    setSaveMessage("");
  }

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Configure who can do what across the platform."
        breadcrumbs={[{ label: "Home" }, { label: "Roles & Permissions" }]}
        actions={
          <Button
            onClick={saveChanges}
            disabled={!activeRole || !roleDirty}
            loading={saveLoading}
          >
            Save changes
          </Button>
        }
      />

      <div className="mb-4 rounded-xl bg-navy-50 px-4 py-3 text-xs text-navy-900 ring-1 ring-navy-100">
        Permissions are evaluated at the API gateway. Save applies the current
        role display and permission changes together.
      </div>

      {loading && <LoadingState label="Loading roles and permissions" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && roles.length === 0 && (
        <EmptyState
          title="No roles"
          description="Create a role to start configuring permissions and members."
        />
      )}

      {!loading && !error && activeRole && (
        <div className="grid grid-cols-1 gap-5 lg:[grid-template-columns:260px_minmax(0,1fr)]">
          <Card className="overflow-hidden !p-0">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Roles
              </p>
              <span className="text-[10px] font-semibold text-ink-500">
                {roles.length}
              </span>
            </div>
            <ul className="max-h-[520px] overflow-y-auto py-1">
              {roles.map((role) => {
                const selected = role.id === activeRole.id;
                const color = role.color || COLOR_SWATCHES[3].hex;
                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleId(role.id);
                        setTab("permissions");
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        selected ? "bg-navy-50" : "hover:bg-cream-100"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 truncate text-sm font-semibold text-navy-900">
                        {role.name}
                      </span>
                      <span className="text-[10px] font-bold text-ink-400">
                        {role.member_count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-ink-100 p-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCreateOpen(true)}
              >
                Create role
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden !p-0">
            <div className="flex flex-col gap-4 border-b border-ink-100 px-6 py-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <span
                  className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: draftColor }}
                >
                  {draftName.trim().slice(0, 1).toUpperCase() || "R"}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Edit role
                  </p>
                  <h2 className="font-serif-display text-2xl font-semibold text-navy-900">
                    {activeRole.name}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {activeRole.member_count} member
                    {activeRole.member_count === 1 ? "" : "s"} -{" "}
                    {draftPermissionIds.length} of{" "}
                    {permissionsAsync.data?.permissions.length ?? 0} permissions
                    granted
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={resetDraft}>
                  Reset role to current
                </Button>
                {!isSystemRole(activeRole) && (
                  <Button variant="danger" onClick={deleteRole}>
                    Delete role
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 border-b border-ink-100 px-4">
              {[
                { id: "display", label: "Display" },
                { id: "permissions", label: "Permissions" },
                { id: "members", label: "Members" },
              ].map((item) => {
                const selected = item.id === tab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id as PanelTab)}
                    className={`relative px-4 py-3 text-sm font-semibold transition ${
                      selected
                        ? "text-navy-900"
                        : "text-ink-500 hover:text-navy-800"
                    }`}
                  >
                    {item.label}
                    {selected && (
                      <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {saveError && <ErrorState message={saveError} />}
              {saveMessage && (
                <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  {saveMessage}
                </div>
              )}

              {tab === "display" && (
                <div className="max-w-xl space-y-5">
                  <Field label="Role name">
                    <input
                      className={inputClass}
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      disabled={isSystemRole(activeRole)}
                    />
                  </Field>
                  <Field label="Description">
                    <input
                      className={inputClass}
                      value={draftDescription}
                      onChange={(event) =>
                        setDraftDescription(event.target.value)
                      }
                      placeholder="Short role description"
                    />
                  </Field>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      Role color
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => setDraftColor(swatch.hex)}
                          className={`h-10 w-10 rounded-full ring-2 ring-offset-2 transition ${
                            draftColor === swatch.hex
                              ? "ring-navy-900"
                              : "ring-transparent hover:ring-ink-300"
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                          aria-label={swatch.id}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-cream-100 p-4 ring-1 ring-ink-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                      Preview
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: draftColor }}
                      >
                        {draftName.trim().slice(0, 1).toUpperCase() || "R"}
                      </span>
                      <div>
                        <p className="font-semibold text-navy-900">
                          {draftName || "Role name"}
                        </p>
                        <p className="text-sm text-ink-500">
                          {draftDescription || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "permissions" && (
                <div className="space-y-6">
                  {groupedPermissions.map(([resource, permissions]) => {
                    const grantedCount = permissions.filter((permission) =>
                      draftPermissionSet.has(permission.id),
                    ).length;
                    return (
                      <div key={resource}>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gold-700">
                            {resource}
                          </h3>
                          <span className="text-[11px] font-semibold text-ink-500">
                            {grantedCount} / {permissions.length}
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-xl ring-1 ring-ink-100">
                          {permissions.map((permission) => {
                            const enabled = draftPermissionSet.has(
                              permission.id,
                            );
                            const code = `${permission.resource}.${permission.action}`;
                            return (
                              <div
                                key={permission.id}
                                className="flex items-center gap-4 border-b border-ink-100 px-4 py-3 last:border-b-0 hover:bg-cream-50"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-navy-900">
                                    {permission.description || permission.code}
                                  </p>
                                  <p className="mt-1 text-[11px] text-ink-400">
                                    {code}
                                  </p>
                                </div>
                                <Toggle
                                  checked={enabled}
                                  disabled={saveLoading}
                                  onChange={() =>
                                    setDraftPermissionIds((current) =>
                                      current.includes(permission.id)
                                        ? current.filter(
                                            (id) => id !== permission.id,
                                          )
                                        : [...current, permission.id],
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "members" && (
                <div className="space-y-4">
                  {memberError && <ErrorState message={memberError} />}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink-600">
                      {(membersAsync.data?.users ?? []).length} member
                      {(membersAsync.data?.users ?? []).length === 1
                        ? ""
                        : "s"}{" "}
                      hold this role.
                    </p>
                  </div>
                  {(membersAsync.data?.users ?? []).length === 0 ? (
                    <EmptyState
                      title="No members yet"
                      description="Assign this role to users from the users management flow."
                    />
                  ) : (
                    <div className="overflow-hidden rounded-xl ring-1 ring-ink-100">
                      {(membersAsync.data?.users ?? []).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 last:border-b-0"
                        >
                          <UserAvatar name={user.full_name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-navy-900">
                              {user.full_name}
                            </p>
                            <p className="truncate text-xs text-ink-500">
                              {user.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMember(user)}
                            disabled={memberBusyId === user.id}
                            className="text-sm font-semibold text-rose-600 disabled:opacity-60"
                          >
                            {memberBusyId === user.id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={async (roleId) => {
          await rolesAsync.reload();
          if (roleId) setSelectedRoleId(roleId);
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function CreateRoleModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (roleId?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[3].hex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setColor(COLOR_SWATCHES[3].hex);
    setError("");
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const role = await api.roles.create({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      await onDone(role.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create role failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a new role"
      description="Choose the display color first, then save the role before assigning permissions."
      eyebrow="Roles & Permissions"
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Role name">
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Teaching Assistant"
            required
          />
        </Field>
        <Field label="Description">
          <input
            className={inputClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional summary"
          />
        </Field>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Role color
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => setColor(swatch.hex)}
                className={`h-10 w-10 rounded-full ring-2 ring-offset-2 transition ${
                  color === swatch.hex
                    ? "ring-navy-900"
                    : "ring-transparent hover:ring-ink-300"
                }`}
                style={{ backgroundColor: swatch.hex }}
                aria-label={swatch.id}
              />
            ))}
          </div>
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Create role</Button>
        </div>
      </form>
    </Modal>
  );
}
