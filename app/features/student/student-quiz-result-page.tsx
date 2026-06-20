"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import { useAuth } from "@/app/hooks/use-auth";
import { ProgressRing } from "./progress-ring";

type QuestionRow = {
  id: string;
  question_text: string;
  type: string;
};

type OptionRow = {
  id: string;
  option_text: string;
  is_correct: boolean;
  feedback?: string;
};

type SelectedOpt = {
  question_id: string;
  option_id: string;
};

type QuestionResult = {
  question: QuestionRow;
  options: OptionRow[];
  selectedIds: Set<string>;
  isCorrect: boolean;
};

export function StudentQuizResultPage({
  classId,
  submissionId,
}: {
  classId: string;
  submissionId: string;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [scorePercent, setScorePercent] = useState<number | null>(null);
  const [passThreshold, setPassThreshold] = useState<number>(70);
  const [requirePassThreshold, setRequirePassThreshold] = useState<boolean>(false);
  const [lessonItemId, setLessonItemId] = useState<string>("");
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [subRaw, resultData] = await Promise.all([
          api.submissions.get(submissionId),
          api.submissions.result(submissionId).catch(() => null),
        ]);

        const liId = String(subRaw.lesson_item_id ?? "");
        setLessonItemId(liId);

        const lessonsRaw = await api.lessons.listForStudentClass(classId).then((r) => r.lessons).catch(() => []);
        // find require_pass_threshold for this lesson item
        const allItems = lessonsRaw.flatMap((l: { items: { id: string; require_pass_threshold?: boolean; pass_threshold_percent?: number | null }[] }) => l.items);
        const currentItem = allItems.find((i: { id: string }) => i.id === liId);
        setRequirePassThreshold(currentItem?.require_pass_threshold ?? false);
        if (currentItem?.pass_threshold_percent) {
          setPassThreshold(currentItem.pass_threshold_percent);
        }

        if (resultData) {
          setScorePercent(resultData.score_percent);
        }

        const questions = (await api.submissions.questions(submissionId)) as QuestionRow[];

        const [selectedRaw, ...optionsPerQ] = await Promise.all([
          api.submissions.selectedOptions(submissionId),
          ...questions.map((q) =>
            api.submissions.questionOptions(submissionId, q.id),
          ),
        ]);

        const selectedList = selectedRaw as SelectedOpt[];
        const selectedByQ: Record<string, Set<string>> = {};
        for (const s of selectedList) {
          const qKey = String(s.question_id);
          if (!selectedByQ[qKey]) selectedByQ[qKey] = new Set();
          selectedByQ[qKey].add(String(s.option_id));
        }

        const qResults: QuestionResult[] = questions.map((q, idx) => {
          const opts = optionsPerQ[idx] as OptionRow[];
          const selIds = selectedByQ[q.id] ?? new Set();
          return { question: q, options: opts, selectedIds: selIds, isCorrect: false };
        });

        setResults(qResults);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [submissionId, classId, lessonItemId]);

  async function handleRetake() {
    if (!user) return;
    setRetaking(true);
    try {
      const lessonsRaw = await api.lessons.listForStudentClass(classId).then((r) => r.lessons);
      const allItems = lessonsRaw.flatMap((l: { items: { id: string; item_id: string }[] }) => l.items);
      const currentItem = allItems.find((i: { id: string }) => i.id === lessonItemId);
      if (!currentItem) return;

      const sub = await api.submissions.start({
        assessment_id: Number(currentItem.item_id),
        lesson_item_id: Number(lessonItemId),
        class_id: Number(classId),
      });
      router.push(routes.quizTake(classId, lessonItemId) + `?sid=${sub.id}`);
    } catch {
      setRetaking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-500">
        Loading results…
      </div>
    );
  }

  if (!results) {
    return <p className="text-sm text-red-600">Could not load quiz results.</p>;
  }

  const percent = scorePercent ?? 0;
  const passed = percent >= passThreshold;
  // require_pass_threshold=true → student must pass, can retake until they do
  const canRetake = requirePassThreshold && !passed;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Result banner */}
      <div
        className={`mb-8 overflow-hidden rounded-2xl ${passed ? "bg-emerald-600" : "bg-rose-600"}`}
      >
        <div className="flex items-center justify-between gap-4 px-8 py-8 text-white">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              {passed ? "Passed!" : "Not passed"}
            </div>
            <h1 className="font-serif-display text-[1.8rem] font-bold leading-9">
              {passed ? "Brilliant work!" : "Keep going!"}
            </h1>
            <p className="mt-2 text-sm opacity-80">
              You scored {percent}% on this quiz.{" "}
              {passed
                ? "You've passed this quiz — the next lesson is now unlocked."
                : canRetake
                  ? `You need ${passThreshold}% to pass. Review the material and try again.`
                  : `You need ${passThreshold}% to pass. This was a one-attempt quiz.`}
            </p>
          </div>
          <ProgressRing percent={percent} size={88} stroke={7} />
        </div>

        <div className="flex flex-wrap gap-6 bg-white/10 px-8 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Score</p>
            <p className="text-[1.4rem] font-bold">{percent}%</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Passing score</p>
            <p className="text-[1.4rem] font-bold">{passThreshold}%</p>
          </div>
          {!requirePassThreshold && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Attempts</p>
              <p className="text-[1.4rem] font-bold">1 / 1</p>
            </div>
          )}
        </div>
      </div>

      {/* Question feedback */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif-display text-[1.05rem] font-semibold text-navy-900">
            Question-by-question feedback
          </h2>
          <span className="text-[11px] text-ink-500">
            Lecturer explanations included for correct answers
          </span>
        </div>

        <div className="space-y-4">
          {results.map((r, idx) => {
            const selectedOpts = r.options.filter((o) => r.selectedIds.has(String(o.id)));
            const correctIds = new Set(r.options.filter((o) => o.is_correct).map((o) => String(o.id)));
            const selSet = r.selectedIds;
            const isCorrect =
              selSet.size === correctIds.size && [...selSet].every((id) => correctIds.has(String(id)));
            const feedback = r.options.find((o) => o.feedback && o.is_correct)?.feedback;

            return (
              <div
                key={r.question.id}
                className={`rounded-2xl border p-5 ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircleRoundedIcon
                      style={{ fontSize: 20 }}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                  ) : (
                    <CancelRoundedIcon
                      style={{ fontSize: 20 }}
                      className="mt-0.5 shrink-0 text-rose-600"
                    />
                  )}
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                      Question {idx + 1}
                    </span>
                    <p className="mt-1.5 font-medium text-navy-900">
                      {r.question.question_text}
                    </p>

                    {selectedOpts.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                          Your answer
                        </p>
                        <div className="mt-1.5 space-y-1.5">
                          {selectedOpts.map((o) => (
                            <div
                              key={o.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                o.is_correct
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {o.is_correct ? (
                                <CheckCircleRoundedIcon
                                  style={{ fontSize: 14 }}
                                  className="text-emerald-600"
                                />
                              ) : (
                                <CancelRoundedIcon
                                  style={{ fontSize: 14 }}
                                  className="text-rose-600"
                                />
                              )}
                              {o.option_text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isCorrect && feedback && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-gold-200 bg-gold-50 px-3 py-2.5">
                        <LightbulbOutlinedIcon
                          style={{ fontSize: 15 }}
                          className="mt-0.5 shrink-0 text-gold-600"
                        />
                        <p className="text-[12px] text-gold-900">{feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={routes.classDetail(classId)}
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-cream-100"
        >
          Back to class
        </Link>
        <Link
          href={routes.grades}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-navy-800"
        >
          View all grades
        </Link>
        {canRetake && (
          <button
            onClick={handleRetake}
            disabled={retaking}
            className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition hover:bg-gold-400 disabled:opacity-50"
          >
            <ReplayRoundedIcon style={{ fontSize: 16 }} />
            {retaking ? "Starting…" : "Retake quiz"}
          </button>
        )}
        {!requirePassThreshold && !passed && (
          <span className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm font-semibold text-ink-400">
            Cannot retake — one attempt only
          </span>
        )}
      </div>
    </div>
  );
}
