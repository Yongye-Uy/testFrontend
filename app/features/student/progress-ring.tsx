"use client";

export function ProgressRing({
  percent,
  size = 64,
  stroke = 5,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color =
    percent >= 100 ? "#16a34a" : percent >= 50 ? "#0f2c5c" : "#b45309";

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="rotate-90"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
        fontSize={size < 56 ? 10 : 13}
        fontWeight="700"
        fill="#0f2c5c"
      >
        {percent}%
      </text>
    </svg>
  );
}
