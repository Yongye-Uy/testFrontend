"use client";

import { FormEvent, useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { formatDuration } from "./assessment-utils";
import type {
  AssessmentOptions,
  AssessmentOptionsInput,
} from "@/types/assessment";

function toFormState(options: AssessmentOptions | null): AssessmentOptionsInput {
  return {
    require_pass_threshold: options?.require_pass_threshold ?? false,
    pass_threshold_percent: options?.pass_threshold_percent ?? 70,
    require_time_limit: options?.require_time_limit ?? false,
    time_limit_seconds: options?.time_limit_seconds ?? 0,
    random_questions_count: options?.random_questions_count ?? 0,
    shuffle_questions: options?.shuffle_questions ?? false,
    shuffle_options: options?.shuffle_options ?? false,
  };
}

export function AssessmentSettingsCard({
  assessmentId,
  options,
  onDone,
}: {
  assessmentId: string;
  options: AssessmentOptions | null;
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-xl font-semibold text-navy-900">
              Assessment settings
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Configure pass threshold, time limit, question randomization,
              and shuffling.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setOpen(true)}
            disabled={!options}
          >
            Edit settings
          </Button>
        </div>
        {options && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingMetric
              label="Pass threshold"
              value={
                options.require_pass_threshold
                  ? `${options.pass_threshold_percent}%`
                  : "Not required"
              }
            />
            <SettingMetric
              label="Time limit"
              value={
                options.require_time_limit
                  ? formatDuration(options.time_limit_seconds)
                  : "No limit"
              }
            />
            <SettingMetric
              label="Random question count"
              value={
                options.random_questions_count
                  ? String(options.random_questions_count)
                  : "All questions"
              }
            />
            <SettingMetric
              label="Shuffle questions"
              value={options.shuffle_questions ? "On" : "Off"}
            />
            <SettingMetric
              label="Shuffle options"
              value={options.shuffle_options ? "On" : "Off"}
            />
          </div>
        )}
      </Card>
      <AssessmentSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={onDone}
        assessmentId={assessmentId}
        initial={options}
      />
    </>
  );
}

function AssessmentSettingsModal({
  open,
  onClose,
  onDone,
  assessmentId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  assessmentId: string;
  initial: AssessmentOptions | null;
}) {
  const [form, setForm] = useState<AssessmentOptionsInput>(
    toFormState(initial),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toFormState(initial));
    setError("");
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.assessments.updateOptions(assessmentId, form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save settings failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit assessment settings"
      eyebrow="Lecturer · Assessment Settings"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            checked={form.require_pass_threshold}
            onChange={(e) =>
              setForm({ ...form, require_pass_threshold: e.target.checked })
            }
          />
          Require a pass threshold
        </label>
        <Field
          label="Pass threshold (%)"
          hint="1-100. Values outside this range fall back to 70%."
        >
          <input
            type="number"
            min={1}
            max={100}
            className={inputClass}
            value={form.pass_threshold_percent}
            disabled={!form.require_pass_threshold}
            onChange={(e) =>
              setForm({
                ...form,
                pass_threshold_percent: Number(e.target.value),
              })
            }
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            checked={form.require_time_limit}
            onChange={(e) =>
              setForm({ ...form, require_time_limit: e.target.checked })
            }
          />
          Require a time limit
        </label>
        <Field label="Time limit (seconds)" hint="Set to 0 to clear the limit.">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.time_limit_seconds}
            disabled={!form.require_time_limit}
            onChange={(e) =>
              setForm({
                ...form,
                time_limit_seconds: Number(e.target.value),
              })
            }
          />
        </Field>

        <Field
          label="Random question count"
          hint="0 = use all questions in the assessment."
        >
          <input
            type="number"
            min={0}
            className={inputClass}
            value={form.random_questions_count}
            onChange={(e) =>
              setForm({
                ...form,
                random_questions_count: Number(e.target.value),
              })
            }
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            checked={form.shuffle_questions}
            onChange={(e) =>
              setForm({ ...form, shuffle_questions: e.target.checked })
            }
          />
          Shuffle question order for each attempt
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <input
            type="checkbox"
            checked={form.shuffle_options}
            onChange={(e) =>
              setForm({ ...form, shuffle_options: e.target.checked })
            }
          />
          Shuffle option order for each attempt
        </label>

        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Save settings</Button>
        </div>
      </form>
    </Modal>
  );
}

function SettingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}
