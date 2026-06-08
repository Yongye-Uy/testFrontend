"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

export function RolesPage() {
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.roles.list(), []);

  return (
    <>
      <PageHeader title="Roles" description="Basic role metadata management. Permission builder is not implemented yet." actions={<Button onClick={() => setOpen(true)}>Create role</Button>} />
      {loading && <LoadingState label="Loading roles" />}
      {error && <ErrorState message={error} />}
      {data && data.roles.length === 0 && <EmptyState title="No roles" description="Create a custom role to get started." />}
      {data && data.roles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.roles.map((role) => (
            <Link key={role.id} href={`/roles/${role.id}`}>
              <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-navy-900">{role.name}</h2>
                    <p className="mt-1 text-sm text-ink-600">{role.description || "No description"}</p>
                  </div>
                  <span className="rounded-full bg-cream-100 px-2 py-1 text-[11px] text-ink-600 ring-1 ring-ink-200">{role.member_count} members</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <RoleFormModal open={open} onClose={() => setOpen(false)} onDone={reload} />
    </>
  );
}

function RoleFormModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const [form, setForm] = useState({ name: "", description: "", color: "#2563eb" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.roles.create(form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create role failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create custom role">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Role name" hint="3-50 lowercase letters, numbers, or underscores."><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Color"><input className={inputClass} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button loading={loading}>Create</Button></div>
      </form>
    </Modal>
  );
}
