import { useEffect, useState } from "react";

interface Slice {
  value: number;
  color: string;
  label?: string;
}

interface PizzaChartProps {
  slices: Slice[];
  size?: number;
  children?: React.ReactNode;
}

export default function PizzaChart({ slices, size = 180, children }: PizzaChartProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  // Build SVG path arcs for each slice
  const paths: { d: string; color: string; label?: string }[] = [];
  let startAngle = -Math.PI / 2; // start from top

  for (const slice of slices) {
    const fraction = slice.value / total;
    const sweepAngle = fraction * 2 * Math.PI * (animated ? 1 : 0);
    const endAngle = startAngle + sweepAngle;
    const largeArc = sweepAngle > Math.PI ? 1 : 0;

    if (sweepAngle <= 0) {
      startAngle = endAngle;
      continue;
    }

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const d = fraction >= 0.999
      ? `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
      : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

    paths.push({ d, color: slice.color, label: slice.label });
    startAngle = endAngle;
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Shadow for pizza depth */}
        <circle cx={cx + 2} cy={cy + 2} r={r} fill="rgba(0,0,0,0.08)" />
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.color}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            style={{
              transition: `d 1s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s`,
            }}
          >
            {p.label && <title>{p.label}</title>}
          </path>
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
