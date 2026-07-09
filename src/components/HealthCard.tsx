import Card from "./Card";
import CircleProgress from "./CircleProgress";

interface HealthCardProps {
  score: number;
}

export default function HealthCard({ score }: HealthCardProps) {
  const color = score >= 75 ? "#2dd4bf" : score >= 50 ? "#fbbf24" : "#fb7185";

  return (
    <Card accent="linear-gradient(90deg,#2dd4bf,#10b981)" className="flex flex-col items-center justify-center text-center" delay={0.05}>
      <p className="mb-4 text-xs font-semibold tracking-widest text-slate-400">KESEHATAN KEUANGAN</p>
      <CircleProgress value={score} color={color}>
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-400">/100</span>
        </div>
      </CircleProgress>
    </Card>
  );
}
