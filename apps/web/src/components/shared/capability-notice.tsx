import { Button } from "@/components/ui/button";

export function CapabilityNotice({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl2 bg-gold-50/70 p-5 ring-1 ring-gold-100">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700">Backend2.0 note</p>
      <h3 className="mt-1 font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
