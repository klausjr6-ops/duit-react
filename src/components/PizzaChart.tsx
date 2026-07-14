import { useEffect, useState } from "react";

interface Slice {
  value: number;
  color: string;
  label?: string;
  amount?: number;
  formattedAmount?: string;
}

export interface HoveredSliceData {
  label?: string;
  amount?: number;
  formattedAmount?: string;
  pct: number;
  color: string;
}

interface PizzaChartProps {
  slices: Slice[];
  size?: number;
  onHoverSlice?: (data: HoveredSliceData | null) => void;
}

export default function PizzaChart({ slices, size = 180, onHoverSlice }: PizzaChartProps) {
  const [animated, setAnimated] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  // Build SVG path arcs for each slice
  const paths: { d: string; color: string; label?: string; amount?: number; formattedAmount?: string; fraction: number }[] = [];
  let startAngle = -Math.PI / 2;

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

    const d =
      fraction >= 0.999
        ? `M${cx},${cy - r} A${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
        : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

    paths.push({ d, color: slice.color, label: slice.label, amount: slice.amount, formattedAmount: slice.formattedAmount, fraction });
    startAngle = endAngle;
  }

  const handleHover = (idx: number | null) => {
    setHoveredIdx(idx);
    if (idx !== null) {
      const p = paths[idx];
      if (p) onHoverSlice?.({ label: p.label, amount: p.amount, formattedAmount: p.formattedAmount, pct: Math.round(p.fraction * 100), color: p.color });
    } else {
      onHoverSlice?.(null);
    }
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx + 2} cy={cy + 2} r={r} fill="rgba(0,0,0,0.08)" />
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.color}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            onMouseEnter={() => handleHover(i)}
            onMouseLeave={() => handleHover(null)}
            style={{
              transition: `d 1s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s, opacity 0.2s, transform 0.2s`,
              transform: hoveredIdx === i ? "scale(1.03)" : hoveredIdx !== null ? "scale(0.97)" : "scale(1)",
              transformOrigin: `${cx}px ${cy}px`,
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.55 : 1,
              cursor: "pointer",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
