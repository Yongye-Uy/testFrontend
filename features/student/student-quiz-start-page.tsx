"use client";

import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import GradingOutlinedIcon from "@mui/icons-material/GradingOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAsync } from "@/features/shared/use-async";
import { api } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { useAuth } from "@/hooks/use-auth";

const RULES = [
  "Once you start, the timer begins immediately and will not pause.",
  "You may navigate between questions and flag items for review.",
  "Your answers auto-save. The quiz auto-submits when time runs out.",
  "Closing the browser counts as an attempt. Make sure you are ready.",
  "Academic integrity applies — no external help, materials, or AI tools.",
];

export function StudentQuizStartPage({
  classId,
  lessonItemId,
}: {
  classId: string;
  lessonItemId: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const classData = useAsync(() => api.classes.get(classId), [classId]);
  const lessonsData = useAsync(
    () => api.lessons.listForStudentClass(classId).then((r) => r.lessons),
    [classId],
  );

  const currentItem = lessonsData.data
    ?.flatMap((l) => l.items)
    .find((i) => i.id === lessonItemId);

  const assessmentStatusData = useAsync(
    () =>
      user
        ? api.student.assessmentStatus(classId, lessonItemId, String(user.id))
        : Promise.resolve(null),
    [classId, lessonItemId, user?.id],
  );

  const cls = classData.data;
  const assessmentStatus = assessmentStatusData.data;

  // require_previous=false → one attempt only; block if already submitted
  const isOneAttempt = currentItem?.require_previous === false;
  const alreadySubmitted =
    assessmentStatus?.status === "completed" || assessmentStatus?.status === "graded";
  const blocked = isOneAttempt && alreadySubmitted;

  async function handleBegin() {
    if (!currentItem || !user) return;
    setStarting(true);
    setError("");
    try {
      const sub = await api.submissions.start({
        assessment_id: Number(currentItem.item_id),
        lesson_item_id: Number(lessonItemId),
        class_id: Number(classId),
      });
      router.push(routes.quizTake(classId, lessonItemId) + `?sid=${sub.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start quiz");
      setStarting(false);
    }
  }

  const timeMinutes = currentItem?.time_limit_seconds
    ? Math.round(currentItem.time_limit_seconds / 60)
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-[12px] text-ink-500">
        <Link href={routes.myClasses} className="hover:text-navy-700">
          My Courses
        </Link>
        <span>/</span>
        <Link href={routes.classDetail(classId)} className="hover:text-navy-700">
          {cls?.course_code ?? "Back"}
        </Link>
        <span>/</span>
        <span className="font-medium text-navy-800">Quiz</span>
      </nav>

      {/* Assessment banner */}
      <div className="mb-6 rounded-2xl bg-navy-900 px-6 py-8 text-cream-50">
        <div className="flex flex-wrap items-center gap-2">
          {cls?.course_code && (
            <span className="rounded-md bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-200">
              {cls.course_code}
            </span>
          )}
          <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
            Assessment
          </span>
          {isOneAttempt && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
              One attempt only
            </span>
          )}
        </div>
        <h1 className="mt-3 font-serif-display text-[1.5rem] font-semibold leading-8">
          {currentItem?.title ?? "Quiz"}
        </h1>
        {currentItem?.description && (
          <p className="mt-2 text-sm leading-6 text-navy-300">
            {currentItem.description}
          </p>
        )}

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm">
            <AssignmentOutlinedIcon style={{ fontSize: 18 }} className="text-navy-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                Questions
              </p>
              <p className="font-semibold">
                {currentItem?.question_count ?? "—"}
              </p>
            </div>
          </div>
          {timeMinutes && (
            <div className="flex items-center gap-2 text-sm">
              <AccessTimeOutlinedIcon style={{ fontSize: 18 }} className="text-navy-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                  Time limit
                </p>
                <p className="font-semibold">{timeMinutes} min</p>
              </div>
            </div>
          )}
          {currentItem?.pass_threshold_percent && (
            <div className="flex items-center gap-2 text-sm">
              <GradingOutlinedIcon style={{ fontSize: 18 }} className="text-navy-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                  Passing score
                </p>
                <p className="font-semibold">
                  {currentItem.pass_threshold_percent}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocked: one-attempt already used */}
      {blocked ? (
        <div className="mb-8 rounded-2xl border border-ink-200 bg-ink-50 p-6">
          <div className="flex items-start gap-3">
            <BlockOutlinedIcon className="mt-0.5 shrink-0 text-ink-400" style={{ fontSize: 22 }} />
            <div>
              <p className="font-semibold text-navy-900">Attempt already submitted</p>
              <p className="mt-1 text-sm text-ink-600">
                This quiz allows only one attempt. Your submission has been recorded.
              </p>
              <Link
                href={routes.classDetail(classId)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-cream-100"
              >
                Back to class
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Rules */}
          <div className="mb-8 rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="mb-4 font-serif-display text-[1rem] font-semibold text-navy-900">
              Rules &amp; guidance
            </h2>
            <ul className="space-y-3">
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-sm text-ink-700">
                  <CheckCircleOutlineRoundedIcon
                    style={{ fontSize: 18 }}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            onClick={handleBegin}
            disabled={starting || !currentItem || assessmentStatusData.loading}
            className="w-full rounded-2xl bg-gold-500 px-6 py-4 text-base font-bold text-navy-950 shadow-sm transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? "Starting…" : "Begin assessment"}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-500">
            The timer starts the moment you click Begin.
          </p>
        </>
      )}
    </div>
  );
}
