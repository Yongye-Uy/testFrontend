interface ProgressBarProps {
  /** 0..100 */
  value: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  tone?: "navy" | "gold" | "emerald";
}

export function ProgressBar({
  value,
  className = "",
  showLabel = false,
  size = "md",
  tone = "navy",
}: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  const h = size === "sm" ? "h-1.5" : "h-2";
  const fill =
    tone === "gold"
      ? "bg-gold-500"
      : tone === "emerald"
        ? "bg-emerald-500"
        : "bg-navy-700";

  return (
    <div className={className}>
      <div className={`w-full ${h} bg-ink-100 rounded-full overflow-hidden`}>
        <div
          className={`${h} ${fill} rounded-full transition-all duration-500`}
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 flex justify-between text-[11px] text-ink-500 font-medium">
          <span>{v}% complete</span>
        </div>
      )}
    </div>
  );
}
