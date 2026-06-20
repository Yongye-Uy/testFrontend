"use client";

import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
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
    return (
      <AssignmentOutlinedIcon style={{ fontSize: 15 }} className="text-gold-600" />
    );
  }
  const t = item.material_type ?? "";
  if (t === "pdf") return <PictureAsPdfOutlinedIcon style={{ fontSize: 15 }} className="text-rose-500" />;
  if (t === "video") return <PlayCircleOutlineRoundedIcon style={{ fontSize: 15 }} className="text-blue-500" />;
  return <ArticleOutlinedIcon style={{ fontSize: 15 }} className="text-ink-500" />;
}

function statusIcon(item: LessonItem) {
  const ps = item.progress_status;
  if (!item.is_unlocked) {
    return <LockOutlinedIcon style={{ fontSize: 18 }} className="text-ink-300" />;
  }
  if (ps === "completed") {
    return <CheckCircleRoundedIcon style={{ fontSize: 18 }} className="text-emerald-500" />;
  }
  if (ps === "in_progress") {
    return (
      <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-blue-500">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
      </span>
    );
  }
  return <RadioButtonUncheckedRoundedIcon style={{ fontSize: 18 }} className="text-ink-300" />;
}

function itemAction(
  classId: string,
  item: LessonItem,
): { label: string; href?: string; disabled?: boolean } {
  if (!item.is_unlocked) return { label: "Locked", disabled: true };

  if (item.item_type === "assessment") {
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

function LessonOutlineItem({
  classId,
  item,
  dayIndex,
}: {
  classId: string;
  item: LessonItem;
  dayIndex: number;
}) {
  const action = itemAction(classId, item);
  const isAssessment = item.item_type === "assessment";
  const isCompleted = item.progress_status === "completed";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        item.is_unlocked ? "bg-white" : "bg-ink-50 opacity-70"
      } border border-ink-100`}
    >
      <span className="shrink-0">{statusIcon(item)}</span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isAssessment ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-gold-600">
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

        <span className={`truncate text-sm font-medium ${item.is_unlocked ? "text-navy-900" : "text-ink-500"}`}>
          {item.title}
        </span>

        {isAssessment && isCompleted && (
          <span className="text-[10px] text-emerald-600">✓ Passed · Score {item.pass_threshold_percent ?? "—"}%</span>
        )}
        {!item.is_unlocked && (
          <span className="text-[10px] text-ink-400">Complete previous lessons to unlock</span>
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
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-400">
            Week {index + 1}
          </p>
          <h3 className="font-serif-display text-[1rem] font-semibold text-navy-900">
            {lesson.title}
          </h3>
        </div>
        <span className="text-[11px] text-ink-500">
          {completedItems} / {total} lessons
        </span>
      </div>

      <div className="space-y-2">
        {lesson.items.map((item) => {
          if (item.item_type !== "assessment") dayCounter += 1;
          return (
            <LessonOutlineItem
              key={item.id}
              classId={classId}
              item={item}
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

  const cls = classData.data;
  const lessons = lessonsData.data ?? [];

  const cont = continueLearning.data as
    | {
        has_continue?: boolean;
        lesson_item_id?: number;
        lesson_title?: string;
        item_type?: string;
        material_type?: string;
      }
    | null;

  const allItems = lessons.flatMap((l) => l.items);
  const total = allItems.length;
  const completed = allItems.filter((i) => i.progress_status === "completed").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const semesterTitle = cls?.semester_title ?? "";
  const courseTitle = cls?.course_title ?? "Class";
  const courseCode = cls?.course_code ?? "";

  const hasContinue = cont?.has_continue && cont.lesson_item_id;
  const continueHref = hasContinue
    ? cont?.item_type === "assessment"
      ? routes.quiz(classId, String(cont.lesson_item_id))
      : routes.lessonViewer(classId, String(cont.lesson_item_id))
    : undefined;

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
      <div className={`mb-5 flex gap-4 ${hasContinue ? "items-stretch" : ""}`}>
        {/* Class info card */}
        <Card className={`flex-1 p-5 ${hasContinue ? "" : "w-full"}`}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-wrap gap-6">
              {courseCode && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <SchoolOutlinedIcon style={{ fontSize: 11 }} />
                    Course
                  </p>
                  <p className="mt-1 font-semibold text-navy-900">{courseCode}</p>
                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    Active
                  </span>
                </div>
              )}

              {cls?.lecturer_name && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <PersonOutlineRoundedIcon style={{ fontSize: 11 }} />
                    Lecturer
                  </p>
                  <p className="mt-1 font-semibold text-navy-900">{cls.lecturer_name}</p>
                </div>
              )}

              {semesterTitle && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-400 flex items-center gap-1">
                    <CalendarTodayOutlinedIcon style={{ fontSize: 11 }} />
                    Semester
                  </p>
                  <p className="mt-1 font-semibold text-navy-900">{semesterTitle}</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-1">
              <ProgressRing percent={percent} size={72} stroke={6} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Progress
              </span>
            </div>
          </div>
        </Card>

        {/* Resume card — separate panel */}
        {hasContinue && continueHref && (
          <div className="flex w-72 shrink-0 flex-col justify-between rounded-2xl bg-navy-900 p-5 text-cream-50">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-navy-300">
                <PlayArrowRoundedIcon style={{ fontSize: 12 }} />
                Resume where you left off
              </p>
              <p className="mt-2 text-[10px] text-navy-400">
                {cont?.material_type
                  ? materialTypeLabel(cont.material_type)
                  : cont?.item_type === "assessment"
                  ? "Assessment"
                  : "Lesson"}
              </p>
              <p className="mt-0.5 font-serif-display text-[1rem] font-semibold leading-snug">
                {cont?.lesson_title ?? "Continue learning"}
              </p>
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
          className="mt-0.5 shrink-0 text-gold-600"
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
