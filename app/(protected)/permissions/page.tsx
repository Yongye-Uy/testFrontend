"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

export default function Page() {
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(
    () => api.permissions.list(),
    [],
  );

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Backend2.0 exposes permission list and create. Role assignment is handled from each role detail page."
        actions={
          <Button onClick={() => setOpen(true)}>Create permission</Button>
        }
      />
      {loading && <LoadingState label="Loading permissions" />}
      {error && <ErrorState message={error} />}
      {data && data.permissions.length === 0 && (
        <EmptyState
          title="No permissions"
          description="Create a permission to start wiring custom roles."
        />
      )}
      {data && data.permissions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.permissions.map((permission) => (
            <Card className="p-5" key={permission.id}>
              <p className="font-semibold text-navy-900">{permission.code}</p>
              <p className="mt-2 text-sm text-ink-600">
                {permission.resource}.{permission.action}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {permission.description || "No description"}
              </p>
            </Card>
          ))}
        </div>
      )}
      <CreatePermissionModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={reload}
      />
    </>
  );
}

function CreatePermissionModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    code: "",
    resource: "",
    action: "",
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.permissions.create(form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create permission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create permission"
      description="Use resource and action values that match the backend authorization model."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Code" hint="Example: user.manage">
          <input
            className={inputClass}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </Field>
        <Field label="Resource" hint="Example: user">
          <input
            className={inputClass}
            value={form.resource}
            onChange={(e) => setForm({ ...form, resource: e.target.value })}
            required
          />
        </Field>
        <Field label="Action" hint="Example: manage">
          <input
            className={inputClass}
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <input
            className={inputClass}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}
