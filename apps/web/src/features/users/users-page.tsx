"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { isSuperAdmin } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types/user";
import { useAsync } from "@/features/shared/use-async";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [lookupEmail, setLookupEmail] = useState("");
  const [activeEmail, setActiveEmail] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<User[]>([]);

  const currentRecord = useAsync(
    () => currentUser?.id ? api.users.get(currentUser.id) : Promise.resolve(null),
    [currentUser?.id],
  );
  const lookedUpUser = useAsync(
    () => activeEmail ? api.users.findByEmail(activeEmail) : Promise.resolve(null),
    [activeEmail],
  );

  const users = useMemo(() => {
    const rows = [currentRecord.data, lookedUpUser.data, ...createdUsers].filter(Boolean) as User[];
    const seen = new Set<string>();
    return rows.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [createdUsers, currentRecord.data, lookedUpUser.data]);

  if (!isSuperAdmin(currentUser)) {
    return (
      <EmptyState
        title="Director users page is a TODO"
        description="The backend currently exposes user management only to Super Admin. Director user views need a separate endpoint."
      />
    );
  }

  async function handleCreated(user: User) {
    setCreatedUsers((current) => [user, ...current]);
  }

  function submitLookup(event: FormEvent) {
    event.preventDefault();
    setActiveEmail(lookupEmail.trim());
  }

  const loading = currentRecord.loading || lookedUpUser.loading;
  const error = currentRecord.error || lookedUpUser.error;

  return (
    <>
      <PageHeader
        title="Users"
        description="Backend2.0 currently supports create user, get by ID, and get by email. This page is adjusted to that contract so Super Admin can keep working."
        actions={<Button onClick={() => setCreateOpen(true)}>Create user</Button>}
      />
      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={submitLookup}>
          <Field label="Find user by email">
            <input className={inputClass} placeholder="example@school.edu" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>
      <div className="mb-5">
        <CapabilityNotice
          title="User list, status change, and reset password are not exposed by Backend2.0 yet"
          description="This adjusted Super Admin page still lets you create users and open exact user records. Full directory listing, status change, and password reset need backend endpoints from the user-service team."
        />
      </div>
      {loading && <LoadingState label="Loading users" />}
      {error && <ErrorState message={error} />}
      {!loading && users.length === 0 && <EmptyState title="No users loaded yet" description="Create a user or search by exact email to open a record." />}
      {users.length > 0 && <UsersTable users={users} total={users.length} />}
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </>
  );
}

function UsersTable({ users, total }: { users: User[]; total: number }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-sm text-ink-600">{total} loaded user{total === 1 ? "" : "s"}</p>
      <DataTable
        rows={users}
        rowKey={(user) => user.id}
        columns={[
          {
            key: "user",
            header: "User",
            render: (user) => (
              <>
                <p className="font-semibold text-navy-900">{user.full_name}</p>
                <p className="text-xs text-ink-500">{user.email}</p>
              </>
            ),
          },
          { key: "role", header: "Role", render: (user) => user.roles.join(", ") || user.role },
          { key: "status", header: "Status", render: (user) => <StatusBadge value={user.status} /> },
          { key: "created", header: "Created", render: (user) => <span className="text-xs text-ink-500">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "n/a"}</span> },
          {
            key: "action",
            header: "Action",
            align: "right",
            render: (user) => <Link href={`/users/${user.id}`} className="font-semibold text-navy-700 hover:text-navy-900">View</Link>,
          },
        ]}
      />
    </div>
  );
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (user: User) => Promise<void> }) {
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await api.users.create(form);
      await onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create user failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create user" description="Creates an active local user using the new backend contract.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input className={inputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
        <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <Field label="Password"><input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
        <Field label="Role">
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="director">Director</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button loading={loading}>Create</Button></div>
      </form>
    </Modal>
  );
}
