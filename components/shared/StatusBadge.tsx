type Status =
  | "active"
  | "inactive"
  | "pending"
  | "completed"
  | "in-progress"
  | "locked"
  | "unlocked"
  | "archived"
  | "draft"
  | "published"
  | "available"
  | "at-risk"
  | "on-track"
  | "behind"
  | "critical"
  | "healthy"
  | "degraded"
  | "down"
  | "passed"
  | "failed"
  | "retake-required"
  | "assigned"
  | "retaking"
  | "submitted";

interface StatusBadgeProps {
  status: Status | string;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

const styles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-ink-100 text-ink-600 ring-ink-200",
  pending: "bg-gold-50 text-gold-700 ring-gold-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "in-progress": "bg-navy-50 text-navy-700 ring-navy-200",
  locked: "bg-ink-100 text-ink-500 ring-ink-200",
  unlocked: "bg-navy-50 text-navy-700 ring-navy-200",
  archived: "bg-ink-100 text-ink-600 ring-ink-200",
  draft: "bg-ink-100 text-ink-700 ring-ink-300",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  available: "bg-navy-50 text-navy-700 ring-navy-200",
  "at-risk": "bg-rose-50 text-rose-700 ring-rose-200",
  "on-track": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  behind: "bg-gold-50 text-gold-800 ring-gold-200",
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  degraded: "bg-gold-50 text-gold-800 ring-gold-200",
  down: "bg-rose-50 text-rose-700 ring-rose-200",
  passed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  "retake-required": "bg-gold-50 text-gold-800 ring-gold-200",
  assigned: "bg-navy-50 text-navy-700 ring-navy-200",
  retaking: "bg-gold-50 text-gold-800 ring-gold-200",
  submitted: "bg-navy-50 text-navy-700 ring-navy-200",
};

const displayLabels: Record<string, string> = {
  "retake-required": "Retake Required",
  assigned: "Assigned to Retake Batch",
  retaking: "Retaking",
  submitted: "Submitted",
};

export function StatusBadge({
  status,
  size = "sm",
  className = "",
  label,
}: StatusBadgeProps) {
  const tone = styles[status] || "bg-ink-100 text-ink-700 ring-ink-200";
  const sizeCls =
    size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  const display = label ?? displayLabels[status] ?? status.replace("-", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-medium capitalize ${tone} ${sizeCls} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {display}
    </span>
  );
}
