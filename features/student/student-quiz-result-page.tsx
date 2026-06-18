"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { routes } from "@/lib/routes";
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
  points: number;
  maxPoints: number;
};

export function StudentQuizResultPage({
  classId,
  submissionId,
}: {
  classId: string;
  submissionId: string;
}) {
  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionMeta, setSubmissionMeta] = useState<{
    started_at?: string;
    submitted_at?: string;
    pass_threshold?: number;
  }>({});

  useEffect(() => {
    async function load() {
      try {
        const sub = await api.submissions.get(submissionId);
        setSubmissionMeta({
          started_at: sub.started_at,
          submitted_at: sub.submitted_at,
          pass_threshold: undefined,
        });

        const questions = (await api.submissions.questions(
          submissionId,
        )) as QuestionRow[];

        const [selectedRaw, ...optionsPerQ] = await Promise.all([
          api.submissions.selectedOptions(submissionId),
          ...questions.map((q) =>
            api.submissions.questionOptions(submissionId, q.id),
          ),
        ]);

        const selectedList = selectedRaw as SelectedOpt[];
        const selectedByQ: Record<string, Set<string>> = {};
        for (const s of selectedList) {
          if (!selectedByQ[s.question_id]) selectedByQ[s.question_id] = new Set();
          selectedByQ[s.question_id].add(s.option_id);
        }

        const qResults: QuestionResult[] = questions.map((q, idx) => {
          const opts = optionsPerQ[idx] as OptionRow[];
          const selIds = selectedByQ[q.id] ?? new Set();
          const correctIds = new Set(
            opts.filter((o) => o.is_correct).map((o) => o.id),
          );
          const isCorrect =
            selIds.size === correctIds.size &&
            [...selIds].every((id) => correctIds.has(id));
          const maxPoints = 10;
          const points = isCorrect ? maxPoints : 0;
          return { question: q, options: opts, selectedIds: selIds, isCorrect, points, maxPoints };
        });

        setResults(qResults);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [submissionId]);

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

  const totalQ = results.length;
  const correct = results.filter((r) => r.isCorrect).length;
  const incorrect = totalQ - correct;
  const percent = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
  const passThreshold = 70;
  const passed = percent >= passThreshold;

  const timeUsedMs =
    submissionMeta.started_at && submissionMeta.submitted_at
      ? new Date(submissionMeta.submitted_at).getTime() -
        new Date(submissionMeta.started_at).getTime()
      : null;
  const timeUsedMin = timeUsedMs ? Math.ceil(timeUsedMs / 60000) : null;

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
                : `You need ${passThreshold}% to pass. Review the material and try again.`}
            </p>
          </div>
          <ProgressRing
            percent={percent}
            size={88}
            stroke={7}
          />
        </div>

        <div className="flex flex-wrap gap-6 bg-white/10 px-8 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              Correct
            </p>
            <p className="text-[1.4rem] font-bold">
              {correct} / {totalQ}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              Incorrect
            </p>
            <p className="text-[1.4rem] font-bold">{incorrect}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              Passing score
            </p>
            <p className="text-[1.4rem] font-bold">{passThreshold}%</p>
          </div>
          {timeUsedMin && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                Time used
              </p>
              <p className="text-[1.4rem] font-bold">{timeUsedMin} min</p>
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
            const selectedOpts = r.options.filter((o) => r.selectedIds.has(o.id));
            const feedback = r.options.find((o) => o.feedback && o.is_correct)?.feedback;

            return (
              <div
                key={r.question.id}
                className={`rounded-2xl border p-5 ${
                  r.isCorrect
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {r.isCorrect ? (
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                        Question {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          r.isCorrect ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {r.isCorrect ? `+${r.points} pts` : `0 of ${r.maxPoints} pts`}
                      </span>
                    </div>
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

                    {!r.isCorrect && feedback && (
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
      </div>
    </div>
  );
}
