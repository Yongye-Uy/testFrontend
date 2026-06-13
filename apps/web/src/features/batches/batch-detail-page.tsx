"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";
import { BulkInviteWizardModal } from "@/features/users/bulk-invite-wizard-modal";

type StudentFilter = "all" | "active" | "pending" | "inactive";

export function BatchDetailPage({ id }: { id: string }) {
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const batch = useAsync(() => api.batches.getDetail(id), [id]);
  const roster = useAsync(() => api.batches.students(id), [id]);
  const classes = useAsync(() => api.classes.list(), []);
  const courses = useAsync(() => api.courses.list(), []);

  const linkedClasses = useMemo(() => {
    const classRows = classes.data?.classes ?? [];
    const courseRows = courses.data?.courses ?? [];

    return (batch.data?.class_ids ?? []).map((classId) => {
      const classItem = classRows.find((row) => row.id === classId);
      const course = courseRows.find((row) => row.id === classItem?.course_id);
      return {
        id: classId,
        code: course?.code ?? `Class ${classId}`,
        title: course?.title ?? "Linked course",
      };
    });
  }, [batch.data?.class_ids, classes.data?.classes, courses.data?.courses]);

  const counts = useMemo(() => {
    const students = roster.data?.students ?? [];
    return {
      active: students.filter((student) => student.status === "active").length,
      pending: students.filter((student) => student.status === "pending")
        .length,
      inactive: students.filter((student) => student.status === "inactive")
        .length,
    };
  }, [roster.data?.students]);

  const visibleStudents = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (roster.data?.students ?? []).filter((student) => {
      if (filter !== "all" && student.status !== filter) return false;
      if (!value) return true;
      return [student.full_name, student.email].some((item) =>
        item.toLowerCase().includes(value),
      );
    });
  }, [filter, query, roster.data?.students]);

  const activeCourses = linkedClasses.length;
  const enrolledCount = roster.data?.students.length ?? 0;
  const progressPercent =
    enrolledCount === 0 ? 0 : Math.round((counts.active / enrolledCount) * 100);

  async function reloadAll() {
    await Promise.all([batch.reload(), roster.reload()]);
  }

  function exportRoster() {
    const rows = [["full_name", "email", "status"]];
    (roster.data?.students ?? []).forEach((student) => {
      rows.push([student.full_name, student.email, student.status]);
    });
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batch.data?.batch.name ?? "batch"}-roster.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <>
      <BackLink href="/batches" label="Batches" />

      {(batch.loading ||
        roster.loading ||
        classes.loading ||
        courses.loading) && <LoadingState label="Loading batch" />}
      {(batch.error || roster.error || classes.error || courses.error) && (
        <ErrorState
          message={
            batch.error || roster.error || classes.error || courses.error
          }
        />
      )}

      {batch.data && (
        <>
          <div className="mb-5 flex flex-col gap-4 border-b border-gold-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-ink-500">
                Home / Batches /{" "}
                <span className="font-semibold text-navy-800">
                  {batch.data.batch.name}
                </span>
              </p>
              <h1 className="mt-2 font-serif-display text-[1.5rem] font-semibold leading-8 text-navy-900">
                Manage Students ({batch.data.batch.name})
              </h1>
              <p className="mt-2 text-sm text-ink-600">
                {batch.data.batch.program_name ?? "Program not assigned"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={exportRoster}>
                Export roster
              </Button>
              <Button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                disabled={batch.data.batch.status === "archived"}
              >
                Continue onboarding
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-5 text-cream-50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300">
                      Batch
                    </span>
                    <StatusBadge value={batch.data.batch.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="font-serif-display text-[1.5rem] font-semibold leading-8">
                      {batch.data.batch.name}
                    </h2>
                    <StatusBadge
                      value={batch.data.batch.type}
                      label={
                        batch.data.batch.type === "generation"
                          ? "Generation"
                          : "General"
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-cream-100/80">
                    {batch.data.batch.program_name ?? "Program not assigned"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
                    Batch progress
                  </p>
                  <p className="mt-1 text-[2rem] font-semibold leading-none">
                    {progressPercent}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-4">
              <Metric
                label="Period"
                value={formatPeriod(
                  batch.data.batch.entry_year,
                  batch.data.batch.expected_graduation_year,
                )}
              />
              <Metric
                label="Starting semester"
                value={batch.data.batch.starting_semester_title ?? "-"}
              />
              <Metric label="Active courses" value={String(activeCourses)} />
              <Metric label="Enrolled" value={String(enrolledCount)} />
            </div>

            <div className="px-6 pb-5">
              <div className="h-2 rounded-full bg-cream-200">
                <div
                  className="h-2 rounded-full bg-gold-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="mt-5" padding="md">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Field label="Search students">
                  <input
                    className={inputClass}
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={filter === "all"}
                  label="All"
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  active={filter === "active"}
                  label={`Active (${counts.active})`}
                  onClick={() => setFilter("active")}
                />
                <FilterButton
                  active={filter === "pending"}
                  label={`Pending (${counts.pending})`}
                  onClick={() => setFilter("pending")}
                />
                <FilterButton
                  active={filter === "inactive"}
                  label={`Inactive (${counts.inactive})`}
                  onClick={() => setFilter("inactive")}
                />
              </div>
            </div>
          </Card>

          <Card className="mt-5 overflow-hidden" padding="none">
            <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[1.5rem] font-semibold leading-8 text-navy-900">
                  Enrolled students
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {visibleStudents.length} of {enrolledCount} student
                  {enrolledCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStudentsOpen(true)}
                  disabled={batch.data.batch.status === "archived"}
                >
                  Add existing student
                </Button>
              </div>
            </div>

            {visibleStudents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No students in this view"
                  description="Invite students into this batch, or clear the filters to show more roster members."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-cream-100">
                    <tr className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Classes</th>
                      <th className="px-5 py-4">Progress</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => {
                      const progress = studentProgress(student.status);
                      return (
                        <tr
                          className="border-t border-ink-100 bg-white"
                          key={student.id}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-cream-50">
                                {initials(student.full_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-navy-900">
                                  {student.full_name}
                                </p>
                                <p className="mt-1 truncate text-sm text-ink-500">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {linkedClasses.length === 0 ? (
                                <span className="text-sm text-ink-500">
                                  No linked classes
                                </span>
                              ) : (
                                linkedClasses.slice(0, 2).map((classItem) => (
                                  <span
                                    key={`${student.id}-${classItem.id}`}
                                    className="rounded-md bg-navy-50 px-2 py-1 text-xs font-semibold text-navy-800 ring-1 ring-navy-100"
                                  >
                                    {classItem.code}
                                  </span>
                                ))
                              )}
                              {linkedClasses.length > 2 && (
                                <span className="text-xs text-ink-500">
                                  +{linkedClasses.length - 2} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex min-w-[180px] items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-cream-200">
                                <div
                                  className="h-2 rounded-full bg-navy-800"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-ink-600">
                                {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge value={student.status} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/users/${student.id}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-navy-800 ring-1 ring-ink-300 transition hover:bg-cream-100 hover:ring-ink-400"
                            >
                              View user
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="mt-5" padding="md">
            <h2 className="text-[1rem] font-semibold text-navy-900">
              Batch workflow notes
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                1. New student invites should attach directly to this batch
                during onboarding.
              </li>
              <li>
                2. Add existing student is kept for testing and correction
                workflows.
              </li>
              <li>
                3. Remove / unenroll from batch is not exposed by the current
                backend contract yet, so the UI stays view-only for that action.
              </li>
            </ul>
          </Card>
        </>
      )}

      <AddStudentsModal
        batchId={id}
        existingStudentIds={
          new Set((roster.data?.students ?? []).map((student) => student.id))
        }
        open={studentsOpen}
        onClose={() => setStudentsOpen(false)}
        onDone={reloadAll}
      />

      <BulkInviteWizardModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onInvited={async () => {
          setOnboardingOpen(false);
          await reloadAll();
        }}
        batches={batch.data ? [batch.data.batch] : []}
        existingUsers={roster.data?.students ?? []}
        title={
          batch.data
            ? `Onboard students · ${batch.data.batch.name}`
            : "Onboard students"
        }
        description="Upload a student CSV, validate the rows, preview the invite list, and then create pending invitations attached to this batch."
        eyebrow="Director - Batch Onboarding"
        defaultRole="student"
        fixedBatchId={id}
      />
    </>
  );
}

function AddStudentsModal({
  batchId,
  existingStudentIds,
  open,
  onClose,
  onDone,
}: {
  batchId: string;
  existingStudentIds: Set<string>;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const users = useAsync(
    () =>
      api.users.list(
        new URLSearchParams([
          ["limit", "500"],
          ["offset", "0"],
          ["role_filter", "student"],
        ]),
      ),
    [open ? "open" : "closed"],
  );

  const candidates = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (users.data?.users ?? [])
      .filter((user) => !existingStudentIds.has(user.id))
      .filter((user) => {
        if (!value) return true;
        return [user.full_name, user.email].some((item) =>
          item.toLowerCase().includes(value),
        );
      });
  }, [existingStudentIds, query, users.data?.users]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (selectedIds.length === 0)
        throw new Error("Select at least one student.");
      await api.batches.addStudents(batchId, selectedIds);
      setSelectedIds([]);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add students failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add existing students"
      description="Use this for students who already exist in the system. New student onboarding should start from Continue onboarding."
      eyebrow="Director - Batch Students"
      size="lg"
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Search students">
          <input
            className={inputClass}
            placeholder="Search by name or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {users.loading && <LoadingState label="Loading students" />}
        {users.error && <ErrorState message={users.error} />}

        {!users.loading && !users.error && (
          <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3">
            {candidates.length === 0 ? (
              <EmptyState
                title="No available students"
                description="Every visible student is already in this batch, or no student matches your search."
              />
            ) : (
              candidates.map((student) => {
                const selected = selectedIds.includes(student.id);
                return (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      selected
                        ? "border-navy-300 bg-navy-50"
                        : "border-ink-100 bg-cream-50 hover:border-ink-200"
                    }`}
                    key={student.id}
                  >
                    <input
                      checked={selected}
                      className="mt-1"
                      onChange={(event) => {
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, student.id]
                            : current.filter((item) => item !== student.id),
                        );
                      }}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900">
                        {student.full_name}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        {student.email}
                      </p>
                      <div className="mt-2">
                        <StatusBadge value={student.status} />
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        )}

        {error && <ErrorState message={error} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Add selected students</Button>
        </div>
      </form>
    </Modal>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-navy-800 text-white"
          : "bg-cream-100 text-navy-800 hover:bg-cream-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-[1.25rem] font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function studentProgress(status: string) {
  if (status === "active") return 100;
  if (status === "pending") return 35;
  return 0;
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

function formatPeriod(entryYear?: number, graduationYear?: number) {
  if (entryYear && graduationYear) return `${entryYear} - ${graduationYear}`;
  return "-";
}

function escapeCsv(value: string) {
  const normalized = String(value ?? "");
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes("\n")
  ) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}
