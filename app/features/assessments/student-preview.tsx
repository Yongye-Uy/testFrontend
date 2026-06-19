"use client";

import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";
import type { Question } from "@/app/types/assessment";
import { questionTypeLabel } from "./assessment-utils";

// StudentPreviewModal renders the assessment exactly as a student would see it:
// prompts and answer choices, with no correct answers or feedback revealed.
// Selections are local only — nothing is submitted or graded.
export function StudentPreviewModal({
  open,
  onClose,
  assessmentId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  assessmentId: string;
  title: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || "Untitled assessment"}
      description="Preview — answers are not saved or graded."
      eyebrow="Preview as student"
      size="lg"
      footer={
        <Button variant="secondary" type="button" onClick={onClose}>
          Close preview
        </Button>
      }
    >
      <PreviewBody assessmentId={assessmentId} />
    </Modal>
  );
}

function PreviewBody({ assessmentId }: { assessmentId: string }) {
  const questions = useAsync(
    () => api.assessments.questions(assessmentId),
    [assessmentId],
  );

  if (questions.loading) return <LoadingState label="Loading preview" />;
  if (questions.error) return <ErrorState message={questions.error} />;

  const rows = questions.data?.questions ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No questions to preview"
        description="Add questions to the assessment to see the student view."
      />
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((question, index) => (
        <PreviewQuestion key={question.id} question={question} index={index} />
      ))}
    </div>
  );
}

function PreviewQuestion({
  question,
  index,
}: {
  question: Question;
  index: number;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gold-700">Q{index + 1}</span>
        <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-600">
          {questionTypeLabel(question.type)}
        </span>
      </div>
      <p className="mt-2 text-[15px] font-medium text-navy-900">
        {question.question_text || "Untitled question"}
      </p>
      <div className="mt-4">
        {question.type === "fill_blank" ? (
          <input
            className={inputClass}
            placeholder="Type your answer…"
            aria-label={`Answer for question ${index + 1}`}
          />
        ) : (
          <PreviewChoices questionId={question.id} type={question.type} />
        )}
      </div>
    </div>
  );
}

function PreviewChoices({
  questionId,
  type,
}: {
  questionId: string;
  type: string;
}) {
  const options = useAsync(
    () => api.questions.listOptions(questionId),
    [questionId],
  );
  // Local-only selection; never persisted.
  const [selected, setSelected] = useState<string[]>([]);
  const multiple = type === "mcq_multiple";

  if (options.loading) return <LoadingState label="Loading choices" />;
  if (options.error) return <ErrorState message={options.error} />;

  const rows = options.data?.options ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-ink-500">No answer choices yet.</p>;
  }

  function toggle(id: string) {
    setSelected((current) => {
      if (multiple) {
        return current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id];
      }
      return [id];
    });
  }

  return (
    <div className="space-y-2">
      {rows.map((option, letter) => {
        const checked = selected.includes(option.id);
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
              checked
                ? "border-navy-300 bg-navy-50"
                : "border-ink-100 bg-cream-50 hover:border-ink-200"
            }`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={`preview-${questionId}`}
              checked={checked}
              onChange={() => toggle(option.id)}
            />
            <span className="text-xs font-bold text-ink-400">
              {String.fromCharCode(65 + letter)}
            </span>
            <span className="text-navy-900">{option.option_text}</span>
          </label>
        );
      })}
    </div>
  );
}
