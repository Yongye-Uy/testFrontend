"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
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
import { api, ApiError } from "@/lib/api-client";
import { courseLabel, programName } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";
import { SemesterModal } from "./semesters-page";
import type { Batch, ClassOffering } from "@/types/course";

type DetailTab = "offerings" | "retake-required" | "retake-batches";
type BatchTypeFilter = "all" | "generation" | "general";

export function SemesterDetailPage({ id }: { id: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [assignBatchOpen, setAssignBatchOpen] = useState(false);
  const [batchClassTarget, setBatchClassTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("offerings");
  const [actionError, setActionError] = useState("");
  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >({});
  const [coursesBlocked, setCoursesBlocked] = useState(false);
  const [programsBlocked, setProgramsBlocked] = useState(false);
  const [batchesBlocked, setBatchesBlocked] = useState(false);
  const semester = useAsync(() => api.semesters.get(id), [id]);
  const classes = useAsync(() => api.semesters.classes(id), [id]);
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
  const programs = useAsync(
    () =>
      api.programs.list().catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setProgramsBlocked(true);
          return { programs: [] };
        }
        throw err;
      }),
    [],
  );
  const semesterBatches = useAsync(() => api.semesters.batches(id), [id]);
  const allBatches = useAsync(
    () =>
      api.batches
        .list(
          new URLSearchParams([
            ["limit", "500"],
            ["offset", "0"],
          ]),
        )
        .catch((err) => {
          if (err instanceof ApiError && err.status === 403) {
            setBatchesBlocked(true);
            return { batches: [], total: 0 };
          }
          throw err;
        }),
    [],
  );
  const archived = semester.data?.status === "archived";
  const editable = semester.data?.status === "draft";
  const classCount = classes.data?.classes.length ?? 0;
  const batchCount = semesterBatches.data?.batches.length ?? 0;

  const grouped = useMemo(() => {
    return (classes.data?.classes ?? []).reduce<
      Record<string, ClassOffering[]>
    >((acc, item) => {
      const course = courses.data?.courses.find(
        (row) => row.id === item.course_id,
      );
      const key = programName(
        programs.data?.programs ?? [],
        course?.program_id,
      );
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [classes.data?.classes, courses.data?.courses, programs.data?.programs]);

  useEffect(() => {
    const keys = Object.keys(grouped);
    if (keys.length === 0) return;
    setExpandedPrograms((current) => {
      const next = { ...current };
      keys.forEach((key, index) => {
        if (next[key] === undefined) next[key] = index === 0;
      });
      return next;
    });
  }, [grouped]);

  async function setStatus(status: "draft" | "active" | "archived") {
    setActionError("");
    try {
      await api.semesters.changeStatus(id, status);
      await semester.reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Status change failed",
      );
    }
  }

  async function reloadAll() {
    await Promise.all([
      classes.reload(),
      semester.reload(),
      semesterBatches.reload(),
      allBatches.reload(),
    ]);
  }

  return (
    <>
      <BackLink href="/semesters" label="Semesters" />
      <PageHeader
        title={semester.data?.title ?? "Semester detail"}
        description="Use this semester to manage class offerings and attached batches. Retake tabs are shown for UX parity and will connect later."
        breadcrumbs={[
          { label: "Home" },
          { label: "Semesters" },
          { label: semester.data?.title ?? "Semester detail" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!editable}
            leftIcon={<EditOutlinedIcon fontSize="small" />}
          >
            Edit
          </Button>
        }
      />

      {(semester.loading || classes.loading) && (
        <LoadingState label="Loading semester" />
      )}
      {(semester.error || classes.error || actionError) && (
        <ErrorState message={semester.error || classes.error || actionError} />
      )}
      {(coursesBlocked || programsBlocked || batchesBlocked) && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <span className="font-semibold">Some reference data limited —</span>{" "}
          grant{" "}
          <code className="font-mono">
            {[
              coursesBlocked && "course.read",
              programsBlocked && "program.read",
              batchesBlocked && "batch.read",
            ]
              .filter(Boolean)
              .join(", ")}
          </code>{" "}
          to see full class groupings and batch assignments.
        </div>
      )}

      {semester.data && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                    Academic term
                  </span>
                  <StatusBadge value={semester.data.status} />
                </div>
                <h2 className="mt-1 font-serif-display text-[1.35rem] font-semibold leading-8 text-cream-50">
                  {semester.data.title}
                </h2>
                <p className="mt-1 text-sm text-cream-100/80">
                  {semester.data.academic_year
                    ? `Academic year ${semester.data.academic_year}`
                    : "Manual publish/archive workflow"}
                </p>
              </div>
              {semester.data.status === "draft" && (
                <Button variant="gold" onClick={() => setStatus("active")}>
                  Publish semester
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <InfoMetric
              label="Academic year"
              value={semester.data.academic_year || "-"}
              icon={<CalendarMonthOutlinedIcon fontSize="small" />}
            />
            <InfoMetric
              label="Workflow"
              value="Manual archive"
              icon={<EditOutlinedIcon fontSize="small" />}
            />
            <InfoMetric
              label="Offerings"
              value={String(classCount)}
              icon={<MenuBookOutlinedIcon fontSize="small" />}
            />
            <InfoMetric
              label="Batches"
              value={String(batchCount)}
              icon={<LinkRoundedIcon fontSize="small" />}
            />
          </div>
          {archived && (
            <div className="border-t border-gold-200 bg-gold-50 px-5 py-3 text-sm text-ink-700">
              <strong className="text-navy-900">Archived semester:</strong>{" "}
              view-only historical record.
            </div>
          )}
        </Card>
      )}

      <SemesterDetailTabs
        active={activeTab}
        classCount={classCount}
        onChange={setActiveTab}
      />

      {activeTab === "offerings" && (
        <>
          {classes.data?.classes.length === 0 && (
            <EmptyState
              title="No class offerings"
              description="Add one or more courses from the catalog into this semester. Lecturer assignment can happen later."
            />
          )}

          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                  Class offerings
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  Classes assigned to this semester.
                </p>
              </div>
              <Button
                onClick={() => setClassOpen(true)}
                disabled={archived}
                leftIcon={<AddRoundedIcon fontSize="small" />}
                className="self-start md:self-auto"
              >
                Add Class
              </Button>
            </div>

            {Object.entries(grouped).map(([program, rows]) => {
              const expanded = expandedPrograms[program] ?? false;
              return (
                <Card className="overflow-hidden p-0" key={program}>
                  <button
                    className="flex w-full items-center justify-between gap-3 bg-navy-50 px-4 py-4 text-left"
                    onClick={() =>
                      setExpandedPrograms((current) => ({
                        ...current,
                        [program]: !expanded,
                      }))
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-navy-700">
                        {expanded ? (
                          <KeyboardArrowDownRoundedIcon fontSize="small" />
                        ) : (
                          <KeyboardArrowRightRoundedIcon fontSize="small" />
                        )}
                      </span>
                      <h2 className="font-serif-display text-[0.95rem] font-semibold text-navy-900">
                        {program}
                      </h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                        {rows.length} class{rows.length === 1 ? "" : "es"}
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                          <tr>
                            <th className="px-4 py-3">Course</th>
                            <th className="px-4 py-3">Lecturer</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                          {rows.map((item) => {
                            const course = courses.data?.courses.find(
                              (row) => row.id === item.course_id,
                            );
                            return (
                              <tr key={item.id}>
                                <td className="px-4 py-3 font-semibold text-navy-900">
                                  {courseLabel(course)}
                                </td>
                                <td className="px-4 py-3 text-ink-600">
                                  {item.lecturer_id || "Unassigned"}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusBadge value={item.status} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Link
                                    href={`/classes/${item.id}`}
                                    className="inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-[13px] font-medium text-navy-700 transition hover:bg-cream-100"
                                  >
                                    Open class
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
              );
            })}
          </div>

          <Card className="mt-5 overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-cream-100 px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                  Assigned Batches
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  Attach existing batches to this semester, then add semester
                  classes into each batch.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setAssignBatchOpen(true)}
                disabled={archived}
                leftIcon={<LinkRoundedIcon fontSize="small" />}
              >
                Assign Batch
              </Button>
            </div>

            <div className="p-5">
              {(semesterBatches.data?.batches.length ?? 0) === 0 ? (
                <EmptyState
                  title="No assigned batches"
                  description="Assign one or more existing batches to this semester to start the batch-class workflow."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-4 py-3">Batch name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Program</th>
                        <th className="px-4 py-3">Students</th>
                        <th className="px-4 py-3">Assigned classes</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {semesterBatches.data?.batches.map((batch) => (
                        <tr key={batch.id}>
                          <td className="px-4 py-3 font-semibold text-navy-900">
                            {batch.name}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              value={batch.type}
                              label={
                                batch.type === "generation"
                                  ? "Generation"
                                  : "General"
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-ink-600">
                            {batch.program_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-ink-600">
                            {batch.student_count}
                          </td>
                          <td className="px-4 py-3 text-ink-600">
                            {batch.class_count}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge value={batch.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="md"
                                onClick={() =>
                                  setBatchClassTarget({
                                    id: batch.id,
                                    name: batch.name,
                                  })
                                }
                                disabled={archived}
                              >
                                Add class
                              </Button>
                              <Link
                                href={`/batches/${batch.id}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-navy-800 ring-1 ring-ink-300 transition hover:bg-cream-100 hover:ring-ink-400"
                              >
                                Open batch
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {activeTab === "retake-required" && (
        <ComingSoonPanel
          title="Retake Required"
          description="This tab is intentionally in place for UXUI parity. It will connect once the retake-required API arrives from the other team."
        />
      )}

      {activeTab === "retake-batches" && (
        <ComingSoonPanel
          title="Retake Batches"
          description="This tab is intentionally in place for UXUI parity. Retake batch records and actions will connect after the external retake API is ready."
        />
      )}

      {semester.data && (
        <SemesterModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onDone={semester.reload}
          initial={semester.data}
        />
      )}
      <AddClassModal
        open={classOpen}
        onClose={() => setClassOpen(false)}
        onDone={reloadAll}
        semesterId={id}
        courses={courses.data?.courses ?? []}
        programs={programs.data?.programs ?? []}
        existingCourseIds={
          new Set((classes.data?.classes ?? []).map((row) => row.course_id))
        }
      />
      <AssignBatchModal
        open={assignBatchOpen}
        onClose={() => setAssignBatchOpen(false)}
        onDone={reloadAll}
        semesterId={id}
        assignedBatchIds={
          new Set(
            (semesterBatches.data?.batches ?? []).map((batch) => batch.id),
          )
        }
        batches={allBatches.data?.batches ?? []}
      />
      <AssignClassToBatchModal
        batch={batchClassTarget}
        classes={classes.data?.classes ?? []}
        courses={courses.data?.courses ?? []}
        programs={programs.data?.programs ?? []}
        onClose={() => setBatchClassTarget(null)}
        onDone={reloadAll}
      />
    </>
  );
}

function SemesterDetailTabs({
  active,
  classCount,
  onChange,
}: {
  active: DetailTab;
  classCount: number;
  onChange: (value: DetailTab) => void;
}) {
  const tabs: { id: DetailTab; label: string; count: number }[] = [
    { id: "offerings", label: "Class Offerings", count: classCount },
    { id: "retake-required", label: "Retake Required", count: 0 },
    { id: "retake-batches", label: "Retake Batches", count: 0 },
  ];

  return (
    <div className="mb-5 -mt-2 flex items-center gap-1 border-b border-ink-200">
      {tabs.map((item) => {
        const selected = item.id === active;
        return (
          <button
            className={`relative px-4 py-2.5 text-sm font-semibold transition ${selected ? "text-navy-900" : "text-ink-500 hover:text-navy-800"}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-navy-100 text-navy-800" : "bg-cream-200 text-ink-600"}`}
              >
                {item.count}
              </span>
            </span>
            {selected && (
              <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="p-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700">
        Upcoming soon
      </p>
      <h2 className="mt-1 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
        {description}
      </p>
    </Card>
  );
}

function InfoMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function AddClassModal({
  open,
  onClose,
  onDone,
  semesterId,
  courses,
  programs,
  existingCourseIds,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  semesterId: string;
  courses: { id: string; code: string; title: string; program_id: string }[];
  programs: { id: string; name: string }[];
  existingCourseIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setProgramFilter("");
    setSelectedIds([]);
    setError("");
  }, [open]);

  const groupedCourses = useMemo(() => {
    const value = query.trim().toLowerCase();
    const filtered = courses
      .filter((course) => !programFilter || course.program_id === programFilter)
      .filter((course) => {
        if (!value) return true;
        const program = programName(programs, course.program_id).toLowerCase();
        return [course.code, course.title, program].some((item) =>
          item.toLowerCase().includes(value),
        );
      });

    return filtered.reduce<Record<string, typeof filtered>>((acc, course) => {
      const key = programName(programs, course.program_id);
      acc[key] = [...(acc[key] ?? []), course];
      return acc;
    }, {});
  }, [courses, programFilter, programs, query]);

  useEffect(() => {
    const keys = Object.keys(groupedCourses);
    if (keys.length === 0) return;
    setExpandedPrograms((current) => {
      const next = { ...current };
      keys.forEach((key, index) => {
        if (next[key] === undefined) next[key] = index === 0;
      });
      return next;
    });
  }, [groupedCourses]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const pending = selectedIds.filter(
        (courseId) => !existingCourseIds.has(courseId),
      );
      if (pending.length === 0)
        throw new Error("Select at least one new class.");
      for (const courseId of pending) {
        await api.semesters.addClass(semesterId, courseId);
      }
      setSelectedIds([]);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add classes failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add classes"
      description="Select one or more courses from the Course Catalog to add to this semester as active class offerings."
      eyebrow="Add to Semester"
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field label="Search">
            <input
              className={inputClass}
              placeholder="Search by course code, course title, or department..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="Department">
            <select
              className={inputClass}
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
            >
              <option value="">All departments</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-white p-2">
          {Object.keys(groupedCourses).length === 0 ? (
            <EmptyState
              title="No courses found"
              description="Adjust the search or department filter to show more courses."
            />
          ) : (
            Object.entries(groupedCourses).map(([program, rows]) => {
              const expanded = expandedPrograms[program] ?? false;
              return (
                <div
                  className="overflow-hidden rounded-xl border border-ink-100"
                  key={program}
                >
                  <button
                    className="flex w-full items-center justify-between bg-navy-50 px-4 py-3 text-left"
                    onClick={() =>
                      setExpandedPrograms((current) => ({
                        ...current,
                        [program]: !expanded,
                      }))
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-navy-700">
                        {expanded ? "v" : ">"}
                      </span>
                      <span className="font-semibold text-navy-900">
                        {program}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                        {rows.length} course{rows.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="divide-y divide-ink-100">
                      {rows.map((course) => {
                        const alreadyAdded = existingCourseIds.has(course.id);
                        const selected = selectedIds.includes(course.id);
                        return (
                          <label
                            className="flex items-center gap-3 px-4 py-3"
                            key={course.id}
                          >
                            <input
                              checked={alreadyAdded || selected}
                              disabled={alreadyAdded}
                              onChange={(event) => {
                                setSelectedIds((current) =>
                                  event.target.checked
                                    ? [...current, course.id]
                                    : current.filter((id) => id !== course.id),
                                );
                              }}
                              type="checkbox"
                            />
                            <span className="rounded-md bg-navy-50 px-2 py-1 text-xs font-bold text-navy-800">
                              {course.code}
                            </span>
                            <span className="flex-1 font-medium text-navy-900">
                              {course.title}
                            </span>
                            {alreadyAdded && (
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                Already added
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="text-xs text-ink-500">
          Classes will be added as Active class offerings.
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-500">
            {selectedIds.filter((id) => !existingCourseIds.has(id)).length}{" "}
            classes selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>Add selected classes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AssignBatchModal({
  open,
  onClose,
  onDone,
  semesterId,
  assignedBatchIds,
  batches,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  semesterId: string;
  assignedBatchIds: Set<string>;
  batches: Batch[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<BatchTypeFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTypeFilter("all");
    setSelectedIds([]);
    setError("");
  }, [open]);

  const available = useMemo(() => {
    const value = query.trim().toLowerCase();
    return batches
      .filter((batch) => batch.status !== "archived")
      .filter((batch) => !assignedBatchIds.has(batch.id))
      .filter((batch) => typeFilter === "all" || batch.type === typeFilter)
      .filter((batch) => {
        if (!value) return true;
        return [batch.name, batch.program_name ?? "", batch.type].some((item) =>
          item.toLowerCase().includes(value),
        );
      });
  }, [assignedBatchIds, batches, query, typeFilter]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (selectedIds.length === 0)
        throw new Error("Select at least one batch.");
      for (const batchId of selectedIds) {
        await api.semesters.addBatch(semesterId, batchId);
      }
      setSelectedIds([]);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign batch failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign batches"
      description="Select one or more student batches to attach to this semester. Already-assigned batches are hidden."
      eyebrow="Assign to Semester"
      size="lg"
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Search">
            <input
              className={inputClass}
              placeholder="Search by batch name, program, or purpose"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Type
            </p>
            <div className="flex rounded-xl border border-ink-200 bg-cream-50 p-1">
              {(["all", "generation", "general"] as BatchTypeFilter[]).map(
                (item) => (
                  <button
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${typeFilter === item ? "bg-white text-navy-900 shadow-soft" : "text-ink-600 hover:text-navy-800"}`}
                    key={item}
                    onClick={() => setTypeFilter(item)}
                    type="button"
                  >
                    {item === "all"
                      ? "All"
                      : item === "generation"
                        ? "Generation"
                        : "General"}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-500 ring-1 ring-ink-200">
          Generation batches are official cohorts. General batches are
          flexible/special groups.
        </div>

        <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3">
          {available.length === 0 ? (
            <EmptyState
              title="No available batches"
              description="Everything eligible is already attached, or nothing matches the current filters."
            />
          ) : (
            available.map((batch) => {
              const selected = selectedIds.includes(batch.id);
              return (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${selected ? "border-navy-300 bg-navy-50" : "border-ink-100 bg-white hover:border-ink-200"}`}
                  key={batch.id}
                >
                  <input
                    checked={selected}
                    className="mt-1"
                    onChange={(event) => {
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, batch.id]
                          : current.filter((id) => id !== batch.id),
                      );
                    }}
                    type="checkbox"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-navy-900">
                        {batch.name}
                      </p>
                      <StatusBadge
                        value={batch.type}
                        label={
                          batch.type === "generation" ? "Generation" : "General"
                        }
                      />
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {batch.program_name || "General batch"}
                      {batch.entry_year && batch.expected_graduation_year
                        ? ` - ${batch.entry_year} - ${batch.expected_graduation_year}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm text-ink-500">
                    {batch.created_at ? "" : ""}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-500">
            {selectedIds.length} batches selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>
              Assign Selected Batches ({selectedIds.length})
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function AssignClassToBatchModal({
  batch,
  classes,
  courses,
  programs,
  onClose,
  onDone,
}: {
  batch: { id: string; name: string } | null;
  classes: ClassOffering[];
  courses: {
    id: string;
    code: string;
    title: string;
    program_id: string;
  }[];
  programs: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const batchDetail = useAsync(async () => {
    if (!batch)
      return {
        class_ids: [] as string[],
      };
    return api.batches.getDetail(batch.id);
  }, [batch?.id]);

  useEffect(() => {
    if (!batch) return;
    setQuery("");
    setProgramFilter("");
    setSelectedIds([]);
    setExpandedPrograms({});
    setError("");
  }, [batch]);

  const existingClassIds = useMemo(
    () => new Set(batchDetail.data?.class_ids ?? []),
    [batchDetail.data?.class_ids],
  );

  const groupedClasses = useMemo(() => {
    const value = query.trim().toLowerCase();
    const filtered = classes
      .filter((item) => {
        const course = courses.find((row) => row.id === item.course_id);
        if (!course) return false;
        if (programFilter && course.program_id !== programFilter) return false;
        if (!value) return true;
        const program = programName(programs, course.program_id).toLowerCase();
        return [
          course.code,
          course.title,
          program,
          item.lecturer_id ?? "",
          item.status,
        ].some((label) => label.toLowerCase().includes(value));
      })
      .sort((left, right) => {
        const leftCourse = courses.find((row) => row.id === left.course_id);
        const rightCourse = courses.find((row) => row.id === right.course_id);
        return (leftCourse?.code ?? "").localeCompare(rightCourse?.code ?? "");
      });

    return filtered.reduce<Record<string, ClassOffering[]>>((acc, item) => {
      const course = courses.find((row) => row.id === item.course_id);
      const key = programName(programs, course?.program_id);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [classes, courses, programFilter, programs, query]);

  useEffect(() => {
    const keys = Object.keys(groupedClasses);
    if (keys.length === 0) return;
    setExpandedPrograms((current) => {
      const next = { ...current };
      keys.forEach((key, index) => {
        if (next[key] === undefined) next[key] = index === 0;
      });
      return next;
    });
  }, [groupedClasses]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!batch) return;
    setLoading(true);
    setError("");

    try {
      if (selectedIds.length === 0)
        throw new Error("Select at least one class.");
      await api.batches.assignClasses(batch.id, selectedIds);
      setSelectedIds([]);
      onClose();
      await onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Assign class to batch failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={Boolean(batch)}
      onClose={onClose}
      title={batch ? `Add classes to ${batch.name}` : "Add classes to batch"}
      description="Select class offerings from this semester to assign to the batch. Already-assigned classes stay visible and disabled."
      eyebrow="Director - Batch Class Assignment"
      size="lg"
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field label="Search class">
            <input
              className={inputClass}
              placeholder="Search by course code, class name, or department..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="Department">
            <select
              className={inputClass}
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
            >
              <option value="">All departments</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-white p-2">
          {batchDetail.loading ? (
            <LoadingState label="Checking existing class assignments" />
          ) : batchDetail.error ? (
            <ErrorState message={batchDetail.error} />
          ) : Object.keys(groupedClasses).length === 0 ? (
            <EmptyState
              title="No classes found"
              description="Adjust the search or department filter to show semester classes."
            />
          ) : (
            Object.entries(groupedClasses).map(([program, rows]) => {
              const expanded = expandedPrograms[program] ?? false;
              return (
                <div
                  className="overflow-hidden rounded-xl border border-ink-100"
                  key={program}
                >
                  <button
                    className="flex w-full items-center justify-between bg-navy-50 px-4 py-3 text-left"
                    onClick={() =>
                      setExpandedPrograms((current) => ({
                        ...current,
                        [program]: !expanded,
                      }))
                    }
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-navy-700">
                        {expanded ? "v" : ">"}
                      </span>
                      <span className="font-semibold text-navy-900">
                        {program}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                        {rows.length} class{rows.length === 1 ? "" : "es"}
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="divide-y divide-ink-100">
                      {rows.map((item) => {
                        const course = courses.find(
                          (row) => row.id === item.course_id,
                        );
                        const alreadyAdded = existingClassIds.has(item.id);
                        const selected = selectedIds.includes(item.id);
                        return (
                          <label
                            className={`flex items-start gap-3 px-4 py-3 ${alreadyAdded ? "bg-emerald-50/60" : "hover:bg-cream-50"}`}
                            key={item.id}
                          >
                            <input
                              checked={alreadyAdded || selected}
                              className="mt-1"
                              disabled={alreadyAdded}
                              onChange={(event) =>
                                setSelectedIds((current) =>
                                  event.target.checked
                                    ? [...current, item.id]
                                    : current.filter((id) => id !== item.id),
                                )
                              }
                              type="checkbox"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-navy-50 px-2 py-1 text-xs font-bold text-navy-800">
                                  {course?.code ?? "CLASS"}
                                </span>
                                <p className="font-semibold text-navy-900">
                                  {course?.title ?? `Class ${item.id}`}
                                </p>
                                {alreadyAdded && (
                                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                    Already added
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-ink-500">
                                Lecturer: {item.lecturer_id || "Unassigned"}
                              </p>
                            </div>
                            <StatusBadge value={item.status} />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-500 ring-1 ring-ink-200">
          Selected classes will be attached to this batch. Classes already shown
          as added remain visible so the Director can see existing coverage by
          program.
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink-500">
            {selectedIds.length} classes selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={loading}>Add selected classes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
