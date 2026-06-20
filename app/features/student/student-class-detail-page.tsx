"use client";

import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useAsync } from "@/app/features/shared/use-async";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import type { ClassLesson, LessonItem } from "@/app/types/course";
import { ProgressRing } from "./progress-ring";

function materialTypeLabel(type: string | null): string {
  if (!type) return "Material";
  if (type === "pdf") return "Pdf";
  if (type === "video") return "Video";
  return "Doc";
}

function itemIcon(item: LessonItem) {
  if (item.item_type === "assessment") {
    return <AssignmentOutlinedIcon style={{ fontSize: 15 }} className="text-gold-500" />;
  }
  const t = item.material_type ?? "";
  if (t === "pdf") return <PictureAsPdfOutlinedIcon style={{ fontSize: 15 }} className="text-rose-500" />;
  if (t === "video") return <PlayCircleOutlineRoundedIcon style={{ fontSize: 15 }} className="text-blue-500" />;
  return <ArticleOutlinedIcon style={{ fontSize: 15 }} className="text-ink-500" />;
}

function StatusCircle({ item }: { item: LessonItem }) {
  const ps = item.progress_status;
  const isDraft = item.item_type === "assessment" && item.status === "draft";
  if (!item.is_unlocked || isDraft) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100">
        <LockOutlinedIcon style={{ fontSize: 14 }} className="text-ink-400" />
      </span>
    );
  }
  if (ps === "completed") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700">
          {/* transparent checkmark via SVG stroke */}
          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
            <path
              d="M1 4L4 7L10 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    );
  }
  if (ps === "in_progress") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-blue-400 bg-white">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink-200 bg-white" />
  );
}

function itemAction(
  classId: string,
  item: LessonItem,
): { label: string; href?: string; disabled?: boolean } {
  if (!item.is_unlocked) return { label: "Locked", disabled: true };

  if (item.item_type === "assessment") {
    if (item.status === "draft") return { label: "Locked", disabled: true };
    const ps = item.progress_status;
    if (ps === "completed") {
      return { label: "Review result", href: routes.quiz(classId, item.id) };
    }
    if (ps === "in_progress") return { label: "Continue quiz", href: routes.quiz(classId, item.id) };
    return { label: "Begin quiz", href: routes.quiz(classId, item.id) };
  }

  const ps = item.progress_status;
  if (ps === "completed") return { label: "Review", href: routes.lessonViewer(classId, item.id) };
  if (ps === "in_progress") return { label: "Resume", href: routes.lessonViewer(classId, item.id) };
  return { label: "Start", href: routes.lessonViewer(classId, item.id) };
}

function lockReason(item: LessonItem, prevItem: LessonItem | null): string {
  if (item.require_open_date && item.scheduled_open_date) {
    const date = new Date(item.scheduled_open_date);
    return `Opens ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (item.require_previous && prevItem) {
    if (prevItem.item_type === "assessment") {
      const pct = prevItem.pass_threshold_percent;
      return pct
        ? `Pass "${prevItem.title}" with ${pct}% to unlock`
        : `Pass "${prevItem.title}" to unlock`;
    }
    return `Complete "${prevItem.title}" to unlock`;
  }
  return "Complete previous lessons to unlock";
}

function LessonOutlineItem({
  classId,
  item,
  prevItem,
  dayIndex,
}: {
  classId: string;
  item: LessonItem;
  prevItem: LessonItem | null;
  dayIndex: number;
}) {
  const action = itemAction(classId, item);
  const isAssessment = item.item_type === "assessment";
  const isCompleted = item.progress_status === "completed";
  const isDraft = isAssessment && item.status === "draft";
  const isDisabled = !item.is_unlocked || isDraft;

  return (
    <div className={`flex items-center gap-4 py-3.5 ${isAssessment ? "-mx-5 bg-gold-50 px-5" : ""} ${isDisabled ? "opacity-60" : ""}`}>
      {isAssessment && !isDisabled && !isCompleted ? (
        <span className="flex h-8 w-8 shrink-0 items-center rounded-full justify-center bg-gold-200">
          <AssignmentOutlinedIcon style={{ fontSize: 17 }} className="text-gold-700" />
        </span>
      ) : (
        <StatusCircle item={item} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isAssessment ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-gold-700">
            Assessment
            {item.question_count ? ` · ${item.question_count} questions` : ""}
            {item.time_limit_seconds
              ? ` · ${Math.round(item.time_limit_seconds / 60)} min`
              : ""}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-ink-400">
            Day {dayIndex}
            <span className="text-ink-300">·</span>
            {itemIcon(item)}
            {materialTypeLabel(item.material_type)}
          </span>
        )}

        <span className={`truncate text-sm font-semibold ${isDisabled ? "text-ink-500" : isAssessment ? "text-navy-800" : "text-navy-900"}`}>
          {item.title}
        </span>

        {isAssessment && isCompleted && (
          <span className="text-[10px] text-emerald-600">✓ Passed · Score {item.pass_threshold_percent ?? "—"}%</span>
        )}
        {isDraft && (
          <span className="text-[10px] text-ink-400">Not yet published by lecturer</span>
        )}
        {!item.is_unlocked && !isDraft && (
          <span className="text-[10px] text-ink-400">{lockReason(item, prevItem)}</span>
        )}
      </div>

      {action.href && !action.disabled ? (
        <Link
          href={action.href}
          className="shrink-0 text-[12px] font-semibold text-navy-700 transition hover:text-navy-900"
        >
          {action.label}
        </Link>
      ) : (
        <span className="shrink-0 text-[12px] font-semibold text-ink-400">
          {action.label}
        </span>
      )}
    </div>
  );
}

function LessonGroup({
  classId,
  lesson,
  index,
}: {
  classId: string;
  lesson: ClassLesson;
  index: number;
}) {
  const completedItems = lesson.items.filter(
    (i) => i.progress_status === "completed",
  ).length;
  const total = lesson.items.length;

  // Track day index across non-assessment items per lesson
  let dayCounter = 0;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
      {/* Week header */}
      <div className="flex items-start justify-between border-b bg-cream-50 border-ink-100 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold-500 ">
            Week {index + 1}
          </p>
          <h3 className="mt-0.5 font-serif-display text-[1rem] font-semibold text-navy-900">
            {lesson.title}
          </h3>
        </div>
        <span className="mt-0.5 text-[11px] text-ink-400">
          {completedItems} / {total} lessons
        </span>
      </div>

      {/* Items — divided list, no individual borders */}
      <div className="divide-y divide-ink-100 px-5">
        {lesson.items.map((item, idx) => {
          if (item.item_type !== "assessment") dayCounter += 1;
          return (
            <LessonOutlineItem
              key={item.id}
              classId={classId}
              item={item}
              prevItem={idx > 0 ? lesson.items[idx - 1] : null}
              dayIndex={item.item_type !== "assessment" ? dayCounter : 0}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StudentClassDetailPage({ classId }: { classId: string }) {
  const classData = useAsync(() => api.classes.get(classId), [classId]);
  const lessonsData = useAsync(
    () => api.lessons.listForStudentClass(classId).then((r) => r.lessons),
    [classId],
  );
  const continueLearning = useAsync(
    () => api.student.continueLearning(classId),
    [classId],
  );
  const batchData = useAsync(
    () => api.classes.batches(classId).then((r) => r.batches[0] ?? null),
    [classId],
  );

  const cls = classData.data;
  const lessons = lessonsData.data ?? [];
  const batch = batchData.data;

  const cont = continueLearning.data as
    | {
        has_continue?: boolean;
        lesson_item_id?: number;
        lesson_id?: number;
        lesson_title?: string;
        item_title?: string;
        item_type?: string;
        material_type?: string;
      }
    | null;

  const allItems = lessons.flatMap((l) => l.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.progress_status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const courseTitle = cls?.course_title ?? "Class";
  const courseCode = cls?.course_code ?? "";

  const hasContinue = cont?.has_continue && cont.lesson_item_id;
  const continueHref = hasContinue
    ? cont?.item_type === "assessment"
      ? routes.quiz(classId, String(cont.lesson_item_id))
      : routes.lessonViewer(classId, String(cont.lesson_item_id))
    : undefined;

  // Compute "Week N · Day M" label for the resume card
  const continueWeekDay = (() => {
    if (!hasContinue || !cont?.lesson_id) return null;
    const weekIdx = lessons.findIndex((l) => String(l.id) === String(cont.lesson_id));
    if (weekIdx === -1) return null;
    const lesson = lessons[weekIdx];
    let dayCounter = 0;
    for (const item of lesson.items) {
      if (item.item_type !== "assessment") dayCounter += 1;
      if (String(item.id) === String(cont.lesson_item_id)) {
        return item.item_type !== "assessment"
          ? `Week ${weekIdx + 1} · Day ${dayCounter}`
          : `Week ${weekIdx + 1} · Assessment`;
      }
    }
    return `Week ${weekIdx + 1}`;
  })();

  const continueTypeLabel = cont?.material_type
    ? materialTypeLabel(cont.material_type)
    : cont?.item_type === "assessment"
    ? "Assessment"
    : "Doc";

  return (
    <>
      <PageHeader
        title={courseTitle}
        breadcrumbs={[
          { label: "Home" },
          { label: "My Classes", href: routes.myClasses },
          { label: courseTitle },
        ]}
        actions={
          <Link
            href={routes.grades}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-cream-100"
          >
            View grades for this class
          </Link>
        }
      />

      {/* Main info + resume layout */}
      <div className="mb-5 flex gap-4 items-stretch">
        {/* Class info card */}
        <Card className="flex-1 p-5">
          {/* Top row: code badge + active pill */}
          <div className="mb-4 flex items-center gap-2">
            {courseCode && (
              <span className="rounded bg-navy-100 px-2 py-0.5 text-[11px] font-bold tracking-wider text-navy-800">
                {courseCode}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          {/* Info columns + progress ring */}
          <div className="flex items-center gap-6">
            <div className="flex flex-1 flex-wrap gap-6">
              {cls?.lecturer_name && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <PersonOutlineRoundedIcon style={{ fontSize: 11 }} />
                    Lecturer
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-900">{cls.lecturer_name}</p>
                </div>
              )}

              {batch?.name && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <SchoolOutlinedIcon style={{ fontSize: 11 }} />
                    Batch
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-900">{batch.name}</p>
                </div>
              )}

              {cls?.semester_title && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <CalendarTodayOutlinedIcon style={{ fontSize: 11 }} />
                    Semester
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-900">{cls.semester_title}</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <ProgressRing percent={percent} size={90} stroke={9} />
            
            </div>
          </div>
        </Card>

        {/* Resume card */}
        {hasContinue && continueHref && (
          <div className="flex w-130 shrink-0 flex-col justify-between rounded-2xl bg-navy-900 p-5 text-cream-50">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-gold-400">
                <PlayArrowRoundedIcon style={{ fontSize: 12 }} />
                Resume where you left off
              </p>
              {continueWeekDay && (
                <p className="mt-2 text-[11px] font-medium text-navy-400">{continueWeekDay}</p>
              )}
              <p className="mt-1 font-serif-display text-[1rem] font-semibold leading-snug">
                {cont?.item_title || cont?.lesson_title || "Continue learning"}
              </p>
              <p className="mt-1 text-[11px] text-navy-400">{continueTypeLabel}</p>
            </div>
            <Link
              href={continueHref}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400"
            >
              Continue lesson
            </Link>
          </div>
        )}
      </div>

      {/* Assessment wall notice */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
        <WarningAmberRoundedIcon
          style={{ fontSize: 18 }}
          className="mt-0.5 shrink-0 text-gold-500"
        />
        <p className="text-[12px] text-gold-900">
          <strong>Assessment wall:</strong> Future lessons unlock as you complete
          weekly quizzes with a passing score of{" "}
          {allItems.find((i) => i.pass_threshold_percent)?.pass_threshold_percent ?? 70}
          % or higher. This ensures every learner builds a solid foundation before moving on.
        </p>
      </div>

      {/* Class outline */}
      <section>
        <h2 className="mb-4 font-serif-display text-[1.15rem] font-semibold text-navy-900">
          Class outline
        </h2>

        {lessonsData.loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-ink-200 bg-ink-100"
              />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <p className="text-sm text-ink-500">
            No content published yet for this class.
          </p>
        ) : (
          lessons.map((lesson, idx) => (
            <LessonGroup
              key={lesson.id}
              classId={classId}
              lesson={lesson}
              index={idx}
            />
          ))
        )}
      </section>
    </>
  );
}
