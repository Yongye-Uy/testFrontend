"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { inputClass, textareaClass } from "@/components/ui/field";
import { api } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";

type DraftOption = {
  key: string;
  option_text: string;
  is_correct: boolean;
  feedback: string;
};

function emptyOption(): DraftOption {
  return {
    key: crypto.randomUUID(),
    option_text: "",
    is_correct: false,
    feedback: "",
  };
}

export function OptionEditor({
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
  const [draft, setDraft] = useState<DraftOption[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!options.data) return;
    const rows = options.data.options.map((option) => ({
      key: option.id,
      option_text: option.option_text,
      is_correct: option.is_correct,
      feedback: option.feedback ?? "",
    }));
    setDraft(
      rows.length > 0
        ? rows
        : type === "true_false"
          ? [
              {
                key: crypto.randomUUID(),
                option_text: "True",
                is_correct: false,
                feedback: "",
              },
              {
                key: crypto.randomUUID(),
                option_text: "False",
                is_correct: false,
                feedback: "",
              },
            ]
          : [],
    );
    setDirty(false);
  }, [options.data, type]);

  const correctCount = draft.filter((row) => row.is_correct).length;

  function updateRow(key: string, patch: Partial<DraftOption>) {
    setDirty(true);
    setDraft((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function saveWith(current: DraftOption[]) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const cleaned = current
        .map((row) => ({ ...row, option_text: row.option_text.trim() }))
        .filter((row) => row.option_text);
      if (cleaned.length === 0) return;
      for (const option of options.data?.options ?? []) {
        await api.questions.removeOption(option.id);
      }
      for (const row of cleaned) {
        await api.questions.addOption(questionId, {
          option_text: row.option_text,
          is_correct: row.is_correct,
          feedback: row.feedback.trim() || undefined,
        });
      }
      await options.reload();
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-save failed");
    } finally {
      setSaving(false);
    }
  }

  function addRow() {
    setDirty(true);
    setDraft((current) => [...current, emptyOption()]);
  }

  function removeRow(key: string) {
    const next = draft.filter((row) => row.key !== key);
    setDraft(next);
    setDirty(true);
    saveWith(next);
  }

  function toggleCorrectAndSave(key: string) {
    const next = draft.map((row) => {
      if (type === "mcq_multiple") {
        return row.key === key ? { ...row, is_correct: !row.is_correct } : row;
      }
      return { ...row, is_correct: row.key === key };
    });
    setDraft(next);
    setDirty(true);
    saveWith(next);
  }

  if (options.loading) return <LoadingState label="Loading options" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
            Answer choices
          </h3>
          {saving && <span className="text-[11px] text-ink-400">Saving…</span>}
        </div>
        <Button variant="secondary" size="sm" type="button" onClick={addRow}>
          + Add option
        </Button>
      </div>
      {options.error && <ErrorState message={options.error} />}
      {draft.length > 0 && correctCount === 0 && (
        <p className="text-xs text-gold-700">No option is marked correct yet.</p>
      )}
      {type === "mcq_single" && correctCount > 1 && (
        <p className="text-xs text-gold-700">
          Single-choice questions should have exactly one correct option.
        </p>
      )}
      <div className="space-y-3">
        {draft.map((row) => (
          <div key={row.key} className="rounded-xl border border-ink-100 bg-white p-3">
            <div className="flex items-start gap-3">
              <input
                type={type === "mcq_multiple" ? "checkbox" : "radio"}
                name={`correct-${questionId}`}
                checked={row.is_correct}
                onChange={() => toggleCorrectAndSave(row.key)}
                className="mt-2.5"
              />
              <div className="flex-1 space-y-2">
                <input
                  className={inputClass}
                  value={row.option_text}
                  placeholder="Option text"
                  onChange={(e) => updateRow(row.key, { option_text: e.target.value })}
                  onBlur={() => dirty && saveWith(draft)}
                />
                <textarea
                  className={textareaClass}
                  value={row.feedback}
                  placeholder="Feedback (optional)"
                  onChange={(e) => updateRow(row.key, { feedback: e.target.value })}
                  onBlur={() => dirty && saveWith(draft)}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => removeRow(row.key)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        {draft.length === 0 && (
          <p className="text-sm text-ink-500">No options yet. Add at least one.</p>
        )}
      </div>
      {error && <ErrorState message={error} />}
    </div>
  );
}
