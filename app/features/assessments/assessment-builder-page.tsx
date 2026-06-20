"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/app/services/api-client";
import { useAuth } from "@/app/hooks/use-auth";
import { isLecturer, isSuperAdmin } from "@/lib/auth";
import type { AssessmentOptionsInput } from "@/app/types/assessment";
import { QuestionsPanel } from "./question-list";
import { StudentPreviewModal } from "./student-preview";

const FEEDBACK_DISPLAY_OPTIONS = [
  "Immediately after submission",
  "After the deadline passes",
  "Manually released by lecturer",
];

type BuilderForm = {
  title: string;
  description: string;
  requireTimeLimit: boolean;
  timeLimitMin: number;
  requirePassThreshold: boolean;
  passingScore: number;
  questionsPerAttempt: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  // Presentational-only (not persisted by assessment-service):
  feedbackDisplay: string;
  unlockRule: boolean;
  opensAt: string;
};

const EMPTY_FORM: BuilderForm = {
  title: "",
  description: "",
  requireTimeLimit: false,
  timeLimitMin: 0,
  requirePassThreshold: false,
  passingScore: 70,
  questionsPerAttempt: 0,
  shuffleQuestions: false,
  shuffleOptions: false,
  feedbackDisplay: FEEDBACK_DISPLAY_OPTIONS[0],
  unlockRule: false,
  opensAt: "",
};

function toOptionsInput(form: BuilderForm): AssessmentOptionsInput {
  return {
    require_pass_threshold: form.requirePassThreshold,
    pass_threshold_percent: form.requirePassThreshold ? form.passingScore : 0,
    require_time_limit: form.requireTimeLimit,
    time_limit_seconds: form.requireTimeLimit ? Math.max(0, Math.round(form.timeLimitMin * 60)) : 0,
    random_questions_count: Math.max(0, form.questionsPerAttempt),
    shuffle_questions: form.shuffleQuestions,
    shuffle_options: form.shuffleOptions,
  };
}

export function AssessmentBuilderPage({
  classId = null,
  lessonId = null,
}: {
  classId?: string | null;
  lessonId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = isLecturer(user) || isSuperAdmin(user);

  // When opened from a lesson's "+ Assessment", the builder attaches the new
  // assessment to that lesson on first save (once — a lesson item is created
  // per call to addAssessment).
  const fromLesson = Boolean(classId && lessonId);
  const [linkedToLesson, setLinkedToLesson] = useState(false);

  const [form, setForm] = useState<BuilderForm>(EMPTY_FORM);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const backHref = fromLesson ? `/classes/${classId}` : "/classes";

  const set = <K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleCount = useCallback(
    (count: number) => setQuestionCount(count),
    [],
  );

  async function persist(): Promise<string> {
    const options = toOptionsInput(form);
    // Fall back to a placeholder title so the backend never receives an empty string.
    const title = form.title.trim() || "Untitled Assessment";
    if (!form.title.trim()) setForm((f) => ({ ...f, title }));
    let id = assessmentId;
    if (id) {
      await api.assessments.update(id, {
        title,
        description: form.description,
      });
      await api.assessments.updateOptions(id, options);
    } else {
      const created = await api.assessments.create({
        title,
        description: form.description,
        options,
      });
      id = created.id;
      setAssessmentId(created.id);
      setStatus(created.status);
    }
    // Attach to the originating lesson exactly once.
    if (id && classId && lessonId && !linkedToLesson) {
      await api.lessons.addAssessment(classId, lessonId, id);
      setLinkedToLesson(true);
    }
    return id;
  }

  async function saveDraft() {
    if (!form.title.trim()) {
      setError("Title is required before saving.");
      return;
    }
    setSavingDraft(true);
    setError("");
    try {
      await persist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingDraft(false);
    }
  }

  async function publish() {
    if (!form.title.trim()) {
      setError("Title is required before publishing.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const id = await persist();
      const published = await api.assessments.publish(id);
      setStatus(published.status);
      router.push(fromLesson ? backHref : `/assessments/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      setPublishing(false);
    }
  }

  if (!canManage) {
    return (
      <>
        <PageHeader title="Assessment Builder" />
        <ErrorState message="You do not have permission to author assessments." />
      </>
    );
  }

  return (
    <>
      <BackLink
        href={backHref}
        label={fromLesson ? "Back to class" : "My Classes"}
      />
      <PageHeader
        title="Assessment Builder"
        description="Design auto-graded quizzes with per-answer feedback."
        breadcrumbs={[
          { label: "Home" },
          { label: "Assessments" },
          { label: assessmentId ? form.title || "Draft" : "New" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              type="button"
              disabled={!assessmentId}
              onClick={() => assessmentId && setPreviewOpen(true)}
            >
              Preview as student
            </Button>
            <Button
              variant="secondary"
              type="button"
              loading={savingDraft}
              onClick={saveDraft}
            >
              Save as draft
            </Button>
            <Button
              variant="gold"
              type="button"
              loading={publishing}
              onClick={publish}
            >
              Publish
            </Button>
          </>
        }
      />

      {fromLesson && (
        <div className="mb-4 rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-800 ring-1 ring-navy-100">
          This assessment will be added to the selected lesson when you save the
          draft or publish.
        </div>
      )}

      {assessmentId && (
        <div className="mb-4 flex items-center gap-2 text-sm text-ink-600">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Status
          </span>
          <StatusBadge value={status} />
          <span className="text-ink-400">·</span>
          <span>
            {linkedToLesson
              ? "Saved and linked to the lesson."
              : "Draft saved — changes are stored as you save."}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}

      {/* Settings */}
      <Card className="mb-5 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <Field label="Title">
              <input
                className={inputClass}
                value={form.title}
                placeholder="e.g. Week 3 Quiz: Programming Basics"
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Time limit">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={form.requireTimeLimit}
                onChange={(e) => {
                  set("requireTimeLimit", e.target.checked);
                  if (!e.target.checked) set("timeLimitMin", 0);
                }}
              />
              Require a time limit
            </label>
            {form.requireTimeLimit && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.timeLimitMin}
                  onChange={(e) => set("timeLimitMin", Math.max(1, Number(e.target.value)))}
                />
                <span className="text-xs font-medium text-ink-500">min</span>
              </div>
            )}
          </Field>

          <Field label="Passing threshold">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={form.requirePassThreshold}
                onChange={(e) => {
                  set("requirePassThreshold", e.target.checked);
                  if (!e.target.checked) set("passingScore", 70);
                }}
              />
              Require minimum passing score
            </label>
            {form.requirePassThreshold && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={form.passingScore}
                  onChange={(e) => set("passingScore", Math.max(1, Number(e.target.value)))}
                />
                <span className="text-xs font-medium text-ink-500">%</span>
              </div>
            )}
          </Field>

          <Field label="Questions per attempt" hint="0 = serve all questions.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.questionsPerAttempt}
                onChange={(e) =>
                  set("questionsPerAttempt", Number(e.target.value))
                }
              />
              <span className="whitespace-nowrap text-xs font-medium text-ink-500">
                of {questionCount}
              </span>
            </div>
          </Field>

          <Field label="Shuffle questions">
            <ToggleRow
              checked={form.shuffleQuestions}
              onChange={(v) => set("shuffleQuestions", v)}
              label="Randomize order each attempt"
            />
          </Field>

          <Field label="Shuffle answer options">
            <ToggleRow
              checked={form.shuffleOptions}
              onChange={(v) => set("shuffleOptions", v)}
              label="Randomize choices each attempt"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
              Total questions
            </p>
            <p className="mt-1 font-serif-display text-[1.4rem] font-semibold text-navy-900">
              {questionCount}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea
              className={textareaClass}
              value={form.description}
              placeholder="Optional summary shown to students."
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {/* Availability (presentational) */}
      <Card className="mb-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-[1.1rem] font-semibold leading-7 text-navy-900">
            Assessment availability
          </h2>
          <span className="rounded bg-cream-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Configured on the lesson page
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Lesson placement, unlock rules, and open dates are managed where this
          assessment is added to a lesson. These controls are a preview.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Feedback display">
            <select
              className={inputClass}
              value={form.feedbackDisplay}
              onChange={(e) => set("feedbackDisplay", e.target.value)}
            >
              {FEEDBACK_DISPLAY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Opens at">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.opensAt}
              onChange={(e) => set("opensAt", e.target.value)}
            />
          </Field>
          <div className="md:col-span-2">
            <label className="flex items-start gap-2 rounded-lg bg-cream-100 p-3 text-sm text-navy-900">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.unlockRule}
                onChange={(e) => set("unlockRule", e.target.checked)}
              />
              Require students to complete the previous assignment or assessment
              before this one unlocks
            </label>
          </div>
        </div>
      </Card>

      {/* Questions */}
      <QuestionsPanel
        assessmentId={assessmentId}
        onCountChange={handleCount}
        onNeedsSave={persist}
        onAssessmentCreated={(id) => { setAssessmentId(id); setStatus("draft"); }}
      />

      {assessmentId && (
        <StudentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          assessmentId={assessmentId}
          title={form.title}
        />
      )}
    </>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex h-10 items-center gap-2 text-[13px] text-navy-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
