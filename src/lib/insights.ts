import { addDaysToDateKey, type Goal, type Transaction, type Wallet } from "./store";

export type InsightTone = "attention" | "warning" | "positive";
export type InsightAction = "finance" | "goal";

export interface FinancialInsight {
  id: string;
  tone: InsightTone;
  title: string;
  message: string;
  actionLabel: string;
  action: InsightAction;
}

interface InsightInput {
  txs: Transaction[];
  wallets: Wallet[];
  goals: Goal[];
  todayKey: string;
  inMonth: number;
  outMonth: number;
}

function totalExpenseInRange(txs: Transaction[], fromDate: string, toDate: string, category?: string): number {
  return txs
    .filter((transaction) =>
      transaction.type === "out" &&
      !transaction.transferId &&
      !transaction.isCarryForward &&
      !(transaction.goalId && transaction.type === "out") &&
      transaction.date >= fromDate &&
      transaction.date <= toDate &&
      (!category || transaction.cat === category)
    )
    .reduce((total, transaction) => total + transaction.amt, 0);
}

function daysBetweenDateKeys(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86_400_000);
}

/**
 * Deterministic, local-only insight engine. It only reads the already-loaded
 * DUIT data and never invokes AI or changes financial records.
 */
export function getFinancialInsights(input: InsightInput): FinancialInsight[] {
  const { txs, wallets, goals, todayKey, inMonth, outMonth } = input;
  const insights: FinancialInsight[] = [];

  if (inMonth > 0 && outMonth > inMonth) {
    insights.push({
      id: "monthly-overspend",
      tone: "attention",
      title: "Pengeluaran sudah melewati pemasukan bulan ini",
      message: `Pengeluaran lebih besar Rp${(outMonth - inMonth).toLocaleString("id-ID")}. Cek kategori terbesar sebelum menambah pengeluaran baru.`,
      actionLabel: "Lihat rincian",
      action: "finance",
    });
  } else if (inMonth > 0 && outMonth >= inMonth * 0.8) {
    insights.push({
      id: "monthly-near-limit",
      tone: "warning",
      title: "Ruang pengeluaran bulan ini mulai menipis",
      message: `${Math.round((outMonth / inMonth) * 100)}% pemasukan bulan ini sudah terpakai. Sisa ruang kas sekitar Rp${Math.max(0, inMonth - outMonth).toLocaleString("id-ID")}.`,
      actionLabel: "Lihat rincian",
      action: "finance",
    });
  }

  const totalBalance = wallets.reduce((total, wallet) => total + wallet.balance, 0);
  const lowWallet = wallets
    .filter((wallet) => wallet.balance > 0)
    .sort((a, b) => a.balance - b.balance)
    .find((wallet) => wallet.balance <= Math.max(50_000, totalBalance * 0.08));
  if (lowWallet) {
    insights.push({
      id: `low-wallet-${lowWallet.id}`,
      tone: "warning",
      title: `Saldo ${lowWallet.name} mulai menipis`,
      message: `Saldo saat ini Rp${lowWallet.balance.toLocaleString("id-ID")}. Pastikan kebutuhan berikutnya tetap tercukupi atau pindahkan dana bila perlu.`,
      actionLabel: "Kelola dompet",
      action: "finance",
    });
  }

  const currentWeekStart = addDaysToDateKey(todayKey, -6);
  const previousWeekStart = addDaysToDateKey(todayKey, -13);
  const previousWeekEnd = addDaysToDateKey(todayKey, -7);
  const categories = [...new Set(
    txs
      .filter((transaction) => transaction.type === "out" && !transaction.transferId && !transaction.isCarryForward && !(transaction.goalId && transaction.type === "out"))
      .map((transaction) => transaction.cat)
  )];
  const categorySpike = categories
    .map((category) => ({
      category,
      current: totalExpenseInRange(txs, currentWeekStart, todayKey, category),
      previous: totalExpenseInRange(txs, previousWeekStart, previousWeekEnd, category),
    }))
    .filter((item) => item.current >= 50_000 && item.previous > 0 && item.current >= item.previous * 1.35)
    .sort((a, b) => (b.current / b.previous) - (a.current / a.previous))[0];
  if (categorySpike) {
    insights.push({
      id: `category-spike-${categorySpike.category}`,
      tone: "warning",
      title: `Pengeluaran ${categorySpike.category} sedang meningkat`,
      message: `Tujuh hari terakhir Rp${categorySpike.current.toLocaleString("id-ID")}, naik ${Math.round(((categorySpike.current - categorySpike.previous) / categorySpike.previous) * 100)}% dari tujuh hari sebelumnya.`,
      actionLabel: "Lihat transaksi",
      action: "finance",
    });
  }

  const goalAtRisk = goals
    .filter((goal) => Boolean(goal.deadline) && goal.current < goal.target)
    .map((goal) => {
      const daysLeft = daysBetweenDateKeys(todayKey, goal.deadline!);
      const remaining = goal.target - goal.current;
      return { goal, daysLeft, remaining, dailyNeed: daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining };
    })
    .filter((item) => item.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  if (goalAtRisk && goalAtRisk.daysLeft <= 60) {
    insights.push({
      id: `goal-pace-${goalAtRisk.goal.id}`,
      tone: "attention",
      title: `Goal ${goalAtRisk.goal.name} butuh perhatian`,
      message: goalAtRisk.daysLeft === 0
        ? `Deadline hari ini. Masih perlu Rp${goalAtRisk.remaining.toLocaleString("id-ID")}.`
        : `Sisa ${goalAtRisk.daysLeft} hari dan Rp${goalAtRisk.remaining.toLocaleString("id-ID")}. Agar tetap di jalur, sisihkan sekitar Rp${goalAtRisk.dailyNeed.toLocaleString("id-ID")} per hari.`,
      actionLabel: "Buka goal",
      action: "goal",
    });
  }

  if (insights.length === 0 && outMonth > 0 && (inMonth === 0 || outMonth < inMonth * 0.6)) {
    insights.push({
      id: "healthy-spending",
      tone: "positive",
      title: "Ritme pengeluaranmu masih terjaga",
      message: inMonth > 0
        ? `Pengeluaran bulan ini baru ${Math.round((outMonth / inMonth) * 100)}% dari pemasukan. Pertahankan kebiasaan baik ini.`
        : "Pengeluaran sudah tercatat dengan rapi. Teruskan agar pola keuanganmu makin mudah dipahami.",
      actionLabel: "Lihat laporan",
      action: "finance",
    });
  }

  const priority: Record<InsightTone, number> = { attention: 0, warning: 1, positive: 2 };
  return insights.sort((a, b) => priority[a.tone] - priority[b.tone]).slice(0, 3);
}
