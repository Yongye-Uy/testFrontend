"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import type { Batch } from "@/types/course";
import { programName } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";

const NEW_PROGRAM_VALUE = "__new_program__";
type BatchTab = "active" | "pending" | "archived";
type BatchType = "generation" | "general";

export function BatchesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<BatchTab>("active");
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
  const programs = useAsync(() => api.programs.list(), []);
  const semesters = useAsync(() => api.semesters.list(), []);
  const rows = useMemo(
    () => batches.data?.batches ?? [],
    [batches.data?.batches],
  );
  const counts = useMemo(
    () => ({
      active: rows.filter((batch) => batch.status === "active").length,
      pending: rows.filter((batch) => batch.status === "pending").length,
      archived: rows.filter((batch) => batch.status === "archived").length,
    }),
    [rows],
  );
  const visible = rows.filter((batch) => batch.status === tab);
  const generation = visible.filter((batch) => batch.type === "generation");
  const general = visible.filter((batch) => batch.type === "general");

  async function reloadAll() {
    await Promise.all([
      batches.reload(),
      programs.reload(),
      semesters.reload(),
    ]);
  }

  return (
    <>
      <PageHeader
        title="Batches"
        description="Master batch list for generation and general groups. Students should be invited into the correct batch from Users or attached later from batch detail."
        breadcrumbs={[{ label: "Home" }, { label: "Batches" }]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>+ Create Batch</Button>
        }
      />

      <BatchTabs value={tab} counts={counts} onChange={setTab} />

      {(batches.loading || programs.loading || semesters.loading) && (
        <LoadingState label="Loading batches" />
      )}
      {(batches.error || programs.error || semesters.error) && (
        <ErrorState
          message={batches.error || programs.error || semesters.error}
        />
      )}

      {!batches.loading && !batches.error && rows.length === 0 && (
        <EmptyState
          title="No batches"
          description="Create a generation or general batch to get started."
        />
      )}

      <BatchTable
        title="Generation Batches"
        batches={generation}
        programs={programs.data?.programs ?? []}
      />
      <BatchTable
        title="General Batches"
        batches={general}
        programs={programs.data?.programs ?? []}
      />

      <BatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={reloadAll}
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
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-navy-100 text-navy-800" : "bg-cream-200 text-ink-600"}`}
              >
                {counts[item.id]}
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

function BatchTable({
  title,
  batches,
  programs,
}: {
  title: string;
  batches: Batch[];
  programs: { id: string; name: string }[];
}) {
  const generation = title.startsWith("Generation");

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-serif-display text-lg font-semibold text-navy-900">
            {title}
          </h2>
          <p className="text-xs text-ink-500">
            {generation
              ? "Official long-term student cohorts."
              : "Flexible groups for semester and class assignment."}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {(batches.length ?? 0) === 0 ? (
          <div className="p-8">
            <EmptyState
              title={`No ${title.toLowerCase()}`}
              description={
                generation
                  ? "Create a generation batch to populate this section."
                  : "Create a general batch to populate this section."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Batch name</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">
                        {batch.name}
                      </p>
                      <div className="mt-2">
                        <StatusBadge
                          value={batch.type}
                          label={
                            batch.type === "generation"
                              ? "Generation"
                              : "General"
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {programName(programs, batch.program_id) ||
                        batch.program_name ||
                        "-"}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {batch.entry_year && batch.expected_graduation_year
                        ? `${batch.entry_year} - ${batch.expected_graduation_year}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="inline-flex min-h-8 items-center rounded-lg px-3 py-1 text-xs font-semibold text-navy-700 ring-1 ring-ink-200 hover:bg-cream-100"
                        href={`/batches/${batch.id}`}
                      >
                        {batch.status === "archived"
                          ? "View details"
                          : "Manage"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function BatchModal({
  open,
  onClose,
  onDone,
  programs,
  semesters,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  programs: { id: string; name: string }[];
  semesters: { id: string; title: string }[];
}) {
  const [type, setType] = useState<BatchType>("generation");
  const [localPrograms, setLocalPrograms] = useState(programs);
  const [newProgramOpen, setNewProgramOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [form, setForm] = useState({
    name: "",
    program_id: "",
    entry_year: "",
    starting_semester_id: "",
    expected_graduation_year: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);

  useEffect(() => {
    setLocalPrograms(programs);
  }, [programs]);

  useEffect(() => {
    if (!open) return;
    setType("generation");
    setForm({
      name: "",
      program_id: "",
      entry_year: "",
      starting_semester_id: "",
      expected_graduation_year: "",
    });
    setError("");
    setNewProgramOpen(false);
    setNewProgramName("");
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.batches.create({
        type,
        name: form.name.trim(),
        program_id: form.program_id,
        entry_year: form.entry_year ? Number(form.entry_year) : undefined,
        starting_semester_id: form.starting_semester_id,
        expected_graduation_year: form.expected_graduation_year
          ? Number(form.expected_graduation_year)
          : undefined,
      });

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
      setLocalPrograms((current) => [
        ...current.filter((item) => item.id !== program.id),
        program,
      ]);
      setForm((current) => ({ ...current, program_id: program.id }));
      setNewProgramName("");
      setNewProgramOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create program failed");
    } finally {
      setProgramLoading(false);
    }
  }

  const selectedProgram = localPrograms.find(
    (program) => program.id === form.program_id,
  );
  const previewCode =
    type === "generation"
      ? initials(form.name || selectedProgram?.name || "GB")
      : initials(form.name || "General Batch");
  const previewPeriod =
    type === "generation" && form.entry_year && form.expected_graduation_year
      ? `${form.entry_year} - ${form.expected_graduation_year}`
      : type === "generation"
        ? "Set period"
        : "Flexible special-purpose group";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create new batch"
      eyebrow="Director - Academic"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Batch type
          </p>
          <div className="flex rounded-xl border border-ink-200 bg-cream-50 p-1">
            {(["generation", "general"] as BatchType[]).map((item) => (
              <button
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${type === item ? "bg-white text-navy-900 shadow-soft" : "text-ink-600 hover:text-navy-800"}`}
                key={item}
                onClick={() => setType(item)}
                type="button"
              >
                {item === "generation" ? "Generation batch" : "General batch"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-500">
            {type === "generation"
              ? "A generation batch is an official long-term student cohort."
              : "A general batch is a flexible group for special or temporary use."}
          </p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-navy-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-700">
                  Will create
                </span>
                <StatusBadge
                  value={type}
                  label={type === "generation" ? "Generation" : "General"}
                />
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-navy-900">
                {form.name || "Batch preview"}
              </h3>
              <p className="mt-1 text-sm text-ink-600">
                {selectedProgram?.name ||
                  (type === "general" ? "General batch" : "Select a program")}
                {previewPeriod ? ` · ${previewPeriod}` : ""}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gold-500 text-lg font-bold text-navy-900">
              {previewCode}
            </div>
          </div>
        </div>

        <Field label="Batch name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
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
                {localPrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
                <option value={NEW_PROGRAM_VALUE}>+ New program</option>
              </select>
            </Field>

            {newProgramOpen && (
              <div className="rounded-2xl bg-gold-50/70 p-4 ring-1 ring-gold-100">
                <Field label="New program name">
                  <input
                    className={inputClass}
                    value={newProgramName}
                    onChange={(event) => setNewProgramName(event.target.value)}
                    placeholder="Example: Business"
                  />
                </Field>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setNewProgramOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    type="button"
                    loading={programLoading}
                    onClick={createProgram}
                  >
                    Create and select
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Entry year">
                <input
                  className={inputClass}
                  type="number"
                  value={form.entry_year}
                  onChange={(event) =>
                    setForm({ ...form, entry_year: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Expected graduation year">
                <input
                  className={inputClass}
                  type="number"
                  value={form.expected_graduation_year}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      expected_graduation_year: event.target.value,
                    })
                  }
                  required
                />
              </Field>
            </div>

            <Field label="Starting semester">
              <select
                className={inputClass}
                value={form.starting_semester_id}
                onChange={(event) =>
                  setForm({ ...form, starting_semester_id: event.target.value })
                }
                required
              >
                <option value="">Select semester</option>
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.title}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {type === "general" && (
          <div className="rounded-lg bg-cream-100 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-200">
            General batch keeps the same backend information structure, but only
            batch name is required right now.
          </div>
        )}

        <div className="rounded-lg bg-gold-50 px-3 py-2 text-sm text-ink-600 ring-1 ring-gold-200">
          Students will not be onboarded automatically. Use Bulk Onboarding to
          invite them once the batch is created.
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Create batch</Button>
        </div>
      </form>
    </Modal>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}
