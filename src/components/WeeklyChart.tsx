import { useMemo } from "react";
import { useStore } from "../lib/store";

export default function WeeklyChart() {
  const { txs } = useStore();

  const data = useMemo(() => {
    const days: { label: string; date: string; in: number; out: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayTxs = txs.filter((t) => t.date === dateStr);
      const income = dayTxs.filter((t) => t.type === "in").reduce((a, t) => a + t.amt, 0);
      const expense = dayTxs.filter((t) => t.type === "out").reduce((a, t) => a + t.amt, 0);
      days.push({ label, date: dateStr, in: income, out: expense });
    }
    return days;
  }, [txs]);

  const max = Math.max(...data.flatMap((d) => [d.in, d.out]), 1);

  const getNiceMax = (v: number) => {
    if (v <= 50000) return 50000;
    if (v <= 100000) return 100000;
    if (v <= 500000) return Math.ceil(v / 100000) * 100000;
    if (v <= 1000000) return Math.ceil(v / 200000) * 200000;
    return Math.ceil(v / 500000) * 500000;
  };
  const niceMax = getNiceMax(max);

  const formatY = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}jt`;
    if (v >= 1000) return `${Math.round(v / 1000)}rb`;
    return v.toString();
  };

  const chartHeight = 240;
  const barWidth = 14;
  const gap = 4;
  const groupWidth = barWidth * 2 + gap;
  const chartPadLeft = 45;
  const groupGap = 40;
  const chartWidth = chartPadLeft + data.length * (groupWidth + groupGap);
  const gridLines = 5;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
          className="w-full"
          style={{ minWidth: "500px" }}
        >
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = (chartHeight / gridLines) * i;
            const val = niceMax - (niceMax / gridLines) * i;
            return (
              <g key={i}>
                <line
                  x1={chartPadLeft}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={chartPadLeft - 8}
                  y={y + 4}
                  fill="rgba(148,163,184,0.7)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {formatY(val)}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const groupX = chartPadLeft + i * (groupWidth + groupGap) + groupGap / 2;
            const inH = (d.in / niceMax) * chartHeight;
            const outH = (d.out / niceMax) * chartHeight;
            return (
              <g key={d.date}>
                <rect
                  x={groupX}
                  y={chartHeight - inH}
                  width={barWidth}
                  height={inH}
                  fill="#10b981"
                  rx="3"
                >
                  <title>Masuk: Rp {d.in.toLocaleString("id-ID")}</title>
                </rect>
                <rect
                  x={groupX + barWidth + gap}
                  y={chartHeight - outH}
                  width={barWidth}
                  height={outH}
                  fill="#f43f5e"
                  rx="3"
                >
                  <title>Keluar: Rp {d.out.toLocaleString("id-ID")}</title>
                </rect>
                <text
                  x={groupX + groupWidth / 2}
                  y={chartHeight + 20}
                  fill="rgba(148,163,184,0.9)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-300">Masuk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500" />
          <span className="text-xs text-slate-300">Keluar</span>
        </div>
      </div>
    </div>
  );
}