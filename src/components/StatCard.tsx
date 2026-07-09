import Card from "./Card";
import { useCountUp } from "../hooks/useCountUp";
import { formatRupiah } from "../lib/format";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  accent: string;
  suffix?: string;
  delay?: number;
}

export default function StatCard({ label, value, color, accent, suffix, delay = 0 }: StatCardProps) {
  const animated = useCountUp(value, 1400, [value]);

  return (
    <Card accent={accent} delay={delay}>
      <p className="mb-3 text-xs font-semibold tracking-widest text-slate-400">{label}</p>
      <p className={`text-3xl font-extrabold sm:text-4xl ${color}`}>{formatRupiah(animated)}</p>
      {suffix && <p className="mt-2 text-sm text-slate-400">{suffix}</p>}
    </Card>
  );
}
