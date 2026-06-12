interface AngkorMotifProps {
  className?: string;
  size?: number;
}

/**
 * Refined Angkor-inspired geometric motif — stacked diamond/lotus pattern.
 * Used as a small decorative accent on auth screens and logo marks.
 */
export function AngkorMotif({ className = "", size = 24 }: AngkorMotifProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M16 2 L24 10 L16 18 L8 10 Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M16 14 L22 20 L16 26 L10 20 Z"
        fill="currentColor"
        opacity="0.55"
      />
      <circle cx="16" cy="16" r="1.6" fill="#FAF9F6" />
    </svg>
  );
}

interface CornerOrnamentProps {
  className?: string;
  flip?: boolean;
}

/** Subtle decorative corner used in auth/login backgrounds. */
export function CornerOrnament({
  className = "",
  flip = false,
}: CornerOrnamentProps) {
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      className={className}
      style={{
        transform: flip ? "scale(-1, -1)" : undefined,
      }}
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
        <path d="M0 20 L120 20" />
        <path d="M0 28 L100 28" />
        <path d="M20 0 L20 120" />
        <path d="M28 0 L28 100" />
        <path d="M20 20 L40 20 L40 40 L20 40 Z" />
        <path d="M48 20 L60 20 M48 28 L60 28" />
        <path d="M20 48 L20 60 M28 48 L28 60" />
      </g>
      <path
        d="M28 28 L36 36 L28 44 L20 36 Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}
