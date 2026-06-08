"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { backendCapabilities } from "@/lib/backend-capabilities";
import type { Batch } from "@/types/course";
import { programName } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";

const NEW_PROGRAM_VALUE = "__new_program__";
type BatchTab = "active" | "pending" | "archived";

export function BatchesPage() {
  const [type, setType] = useState<"generation" | "general" | null>(null);
  const [tab, setTab] = useState<BatchTab>("active");
  const [lastCreated, setLastCreated] = useState<Batch | null>(null);
  const batches = useAsync(
    () => backendCapabilities.batchDirectory ? api.batches.list() : Promise.resolve({ batches: [] as Batch[] }),
    [],
  );
  const programs = useAsync(() => api.programs.list(), []);
  const semesters = useAsync(() => api.semesters.list(), []);
  const rows = useMemo(() => batches.data?.batches ?? [], [batches.data?.batches]);
  const counts = useMemo(() => ({
    active: rows.filter((batch) => batch.status === "active").length,
    pending: rows.filter((batch) => batch.status === "pending").length,
    archived: rows.filter((batch) => batch.status === "archived").length,
  }), [rows]);
  const visible = rows.filter((batch) => batch.status === tab);
  const generation = visible.filter((batch) => batch.type === "generation");
  const general = visible.filter((batch) => batch.type === "general");

  async function reloadAll() {
    await programs.reload();
    await semesters.reload();
    if (backendCapabilities.batchDirectory) await batches.reload();
  }

  return (
    <>
      <PageHeader
        title="Batches"
        description="Master batch list for generation and general groups. Archive, detail, and student-roster flows are kept in the UI even while Backend2.0 is still exposing them."
        breadcrumbs={[{ label: "Home" }, { label: "Batches" }]}
        actions={
          <>
            <Button onClick={() => setType("generation")}>Create generation batch</Button>
            <Button variant="outline" onClick={() => setType("general")}>Create general batch</Button>
          </>
        }
      />
      <BatchTabs value={tab} counts={counts} onChange={setTab} />
      {(programs.loading || semesters.loading || (backendCapabilities.batchDirectory && batches.loading)) && <LoadingState label="Loading batches" />}
      {(programs.error || semesters.error || batches.error) && <ErrorState message={programs.error || semesters.error || batches.error} />}

      {!backendCapabilities.batchDirectory && (
        <div className="mb-5">
          <CapabilityNotice
            title="Batch list and detail are waiting on Backend2.0 read endpoints"
            description="Create batch already calls the real backend. The list, detail, archive, status, and student-roster screens are being kept visually aligned with the UXUI, but they cannot read live batch records until Backend2.0 exposes those APIs."
          />
        </div>
      )}

      {lastCreated && (
        <Card className="mb-5 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700">Latest create result</p>
          <h2 className="mt-1 font-semibold text-navy-900">{lastCreated.name}</h2>
          <p className="mt-2 text-sm text-ink-600">
            Backend created batch ID <span className="font-semibold text-navy-900">{lastCreated.id}</span>.
            {!backendCapabilities.batchDirectory && " Batch read/list endpoints are still pending, so the page cannot reload this record from the backend yet."}
          </p>
        </Card>
      )}

      {backendCapabilities.batchDirectory && batches.data?.batches.length === 0 && (
        <EmptyState title="No batches" description="Create a generation or general batch to get started." />
      )}

      <BatchTable title="Generation Batches" batches={generation} programs={programs.data?.programs ?? []} backendReady={backendCapabilities.batchDirectory} />
      <BatchTable title="General Batches" batches={general} programs={programs.data?.programs ?? []} backendReady={backendCapabilities.batchDirectory} />

      <BatchModal
        open={type !== null}
        type={type ?? "general"}
        onClose={() => setType(null)}
        onDone={reloadAll}
        onCreated={(batch) => setLastCreated(batch)}
        programs={programs.data?.programs ?? []}
        semesters={semesters.data?.semesters ?? []}
      />
    </>
  );
}

function BatchTabs({
  value,
  counts,
  onChange,
}: {
  value: BatchTab;
  counts: Record<BatchTab, number>;
  onChange: (value: BatchTab) => void;
}) {
  const tabs: { id: BatchTab; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "pending", label: "Pending" },
    { id: "archived", label: "Archived" },
  ];
  return (
    <div className="mb-5 -mt-2 flex items-center gap-1 border-b border-ink-200">
      {tabs.map((item) => {
        const active = value === item.id;
        return (
          <button
            className={`relative px-4 py-2.5 text-sm font-semibold transition ${active ? "text-navy-900" : "text-ink-500 hover:text-navy-800"}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-navy-100 text-navy-800" : "bg-cream-200 text-ink-600"}`}>{counts[item.id]}</span>
            </span>
            {active && <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />}
          </button>
        );
      })}
    </div>
  );
}

function BatchTable({
  title,
  batches,
  programs,
  backendReady,
}: {
  title: string;
  batches: Batch[];
  programs: { id: string; name: string }[];
  backendReady: boolean;
}) {
  const generation = title.startsWith("Generation");
  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-serif-display text-lg font-semibold text-navy-900">{title}</h2>
          <p className="text-xs text-ink-500">{generation ? "Official long-term student cohorts." : "Flexible groups for semester and class assignment."}</p>
        </div>
      </div>
      {backendReady ? (
        <DataTable
          rows={batches}
          rowKey={(batch) => batch.id}
          emptyTitle={`No ${title.toLowerCase()}`}
          emptyDescription={generation ? "Create a generation batch to populate this section." : "Create a general batch to populate this section."}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (batch) => (
                <>
                  <p className="font-semibold text-navy-900">{batch.name}</p>
                  <p className="text-xs text-ink-500">{batch.type}</p>
                </>
              ),
            },
            { key: "program", header: "Program", render: (batch) => <span className="text-ink-600">{programName(programs, batch.program_id)}</span> },
            { key: "status", header: "Status", render: (batch) => <StatusBadge value={batch.status} /> },
            {
              key: "action",
              header: "Action",
              align: "right",
              render: (batch) => (
                <Link className="inline-flex min-h-8 items-center rounded-lg px-3 py-1 text-xs font-semibold text-navy-700 ring-1 ring-ink-200 hover:bg-cream-100" href={`/batches/${batch.id}`}>
                  {batch.status === "archived" ? "View details" : "Manage"}
                </Link>
              ),
            },
          ]}
        />
      ) : (
        <Card className="p-6">
          <EmptyState
            title={`${title} will appear here`}
            description="The layout is ready, but Backend2.0 has not exposed live batch list/detail APIs yet."
          />
        </Card>
      )}
    </div>
  );
}

export function BatchModal({
  open,
  onClose,
  onDone,
  onCreated,
  type,
  programs,
  semesters,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  onCreated?: (batch: Batch) => void;
  type: "generation" | "general";
  programs: { id: string; name: string }[];
  semesters: { id: string; title: string }[];
  initial?: Batch;
}) {
  const [localPrograms, setLocalPrograms] = useState(programs);
  const [newProgramOpen, setNewProgramOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    program_id: initial?.program_id ?? "",
    entry_year: initial?.entry_year ? String(initial.entry_year) : "",
    starting_semester_id: initial?.starting_semester_id ?? "",
    expected_graduation_year: initial?.expected_graduation_year ? String(initial.expected_graduation_year) : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);

  useEffect(() => {
    setLocalPrograms(programs);
  }, [programs]);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initial?.name ?? "",
      program_id: initial?.program_id ?? "",
      entry_year: initial?.entry_year ? String(initial.entry_year) : "",
      starting_semester_id: initial?.starting_semester_id ?? "",
      expected_graduation_year: initial?.expected_graduation_year ? String(initial.expected_graduation_year) : "",
    });
    setError("");
    setNewProgramOpen(false);
    setNewProgramName("");
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial) {
        await api.batches.update(initial.id, { name: form.name });
      } else {
        const created = await api.batches.create({
          type,
          name: form.name,
          program_id: form.program_id,
          entry_year: form.entry_year ? Number(form.entry_year) : undefined,
          starting_semester_id: form.starting_semester_id,
          expected_graduation_year: form.expected_graduation_year ? Number(form.expected_graduation_year) : undefined,
        });
        onCreated?.(created);
      }
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save batch failed");
    } finally {
      setLoading(false);
    }
  }

  async function createProgram() {
    if (!newProgramName.trim()) return;
    setProgramLoading(true);
    setError("");
    try {
      const program = await api.programs.create(newProgramName.trim());
      setLocalPrograms((current) => [...current.filter((item) => item.id !== program.id), program]);
      setForm((current) => ({ ...current, program_id: program.id }));
      setNewProgramName("");
      setNewProgramOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create program failed");
    } finally {
      setProgramLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit batch" : `Create ${type} batch`} eyebrow="Director · Academic">
      <form onSubmit={submit} className="space-y-4">
        <CapabilityNotice
          title="Current Backend2.0 batch create is narrower than the UX form"
          description="The full generation/general fields stay in the Director UI so the workflow matches the UXUI. Right now the synced backend only persists the batch record itself during create; richer batch detail APIs will be wired later by the backend team."
        />
        <Field label="Batch name">
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        {type === "generation" && (
          <>
            <Field label="Program">
              <select
                className={inputClass}
                value={form.program_id}
                onChange={(event) => {
                  if (event.target.value === NEW_PROGRAM_VALUE) {
                    setNewProgramOpen(true);
                    return;
                  }
                  setForm({ ...form, program_id: event.target.value });
                }}
                required
              >
                <option value="">Select program</option>
                {localPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                <option value={NEW_PROGRAM_VALUE}>+ New program</option>
              </select>
            </Field>
            {newProgramOpen && (
              <div className="rounded-2xl bg-gold-50/70 p-4 ring-1 ring-gold-100">
                <Field label="New program name">
                  <input className={inputClass} value={newProgramName} onChange={(event) => setNewProgramName(event.target.value)} placeholder="Example: Business" />
                </Field>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={() => setNewProgramOpen(false)}>Cancel</Button>
                  <Button variant="gold" type="button" loading={programLoading} onClick={createProgram}>Create and select</Button>
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Entry year"><input className={inputClass} type="number" value={form.entry_year} onChange={(event) => setForm({ ...form, entry_year: event.target.value })} required /></Field>
              <Field label="Expected graduation year"><input className={inputClass} type="number" value={form.expected_graduation_year} onChange={(event) => setForm({ ...form, expected_graduation_year: event.target.value })} required /></Field>
            </div>
            <Field label="Starting semester">
              <select className={inputClass} value={form.starting_semester_id} onChange={(event) => setForm({ ...form, starting_semester_id: event.target.value })} required>
                <option value="">Select semester</option>
                {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.title}</option>)}
              </select>
            </Field>
          </>
        )}
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
