import React from "react";

interface ProgressRingProps {
  /** 0..100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  tone?: "navy" | "gold" | "emerald" | "rose";
  label?: React.ReactNode;
}

const toneColor: Record<string, string> = {
  navy: "#1E3A8A",
  gold: "#D4A017",
  emerald: "#059669",
  rose: "#E11D48",
};

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className = "",
  tone = "navy",
  label,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneColor[tone]}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {label ?? (
          <span className="text-sm font-semibold text-navy-800">{v}%</span>
        )}
      </div>
    </div>
  );
}
