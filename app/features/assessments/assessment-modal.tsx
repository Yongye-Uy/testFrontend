"use client";

import { FormEvent, useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/app/services/api-client";
import type { Assessment } from "@/app/types/assessment";

// Lightweight title/description editor for an existing assessment. New
// assessments are authored in the Assessment Builder.
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
