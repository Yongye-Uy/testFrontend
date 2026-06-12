"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { isDirector, isSuperAdmin } from "@/lib/auth";
import type { Batch } from "@/types/course";
import type {
  InviteUserResult,
  User,
  UserRole,
  UserStatus,
} from "@/types/user";
import { useAsync } from "@/features/shared/use-async";
import { BulkInviteWizardModal } from "./bulk-invite-wizard-modal";

type Mode = "admin" | "director";
type StatusTab = UserStatus;
type InviteRole = "lecturer" | "student";

const defaultInviteMessage =
  "Welcome to EPPLMS at Paragon International University. Please set up your account using the link in this email.";

const inviteRoleOptions: { value: InviteRole; label: string }[] = [
  { value: "lecturer", label: "Lecturer" },
  { value: "student", label: "Student" },
];

const roleSortOrder = ["super_admin", "director", "lecturer", "student"];

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const mode: Mode | null = isSuperAdmin(currentUser)
    ? "admin"
    : isDirector(currentUser)
      ? "director"
      : null;
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("active");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteUserResult[]>([]);
  const [statusMenuUserId, setStatusMenuUserId] = useState<string | null>(null);
  const [statusConfirmation, setStatusConfirmation] = useState<{
    user: User;
    nextStatus: Extract<UserStatus, "active" | "inactive">;
  } | null>(null);

  const users = useAsync(
    () =>
      api.users.list(
        new URLSearchParams([
          ["limit", "500"],
          ["offset", "0"],
        ]),
      ),
    [],
  );
  const batches = useAsync(
    () =>
      api.batches.list(
        new URLSearchParams([
          ["limit", "500"],
          ["offset", "0"],
        ]),
      ),
    [],
  );

  const filteredUsersByMode = useMemo(() => {
    const rows = users.data?.users ?? [];
    if (mode !== "director") return rows;
    return rows.filter((user) => {
      const role = primaryRole(user);
      return role === "student" || role === "lecturer";
    });
  }, [mode, users.data?.users]);

  const counts = useMemo(
    () => ({
      pending: filteredUsersByMode.filter((user) => user.status === "pending")
        .length,
      active: filteredUsersByMode.filter((user) => user.status === "active")
        .length,
      inactive: filteredUsersByMode.filter((user) => user.status === "inactive")
        .length,
    }),
    [filteredUsersByMode],
  );

  const roleOptions = useMemo(() => {
    const seen = new Set(filteredUsersByMode.map(primaryRole));
    return Array.from(seen).sort((left, right) => {
      const leftIndex = roleSortOrder.indexOf(left);
      const rightIndex = roleSortOrder.indexOf(right);
      if (leftIndex !== -1 || rightIndex !== -1)
        return (
          (leftIndex === -1 ? 999 : leftIndex) -
          (rightIndex === -1 ? 999 : rightIndex)
        );
      return left.localeCompare(right);
    });
  }, [filteredUsersByMode]);

  const roleCounts = useMemo(() => {
    return roleOptions.reduce<Record<string, number>>((acc, role) => {
      acc[role] = filteredUsersByMode.filter(
        (user) => user.status === statusTab && primaryRole(user) === role,
      ).length;
      return acc;
    }, {});
  }, [filteredUsersByMode, roleOptions, statusTab]);

  const visibleUsers = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();

    return filteredUsersByMode.filter((user) => {
      if (user.status !== statusTab) return false;
      if (roleFilter !== "all" && primaryRole(user) !== roleFilter)
        return false;
      if (!query) return true;

      return [user.full_name, user.email, primaryRole(user)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [directoryQuery, filteredUsersByMode, roleFilter, statusTab]);

  const assignableBatches = useMemo(
    () =>
      (batches.data?.batches ?? []).filter(
        (batch) => batch.status !== "archived",
      ),
    [batches.data?.batches],
  );

  if (!mode) {
    return (
      <EmptyState
        title="Users are not available for this role"
        description="This page is currently designed for Super Admin and Director workflows only."
      />
    );
  }

  async function reloadAll() {
    await users.reload();
    await batches.reload();
  }

  async function handleInvited(results: InviteUserResult[]) {
    setInviteResults(results);
    setSingleInviteOpen(false);
    setBulkInviteOpen(false);
    setStatusTab("pending");
    await reloadAll();
  }

  const description =
    mode === "admin"
      ? "Manage invitations, statuses, and account access across the platform."
      : "Manage students and lecturers across the department. Student invites should attach to a batch from this screen.";

  return (
    <>
      <PageHeader
        eyebrow={mode === "admin" ? "Platform - Users" : "People - Users"}
        title="Users"
        description={description}
        breadcrumbs={[{ label: "Home" }, { label: "Users" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkInviteOpen(true)}>
              Bulk import
            </Button>
            <Button onClick={() => setSingleInviteOpen(true)}>
              Invite user
            </Button>
          </>
        }
      />

      <Card padding="md">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field label="Search users">
            <input
              className={inputClass}
              placeholder="Search by name, email, or role..."
              value={directoryQuery}
              onChange={(event) => setDirectoryQuery(event.target.value)}
            />
          </Field>
          <Field label="Role">
            <select
              className={inputClass}
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as UserRole | "all")
              }
            >
              <option value="all">All roles ({counts[statusTab]})</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {prettyRoleValue(role)} ({roleCounts[role] ?? 0})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {inviteResults.length > 0 && (
        <Card className="mt-5" padding="md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
            Latest invite result
          </p>
          <div className="mt-3 grid gap-3">
            {inviteResults.map((result) => (
              <div
                className="rounded-xl border border-ink-100 bg-cream-50 px-4 py-3"
                key={`${result.email}-${result.invitation_url ?? "result"}`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-navy-900">
                      {result.email}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {result.success
                        ? "Invitation record created. The account stays pending until invite acceptance and password setup are connected."
                        : (result.error ?? "Invite failed")}
                    </p>
                  </div>
                  <StatusBadge
                    value={result.success ? "pending" : "inactive"}
                    label={result.success ? "Pending" : "Failed"}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-5 border-gold-200 bg-gold-50/60" padding="md">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
          Current backend notes
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-600">
          <li>
            1. Invitation email delivery is not connected yet, so invite actions
            create pending records without sending a real email.
          </li>
          <li>
            2. Invite acceptance and password setup page are not wired in the
            frontend yet.
          </li>
          <li>
            3. Reset password is still not exposed by the current backend
            contract.
          </li>
        </ul>
      </Card>

      <div className="mt-6">
        <StatusTabs value={statusTab} counts={counts} onChange={setStatusTab} />
      </div>

      <div className="mt-4">
        {(users.loading || batches.loading) && (
          <LoadingState label="Loading users" />
        )}
        {(users.error || batches.error) && (
          <ErrorState message={users.error || batches.error} />
        )}
        {!users.loading && !users.error && visibleUsers.length === 0 && (
          <Card padding="lg">
            <EmptyState
              title={`No ${statusTab} users`}
              description="Change the role filter, clear the search, or invite a new user to populate this state."
            />
          </Card>
        )}
        {!users.loading && !users.error && visibleUsers.length > 0 && (
          <UserDirectory
            currentUserId={currentUser?.id ?? ""}
            users={visibleUsers}
            onRequestStatusChange={(user, nextStatus) =>
              setStatusConfirmation({ user, nextStatus })
            }
            onToggleStatusMenu={(userId) =>
              setStatusMenuUserId((current) =>
                current === userId ? null : userId,
              )
            }
            statusMenuUserId={statusMenuUserId}
          />
        )}
      </div>

      <SingleInviteModal
        mode={mode}
        open={singleInviteOpen}
        batches={assignableBatches}
        onClose={() => setSingleInviteOpen(false)}
        onInvited={handleInvited}
      />
      <BulkInviteWizardModal
        open={bulkInviteOpen}
        batches={assignableBatches}
        existingUsers={users.data?.users ?? []}
        onClose={() => setBulkInviteOpen(false)}
        onInvited={handleInvited}
        defaultRole={mode === "director" ? "student" : "student"}
        description="Choose a role, validate the CSV, edit any bad rows, preview the invite list, and then create pending invitations."
      />
      <StatusChangeModal
        confirmation={statusConfirmation}
        onCancel={() => setStatusConfirmation(null)}
        onConfirm={async () => {
          if (!statusConfirmation) return;
          await api.users.changeStatus(
            statusConfirmation.user.id,
            statusConfirmation.nextStatus,
          );
          setStatusConfirmation(null);
          setStatusMenuUserId(null);
          await users.reload();
        }}
      />
    </>
  );
}

function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: StatusTab;
  counts: Record<UserStatus, number>;
  onChange: (value: StatusTab) => void;
}) {
  const tabs: { id: StatusTab; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "pending", label: "Pending" },
    { id: "inactive", label: "Inactive" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-ink-200">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            className={`relative px-4 py-2.5 text-sm font-semibold transition ${
              active ? "text-navy-900" : "text-ink-500 hover:text-navy-800"
            }`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  active
                    ? "bg-navy-100 text-navy-800"
                    : "bg-cream-200 text-ink-600"
                }`}
              >
                {counts[tab.id]}
              </span>
            </span>
            {active && (
              <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function UserDirectory({
  currentUserId,
  users,
  statusMenuUserId,
  onToggleStatusMenu,
  onRequestStatusChange,
}: {
  currentUserId: string;
  users: User[];
  statusMenuUserId: string | null;
  onToggleStatusMenu: (userId: string) => void;
  onRequestStatusChange: (
    user: User,
    nextStatus: Extract<UserStatus, "active" | "inactive">,
  ) => void;
}) {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-cream-100">
            <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Invited</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const disableStatusChange = user.id === currentUserId;
              return (
                <tr className="border-t border-ink-100 bg-white" key={user.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <AvatarLabel user={user} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-900">
                          {user.full_name}
                        </p>
                        <p className="mt-1 truncate text-sm text-ink-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      value={primaryRole(user)}
                      label={prettyRole(user)}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative inline-flex">
                      <button
                        className="rounded-full disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={disableStatusChange}
                        onClick={() => onToggleStatusMenu(user.id)}
                        type="button"
                      >
                        <StatusBadge value={user.status} />
                      </button>
                      {statusMenuUserId === user.id && !disableStatusChange && (
                        <div className="absolute left-0 top-full z-10 mt-2 min-w-[150px] rounded-xl border border-ink-200 bg-white p-1 shadow-soft">
                          <button
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-navy-900 hover:bg-cream-100 disabled:opacity-50"
                            disabled={user.status === "active"}
                            onClick={() =>
                              onRequestStatusChange(user, "active")
                            }
                            type="button"
                          >
                            Set Active
                          </button>
                          <button
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-navy-900 hover:bg-cream-100 disabled:opacity-50"
                            disabled={user.status === "inactive"}
                            onClick={() =>
                              onRequestStatusChange(user, "inactive")
                            }
                            type="button"
                          >
                            Set Inactive
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-600">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/users/${user.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-navy-800 ring-1 ring-ink-300 transition hover:bg-cream-100 hover:ring-ink-400"
                    >
                      View detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AvatarLabel({ user }: { user: User }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-lg font-bold text-cream-50 shadow-soft">
      {initials(user.full_name || user.email)}
    </div>
  );
}

function SingleInviteModal({
  mode,
  open,
  batches,
  onClose,
  onInvited,
}: {
  mode: Mode;
  open: boolean;
  batches: Batch[];
  onClose: () => void;
  onInvited: (results: InviteUserResult[]) => Promise<void>;
}) {
  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    role: InviteRole;
    batch_id: string;
    personal_message: string;
  }>({
    full_name: "",
    email: "",
    role: mode === "director" ? "lecturer" : "student",
    batch_id: "",
    personal_message: defaultInviteMessage,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.users.bulkInvite([
        {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          batch_id: form.role === "student" ? form.batch_id : undefined,
        },
      ]);
      await onInvited(response.results);
      setForm({
        full_name: "",
        email: "",
        role: mode === "director" ? "lecturer" : "student",
        batch_id: "",
        personal_message: defaultInviteMessage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Onboarding - Single Invite"
      title="Invite a new user"
      description="This creates the pending invite record now. SMTP delivery and invite acceptance UI will connect later."
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input
              className={inputClass}
              placeholder="e.g. Sokha Pich"
              required
              value={form.full_name}
              onChange={(event) =>
                setForm({ ...form, full_name: event.target.value })
              }
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              placeholder="name@school.edu"
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </Field>
        </div>

        <div
          className={`grid gap-4 ${form.role === "student" ? "md:grid-cols-2" : ""}`}
        >
          <Field label="Role">
            <select
              className={inputClass}
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value as InviteRole,
                  batch_id: "",
                })
              }
            >
              {inviteRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>

          {form.role === "student" && (
            <Field label="Batch">
              <select
                className={inputClass}
                required
                value={form.batch_id}
                onChange={(event) =>
                  setForm({ ...form, batch_id: event.target.value })
                }
              >
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Personal message (optional)">
          <textarea
            className={textareaClass}
            rows={4}
            value={form.personal_message}
            onChange={(event) =>
              setForm({ ...form, personal_message: event.target.value })
            }
          />
        </Field>

        <div className="rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-500 ring-1 ring-ink-200">
          Pending means invited but not accepted yet. Student invites should
          already be attached to the target batch here.
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Send invitation</Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusChangeModal({
  confirmation,
  onCancel,
  onConfirm,
}: {
  confirmation: {
    user: User;
    nextStatus: Extract<UserStatus, "active" | "inactive">;
  } | null;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={Boolean(confirmation)}
      onClose={onCancel}
      eyebrow="Status - Second Confirmation"
      title={
        confirmation
          ? `Set ${confirmation.user.full_name} to ${confirmation.nextStatus}?`
          : "Confirm status change"
      }
      description="Use this second confirmation before changing a user between active and inactive."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-ink-100 bg-cream-50 p-4 text-sm text-ink-600">
          Current status: {confirmation?.user.status ?? "n/a"}
          <br />
          Next status: {confirmation?.nextStatus ?? "n/a"}
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" loading={loading} onClick={confirm}>
            Confirm change
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function primaryRole(user: User) {
  return (user.roles[0] ?? user.role) as UserRole;
}

function prettyRole(user: User) {
  return prettyRoleValue(primaryRole(user));
}

function prettyRoleValue(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
