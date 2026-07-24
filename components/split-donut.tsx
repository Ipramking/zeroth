export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

// Lightweight SVG donut — no chart library (keeps the bundle small and the
// flaky-wifi build dependency-free). Segments are drawn as dash-offset arcs.
export function SplitDonut({
  segments,
  total,
  size = 176,
  stroke = 22,
}: {
  segments: DonutSegment[];
  total: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const centre = size / 2;
  let offset = 0;

  const centreLabel =
    total >= 1000 ? `₦${Math.round(total / 1000)}k` : `₦${total}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label="Money split chart"
    >
      <g transform={`rotate(-90 ${centre} ${centre})`}>
        <circle
          cx={centre}
          cy={centre}
          r={r}
          fill="none"
          stroke="hsl(var(--elevated))"
          strokeWidth={stroke}
        />
        {segments
          .filter((s) => s.value > 0)
          .map((s, i) => {
            const len = (s.value / sum) * c;
            const el = (
              <circle
                key={i}
                cx={centre}
                cy={centre}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </g>
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="fill-foreground font-display"
        style={{ fontSize: size * 0.17, fontWeight: 700 }}
      >
        {centreLabel}
      </text>
      <text
        x="50%"
        y="61%"
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: size * 0.08 }}
      >
        locked
      </text>
    </svg>
  );
}
