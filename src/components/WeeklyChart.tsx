import { useMemo, useRef, useState } from "react";
import { addDaysToDateKey, todayStr, useStore } from "../lib/store";
import { useTheme } from "../lib/ThemeContext";

function weekdayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export default function WeeklyChart() {
  const { txs } = useStore();
  const { isDark } = useTheme();
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ date: string; label: string; value: number; color: string; x: number; y: number } | null>(null);

  const setHover = (event: React.MouseEvent<SVGRectElement> | React.FocusEvent<SVGRectElement>, data: { date: string; label: string; value: number; color: string }) => {
    const container = chartAreaRef.current?.getBoundingClientRect();
    if (!container) return;
    const target = event.currentTarget.getBoundingClientRect();
    const x = "clientX" in event ? event.clientX - container.left : target.left - container.left + target.width / 2;
    const y = "clientY" in event ? event.clientY - container.top : target.top - container.top;
    setHovered({ ...data, x, y });
  };

  const data = useMemo(() => {
    const days: { label: string; date: string; in: number; out: number }[] = [];
    const today = todayStr();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDaysToDateKey(today, -offset);
      const dayTransactions = txs.filter((transaction) => transaction.date === date && !transaction.isCarryForward);
      const income = dayTransactions
        .filter((transaction) => transaction.type === "in" && !transaction.transferId && !transaction.goalId)
        .reduce((amount, transaction) => amount + transaction.amt, 0);
      const expense = dayTransactions
        .filter((transaction) => transaction.type === "out" && !transaction.transferId && !transaction.goalId)
        .reduce((amount, transaction) => amount + transaction.amt, 0);
      days.push({ label: weekdayLabel(date), date, in: income, out: expense });
    }

    return days;
  }, [txs]);

  const max = Math.max(...data.flatMap((day) => [day.in, day.out]), 1);

  const getNiceMax = (value: number) => {
    if (value <= 50000) return 50000;
    if (value <= 100000) return 100000;
    if (value <= 500000) return Math.ceil(value / 100000) * 100000;
    if (value <= 1000000) return Math.ceil(value / 200000) * 200000;
    return Math.ceil(value / 500000) * 500000;
  };
  const niceMax = getNiceMax(max);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}jt`;
    if (value >= 1000) return `${Math.round(value / 1000)}rb`;
    return value.toString();
  };

  const chartPadTop = 16; // room for top Y-axis label
  const chartPadBottom = 36; // room for bottom day labels
  const chartPadLeft = 45;
  const barAreaHeight = 240;
  const svgHeight = chartPadTop + barAreaHeight + chartPadBottom;
  const barWidth = 14;
  const barGap = 4;
  const groupWidth = barWidth * 2 + barGap;
  const groupGap = 40;
  const chartWidth = chartPadLeft + data.length * (groupWidth + groupGap);
  const gridLines = 5;
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.10)";
  const axisColor = isDark ? "rgba(148,163,184,0.80)" : "rgba(71,85,105,0.80)";
  const legendColor = isDark ? "text-slate-300" : "text-zinc-600";

  return (
    <div className="w-full">
      <div ref={chartAreaRef} className="relative overflow-x-auto" onMouseLeave={() => setHovered(null)}>
        <svg
          viewBox={`0 0 ${chartWidth} ${svgHeight}`}
          className="w-full"
          style={{ minWidth: "500px" }}
          role="img"
          aria-label="Grafik pemasukan dan pengeluaran tujuh hari terakhir"
          onMouseMove={(event) => {
            if (!(event.target instanceof Element) || event.target.tagName.toLowerCase() !== "rect") setHovered(null);
          }}
        >
          {Array.from({ length: gridLines + 1 }).map((_, index) => {
            const y = chartPadTop + (barAreaHeight / gridLines) * index;
            const value = niceMax - (niceMax / gridLines) * index;
            return (
              <g key={index}>
                <line
                  x1={chartPadLeft}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth="1"
                />
                <text
                  x={chartPadLeft - 8}
                  y={y + 4}
                  fill={axisColor}
                  fontSize="10"
                  textAnchor="end"
                >
                  {formatYAxis(value)}
                </text>
              </g>
            );
          })}

          {data.map((day, index) => {
            const groupX = chartPadLeft + index * (groupWidth + groupGap) + groupGap / 2;
            const incomeHeight = (day.in / niceMax) * barAreaHeight;
            const expenseHeight = (day.out / niceMax) * barAreaHeight;
            const barBottom = chartPadTop + barAreaHeight;

            return (
              <g key={day.date}>
                <rect
                  x={groupX}
                  y={barBottom - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  fill="#10b981"
                  rx="3"
                  onMouseEnter={(event) => setHover(event, { date: day.date, label: "Pemasukan", value: day.in, color: "#10b981" })}
                  onMouseMove={(event) => setHover(event, { date: day.date, label: "Pemasukan", value: day.in, color: "#10b981" })}
                  onFocus={(event) => setHover(event, { date: day.date, label: "Pemasukan", value: day.in, color: "#10b981" })}
                  onClick={(event) => setHover(event, { date: day.date, label: "Pemasukan", value: day.in, color: "#10b981" })}
                  tabIndex={0}
                  role="button"
                  aria-label={`Pemasukan ${day.date}: Rp${day.in.toLocaleString("id-ID")}`}
                >
                  <title>Masuk: Rp {day.in.toLocaleString("id-ID")}</title>
                </rect>
                <rect
                  x={groupX + barWidth + barGap}
                  y={barBottom - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  fill="#f43f5e"
                  rx="3"
                  onMouseEnter={(event) => setHover(event, { date: day.date, label: "Pengeluaran", value: day.out, color: "#f43f5e" })}
                  onMouseMove={(event) => setHover(event, { date: day.date, label: "Pengeluaran", value: day.out, color: "#f43f5e" })}
                  onFocus={(event) => setHover(event, { date: day.date, label: "Pengeluaran", value: day.out, color: "#f43f5e" })}
                  onClick={(event) => setHover(event, { date: day.date, label: "Pengeluaran", value: day.out, color: "#f43f5e" })}
                  tabIndex={0}
                  role="button"
                  aria-label={`Pengeluaran ${day.date}: Rp${day.out.toLocaleString("id-ID")}`}
                >
                  <title>Keluar: Rp {day.out.toLocaleString("id-ID")}</title>
                </rect>
                <text
                  x={groupX + groupWidth / 2}
                  y={barBottom + 20}
                  fill={axisColor}
                  fontSize="11"
                  textAnchor="middle"
                >
                  {day.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hovered && (
          <div
            className={`pointer-events-none absolute z-10 rounded-xl border px-3 py-2 text-center shadow-lg backdrop-blur ${isDark ? "border-white/10 bg-slate-900/90 text-white" : "border-white bg-white/90 text-zinc-900"}`}
            style={{
              left: Math.min(Math.max(8, hovered.x + 12), Math.max(8, (chartAreaRef.current?.clientWidth || 0) - 156)),
              top: Math.max(8, hovered.y - 76),
            }}
          >
            <p className="text-[10px] font-extrabold tracking-wider" style={{ color: hovered.color }}>{hovered.label.toUpperCase()}</p>
            <p className="mt-0.5 text-sm font-extrabold">Rp {hovered.value.toLocaleString("id-ID")}</p>
            <p className={`mt-0.5 text-[10px] ${isDark ? "text-slate-400" : "text-zinc-500"}`}>{hovered.date}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className={`text-xs ${legendColor}`}>Masuk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className={`text-xs ${legendColor}`}>Keluar</span>
        </div>
      </div>
    </div>
  );
}
