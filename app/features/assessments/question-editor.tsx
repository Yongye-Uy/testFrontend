"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { textareaClass } from "@/components/ui/field";

import { api } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";
import { AnswerEditor } from "./answer-editor";
import { OptionEditor } from "./option-editor";
import { QUESTION_TYPE_OPTIONS } from "./assessment-utils";

export function QuestionEditor({
  assessmentId,
  questionId,
  onSaved,
  onDeleted,
  structureLocked = false,
}: {
  assessmentId: string;
  questionId: string;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
  structureLocked?: boolean;
}) {
  const question = useAsync(() => api.questions.get(questionId), [questionId]);
  const [form, setForm] = useState({ question_text: "", type: "mcq_single" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!question.data) return;
    setForm({
      question_text: question.data.question_text,
      type: question.data.type,
    });
  }, [question.data]);

  async function remove() {
    if (
      !window.confirm(
        "Remove this question from the assessment? This deletes the question and its answer choices.",
      )
    )
      return;
    setDeleting(true);
    setError("");
    try {
      await api.assessments.removeQuestion(assessmentId, questionId);
      await api.questions.remove(questionId);
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete question failed");
      setDeleting(false);
    }
  }

  if (question.loading) return <LoadingState label="Loading question" />;
  if (question.error) return <ErrorState message={question.error} />;
  if (!question.data) return null;

  const dirty =
    form.question_text !== question.data.question_text ||
    form.type !== question.data.type;

  async function saveOnBlur() {
    if (!dirty || structureLocked) return;
    setSaving(true);
    setError("");
    try {
      await api.questions.update(questionId, form);
      await question.reload();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeType(newType: string) {
    if (structureLocked) return;
    const updated = { ...form, type: newType };
    setForm(updated);
    setSaving(true);
    setError("");
    try {
      await api.questions.update(questionId, updated);
      await question.reload();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
            Question editor
          </h3>
          {saving && <span className="text-[11px] text-ink-400">Saving…</span>}
        </div>
        {!structureLocked && (
          <Button
            variant="danger"
            size="sm"
            type="button"
            loading={deleting}
            onClick={remove}
          >
            Delete question
          </Button>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          Question type
        </p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={structureLocked}
              onClick={() => changeType(option.value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                form.type === option.value
                  ? "bg-navy-800 text-cream-50 shadow-soft"
                  : structureLocked
                    ? "cursor-not-allowed bg-cream-100 text-ink-400"
                    : "bg-cream-200 text-navy-800 hover:bg-cream-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          Question prompt
        </p>
        <textarea
          className={textareaClass}
          value={form.question_text ?? ""}
          readOnly={structureLocked}
          onChange={(e) =>
            !structureLocked &&
            setForm((current) => ({
              ...current,
              question_text: e.target.value,
            }))
          }
          onBlur={saveOnBlur}
        />
      </div>

      {error && <ErrorState message={error} />}

      <div className="border-t border-ink-100 pt-5">
        {question.data.type === "fill_blank" ? (
          <AnswerEditor questionId={questionId} structureLocked={structureLocked} />
        ) : (
          <OptionEditor questionId={questionId} type={question.data.type} structureLocked={structureLocked} />
        )}
      </div>
    </div>
  );
}
