"use client";

export function ProgressRing({
  percent,
  size = 64,
  stroke = 10,
  accentColor,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  accentColor?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = accentColor ?? (
    percent >= 100 ? "#16a34a" : percent >= 50 ? "#0f2c5c" : "#b45309"
  );
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.max(9, Math.round(size * 0.22));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      {/* Progress arc — starts at top (rotate -90) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* Label */}
      <text
        x={cx}
        y={cy}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fill="#0f2c5c"
      >
        {percent}%
      </text>
  
    </svg>
  );
}
