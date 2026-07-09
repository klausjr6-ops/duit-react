import { useEffect, useState } from "react";

interface Segment {
  value: number;
  color: string;
}

interface MultiDonutProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export default function MultiDonut({ segments, size = 200, strokeWidth = 22, children }: MultiDonutProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  let offsetAcc = 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(148,163,184,0.1)" strokeWidth={strokeWidth} fill="none" />
        {segments.map((seg, i) => {
          const fraction = seg.value / total;
          const dash = animated ? fraction * circumference : 0;
          const gap = circumference - dash;
          const rotationOffset = offsetAcc;
          offsetAcc += fraction * circumference;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-rotationOffset}
              strokeLinecap="butt"
              style={{
                transition: `stroke-dasharray 1.2s cubic-bezier(0.22,1,0.36,1) ${i * 0.15}s`,
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
