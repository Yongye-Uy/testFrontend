"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
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

function normalizeRoleValue(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

function normalizeStatusValue(value: string) {
  return value.trim().toLowerCase();
}

type ClassTab =
  | "overview"
  | "lessons"
  | "student-progress"
  | "lecturer-performance";

export function ClassDetailPage({ id }: { id: string }) {
  const [lecturerOpen, setLecturerOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ClassTab>("overview");
  const classItem = useAsync(() => api.classes.get(id), [id]);
  const courses = useAsync(() => api.courses.list(), []);
  const semester = useAsync(async () => {
    if (!classItem.data?.semester_id) return null;
    return api.semesters.get(classItem.data.semester_id);
  }, [classItem.data?.semester_id]);
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
  const hasAssignedLecturer = Boolean(classItem.data?.lecturer_id);
  const batchCount = batches.data?.batches.length ?? 0;
  const enrollmentCount = enrollments.data?.enrollments.length ?? 0;
  const heroDescription =
    currentCourse?.description?.trim() ||
    "Course details are active now. Lessons, student progress, and lecturer performance cards are scaffolded for the upcoming teaching workflow.";

  async function reloadAll() {
    await Promise.all([
      classItem.reload(),
      batches.reload(),
      enrollments.reload(),
      users.reload(),
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
        label={semester.data?.title ?? "Semester detail"}
      />
      <PageHeader
        title={courseLabel(currentCourse)}
        description={`${currentCourse?.code ?? "Class"} - ${semester.data?.title ?? "Current semester"} - ${lecturerName}`}
        breadcrumbs={[
          { label: "Home" },
          { label: "Semesters" },
          { label: semester.data?.title ?? "Class detail" },
          { label: currentCourse?.code ?? "Class" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setLecturerOpen(true)}
              leftIcon={<SchoolOutlinedIcon fontSize="small" />}
            >
              {hasAssignedLecturer ? "Reassign lecturer" : "Assign lecturer"}
            </Button>
            <Button
              onClick={() =>
                setInfoMessage(
                  "Edit offering UI is ready, but the current course-service contract still does not expose class update yet.",
                )
              }
              leftIcon={<EditOutlinedIcon fontSize="small" />}
            >
              Edit offering
            </Button>
          </>
        }
      />

      {(classItem.loading ||
        courses.loading ||
        semester.loading ||
        batches.loading ||
        enrollments.loading ||
        users.loading) && <LoadingState label="Loading class offering" />}
      {(classItem.error ||
        courses.error ||
        semester.error ||
        batches.error ||
        enrollments.error ||
        users.error ||
        assignError) && (
        <ErrorState
          message={
            classItem.error ||
            courses.error ||
            semester.error ||
            batches.error ||
            enrollments.error ||
            users.error ||
            assignError
          }
        />
      )}
      {infoMessage && (
        <div className="mb-5 rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-800 ring-1 ring-navy-100">
          {infoMessage}
        </div>
      )}

      {classItem.data && (
        <>
          <Card className="mb-5 overflow-hidden p-0">
            <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-6 text-cream-100">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {currentCourse?.code && (
                      <span className="rounded-md bg-gold-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gold-300 ring-1 ring-gold-400/30">
                        {currentCourse.code}
                      </span>
                    )}
                    <StatusBadge value={classItem.data.status} />
                  </div>
                  <h2 className="mt-3 font-serif-display text-[1.35rem] font-semibold leading-8 text-cream-50">
                    {currentCourse?.title ?? `Class ${classItem.data.id}`}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-100/85">
                    {heroDescription}
                  </p>
                </div>
                <div className="rounded-3xl border border-cream-50/20 bg-cream-50/10 px-6 py-5 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-300">
                    Enrollment records
                  </p>
                  <p className="mt-2 text-[1.4rem] font-semibold leading-8 text-cream-50">
                    {enrollmentCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <HeroMetric
                icon={<Groups2OutlinedIcon fontSize="small" />}
                label="Students"
                value={String(enrollmentCount)}
                helper={
                  batchCount > 0
                    ? `${batchCount} attached batch${batchCount === 1 ? "" : "es"}`
                    : "Waiting for batch or direct student assignment"
                }
              />
              <HeroMetric
                icon={<MenuBookOutlinedIcon fontSize="small" />}
                label="Batches"
                value={String(batchCount)}
                helper={
                  batchCount > 0
                    ? "Visible from current backend reads"
                    : "Attach batches from semester detail"
                }
              />
              <HeroMetric
                icon={<SchoolOutlinedIcon fontSize="small" />}
                label="Lecturer"
                value={lecturerName}
                helper={
                  classItem.data.lecturer_id
                    ? "Primary instructor"
                    : "Not assigned yet"
                }
              />
            </div>
          </Card>

          <ClassTabs active={activeTab} onChange={setActiveTab} />

          {activeTab === "overview" && (
            <>
              <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
                    Cohort Health
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <SummaryTile
                      tone="success"
                      icon={<TaskAltOutlinedIcon fontSize="small" />}
                      label="Assigned lecturer"
                      value={classItem.data.lecturer_id ? "Ready" : "Pending"}
                      helper={
                        classItem.data.lecturer_id
                          ? "Lecturer assignment is complete."
                          : "Use Assign lecturer to choose one."
                      }
                    />
                    <SummaryTile
                      tone="danger"
                      icon={<InsightsOutlinedIcon fontSize="small" />}
                      label="At risk"
                      value={batchCount === 0 ? "1" : "0"}
                      helper={
                        batchCount === 0
                          ? "No batch is attached yet."
                          : "Batch attachment exists."
                      }
                    />
                    <SummaryTile
                      tone="warning"
                      icon={<AutoStoriesOutlinedIcon fontSize="small" />}
                      label="Lessons live"
                      value="Upcoming"
                      helper="Lesson publishing is a later lecturer workflow."
                    />
                  </div>
                </Card>

                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
                    Quick Facts
                  </p>
                  <div className="mt-4 space-y-4 text-sm">
                    <FactRow
                      label="Semester"
                      value={semester.data?.title ?? classItem.data.semester_id}
                    />
                    <FactRow
                      label="Course code"
                      value={currentCourse?.code ?? "n/a"}
                    />
                    <FactRow
                      label="Status"
                      valueNode={<StatusBadge value={classItem.data.status} />}
                    />
                    <FactRow label="Lecturer" value={lecturerName} />
                  </div>
                </Card>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <Groups2OutlinedIcon
                      fontSize="small"
                      className="text-ink-500"
                    />
                    <h2 className="font-semibold text-navy-900">
                      Assigned batches
                    </h2>
                  </div>
                  <div className="mt-4">
                    {batchCount === 0 ? (
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
                                  {batch.type === "generation"
                                    ? "Generation batch"
                                    : "General batch"}
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
                  <div className="flex items-center gap-2">
                    <PersonOutlineRoundedIcon
                      fontSize="small"
                      className="text-ink-500"
                    />
                    <h2 className="font-semibold text-navy-900">Enrollments</h2>
                  </div>
                  <div className="mt-4">
                    {enrollmentCount === 0 ? (
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
                                    {student?.email ??
                                      "Student record not loaded"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <StatusBadge value={enrollment.status} />
                                  <span className="text-xs text-ink-500">
                                    Enrolled{" "}
                                    {formatDate(enrollment.enrolled_at)}
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
            </>
          )}

          {activeTab !== "overview" && (
            <Card className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
                Upcoming soon
              </p>
              <h2 className="mt-2 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                {tabTitle(activeTab)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-600">
                This tab is in place to keep the Director workflow aligned with
                the UXUI. The live backend data for this section is not
                connected yet.
              </p>
            </Card>
          )}
        </>
      )}

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

function HeroMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold text-navy-900">{value}</p>
      <p className="mt-1 text-sm text-ink-500">{helper}</p>
    </div>
  );
}

function SummaryTile({
  tone,
  icon,
  label,
  value,
  helper,
}: {
  tone: "success" | "danger" | "warning";
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-gold-200 bg-gold-50 text-gold-800";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold">{value}</p>
      <p className="mt-1 text-sm opacity-85">{helper}</p>
    </div>
  );
}

function FactRow({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-semibold text-navy-900">
        {valueNode ?? value}
      </span>
    </div>
  );
}

function ClassTabs({
  active,
  onChange,
}: {
  active: ClassTab;
  onChange: (value: ClassTab) => void;
}) {
  const tabs: { id: ClassTab; label: string; icon: ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <MenuBookOutlinedIcon fontSize="small" />,
    },
    {
      id: "lessons",
      label: "Lessons",
      icon: <AutoStoriesOutlinedIcon fontSize="small" />,
    },
    {
      id: "student-progress",
      label: "Student Progress",
      icon: <Groups2OutlinedIcon fontSize="small" />,
    },
    {
      id: "lecturer-performance",
      label: "Lecturer Performance",
      icon: <InsightsOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <Card className="mb-5 p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-navy-800 text-cream-50 shadow-soft"
                  : "text-ink-600 hover:bg-cream-100 hover:text-navy-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function tabTitle(tab: ClassTab) {
  switch (tab) {
    case "lessons":
      return "Lessons";
    case "student-progress":
      return "Student Progress";
    case "lecturer-performance":
      return "Lecturer Performance";
    default:
      return "Overview";
  }
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
  const lecturers = useAsync(async () => {
    const direct = await api.users.listByRole("lecturer", "active");
    if (direct.users.length > 0) return direct;

    const fallback = await api.users.list(
      new URLSearchParams([
        ["limit", "500"],
        ["offset", "0"],
      ]),
    );

    return {
      ...fallback,
      users: fallback.users.filter((user) => {
        const roles = new Set(
          [user.role, ...user.roles]
            .map((role) => normalizeRoleValue(String(role)))
            .filter(Boolean),
        );
        return (
          roles.has("lecturer") &&
          normalizeStatusValue(String(user.status)) === "active"
        );
      }),
    };
  }, [open ? "open" : "closed"]);

  useEffect(() => {
    if (!open) return;
    setSelectedId(currentLecturerId ?? "");
    setQuery("");
    setLocalError("");
  }, [currentLecturerId, open]);

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
                description="We could not find any active lecturer accounts from the current user-service response for this search."
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
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">
                      {lecturer.full_name}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {lecturer.email}
                    </p>
                  </div>
                  <StatusBadge value={lecturer.status} />
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
          <Button
            loading={loading}
            leftIcon={<SchoolOutlinedIcon fontSize="small" />}
          >
            Assign lecturer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}
