"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";

type Question = {
  id: string;
  question_text: string;
  type: string;
};

type OptionRow = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
};

type SelectedOption = {
  question_id: string;
  option_id: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function StudentQuizTakePage({
  classId,
  submissionId,
}: {
  classId: string;
  lessonItemId: string;
  submissionId: string;
}) {
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, OptionRow[]>>({});
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Load submission data
  useEffect(() => {
    async function init() {
      try {
        const sub = await api.submissions.get(submissionId);
        if (sub.time_limit_seconds) {
          const elapsed = sub.started_at
            ? Math.floor((Date.now() - new Date(sub.started_at).getTime()) / 1000)
            : 0;
          setTimeLeft(Math.max(0, sub.time_limit_seconds - elapsed));
        }

        const qs = (await api.submissions.questions(submissionId)) as Question[];
        setQuestions(qs);

        // Load options for all questions
        const map: Record<string, OptionRow[]> = {};
        await Promise.all(
          qs.map(async (q) => {
            const opts = (await api.submissions.questionOptions(
              submissionId,
              q.id,
            )) as OptionRow[];
            map[q.id] = opts;
          }),
        );
        setOptionsMap(map);

        // Load already selected
        const existing = (await api.submissions.selectedOptions(
          submissionId,
        )) as SelectedOption[];
        const sel: Record<string, Set<string>> = {};
        for (const e of existing) {
          if (!sel[e.question_id]) sel[e.question_id] = new Set();
          sel[e.question_id].add(e.option_id);
        }
        setSelected(sel);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [submissionId]);

  // Prevent accidental navigation away while quiz is in progress
  useEffect(() => {
    if (submitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitting]);

  // Timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      void handleSubmit(true);
      return;
    }
    timerRef.current = setInterval(
      () => setTimeLeft((t) => (t !== null ? t - 1 : null)),
      1000,
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  async function selectOption(questionId: string, optionId: string) {
    const q = questions.find((q) => q.id === questionId);
    const isMulti = q?.type === "mcq_multiple";

    setSelected((prev) => {
      const next = { ...prev };
      if (!next[questionId]) next[questionId] = new Set();
      else next[questionId] = new Set(next[questionId]);

      if (isMulti) {
        if (next[questionId].has(optionId)) {
          next[questionId].delete(optionId);
        } else {
          next[questionId].add(optionId);
        }
      } else {
        next[questionId] = new Set([optionId]);
      }
      return next;
    });

    try {
      if (!isMulti) {
        await api.submissions.clearOptions(submissionId, Number(questionId));
      }
      await api.submissions.selectOption(submissionId, {
        question_id: Number(questionId),
        option_id: Number(optionId),
      });
    } catch {
      // best effort — state already updated locally
    }
  }

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        const timeUsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        await api.submissions.submit(submissionId, timeUsed);
        router.replace(routes.quizResult(classId, submissionId));
      } catch {
        setSubmitting(false);
        if (!auto) setConfirmSubmit(false);
      }
    },
    [submissionId, classId, router, submitting],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-500">
        Loading quiz…
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentOpts = currentQ ? (optionsMap[currentQ.id] ?? []) : [];
  const currentSel = currentQ ? (selected[currentQ.id] ?? new Set()) : new Set();
  const answeredCount = Object.values(selected).filter((s) => s.size > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-cream-50">
      {/* Top bar */}
      <div className="flex items-center gap-4 bg-navy-900 px-6 py-3 shadow-sm">
        <h1 className="flex-1 truncate font-serif-display text-[1rem] font-semibold text-cream-50">
          Quiz in progress
        </h1>

        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ring-1 ${
              timeLeft < 120
                ? "bg-rose-50 text-rose-700 ring-rose-200"
                : "bg-navy-50 text-navy-800 ring-navy-100"
            }`}
          >
            <AccessTimeRoundedIcon style={{ fontSize: 16 }} />
            {formatTime(timeLeft)}
          </div>
        )}

        <button
          onClick={() => setConfirmSubmit(true)}
          disabled={submitting}
          className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 transition hover:bg-gold-400 disabled:opacity-50"
        >
          Submit quiz
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Question navigator */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-ink-200 bg-white p-4 xl:block">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-400">
            Questions ({answeredCount}/{questions.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const answered = (selected[q.id]?.size ?? 0) > 0;
              const isFlagged = flagged.has(q.id);
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                    isCurrent
                      ? "bg-navy-900 text-cream-50"
                      : answered
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-ink-50 text-ink-600 ring-1 ring-ink-200"
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold-500 ring-1 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Question area */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
          {currentQ ? (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                    Question {currentIdx + 1} of {questions.length}
                  </p>
                  <p className="text-[1.05rem] font-semibold leading-7 text-navy-900">
                    {currentQ.question_text}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFlagged((prev) => {
                      const next = new Set(prev);
                      if (next.has(currentQ.id)) next.delete(currentQ.id);
                      else next.add(currentQ.id);
                      return next;
                    })
                  }
                  title="Flag for review"
                  className={`mt-1 shrink-0 rounded-lg p-2 transition ${
                    flagged.has(currentQ.id)
                      ? "bg-gold-50 text-gold-600"
                      : "text-ink-400 hover:bg-ink-50"
                  }`}
                >
                  {flagged.has(currentQ.id) ? (
                    <FlagRoundedIcon style={{ fontSize: 20 }} />
                  ) : (
                    <FlagOutlinedIcon style={{ fontSize: 20 }} />
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {currentOpts.map((opt) => {
                  const isSelected = currentSel.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(currentQ.id, opt.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left text-sm font-medium transition ${
                        isSelected
                          ? "border-navy-400 bg-navy-50 text-navy-900"
                          : "border-ink-200 bg-white text-ink-800 hover:border-navy-200 hover:bg-cream-50"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-navy-600 bg-navy-600"
                            : "border-ink-300"
                        }`}
                      >
                        {isSelected && (
                          <CheckRoundedIcon
                            style={{ fontSize: 12 }}
                            className="text-white"
                          />
                        )}
                      </span>
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>

              {/* Prev / Next */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 shadow-sm transition hover:bg-cream-100 disabled:opacity-40"
                >
                  Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() =>
                      setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                    }
                    className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-navy-800"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmSubmit(true)}
                    className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-950 shadow-sm transition hover:bg-gold-400"
                  >
                    Review &amp; submit
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-500">No questions found.</p>
          )}
        </main>
      </div>

      {/* Confirm submit modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop">
            <h2 className="font-serif-display text-[1.1rem] font-semibold text-navy-900">
              Submit quiz?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              You have answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length
                ? " Unanswered questions will be marked incorrect."
                : ""}{" "}
              This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-cream-100"
              >
                Continue quiz
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-cream-50 transition hover:bg-navy-800 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
