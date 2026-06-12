"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";
import { questionTypeLabel } from "./assessment-utils";
import { QuestionEditor } from "./question-editor";

export function QuestionsPanel({ assessmentId }: { assessmentId: string }) {
  const questions = useAsync(
    () => api.assessments.questions(assessmentId),
    [assessmentId],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!questions.data) return;
    const rows = questions.data.questions;
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [questions.data, selectedId]);

  async function addQuestion() {
    setAdding(true);
    setError("");
    try {
      const question = await api.questions.create({
        question_text: "New question",
        type: "mcq_single",
      });
      await api.assessments.addQuestion(assessmentId, question.id);
      await questions.reload();
      setSelectedId(question.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add question failed");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleted() {
    setSelectedId(null);
    await questions.reload();
  }

  if (questions.loading) return <LoadingState label="Loading questions" />;

  const rows = questions.data?.questions ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-ink-100 bg-cream-100 px-4 py-3">
          <h2 className="font-semibold text-navy-900">
            Questions ({rows.length})
          </h2>
        </div>
        {(questions.error || error) && (
          <div className="p-4">
            <ErrorState message={questions.error || error} />
          </div>
        )}
        <div className="max-h-[520px] divide-y divide-ink-100 overflow-y-auto">
          {rows.map((question, index) => (
            <button
              key={question.id}
              type="button"
              onClick={() => setSelectedId(question.id)}
              className={`block w-full px-4 py-3 text-left transition ${
                selectedId === question.id
                  ? "bg-navy-50"
                  : "hover:bg-cream-100"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gold-700">
                  Q{index + 1}
                </span>
                <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-600">
                  {questionTypeLabel(question.type)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-navy-900">
                {question.question_text || "Untitled question"}
              </p>
            </button>
          ))}
        </div>
        <div className="border-t border-ink-100 p-3">
          <Button
            variant="secondary"
            className="w-full"
            loading={adding}
            type="button"
            onClick={addQuestion}
          >
            + Add question
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        {rows.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="Add your first question to start building this assessment."
          />
        ) : selectedId ? (
          <QuestionEditor
            assessmentId={assessmentId}
            questionId={selectedId}
            onSaved={questions.reload}
            onDeleted={handleDeleted}
          />
        ) : null}
      </Card>
    </div>
  );
}
