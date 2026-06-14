"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";
import type { Assessment } from "@/types/assessment";

export function AssessmentsPage() {
  const [open, setOpen] = useState(false);
  const assessments = useAsync(() => api.assessments.list(), []);

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Create and manage assessments for your classes: author questions, configure settings, and review student submissions."
        breadcrumbs={[{ label: "Home" }, { label: "Assessments" }]}
        actions={
          <Button onClick={() => setOpen(true)}>Create assessment</Button>
        }
      />
      {assessments.loading && <LoadingState label="Loading assessments" />}
      {assessments.error && <ErrorState message={assessments.error} />}
      {assessments.data?.assessments.length === 0 && (
        <EmptyState
          title="No assessments yet"
          description="Create your first assessment to start authoring questions."
        />
      )}
      {(assessments.data?.assessments.length ?? 0) > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {assessments.data?.assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {assessment.title}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {assessment.description || "No description"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={assessment.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {assessment.question_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/assessments/${assessment.id}`}
                        className="font-semibold text-navy-700"
                      >
                        Open assessment
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <AssessmentModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={assessments.reload}
      />
    </>
  );
}

export function AssessmentModal({
  open,
  onClose,
  onDone,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  initial?: Assessment;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
    });
    setError("");
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial) await api.assessments.update(initial.id, form);
      else await api.assessments.create(form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save assessment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit assessment" : "Create assessment"}
      eyebrow="Lecturer · Assessments"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
