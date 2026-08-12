import { describe, expect, it, vi } from "vitest";

// insights reuses date helpers exported by the store; keep Firebase/Auth out
// of this pure-rule test environment.
vi.mock("./firebaseDb", () => ({ db: {} }));
vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import { getFinancialInsights } from "./insights";

const base = { wallets: [{ id: 1, name: "Cash", balance: 20000, icon: "cash", color: "teal" }], goals: [], todayKey: "2026-08-12" };

describe("Insight Engine", () => {
  it("prioritizes overspending insight", () => {
    const insights = getFinancialInsights({ ...base, txs: [], inMonth: 100000, outMonth: 130000 });
    expect(insights[0]).toMatchObject({ id: "monthly-overspend", action: "finance" });
  });

  it("detects a category spike over the previous week", () => {
    const txs = [
      { id: 1, type: "out" as const, amt: 100000, cat: "Makan", desc: "", date: "2026-08-11" },
      { id: 2, type: "out" as const, amt: 50000, cat: "Makan", desc: "", date: "2026-08-10" },
      { id: 3, type: "out" as const, amt: 60000, cat: "Makan", desc: "", date: "2026-08-03" },
    ];
    const insights = getFinancialInsights({ ...base, txs, inMonth: 500000, outMonth: 150000 });
    expect(insights.some((item) => item.id === "category-spike-Makan")).toBe(true);
  });

  it("calculates a goal pace insight near its deadline", () => {
    const insights = getFinancialInsights({
      ...base,
      txs: [],
      inMonth: 0,
      outMonth: 0,
      goals: [{ id: 1, name: "Laptop", current: 400000, target: 1000000, deadline: "2026-08-22", icon: "laptop" }],
    });
    expect(insights.some((item) => item.id === "goal-pace-1" && item.action === "goal")).toBe(true);
  });
});
