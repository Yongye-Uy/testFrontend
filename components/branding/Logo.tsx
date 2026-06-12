interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
  compact?: boolean;
  showTagline?: boolean;
}

/**
 * Official Paragon International University logo.
 *
 * - `light` variant = white mark on navy background (dark sidebar).
 * - `dark` variant  = navy mark on light background (light sidebar / login).
 */
export function Logo({
  className = "",
  variant = "dark",
  compact = false,
  showTagline = false,
}: LogoProps) {
  const isLight = variant === "light";
  const wordColor = isLight ? "text-cream-50" : "text-navy-900";
  const subColor = isLight ? "text-cream-200/85" : "text-ink-500";
  const markBg = "bg-navy-800";
  const markRing = isLight ? "ring-gold-500/40" : "ring-navy-100";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${markBg} h-10 w-10 rounded-lg flex items-center justify-center shadow-soft shrink-0 ring-1 ${markRing} overflow-hidden`}
      >
        <span className="font-serif-display text-cream-50 text-base font-bold tracking-wide">
          PIU
        </span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div
            className={`font-serif-display font-semibold text-[15px] ${wordColor} tracking-tight`}
          >
            Paragon Int&apos;l University
          </div>
          {showTagline ? (
            <div
              className={`text-[10px] uppercase tracking-[0.15em] ${subColor} font-medium mt-0.5`}
            >
              Phnom Penh, Cambodia
            </div>
          ) : (
            <div
              className={`text-[10px] uppercase tracking-[0.14em] ${subColor} font-medium`}
            >
              EPP · Learning Platform
            </div>
          )}
        </div>
      )}
    </div>
  );
}
