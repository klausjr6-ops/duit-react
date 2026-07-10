import Card from "./Card";
import CircleProgress from "./CircleProgress";
import { useTheme } from "../lib/ThemeContext";

interface HealthCardProps {
  score: number;
}

export default function HealthCard({ score }: HealthCardProps) {
  const color = score >= 75 ? "#2dd4bf" : score >= 50 ? "#fbbf24" : "#fb7185";
  const { isDark } = useTheme();

  return (
    <Card accent="linear-gradient(90deg,#2dd4bf,#10b981)" className="flex flex-col items-center justify-center text-center" delay={0.05}>
      <p className={`mb-4 text-xs font-semibold tracking-widest ${isDark ? "text-slate-400" : "text-zinc-500"}`}>KESEHATAN KEUANGAN</p>
      <CircleProgress value={score} color={color}>
        <div className="flex flex-col items-center">
          <span className={`text-4xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{score}</span>
          <span className={`text-xs ${isDark ? "text-slate-400" : "text-zinc-500"}`}>/100</span>
        </div>
      </CircleProgress>
    </Card>
  );
}
