"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
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
import { courseLabel } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";

export function ClassDetailPage({ id }: { id: string }) {
  const [lecturerOpen, setLecturerOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const classItem = useAsync(() => api.classes.get(id), [id]);
  const courses = useAsync(() => api.courses.list(), []);
  const batches = useAsync(() => api.classes.batches(id), [id]);
  const enrollments = useAsync(() => api.classes.enrollments(id), [id]);
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

  const currentCourse = courses.data?.courses.find(
    (course) => course.id === classItem.data?.course_id,
  );
  const userById = useMemo(
    () => new Map((users.data?.users ?? []).map((user) => [user.id, user])),
    [users.data?.users],
  );
  const lecturerName =
    (classItem.data?.lecturer_id
      ? userById.get(classItem.data.lecturer_id)?.full_name
      : null) ??
    classItem.data?.lecturer_id ??
    "Unassigned";

  async function reloadAll() {
    await Promise.all([
      classItem.reload(),
      batches.reload(),
      enrollments.reload(),
    ]);
  }

  return (
    <>
      <BackLink
        href={
          classItem.data
            ? `/semesters/${classItem.data.semester_id}`
            : "/semesters"
        }
        label="Semester detail"
      />
      <PageHeader
        title={courseLabel(currentCourse)}
        description="Manage a class offering. Lecturer assignment is wired to a real lecturer list, and batch/enrollment reads come from the current backend."
        breadcrumbs={[
          { label: "Home" },
          { label: "Semesters" },
          { label: "Class detail" },
        ]}
        actions={
          <Button onClick={() => setLecturerOpen(true)}>Assign lecturer</Button>
        }
      />

      {(classItem.loading ||
        courses.loading ||
        batches.loading ||
        enrollments.loading ||
        users.loading) && <LoadingState label="Loading class offering" />}
      {(classItem.error ||
        courses.error ||
        batches.error ||
        enrollments.error ||
        users.error ||
        assignError) && (
        <ErrorState
          message={
            classItem.error ||
            courses.error ||
            batches.error ||
            enrollments.error ||
            users.error ||
            assignError
          }
        />
      )}

      {classItem.data && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                Class offering
              </span>
              <StatusBadge value={classItem.data.status} />
            </div>
            <h2 className="mt-2 font-serif-display text-2xl font-semibold text-cream-50">
              {courseLabel(currentCourse)}
            </h2>
            <p className="mt-1 text-sm text-cream-100/80">
              Lecturer: {lecturerName}
            </p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Info label="Class ID" value={classItem.data.id} />
            <Info label="Semester ID" value={classItem.data.semester_id} />
            <Info label="Course ID" value={classItem.data.course_id} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge value={classItem.data.status} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-navy-900">
            Batches assigned to this class
          </h2>
          <div className="mt-4">
            {(batches.data?.batches.length ?? 0) === 0 ? (
              <EmptyState
                title="No batches assigned"
                description="Attach batches from semester detail to show them here."
              />
            ) : (
              <div className="space-y-3">
                {batches.data?.batches.map((batch) => (
                  <Link
                    className="block rounded-xl border border-ink-100 bg-cream-50 px-4 py-3 transition hover:border-navy-200 hover:bg-cream-100"
                    href={`/batches/${batch.id}`}
                    key={batch.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy-900">
                          {batch.name}
                        </p>
                        <p className="mt-1 text-sm text-ink-500">
                          {batch.type}
                        </p>
                      </div>
                      <StatusBadge value={batch.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-navy-900">Enrollments</h2>
          <div className="mt-4">
            {(enrollments.data?.enrollments.length ?? 0) === 0 ? (
              <EmptyState
                title="No enrollments"
                description="Enrollments appear after batches or students are attached to this class."
              />
            ) : (
              <div className="space-y-3">
                {enrollments.data?.enrollments.map((enrollment) => {
                  const student = userById.get(enrollment.student_id);
                  return (
                    <div
                      className="rounded-xl border border-ink-100 bg-cream-50 px-4 py-3"
                      key={enrollment.id}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-navy-900">
                            {student?.full_name ??
                              `Student ${enrollment.student_id}`}
                          </p>
                          <p className="mt-1 text-sm text-ink-500">
                            {student?.email ?? "Student record not loaded"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <StatusBadge value={enrollment.status} />
                          <span className="text-xs text-ink-500">
                            Enrolled {formatDate(enrollment.enrolled_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <AssignLecturerModal
        classId={id}
        currentLecturerId={classItem.data?.lecturer_id ?? null}
        open={lecturerOpen}
        onClose={() => setLecturerOpen(false)}
        onDone={async () => {
          setAssignError("");
          setLecturerOpen(false);
          await reloadAll();
        }}
        onError={(message) => setAssignError(message)}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-navy-900">
        {value}
      </p>
    </div>
  );
}

function AssignLecturerModal({
  classId,
  currentLecturerId,
  open,
  onClose,
  onDone,
  onError,
}: {
  classId: string;
  currentLecturerId: string | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(currentLecturerId ?? "");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const lecturers = useAsync(
    () =>
      api.users.list(
        new URLSearchParams([
          ["limit", "500"],
          ["offset", "0"],
          ["role_filter", "lecturer"],
          ["status_filter", "active"],
        ]),
      ),
    [open ? "open" : "closed"],
  );

  const visibleLecturers = useMemo(() => {
    const value = query.trim().toLowerCase();
    return (lecturers.data?.users ?? []).filter((lecturer) => {
      if (!value) return true;
      return [lecturer.full_name, lecturer.email].some((item) =>
        item.toLowerCase().includes(value),
      );
    });
  }, [lecturers.data?.users, query]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setLocalError("");

    try {
      if (!selectedId) throw new Error("Select a lecturer first.");
      await api.classes.assignLecturer(classId, selectedId);
      await onDone();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Assign lecturer failed";
      setLocalError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign lecturer"
      description="Select an active lecturer from the system instead of typing a raw user ID."
      eyebrow="Director - Lecturer Assignment"
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Search lecturer">
          <input
            className={inputClass}
            placeholder="Search by name or email..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>

        {lecturers.loading && <LoadingState label="Loading lecturers" />}
        {lecturers.error && <ErrorState message={lecturers.error} />}

        {!lecturers.loading && !lecturers.error && (
          <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3">
            {visibleLecturers.length === 0 ? (
              <EmptyState
                title="No lecturers found"
                description="No active lecturer matches the current search."
              />
            ) : (
              visibleLecturers.map((lecturer) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                    selectedId === lecturer.id
                      ? "border-navy-300 bg-navy-50"
                      : "border-ink-100 bg-cream-50 hover:border-ink-200"
                  }`}
                  key={lecturer.id}
                >
                  <input
                    checked={selectedId === lecturer.id}
                    className="mt-1"
                    name="lecturer_id"
                    onChange={() => setSelectedId(lecturer.id)}
                    type="radio"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">
                      {lecturer.full_name}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {lecturer.email}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        {localError && <ErrorState message={localError} />}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Assign lecturer</Button>
        </div>
      </form>
    </Modal>
  );
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}
