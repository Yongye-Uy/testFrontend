"use client";

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
import { api } from "@/lib/api-client";
import type { Semester } from "@/types/course";
import { useAsync } from "@/features/shared/use-async";

type SemesterTab = "active" | "draft" | "archived";

export function SemestersPage() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SemesterTab>("active");
  const [editing, setEditing] = useState<Semester | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Semester | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [actionError, setActionError] = useState("");
  const [publishingId, setPublishingId] = useState("");
  const semesters = useAsync(() => api.semesters.list(), []);
  const counts = useMemo(() => {
    const rows = semesters.data?.semesters ?? [];
    return {
      active: rows.filter((semester) => semester.status === "active").length,
      draft: rows.filter((semester) => semester.status === "draft").length,
      archived: rows.filter((semester) => semester.status === "archived")
        .length,
    };
  }, [semesters.data?.semesters]);
  const visible = useMemo(
    () =>
      (semesters.data?.semesters ?? []).filter(
        (semester) => semester.status === tab,
      ),
    [semesters.data?.semesters, tab],
  );

  async function publishSemester(semester: Semester) {
    setPublishingId(semester.id);
    setActionError("");
    try {
      await api.semesters.changeStatus(semester.id, "active");
      await semesters.reload();
      setTab("active");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Publish semester failed",
      );
    } finally {
      setPublishingId("");
    }
  }

  return (
    <>
      <PageHeader
        title="Semesters"
        description="Plan academic terms, publish drafts, and manually archive older semesters when they are no longer active."
        breadcrumbs={[{ label: "Home" }, { label: "Semesters" }]}
        actions={<Button onClick={() => setOpen(true)}>Create semester</Button>}
      />
      <SemesterTabs value={tab} counts={counts} onChange={setTab} />
      {semesters.loading && <LoadingState label="Loading semesters" />}
      {(semesters.error || actionError) && (
        <ErrorState message={semesters.error || actionError} />
      )}
      {!semesters.loading && semesters.data?.semesters.length === 0 && (
        <EmptyState
          title="No semesters"
          description="Create a draft semester before adding class offerings."
        />
      )}
      {!semesters.loading && semesters.data && visible.length === 0 && (
        <Card className="p-10 text-center">
          <p className="font-semibold text-navy-900">No {tab} semesters</p>
          <p className="mt-1 text-sm text-ink-500">
            {tab === "archived"
              ? "Semesters you archive will appear here as historical records."
              : tab === "draft"
                ? "Draft semesters appear here before publication."
                : "Publish or create a semester to see it here."}
          </p>
        </Card>
      )}
      {visible.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-cream-100">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Semester name
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Academic year
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Workflow
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((semester) => (
                  <tr
                    className="border-b border-ink-100 last:border-b-0 hover:bg-cream-100/60"
                    key={semester.id}
                  >
                    <td className="px-5 py-3.5 font-semibold text-navy-900">
                      {semester.title}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">
                      {semester.academic_year || "No academic year"}
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">
                      Manual publish / archive
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge value={semester.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {semester.status === "draft" && (
                          <Button
                            className="min-h-8 px-3 py-1 text-xs"
                            loading={publishingId === semester.id}
                            onClick={() => publishSemester(semester)}
                          >
                            Publish
                          </Button>
                        )}
                        <Link
                          href={`/semesters/${semester.id}`}
                          className="inline-flex min-h-8 items-center rounded-lg px-3 py-1 text-xs font-semibold text-navy-700 ring-1 ring-ink-200 hover:bg-cream-100"
                        >
                          View details
                        </Link>
                        {semester.status !== "archived" && (
                          <SemesterRowMenu
                            onEdit={
                              semester.status === "draft"
                                ? () => setEditing(semester)
                                : undefined
                            }
                            onDelete={
                              semester.status === "draft"
                                ? () => setDeleteTarget(semester)
                                : undefined
                            }
                            onArchive={() => setArchiveTarget(semester)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <SemesterModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={semesters.reload}
      />
      <SemesterModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onDone={semesters.reload}
        initial={editing ?? undefined}
      />
      <ConfirmArchiveSemesterModal
        open={Boolean(archiveTarget)}
        semester={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onArchived={async () => {
          setArchiveTarget(null);
          await semesters.reload();
          setTab("archived");
        }}
      />
      <ConfirmDeleteSemesterModal
        open={Boolean(deleteTarget)}
        semester={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async () => {
          setDeleteTarget(null);
          await semesters.reload();
          setTab("draft");
        }}
      />
    </>
  );
}

function SemesterTabs({
  value,
  counts,
  onChange,
}: {
  value: SemesterTab;
  counts: Record<SemesterTab, number>;
  onChange: (value: SemesterTab) => void;
}) {
  const tabs: { id: SemesterTab; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "draft", label: "Draft" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="mb-5 -mt-2 flex items-center gap-1 border-b border-ink-200">
      {tabs.map((item) => {
        const active = item.id === value;
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

function SemesterRowMenu({
  onEdit,
  onDelete,
  onArchive,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="More actions"
        className={`rounded-lg px-2 py-1 text-lg font-bold leading-none text-ink-500 hover:bg-cream-200 ${open ? "bg-cream-200" : ""}`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({ top: rect.bottom + 6, left: rect.right - 144 });
          setOpen((current) => !current);
        }}
        type="button"
      >
        ...
      </button>
      {open && (
        <div
          className="fixed z-50 w-36 rounded-lg bg-white py-1 shadow-soft ring-1 ring-ink-200"
          onMouseDown={(event) => event.stopPropagation()}
          style={{ left: position.left, top: position.top }}
        >
          {onEdit && (
            <button
              className="w-full px-3 py-2 text-left text-xs font-semibold text-navy-800 hover:bg-cream-100"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              type="button"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              type="button"
            >
              Delete
            </button>
          )}
          <button
            className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
            type="button"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

export function ConfirmDeleteSemesterModal({
  open,
  semester,
  onClose,
  onDeleted,
}: {
  open: boolean;
  semester: Semester | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dependencies = useAsync(async () => {
    if (!semester) return { classCount: 0, batchCount: 0 };
    const [classes, batches] = await Promise.all([
      api.semesters.classes(semester.id),
      api.semesters.batches(semester.id),
    ]);
    return {
      classCount: classes.classes.length,
      batchCount: batches.batches.length,
    };
  }, [semester?.id, open]);

  useEffect(() => {
    if (!open) return;
    setConfirmation("");
    setError("");
  }, [open, semester?.id]);

  const canDelete =
    Boolean(semester) &&
    semester?.status === "draft" &&
    confirmation === semester?.title &&
    !dependencies.loading &&
    !dependencies.error &&
    (dependencies.data?.classCount ?? 0) === 0 &&
    (dependencies.data?.batchCount ?? 0) === 0;

  async function destroy() {
    if (!semester || !canDelete) return;
    setLoading(true);
    setError("");
    try {
      await api.semesters.delete(semester.id);
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete semester failed");
    } finally {
      setLoading(false);
    }
  }

  const classCount = dependencies.data?.classCount ?? 0;
  const batchCount = dependencies.data?.batchCount ?? 0;
  const blocked = classCount > 0 || batchCount > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete this draft semester?"
      description="Only draft semesters with no attached classes or batches can be deleted."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!canDelete}
            loading={loading}
            onClick={destroy}
          >
            Delete semester
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <p className="font-semibold">
            Draft-only delete with second confirmation.
          </p>
          <p className="mt-1">
            This is allowed only before the semester is published and only when
            no class offerings or assigned batches exist yet.
          </p>
        </div>
        {dependencies.loading && (
          <LoadingState label="Checking draft semester dependencies" />
        )}
        {dependencies.error && <ErrorState message={dependencies.error} />}
        {!dependencies.loading && !dependencies.error && (
          <div className="rounded-xl border border-ink-100 bg-cream-50 p-4 text-sm text-ink-700">
            <p>Class offerings: {classCount}</p>
            <p className="mt-1">Assigned batches: {batchCount}</p>
            {blocked && (
              <p className="mt-3 font-semibold text-rose-700">
                This draft cannot be deleted until both counts are zero.
              </p>
            )}
          </div>
        )}
        <Field
          label={`Type "${semester?.title ?? "semester title"}" to confirm`}
        >
          <input
            className={inputClass}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

export function SemesterModal({
  open,
  onClose,
  onDone,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  initial?: Semester;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    academic_year: initial?.academic_year ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initial?.title ?? "",
      academic_year: initial?.academic_year ?? "",
    });
    setError("");
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial) await api.semesters.update(initial.id, form);
      else await api.semesters.create(form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save semester failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit semester" : "Create semester"}
      eyebrow="Director · Academic"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Academic year">
          <input
            className={inputClass}
            value={form.academic_year}
            onChange={(e) =>
              setForm({ ...form, academic_year: e.target.value })
            }
            placeholder="Example: 2026"
          />
        </Field>
        <div className="rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-500 ring-1 ring-ink-200">
          This backend version does not store semester start/end dates yet.
          Directors publish drafts manually and archive older semesters
          manually.
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmArchiveSemesterModal({
  open,
  semester,
  onClose,
  onArchived,
}: {
  open: boolean;
  semester: Semester | null;
  onClose: () => void;
  onArchived: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canArchive = Boolean(semester) && confirmation === semester?.title;

  useEffect(() => {
    if (!open) return;
    setConfirmation("");
    setError("");
  }, [open, semester?.id]);

  async function archive() {
    if (!semester || !canArchive) return;
    setLoading(true);
    setError("");
    try {
      await api.semesters.changeStatus(semester.id, "archived");
      await onArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive semester failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archive this semester?"
      description="Second verification is required. Archived semesters are historical, view-only, and cannot be restored."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!canArchive}
            loading={loading}
            onClick={archive}
          >
            Archive semester
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <p className="font-semibold">
            This action changes the semester to Archived.
          </p>
          <p className="mt-1">
            Classes, batches, enrollments, grades, and reports are kept for
            history. Editing and assignment actions will be disabled.
          </p>
        </div>
        <Field
          label={`Type "${semester?.title ?? "semester title"}" to confirm`}
        >
          <input
            className={inputClass}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
