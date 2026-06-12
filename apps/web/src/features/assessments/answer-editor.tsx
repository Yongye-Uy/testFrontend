"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";

type DraftAnswer = { key: string; accepted_answer: string };

export function AnswerEditor({ questionId }: { questionId: string }) {
  const answers = useAsync(
    () => api.questions.listAnswers(questionId),
    [questionId],
  );
  const [draft, setDraft] = useState<DraftAnswer[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!answers.data) return;
    setDraft(
      answers.data.answers.map((answer) => ({
        key: answer.id,
        accepted_answer: answer.accepted_answer,
      })),
    );
    setDirty(false);
  }, [answers.data]);

  function updateRow(key: string, value: string) {
    setDirty(true);
    setDraft((current) =>
      current.map((row) =>
        row.key === key ? { ...row, accepted_answer: value } : row,
      ),
    );
  }

  function addRow() {
    setDirty(true);
    setDraft((current) => [
      ...current,
      { key: crypto.randomUUID(), accepted_answer: "" },
    ]);
  }

  function removeRow(key: string) {
    setDirty(true);
    setDraft((current) => current.filter((row) => row.key !== key));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const cleaned = draft
        .map((row) => row.accepted_answer.trim())
        .filter(Boolean);
      if (cleaned.length === 0)
        throw new Error("Add at least one accepted answer.");
      for (const answer of answers.data?.answers ?? []) {
        await api.questions.removeAnswer(answer.id);
      }
      for (const value of cleaned) {
        await api.questions.addAnswer(questionId, value);
      }
      await answers.reload();
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save answers failed");
    } finally {
      setSaving(false);
    }
  }

  if (answers.loading) return <LoadingState label="Loading accepted answers" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
          Accepted answers
        </h3>
        <Button variant="secondary" size="sm" type="button" onClick={addRow}>
          + Add answer
        </Button>
      </div>
      {answers.error && <ErrorState message={answers.error} />}
      <p className="text-xs text-ink-500">
        A student response is graded correct if it matches any one of these
        accepted answers.
      </p>
      <div className="space-y-2">
        {draft.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <input
              className={inputClass}
              value={row.accepted_answer}
              placeholder="Accepted answer"
              onChange={(e) => updateRow(row.key, e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => removeRow(row.key)}
            >
              Remove
            </Button>
          </div>
        ))}
        {draft.length === 0 && (
          <p className="text-sm text-ink-500">
            No accepted answers yet. Add at least one.
          </p>
        )}
      </div>
      {error && <ErrorState message={error} />}
      <div className="flex justify-end">
        <Button
          loading={saving}
          type="button"
          onClick={save}
          disabled={!dirty}
        >
          Save answers
        </Button>
      </div>
    </div>
  );
}
