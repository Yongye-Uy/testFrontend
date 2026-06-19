"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, ApiError } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";
import { BulkInviteWizardModal } from "@/app/features/users/bulk-invite-wizard-modal";

type StudentFilter = "all" | "active" | "pending" | "inactive";

export function BatchDetailPage({ id }: { id: string }) {
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    full_name: string;
  } | null>(null);
  const [resendingStudentId, setResendingStudentId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [classesBlocked, setClassesBlocked] = useState(false);
  const [coursesBlocked, setCoursesBlocked] = useState(false);
  const [directoryBlocked, setDirectoryBlocked] = useState(false);
  const batch = useAsync(() => api.batches.getDetail(id), [id]);
  const roster = useAsync(() => api.batches.students(id), [id]);
  const studentDirectory = useAsync(
    () =>
      api.users
        .list(
          new URLSearchParams([
            ["limit", "1000"],
            ["offset", "0"],
            ["role_filter", "student"],
          ]),
        )
        .catch((err) => {
          if (err instanceof ApiError && err.status === 403) {
            setDirectoryBlocked(true);
            return { users: [], total: 0 };
          }
          throw err;
        }),
    [id],
  );
  const classes = useAsync(
    () =>
      api.classes.list().catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setClassesBlocked(true);
          return { classes: [] };
        }
        throw err;
      }),
    [],
  );
  const courses = useAsync(
    () =>
      api.courses.list().catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setCoursesBlocked(true);
          return { courses: [] };
        }
        throw err;
      }),
    [],
  );

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

  const fallbackStudents = useMemo(() => {
    const knownStudentIds = new Set(batch.data?.student_ids ?? []);
    if (knownStudentIds.size === 0) return [];

    return (studentDirectory.data?.users ?? [])
      .filter((user) => knownStudentIds.has(user.id))
      .map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        status: user.status,
        added_at: user.created_at,
      }));
  }, [batch.data?.student_ids, studentDirectory.data?.users]);

  const rosterStudents = useMemo(() => {
    if ((roster.data?.students?.length ?? 0) > 0) {
      return roster.data?.students ?? [];
    }
    if (roster.error) return fallbackStudents;
    return roster.data?.students ?? [];
  }, [fallbackStudents, roster.data?.students, roster.error]);

  const counts = useMemo(() => {
    return {
      active: rosterStudents.filter((student) => student.status === "active")
        .length,
      pending: rosterStudents.filter((student) => student.status === "pending")
        .length,
      inactive: rosterStudents.filter(
        (student) => student.status === "inactive",
      ).length,
    };
  }, [rosterStudents]);

  const visibleStudents = useMemo(() => {
    const value = query.trim().toLowerCase();
    return rosterStudents.filter((student) => {
      if (filter !== "all" && student.status !== filter) return false;
      if (!value) return true;
      return [student.full_name, student.email].some((item) =>
        item.toLowerCase().includes(value),
      );
    });
  }, [filter, query, rosterStudents]);

  const activeCourses = linkedClasses.length;
  const enrolledCount = Math.max(
    batch.data?.student_count ?? 0,
    rosterStudents.length,
  );
  const progressPercent =
    enrolledCount === 0 ? 0 : Math.round((counts.active / enrolledCount) * 100);
  const canRemoveStudents =
    (batch.data?.class_count ?? linkedClasses.length) === 0 &&
    batch.data?.batch.status !== "archived";
  const showRosterWarning =
    Boolean(roster.error) &&
    (roster.data?.students?.length ?? 0) === 0 &&
    fallbackStudents.length === 0;

  async function reloadAll() {
    await Promise.all([
      batch.reload(),
      roster.reload(),
      studentDirectory.reload(),
    ]);
  }

  async function resendInvitation(studentId: string) {
    setResendingStudentId(studentId);
    setActionError("");
    try {
      await api.users.resendInvitation(studentId);
      await reloadAll();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Resend invitation failed",
      );
    } finally {
      setResendingStudentId(null);
    }
  }

  function exportRoster() {
    const rows = [["full_name", "email", "status"]];
    rosterStudents.forEach((student) => {
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

      {(batch.loading || roster.loading) && <SkeletonCard />}
      {batch.error && <ErrorState message={batch.error} />}
      {(classesBlocked || coursesBlocked) && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <span className="font-semibold">Class details limited —</span> grant{" "}
          {classesBlocked && coursesBlocked ? (
            <>
              <code className="font-mono">class.read</code> and{" "}
              <code className="font-mono">course.read</code>
            </>
          ) : classesBlocked ? (
            <code className="font-mono">class.read</code>
          ) : (
            <code className="font-mono">course.read</code>
          )}{" "}
          to see linked classes for this batch.
        </div>
      )}

      {batch.data && (
        <>
          <div className="mb-5 flex flex-col gap-4 border-b border-gold-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-ink-500">
                <Link
                  href="/dashboard"
                  className="transition hover:text-navy-700"
                >
                  Home
                </Link>{" "}
                /{" "}
                <Link
                  href="/batches"
                  className="transition hover:text-navy-700"
                >
                  Batches
                </Link>{" "}
                /{" "}
                <span className="font-semibold text-navy-800">
                  {batch.data.batch.name}
                </span>
              </p>
              <h1 className="mt-2 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
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
                    <h2 className="font-serif-display text-[1.35rem] font-semibold leading-8">
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
                  <p className="mt-1 text-[1.6rem] font-semibold leading-none">
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
              <div className="w-full max-w-2xl">
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
                <h2 className="text-[1.25rem] font-semibold leading-8 text-navy-900">
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

            {actionError && (
              <div className="border-b border-ink-100 px-6 py-4">
                <ErrorState message={actionError} />
              </div>
            )}

            {showRosterWarning && (
              <div className="border-b border-ink-100 px-6 py-4">
                <ErrorState message="Student roster refresh is failing in the backend right now. We are showing fallback batch membership from batch detail data, so newly added students may already be saved even if this page still warns." />
              </div>
            )}

            {visibleStudents.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No students in this view"
                  description="Invite students into this batch, or clear the filters to show more roster members."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
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
                            <div className="flex justify-end gap-2">
                              {student.status === "pending" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  loading={resendingStudentId === student.id}
                                  onClick={() =>
                                    void resendInvitation(student.id)
                                  }
                                >
                                  Resend invite
                                </Button>
                              )}
                              {canRemoveStudents && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    setRemoveTarget({
                                      id: student.id,
                                      full_name: student.full_name,
                                    })
                                  }
                                >
                                  Remove
                                </Button>
                              )}
                              <button
                                onClick={() => {
                                  setDetailUserId(student.id);
                                }}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-navy-800 ring-1 ring-ink-300 transition hover:bg-cream-100 hover:ring-ink-400"
                                type="button"
                              >
                                View user
                              </button>
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

          <Card className="mt-5" padding="md">
            <h2 className="text-[1rem] font-semibold text-navy-900">
              Batch workflow notes
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li>
                1. Student invitations create pending users first, and the batch
                roster can now show those pending students immediately.
              </li>
              <li>
                2. When a pending student accepts the invitation, backend
                activation flow can complete their class enrollment later.
              </li>
              <li>
                3. Remove student from batch is only available here while this
                batch has no assigned classes yet.
              </li>
              <li>
                4. Batch progress and per-student progress are still frontend
                placeholders based on current active/pending roster state, not
                detailed learning progression from a dedicated progress service
                yet.
              </li>
            </ul>
          </Card>
        </>
      )}

      <AddStudentsModal
        batchId={id}
        existingStudentIds={
          new Set([
            ...(batch.data?.student_ids ?? []),
            ...rosterStudents.map((student) => student.id),
          ])
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
        existingUsers={rosterStudents}
        title={
          batch.data
            ? `Onboard students - ${batch.data.batch.name}`
            : "Onboard students"
        }
        description="Upload a student CSV, validate the rows, preview the invite list, and then create pending invitations attached to this batch."
        eyebrow="Director - Batch Onboarding"
        defaultRole="student"
        fixedBatchId={id}
      />
      <RemoveStudentModal
        batchId={id}
        onClose={() => setRemoveTarget(null)}
        onDone={async () => {
          setActionError("");
          setRemoveTarget(null);
          await reloadAll();
        }}
        onError={setActionError}
        open={Boolean(removeTarget)}
        student={removeTarget}
      />
      <BatchStudentDetailModal
        batchName={batch.data?.batch.name ?? "Batch"}
        linkedClasses={linkedClasses}
        open={Boolean(detailUserId)}
        semesterName={
          batch.data?.batch.starting_semester_title ?? "Current semester"
        }
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
      />
    </>
  );
}

function BatchStudentDetailModal({
  batchName,
  linkedClasses,
  open,
  semesterName,
  userId,
  onClose,
}: {
  batchName: string;
  linkedClasses: { id: string; code: string; title: string }[];
  open: boolean;
  semesterName: string;
  userId: string | null;
  onClose: () => void;
}) {
  const detail = useAsync(async () => {
    if (!userId) return null;
    return api.users.get(userId);
  }, [userId]);

  const user = detail.data;
  const overallProgress = studentProgress(user?.status ?? "inactive");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user?.full_name ?? "User detail"}
      description={
        user ? `Student - ${user.email}` : "Loading student information"
      }
      size="lg"
    >
      {detail.loading && <LoadingState label="Loading student detail" />}
      {detail.error && <ErrorState message={detail.error} />}

      {user && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="h-14 bg-gradient-to-r from-navy-900 to-navy-700" />
            <div className="flex items-start gap-4 px-5 pb-4">
              <div className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] border-4 border-white bg-navy-800 text-base font-bold text-cream-50 shadow-soft">
                {initials(user.full_name || user.email)}
              </div>
              <div className="min-w-0 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[1.05rem] font-semibold text-navy-900">
                    {user.full_name}
                  </p>
                  <StatusBadge value={user.status} />
                </div>
                <p className="mt-1 truncate text-sm text-ink-500">
                  {user.email}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Joined {formatJoinedDate(user.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Student ID" value={user.id} />
            <MetricCard label="Current batch" value={batchName} />
            <MetricCard label="Current semester" value={semesterName} />
            <MetricCard
              label="Overall progress"
              value={`${overallProgress}%`}
            />
          </div>

          <div className="space-y-1 text-sm text-ink-700">
            <p>
              <span className="font-semibold text-navy-900">All batches:</span>{" "}
              {batchName}
            </p>
            <p>
              <span className="font-semibold text-navy-900">
                All semesters:
              </span>{" "}
              {semesterName}
            </p>
          </div>

          <section>
            <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-navy-900">
              <span className="text-gold-600">o</span>
              Active Classes
            </h3>
            <div className="mt-3 space-y-3">
              {linkedClasses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
                  No linked classes yet.
                </div>
              ) : (
                linkedClasses.map((classItem, index) => {
                  const progress = classProgress(user.status, index);
                  return (
                    <div
                      key={`${user.id}-${classItem.id}`}
                      className="rounded-xl border border-ink-100 bg-white px-4 py-4 shadow-soft"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-navy-900">
                            {classItem.title}
                          </p>
                          <p className="mt-1 text-sm text-ink-500">
                            {classItem.code} - {semesterName}
                          </p>
                        </div>
                        <div className="w-full max-w-[220px]">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-500">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-cream-200">
                            <div
                              className="h-2 rounded-full bg-navy-800"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-navy-900">
              <span className="text-gold-600">o</span>
              Archived Classes
            </h3>
            <div className="mt-3 rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
              No archived class history is available from the current backend
              contract yet.
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

function RemoveStudentModal({
  batchId,
  onClose,
  onDone,
  onError,
  open,
  student,
}: {
  batchId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
  open: boolean;
  student: { id: string; full_name: string } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!student) return;
    setLoading(true);
    setError("");
    try {
      await api.batches.removeStudent(batchId, student.id);
      await onDone();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Remove student failed";
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        student
          ? `Remove ${student.full_name} from this batch?`
          : "Remove student"
      }
      description="This is only allowed while the student is not enrolled through classes attached to this batch."
      eyebrow="Director - Batch Students"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            onClick={() => void confirm()}
          >
            Remove student
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          Removing a student from the batch will also block them from future
          batch-based class enrollment until they are added again.
        </div>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-[0.95rem] font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function studentProgress(status: string) {
  if (status === "active") return 100;
  if (status === "pending") return 35;
  return 0;
}

function classProgress(status: string, index: number) {
  if (status === "active") return [68, 55, 70, 82][index % 4];
  if (status === "pending") return [25, 18, 30, 22][index % 4];
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

function formatJoinedDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}
