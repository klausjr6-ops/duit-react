import { useMemo } from "react";
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

  const data = useMemo(() => {
    const days: { label: string; date: string; in: number; out: number }[] = [];
    const today = todayStr();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDaysToDateKey(today, -offset);
      const dayTransactions = txs.filter((transaction) => transaction.date === date);
      const income = dayTransactions
        .filter((transaction) => transaction.type === "in" && !transaction.goalId)
        .reduce((amount, transaction) => amount + transaction.amt, 0);
      const expense = dayTransactions
        .filter((transaction) => transaction.type === "out" && !transaction.goalId)
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

  const chartHeight = 240;
  const barWidth = 14;
  const barGap = 4;
  const groupWidth = barWidth * 2 + barGap;
  const chartPadLeft = 45;
  const groupGap = 40;
  const chartWidth = chartPadLeft + data.length * (groupWidth + groupGap);
  const gridLines = 5;
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.10)";
  const axisColor = isDark ? "rgba(148,163,184,0.80)" : "rgba(71,85,105,0.80)";
  const legendColor = isDark ? "text-slate-300" : "text-zinc-600";

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
          className="w-full"
          style={{ minWidth: "500px" }}
          role="img"
          aria-label="Grafik pemasukan dan pengeluaran tujuh hari terakhir"
        >
          {Array.from({ length: gridLines + 1 }).map((_, index) => {
            const y = (chartHeight / gridLines) * index;
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
            const incomeHeight = (day.in / niceMax) * chartHeight;
            const expenseHeight = (day.out / niceMax) * chartHeight;

            return (
              <g key={day.date}>
                <rect
                  x={groupX}
                  y={chartHeight - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  fill="#10b981"
                  rx="3"
                >
                  <title>Masuk: Rp {day.in.toLocaleString("id-ID")}</title>
                </rect>
                <rect
                  x={groupX + barWidth + barGap}
                  y={chartHeight - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  fill="#f43f5e"
                  rx="3"
                >
                  <title>Keluar: Rp {day.out.toLocaleString("id-ID")}</title>
                </rect>
                <text
                  x={groupX + groupWidth / 2}
                  y={chartHeight + 20}
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
