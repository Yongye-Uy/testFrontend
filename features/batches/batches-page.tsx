"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { programName } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";
import { api } from "@/lib/api-client";
import type { Batch } from "@/types/course";

const NEW_PROGRAM_VALUE = "__new_program__";

type BatchTab = "active" | "pending" | "archived";
type BatchType = "generation" | "general";
type ProgramOption = { id: string; name: string };
type SemesterOption = { id: string; title: string };
type BatchMeta = {
  studentCount: number;
  classCount: number;
  semesterCount: number;
};

export function BatchesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
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
  const visible = useMemo(
    () => rows.filter((batch) => batch.status === tab),
    [rows, tab],
  );
  const generation = useMemo(
    () => visible.filter((batch) => batch.type === "generation"),
    [visible],
  );
  const general = useMemo(
    () => visible.filter((batch) => batch.type === "general"),
    [visible],
  );

  const batchMeta = useAsync(async () => {
    const ids = rows.map((batch) => batch.id);
    if (ids.length === 0) return {} as Record<string, BatchMeta>;

    const semesterList = await api.semesters.list();
    const semesterRefs = new Map<string, number>();

    await Promise.all(
      semesterList.semesters.map(async (semester) => {
        try {
          const response = await api.semesters.batches(semester.id);
          response.batches.forEach((batch) => {
            semesterRefs.set(batch.id, (semesterRefs.get(batch.id) ?? 0) + 1);
          });
        } catch {
          // Keep the rest of the page working even if one semester relation call fails.
        }
      }),
    );

    const entries = await Promise.all(
      rows.map(async (batch) => {
        try {
          const detail = await api.batches.getDetail(batch.id);
          return [
            batch.id,
            {
              studentCount:
                detail.student_count || detail.student_ids.length || 0,
              classCount: detail.class_count || detail.class_ids.length || 0,
              semesterCount: semesterRefs.get(batch.id) ?? 0,
            } satisfies BatchMeta,
          ] as const;
        } catch {
          return [
            batch.id,
            {
              studentCount: 0,
              classCount: 0,
              semesterCount: semesterRefs.get(batch.id) ?? 0,
            } satisfies BatchMeta,
          ] as const;
        }
      }),
    );

    return Object.fromEntries(entries) as Record<string, BatchMeta>;
  }, [
    rows
      .map((batch) => `${batch.id}:${batch.status}:${batch.updated_at ?? ""}`)
      .join("|"),
  ]);

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
        description="Student cohorts grouped by program, plus general flexible batches."
        breadcrumbs={[{ label: "Home" }, { label: "Batches" }]}
        actions={
          <Button
            leftIcon={<AddRoundedIcon fontSize="small" />}
            onClick={() => setCreateOpen(true)}
          >
            Create batch
          </Button>
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

      {!batches.loading && !batches.error && rows.length > 0 && (
        <>
          <BatchTable
            title="Generation Batches"
            kind="generation"
            batches={generation}
            meta={batchMeta.data ?? {}}
            metaLoading={batchMeta.loading}
            programs={programs.data?.programs ?? []}
            semesters={semesters.data?.semesters ?? []}
            onArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
            onEdit={setEditTarget}
          />
          <BatchTable
            title="General Batches"
            kind="general"
            batches={general}
            meta={batchMeta.data ?? {}}
            metaLoading={batchMeta.loading}
            programs={programs.data?.programs ?? []}
            semesters={semesters.data?.semesters ?? []}
            onArchive={setArchiveTarget}
            onDelete={setDeleteTarget}
            onEdit={setEditTarget}
          />
        </>
      )}

      <BatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={reloadAll}
        programs={programs.data?.programs ?? []}
        semesters={semesters.data?.semesters ?? []}
      />
      <EditBatchModal
        batch={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onDone={reloadAll}
        programs={programs.data?.programs ?? []}
        semesters={semesters.data?.semesters ?? []}
      />
      <ConfirmArchiveBatchModal
        batch={archiveTarget}
        open={Boolean(archiveTarget)}
        onArchived={async () => {
          setArchiveTarget(null);
          await reloadAll();
          setTab("archived");
        }}
        onClose={() => setArchiveTarget(null)}
      />
      <ConfirmDeleteBatchModal
        batch={deleteTarget}
        meta={deleteTarget ? (batchMeta.data?.[deleteTarget.id] ?? null) : null}
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
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
  kind,
  batches,
  meta,
  metaLoading,
  programs,
  semesters,
  onArchive,
  onDelete,
  onEdit,
}: {
  title: string;
  kind: BatchType;
  batches: Batch[];
  meta: Record<string, BatchMeta>;
  metaLoading: boolean;
  programs: ProgramOption[];
  semesters: SemesterOption[];
  onArchive: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
}) {
  const generation = kind === "generation";

  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-serif-display text-[0.95rem] font-semibold text-navy-900">
            {title}
          </h2>
          <p className="text-xs text-ink-500">
            {generation
              ? "Official long-term student cohorts."
              : "Flexible groups the Director can assign to a semester or class later."}
          </p>
        </div>
        <SectionTypeBadge type={kind} />
      </div>

      <Card className="overflow-hidden p-0">
        {batches.length === 0 ? (
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
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-6 py-3">Batch name</th>
                  {generation && <th className="px-6 py-3">Program</th>}
                  {generation && <th className="px-6 py-3">Period</th>}
                  {generation && (
                    <th className="px-6 py-3">Starting semester</th>
                  )}
                  <th className="px-6 py-3 text-center">Students</th>
                  <th className="px-6 py-3 text-center">Classes</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {batches.map((batch) => {
                  const itemMeta = meta[batch.id];
                  const startingSemester =
                    batch.starting_semester_title ||
                    semesters.find(
                      (semester) => semester.id === batch.starting_semester_id,
                    )?.title ||
                    "-";
                  const canManage = batch.status !== "archived";

                  return (
                    <tr key={batch.id}>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-2">
                          <p className="text-[15px] font-semibold text-navy-900">
                            {batch.name}
                          </p>
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
                      {generation && (
                        <td className="px-6 py-4 text-ink-600">
                          {programName(programs, batch.program_id) ||
                            batch.program_name ||
                            "-"}
                        </td>
                      )}
                      {generation && (
                        <td className="px-6 py-4 text-ink-600">
                          <span className="inline-flex items-center gap-2">
                            <CalendarMonthOutlinedIcon
                              className="text-ink-400"
                              fontSize="inherit"
                            />
                            {formatPeriod(batch)}
                          </span>
                        </td>
                      )}
                      {generation && (
                        <td className="px-6 py-4 text-ink-600">
                          {startingSemester}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center font-semibold text-navy-900">
                        {metaLoading && !itemMeta
                          ? "..."
                          : (itemMeta?.studentCount ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-navy-900">
                        {metaLoading && !itemMeta
                          ? "..."
                          : (itemMeta?.classCount ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge value={batch.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-semibold text-navy-700 ring-1 ring-ink-200 hover:bg-cream-100"
                            href={`/batches/${batch.id}`}
                          >
                            {canManage ? "Manage" : "View details"}
                          </Link>
                          {canManage && (
                            <BatchRowMenu
                              batch={batch}
                              meta={itemMeta}
                              onArchive={onArchive}
                              onDelete={onDelete}
                              onEdit={onEdit}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function BatchRowMenu({
  batch,
  meta,
  onArchive,
  onDelete,
  onEdit,
}: {
  batch: Batch;
  meta?: BatchMeta;
  onArchive: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const blockedDelete =
    (meta?.semesterCount ?? 0) > 0 ||
    (meta?.classCount ?? 0) > 0 ||
    (meta?.studentCount ?? 0) > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="More actions"
        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-ink-500 ring-1 ring-ink-200 hover:bg-cream-100 ${open ? "bg-cream-100" : ""}`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ top: rect.bottom + 6, left: rect.right - 172 });
          setOpen((current) => !current);
        }}
        type="button"
      >
        <MoreHorizRoundedIcon fontSize="small" />
      </button>
      {open && (
        <div
          className="fixed z-50 w-44 rounded-xl bg-white py-1 shadow-soft ring-1 ring-ink-200"
          onMouseDown={(event) => event.stopPropagation()}
          style={{ left: position.left, top: position.top }}
        >
          <MenuAction
            icon={<EditOutlinedIcon fontSize="small" />}
            label="Edit"
            onClick={() => {
              setOpen(false);
              onEdit(batch);
            }}
          />
          <MenuAction
            icon={<ArchiveOutlinedIcon fontSize="small" />}
            label="Archive"
            onClick={() => {
              setOpen(false);
              onArchive(batch);
            }}
          />
          <MenuAction
            destructive
            disabled={blockedDelete}
            helper={
              blockedDelete
                ? "Only empty, unassigned batches can be deleted."
                : undefined
            }
            icon={<DeleteOutlineRoundedIcon fontSize="small" />}
            label="Delete"
            onClick={() => {
              setOpen(false);
              onDelete(batch);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuAction({
  destructive,
  disabled,
  helper,
  icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  disabled?: boolean;
  helper?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs ${disabled ? "cursor-not-allowed opacity-60" : destructive ? "text-rose-700 hover:bg-rose-50" : "text-navy-800 hover:bg-cream-100"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {helper && <span className="mt-0.5 block text-[10px]">{helper}</span>}
      </span>
    </button>
  );
}

function EditBatchModal({
  batch,
  open,
  onClose,
  onDone,
  programs,
  semesters,
}: {
  batch: Batch | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  programs: ProgramOption[];
  semesters: SemesterOption[];
}) {
  const [form, setForm] = useState({
    name: "",
    program_id: "",
    entry_year: "",
    expected_graduation_year: "",
    starting_semester_id: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !batch) return;
    setForm({
      name: batch.name,
      program_id: batch.program_id ?? "",
      entry_year: batch.entry_year ? String(batch.entry_year) : "",
      expected_graduation_year: batch.expected_graduation_year
        ? String(batch.expected_graduation_year)
        : "",
      starting_semester_id: batch.starting_semester_id ?? "",
    });
    setError("");
  }, [batch, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!batch) return;
    setLoading(true);
    setError("");
    try {
      await api.batches.update(batch.id, {
        name: form.name.trim(),
        program_id: form.program_id,
        entry_year: form.entry_year ? Number(form.entry_year) : undefined,
        expected_graduation_year: form.expected_graduation_year
          ? Number(form.expected_graduation_year)
          : undefined,
        starting_semester_id: form.starting_semester_id,
      });
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update batch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit batch"
      description="Update batch name and timeline details."
      eyebrow="Director - Academic"
    >
      {!batch ? null : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="flex items-center justify-between rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-600 ring-1 ring-ink-200">
            <span>Batch type cannot be changed after creation.</span>
            <StatusBadge
              value={batch.type}
              label={batch.type === "generation" ? "Generation" : "General"}
            />
          </div>

          <Field
            label={
              batch.type === "generation" ? "Batch name (auto)" : "Batch name"
            }
          >
            <input
              className={inputClass}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              value={form.name}
            />
          </Field>

          {batch.type === "generation" ? (
            <>
              <Field label="Program">
                <select
                  className={inputClass}
                  disabled
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      program_id: event.target.value,
                    }))
                  }
                  value={form.program_id}
                >
                  <option value="">Select program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="-mt-2 text-xs text-ink-500">
                Program stays read-only here because the active backend update
                only supports batch name and timeline edits.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Entry year">
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        entry_year: event.target.value,
                      }))
                    }
                    type="number"
                    value={form.entry_year}
                  />
                </Field>
                <Field label="Expected exit year">
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expected_graduation_year: event.target.value,
                      }))
                    }
                    type="number"
                    value={form.expected_graduation_year}
                  />
                </Field>
              </div>

              <Field label="Starting semester">
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      starting_semester_id: event.target.value,
                    }))
                  }
                  value={form.starting_semester_id}
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
          ) : (
            <div className="rounded-xl bg-cream-50 px-4 py-3 text-sm text-ink-600 ring-1 ring-ink-200">
              General batch editing stays lightweight right now. Only the batch
              name is guaranteed by the current backend contract.
            </div>
          )}

          <div className="rounded-xl bg-gold-50 px-4 py-3 text-sm text-ink-600 ring-1 ring-gold-200">
            If Save returns a backend contract error, that means the current
            course-service has not exposed batch update yet through the active
            API route.
          </div>

          {error && <ErrorState message={error} />}

          <div className="flex justify-end gap-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button loading={loading}>Save changes</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ConfirmArchiveBatchModal({
  batch,
  open,
  onClose,
  onArchived,
}: {
  batch: Batch | null;
  open: boolean;
  onClose: () => void;
  onArchived: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canArchive = Boolean(batch) && confirmation === batch?.name;

  useEffect(() => {
    if (!open) return;
    setConfirmation("");
    setError("");
  }, [batch?.id, open]);

  async function archive() {
    if (!batch || !canArchive) return;
    setLoading(true);
    setError("");
    try {
      await api.batches.changeStatus(batch.id, "archived");
      await onArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive batch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archive this batch?"
      description="Archived batches become historical, view-only records."
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!canArchive}
            loading={loading}
            onClick={archive}
            variant="danger"
          >
            Archive batch
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <p className="font-semibold">This batch will move to Archived.</p>
          <p className="mt-1">
            It remains visible for history and reporting, but ongoing academic
            management should happen from active or pending batches only.
          </p>
        </div>
        <Field label={`Type "${batch?.name ?? "batch name"}" to confirm`}>
          <input
            className={inputClass}
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

function ConfirmDeleteBatchModal({
  batch,
  meta,
  open,
  onClose,
}: {
  batch: Batch | null;
  meta: BatchMeta | null;
  open: boolean;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const relationshipBlockers = [
    { label: "Assigned to semesters", value: meta?.semesterCount ?? 0 },
    { label: "Assigned classes", value: meta?.classCount ?? 0 },
    { label: "Assigned students", value: meta?.studentCount ?? 0 },
  ];
  const hasRelations = relationshipBlockers.some((item) => item.value > 0);
  const matchesName = confirmation === batch?.name;

  useEffect(() => {
    if (!open) return;
    setConfirmation("");
  }, [batch?.id, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete this batch?"
      description="Delete is only allowed when the batch has no semester, class, or student relationships."
      footer={
        <>
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
          <Button disabled variant="danger">
            Delete not available
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <p className="font-semibold">
            Frontend rule check is ready, but the current backend API contract
            still does not expose batch delete.
          </p>
          <p className="mt-1">
            Once the backend provides delete, this same dialog can enforce the
            relationship rules before calling it.
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-cream-50 p-4 text-sm text-ink-700">
          {relationshipBlockers.map((item) => (
            <p
              className="flex items-center justify-between py-1"
              key={item.label}
            >
              <span>{item.label}</span>
              <span className="font-semibold">{item.value}</span>
            </p>
          ))}
          {!hasRelations && (
            <p className="mt-3 font-medium text-emerald-700">
              This batch currently satisfies the delete safety rule.
            </p>
          )}
        </div>
        <Field label={`Type "${batch?.name ?? "batch name"}" to confirm`}>
          <input
            className={inputClass}
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </Field>
        {matchesName && !hasRelations && (
          <div className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-600 ring-1 ring-ink-200">
            Confirmation is correct. The remaining blocker is the missing delete
            endpoint from the current backend contract.
          </div>
        )}
      </div>
    </Modal>
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
  programs: ProgramOption[];
  semesters: SemesterOption[];
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
      description="Choose whether this is a long-term generation cohort or a flexible general batch."
      eyebrow="Director - Academic"
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
              ? "A generation batch is an official long-term student cohort, such as BSCS 2026."
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
              <h3 className="mt-2 text-[1.25rem] font-semibold text-navy-900">
                {form.name || "Batch preview"}
              </h3>
              <p className="mt-1 text-sm text-ink-600">
                {selectedProgram?.name ||
                  (type === "general" ? "General batch" : "Select a program")}
                {previewPeriod ? ` - ${previewPeriod}` : ""}
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
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </Field>

        {type === "generation" && (
          <>
            <Field label="Program">
              <select
                className={inputClass}
                onChange={(event) => {
                  if (event.target.value === NEW_PROGRAM_VALUE) {
                    setNewProgramOpen(true);
                    return;
                  }
                  setForm({ ...form, program_id: event.target.value });
                }}
                required
                value={form.program_id}
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
                    onChange={(event) => setNewProgramName(event.target.value)}
                    placeholder="Example: Business"
                    value={newProgramName}
                  />
                </Field>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    onClick={() => setNewProgramOpen(false)}
                    type="button"
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={programLoading}
                    onClick={createProgram}
                    type="button"
                    variant="gold"
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
                  onChange={(event) =>
                    setForm({ ...form, entry_year: event.target.value })
                  }
                  required
                  type="number"
                  value={form.entry_year}
                />
              </Field>
              <Field label="Expected exit year">
                <input
                  className={inputClass}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      expected_graduation_year: event.target.value,
                    })
                  }
                  required
                  type="number"
                  value={form.expected_graduation_year}
                />
              </Field>
            </div>

            <Field label="Starting semester">
              <select
                className={inputClass}
                onChange={(event) =>
                  setForm({ ...form, starting_semester_id: event.target.value })
                }
                required
                value={form.starting_semester_id}
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
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button loading={loading}>Create batch</Button>
        </div>
      </form>
    </Modal>
  );
}

function SectionTypeBadge({ type }: { type: BatchType }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
        type === "generation"
          ? "bg-navy-50 text-navy-700 ring-navy-200"
          : "bg-gold-50 text-gold-700 ring-gold-200"
      }`}
    >
      {type}
    </span>
  );
}

function formatPeriod(batch: Batch) {
  if (batch.entry_year && batch.expected_graduation_year) {
    return `${batch.entry_year} - ${batch.expected_graduation_year}`;
  }
  return "-";
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
