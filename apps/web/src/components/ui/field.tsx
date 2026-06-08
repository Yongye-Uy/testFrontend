export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border-0 bg-white px-3 text-sm text-ink-800 ring-1 ring-ink-200 outline-none transition placeholder:text-ink-400 hover:ring-ink-300 focus:ring-2 focus:ring-navy-400";

export const textareaClass =
  "min-h-24 w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-ink-800 ring-1 ring-ink-200 outline-none transition placeholder:text-ink-400 hover:ring-ink-300 focus:ring-2 focus:ring-navy-400";
