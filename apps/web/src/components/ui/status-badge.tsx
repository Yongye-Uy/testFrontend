const tones: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-ink-100 text-ink-600 ring-ink-200",
  pending: "bg-gold-50 text-gold-700 ring-gold-200",
  draft: "bg-ink-100 text-ink-700 ring-ink-200",
  archived: "bg-ink-100 text-ink-600 ring-ink-200",
  generation: "bg-navy-50 text-navy-700 ring-navy-200",
  general: "bg-gold-50 text-gold-700 ring-gold-200",
  super_admin: "bg-navy-50 text-navy-700 ring-navy-200",
  director: "bg-gold-50 text-gold-700 ring-gold-200",
  lecturer: "bg-purple-50 text-purple-700 ring-purple-200",
  student: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const tone = tones[value] ?? "bg-ink-100 text-ink-700 ring-ink-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label ?? value.replace("_", " ")}
    </span>
  );
}
