import type { QuestionType } from "@/app/types/assessment";

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "mcq_single", label: "Single choice" },
  { value: "mcq_multiple", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the blank" },
];

export function questionTypeLabel(type: string) {
  return (
    QUESTION_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
  );
}

export function formatDuration(seconds?: number) {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds))
    return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}
