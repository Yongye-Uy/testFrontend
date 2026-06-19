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

  function toggleCorrect(key: string) {
    setDirty(true);
    setDraft((current) =>
      current.map((row) => {
        if (type === "mcq_multiple") {
          return row.key === key
            ? { ...row, is_correct: !row.is_correct }
            : row;
        }
        return { ...row, is_correct: row.key === key };
      }),
    );
  }

  function addRow() {
    setDirty(true);
    setDraft((current) => [...current, emptyOption()]);
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
        .map((row) => ({ ...row, option_text: row.option_text.trim() }))
        .filter((row) => row.option_text);
      if (cleaned.length === 0) throw new Error("Add at least one option.");
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
      setError(err instanceof Error ? err.message : "Save options failed");
    } finally {
      setSaving(false);
    }
  }

  if (options.loading) return <LoadingState label="Loading options" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink-500">
          Answer choices
        </h3>
        <Button variant="secondary" size="sm" type="button" onClick={addRow}>
          + Add option
        </Button>
      </div>
      {options.error && <ErrorState message={options.error} />}
      {draft.length > 0 && correctCount === 0 && (
        <p className="text-xs text-gold-700">
          No option is marked correct yet.
        </p>
      )}
      {type === "mcq_single" && correctCount > 1 && (
        <p className="text-xs text-gold-700">
          Single-choice questions should have exactly one correct option.
        </p>
      )}
      <div className="space-y-3">
        {draft.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-ink-100 bg-white p-3"
          >
            <div className="flex items-start gap-3">
              <input
                type={type === "mcq_multiple" ? "checkbox" : "radio"}
                name={`correct-${questionId}`}
                checked={row.is_correct}
                onChange={() => toggleCorrect(row.key)}
                className="mt-2.5"
              />
              <div className="flex-1 space-y-2">
                <input
                  className={inputClass}
                  value={row.option_text}
                  placeholder="Option text"
                  onChange={(e) =>
                    updateRow(row.key, { option_text: e.target.value })
                  }
                />
                <textarea
                  className={textareaClass}
                  value={row.feedback}
                  placeholder="Feedback (optional)"
                  onChange={(e) =>
                    updateRow(row.key, { feedback: e.target.value })
                  }
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
          <p className="text-sm text-ink-500">
            No options yet. Add at least one.
          </p>
        )}
      </div>
      {error && <ErrorState message={error} />}
      <div className="flex justify-end">
        <Button loading={saving} type="button" onClick={save} disabled={!dirty}>
          Save options
        </Button>
      </div>
    </div>
  );
}
