"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api, ApiError } from "@/lib/api-client";
import { courseLabel } from "@/features/courses/course-utils";
import { AssignLecturerModal } from "@/features/classes/assign-lecturer-modal";
import { Modal } from "@/components/ui/modal";
import { LecturerClassDetailPage } from "@/features/classes/lecturer-class-detail-page";
import { useAsync } from "@/features/shared/use-async";
import { useAuth } from "@/hooks/use-auth";
import { isLecturer } from "@/lib/auth";
import type { LessonItem } from "@/types/course";

type ClassTab =
  | "overview"
  | "lessons"
  | "student-progress"
  | "lecturer-performance";

export function ClassDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  if (isLecturer(user)) {
    return <LecturerClassDetailPage id={id} />;
  }
  return <DirectorClassDetailPage id={id} />;
}

function DirectorClassDetailPage({ id }: { id: string }) {
  const [lecturerOpen, setLecturerOpen] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ClassTab>("overview");
  const [expandedLessons, setExpandedLessons] = useState<
    Record<string, boolean>
  >({});
  const [previewItem, setPreviewItem] = useState<LessonItem | null>(null);
  const [coursesBlocked, setCoursesBlocked] = useState(false);
  const [semesterBlocked, setSemesterBlocked] = useState(false);
  const [batchesBlocked, setBatchesBlocked] = useState(false);
  const [usersBlocked, setUsersBlocked] = useState(false);
  const classItem = useAsync(() => api.classes.get(id), [id]);
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
  const semester = useAsync(async () => {
    if (!classItem.data?.semester_id) return null;
    return api.semesters.get(classItem.data.semester_id).catch((err) => {
      if (err instanceof ApiError && err.status === 403) {
        setSemesterBlocked(true);
        return null;
      }
      throw err;
    });
  }, [classItem.data?.semester_id]);
  const batches = useAsync(
    () =>
      api.classes.batches(id).catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setBatchesBlocked(true);
          return { batches: [] };
        }
        throw err;
      }),
    [id],
  );
  const enrollments = useAsync(() => api.classes.enrollments(id), [id]);
  const lessons = useAsync(async () => {
    const res = await api.lessons.listForClass(id);
    const detailed = await Promise.all(
      res.lessons.map((lesson) =>
        api.lessons.get(id, lesson.id).catch(() => ({ ...lesson, items: [] })),
      ),
    );
    return detailed.sort((a, b) => a.lesson_order - b.lesson_order);
  }, [id]);
  const users = useAsync(
    () =>
      api.users
        .list(
          new URLSearchParams([
            ["limit", "500"],
            ["offset", "0"],
          ]),
        )
        .catch((err) => {
          if (err instanceof ApiError && err.status === 403) {
            setUsersBlocked(true);
            return { users: [], total: 0 };
          }
          throw err;
        }),
    [],
  );

  const currentCourse = courses.data?.courses.find(
    (course) => course.id === classItem.data?.course_id,
  );
  const userById = useMemo(
    () => new Map((users.data?.users ?? []).map((user) => [user.id, user])),
    [users.data?.users],
  );
  useEffect(() => {
    const lessonList = lessons.data ?? [];
    if (lessonList.length === 0) return;
    setExpandedLessons((current) => {
      const next = { ...current };
      lessonList.forEach((lesson, index) => {
        if (next[lesson.id] === undefined) next[lesson.id] = index === 0;
      });
      return next;
    });
  }, [lessons.data]);

  const lessonStats = useMemo(() => {
    const items = (lessons.data ?? []).flatMap((lesson) => lesson.items);
    const total = items.length;
    const unlocked = items.filter((item) => item.is_unlocked).length;
    return {
      totalItems: total,
      unlockedItems: unlocked,
      deliveredPct: total ? Math.round((unlocked / total) * 100) : 0,
      publishedLessons: (lessons.data ?? []).filter(
        (lesson) =>
          lesson.items.length > 0 &&
          lesson.items.every((item) => item.is_unlocked),
      ).length,
      totalLessons: lessons.data?.length ?? 0,
    };
  }, [lessons.data]);

  const firstBatchName = batches.data?.batches[0]?.name ?? null;

  const lecturerName =
    (classItem.data?.lecturer_id
      ? userById.get(classItem.data.lecturer_id)?.full_name
      : null) ??
    classItem.data?.lecturer_id ??
    "Unassigned";
  const hasAssignedLecturer =
    Boolean(classItem.data?.lecturer_id) && classItem.data?.lecturer_id !== "0";
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

      {(classItem.loading || enrollments.loading) && <SkeletonCard />}
      {(classItem.error || enrollments.error || assignError) && (
        <ErrorState
          message={classItem.error || enrollments.error || assignError}
        />
      )}
      {(coursesBlocked ||
        semesterBlocked ||
        batchesBlocked ||
        usersBlocked) && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <span className="font-semibold">Some reference data limited —</span>{" "}
          grant{" "}
          <code className="font-mono">
            {[
              coursesBlocked && "course.read",
              semesterBlocked && "semester.read",
              batchesBlocked && "batch.read",
              usersBlocked && "user.list",
            ]
              .filter(Boolean)
              .join(", ")}
          </code>{" "}
          to enable full class detail, lecturer assignment, and batch info.
        </div>
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
                <ProgressRing
                  value={lessonStats.deliveredPct}
                  label="Class Avg"
                />
              </div>
            </div>
            <div className="grid divide-y divide-ink-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <HeroMetric
                icon={<Groups2OutlinedIcon fontSize="small" />}
                label="Students"
                value={String(enrollmentCount)}
                helper={firstBatchName ?? "Batch not assigned"}
              />
              <HeroMetric
                icon={<AutoStoriesOutlinedIcon fontSize="small" />}
                label="Lessons"
                value={
                  lessonStats.totalLessons > 0
                    ? `${lessonStats.publishedLessons} / ${lessonStats.totalLessons}`
                    : "—"
                }
                helper="published"
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

          <ClassTabs
            active={activeTab}
            onChange={setActiveTab}
            enrollmentCount={enrollmentCount}
          />

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
                      label="Completed"
                      value={String(batchCount)}
                      helper={
                        batchCount > 0
                          ? `${batchCount} batch${batchCount === 1 ? "" : "es"} attached`
                          : "No batches attached yet"
                      }
                    />
                    <SummaryTile
                      tone="danger"
                      icon={<InsightsOutlinedIcon fontSize="small" />}
                      label="At risk"
                      value={
                        batchCount === 0 || !classItem.data.lecturer_id
                          ? "1"
                          : "0"
                      }
                      helper={
                        batchCount === 0
                          ? "No batch attached."
                          : !classItem.data.lecturer_id
                            ? "Lecturer not assigned."
                            : "No issues detected."
                      }
                    />
                    <SummaryTile
                      tone="warning"
                      icon={<AutoStoriesOutlinedIcon fontSize="small" />}
                      label="Lessons live"
                      value={
                        lessonStats.totalItems > 0
                          ? `${lessonStats.unlockedItems}/${lessonStats.totalItems}`
                          : "0"
                      }
                      helper={
                        lessonStats.totalItems > 0
                          ? "items unlocked for students"
                          : "No lesson items yet"
                      }
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
                      label="Batch"
                      value={firstBatchName ?? "Not assigned"}
                    />
                    <FactRow
                      label="Status"
                      valueNode={<StatusBadge value={classItem.data.status} />}
                    />
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

          {activeTab === "lessons" && (
            <>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                    Lessons
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {(lessons.data ?? []).length} lesson
                    {(lessons.data ?? []).length === 1 ? "" : "s"} — read-only
                    director view. Lesson authoring is managed by the lecturer.
                  </p>
                </div>
              </div>
              {lessons.loading && <LoadingState label="Loading lessons" />}
              {lessons.error && <ErrorState message={lessons.error} />}
              {!lessons.loading && (lessons.data ?? []).length === 0 && (
                <EmptyState
                  title="No lessons yet"
                  description="The lecturer hasn't added any lessons to this class yet."
                />
              )}
              <div className="space-y-4">
                {(lessons.data ?? []).map((lesson, index) => {
                  const expanded = expandedLessons[lesson.id] ?? false;
                  const materialCount = lesson.items.filter(
                    (item) => item.item_type !== "assessment",
                  ).length;
                  const assessmentCount = lesson.items.filter(
                    (item) => item.item_type === "assessment",
                  ).length;
                  const unlockedCount = lesson.items.filter(
                    (item) => item.is_unlocked,
                  ).length;
                  return (
                    <Card key={lesson.id} className="overflow-hidden p-0">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-ink-100 bg-cream-100/60 px-5 py-3 text-left"
                        onClick={() =>
                          setExpandedLessons((current) => ({
                            ...current,
                            [lesson.id]: !expanded,
                          }))
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-ink-400">
                            {expanded ? (
                              <KeyboardArrowDownRoundedIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowRightRoundedIcon fontSize="small" />
                            )}
                          </span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
                              Week {index + 1}
                            </p>
                            <h3 className="font-serif-display text-[1.05rem] font-semibold leading-7 text-navy-900">
                              {lesson.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {materialCount} material
                              {materialCount === 1 ? "" : "s"} ·{" "}
                              {assessmentCount} assessment
                              {assessmentCount === 1 ? "" : "s"}
                              {lesson.items.length > 0
                                ? ` · ${unlockedCount}/${lesson.items.length} unlocked`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                          {lesson.items.length} item
                          {lesson.items.length === 1 ? "" : "s"}
                        </span>
                      </button>

                      {expanded && (
                        <div>
                          {lesson.items.length === 0 ? (
                            <p className="px-5 py-4 text-sm text-ink-500">
                              No materials or assessments in this lesson yet.
                            </p>
                          ) : (
                            <div className="divide-y divide-ink-100">
                              {lesson.items.map((item) => {
                                const isAssessment =
                                  item.item_type === "assessment";
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-3 bg-white px-5 py-3"
                                  >
                                    <span
                                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                        isAssessment
                                          ? "bg-gold-50 text-gold-700"
                                          : "bg-navy-50 text-navy-700"
                                      }`}
                                    >
                                      <DirectorItemIcon item={item} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            isAssessment
                                              ? "bg-gold-100 text-gold-800"
                                              : "bg-navy-50 text-navy-600 ring-1 ring-navy-100"
                                          }`}
                                        >
                                          {isAssessment
                                            ? "Assessment"
                                            : directorItemBadge(item)}
                                        </span>
                                        {isAssessment && (
                                          <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                              item.is_unlocked
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "bg-ink-100 text-ink-600 ring-1 ring-ink-200"
                                            }`}
                                          >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                                            {item.is_unlocked
                                              ? "Available"
                                              : "Locked"}
                                          </span>
                                        )}
                                        <span className="truncate font-semibold text-navy-900">
                                          {item.title}
                                        </span>
                                      </div>
                                      {isAssessment && (
                                        <p className="mt-0.5 text-xs text-ink-500">
                                          {[
                                            item.question_count != null
                                              ? `${item.question_count} question${item.question_count === 1 ? "" : "s"}`
                                              : null,
                                            item.time_limit_seconds
                                              ? `${Math.round(item.time_limit_seconds / 60)} min`
                                              : null,
                                            item.pass_threshold_percent != null
                                              ? `pass ${Math.round(item.pass_threshold_percent)}%`
                                              : null,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <StatusBadge
                                        value={
                                          isAssessment
                                            ? (item.status ?? "draft")
                                            : "material"
                                        }
                                      />
                                      <button
                                        type="button"
                                        aria-label="View as student"
                                        title="View as student"
                                        onClick={() => setPreviewItem(item)}
                                        className="rounded-lg p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-navy-700"
                                      >
                                        <VisibilityOutlinedIcon
                                          sx={{ fontSize: 18 }}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "student-progress" && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                  Student Enrollments
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  {enrollmentCount} student
                  {enrollmentCount === 1 ? "" : "s"} enrolled in this class.
                </p>
              </div>
              {enrollments.loading && (
                <LoadingState label="Loading enrollments" />
              )}
              {enrollmentCount === 0 && !enrollments.loading ? (
                <div className="px-5 py-10">
                  <EmptyState
                    title="No enrollments"
                    description="Enrollments appear after batches or students are attached to this class."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Enrolled</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {enrollments.data?.enrollments.map((enrollment) => {
                        const student = userById.get(enrollment.student_id);
                        return (
                          <tr key={enrollment.id}>
                            <td className="px-5 py-3">
                              <p className="font-semibold text-navy-900">
                                {student?.full_name ??
                                  `Student ${enrollment.student_id}`}
                              </p>
                              <p className="mt-0.5 text-ink-500">
                                {student?.email ?? "—"}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-ink-500">
                              {formatDate(enrollment.enrolled_at)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <StatusBadge value={enrollment.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {activeTab === "lecturer-performance" && (
            <Card className="p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
                Upcoming soon
              </p>
              <h2 className="mt-2 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                Lecturer Performance
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-600">
                This tab is in place to keep the Director workflow aligned with
                the UXUI. Assessment submission and completion data will connect
                here once the grading-service is ready.
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

      <DirectorPreviewModal
        code={currentCourse?.code ?? ""}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
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
    <div className="px-5 py-4">
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
  enrollmentCount,
}: {
  active: ClassTab;
  onChange: (value: ClassTab) => void;
  enrollmentCount: number;
}) {
  const tabs: {
    id: ClassTab;
    label: string;
    icon: ReactNode;
    count?: number;
  }[] = [
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
      count: enrollmentCount,
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
              {tab.count != null && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    selected
                      ? "bg-cream-50/20 text-cream-100"
                      : "bg-navy-100 text-navy-800"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-cream-50/20"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-gold-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.05rem] font-bold leading-none text-cream-50">
          {clamped}%
        </span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-gold-300">
          {label}
        </span>
      </div>
    </div>
  );
}

function DirectorItemIcon({ item }: { item: LessonItem }) {
  if (item.item_type === "assessment")
    return <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />;
  const type = (item.material_type ?? "").toLowerCase();
  if (type === "pdf") return <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />;
  if (type === "link") return <LinkRoundedIcon sx={{ fontSize: 18 }} />;
  return <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />;
}

function directorItemBadge(item: LessonItem) {
  const type = (item.material_type ?? "").toLowerCase();
  if (type === "pdf") return "PDF";
  if (type === "document") return "DOC";
  if (type === "text") return "TXT";
  if (type === "link") return "LINK";
  return "MATERIAL";
}

function directorAssessmentMeta(item: LessonItem) {
  return [
    item.question_count != null
      ? `${item.question_count} question${item.question_count === 1 ? "" : "s"}`
      : null,
    item.time_limit_seconds
      ? `${Math.round(item.time_limit_seconds / 60)} min`
      : null,
    item.pass_threshold_percent != null
      ? `pass ${Math.round(item.pass_threshold_percent)}%`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function DirectorPreviewModal({
  code,
  item,
  onClose,
}: {
  code: string;
  item: LessonItem | null;
  onClose: () => void;
}) {
  const isAssessment = item?.item_type === "assessment";
  const badge = item
    ? isAssessment
      ? "Assessment"
      : directorItemBadge(item)
    : "";

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.title ?? "Preview"}
      description="This is exactly how students will see this item."
      eyebrow="Director · View as student"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close preview
        </Button>
      }
    >
      {item && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gold-50 px-4 py-3 text-sm font-semibold text-gold-800 ring-1 ring-gold-200">
            <span>Preview mode — interactions are read-only.</span>
            <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] uppercase tracking-wider">
              {badge}
            </span>
          </div>

          <div className="rounded-xl bg-navy-900 px-5 py-4 text-cream-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cream-50/10 text-gold-300">
                <DirectorItemIcon item={item} />
              </span>
              <div>
                <p className="font-semibold text-cream-50">{item.title}</p>
                <p className="text-xs text-cream-100/70">
                  {badge}
                  {isAssessment ? ` · ${directorAssessmentMeta(item)}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-cream-50/60 px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
              {code} · {isAssessment ? "Assessment" : "Material"}
            </p>
            <h3 className="mt-1 font-serif-display text-[1.3rem] font-semibold text-navy-900">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {item.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-500">
                No description was provided for this{" "}
                {isAssessment ? "assessment" : "material"}.
              </p>
            )}

            {isAssessment && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <DirectorPreviewFact
                  label="Questions"
                  value={String(item.question_count ?? 0)}
                />
                <DirectorPreviewFact
                  label="Time limit"
                  value={
                    item.time_limit_seconds
                      ? `${Math.round(item.time_limit_seconds / 60)} min`
                      : "None"
                  }
                />
                <DirectorPreviewFact
                  label="Pass mark"
                  value={
                    item.pass_threshold_percent != null
                      ? `${Math.round(item.pass_threshold_percent)}%`
                      : "—"
                  }
                />
              </div>
            )}

            {!isAssessment && item.link_url && (
              <a
                href={item.link_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-cream-50 transition hover:bg-navy-900"
              >
                <OpenInNewRoundedIcon sx={{ fontSize: 16 }} /> Open resource
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function DirectorPreviewFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}
