import { describe, expect, it, vi } from "vitest";
import { extractAssistantAction, resolveScheduleAction } from "../components/ChatWidget";

// Store date/schedule helpers are pure, but the module also exports the React
// store. Keep Firebase/Auth out of this unit-test environment.
vi.mock("./firebaseDb", () => ({ db: {} }));
vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import {
  addDaysToDateKey,
  dateKeyInJakarta,
  getNextScheduleOccurrence,
  removeUndefinedDeep,
  sanitizeImportedUserData,
  scheduleOccursOnDate,
  type ScheduleItem,
} from "./store";

describe("Jakarta financial date helpers", () => {
  it("uses Asia/Jakarta rather than the host timezone", () => {
    expect(dateKeyInJakarta(new Date("2026-07-21T17:30:00.000Z"))).toBe("2026-07-22");
  });

  it("adds calendar days without a timezone shift", () => {
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("Firestore write sanitization", () => {
  it("removes undefined optional fields while preserving arrays", () => {
    expect(removeUndefinedDeep({ name: "Jadwal", end: undefined, nested: { note: undefined, icon: "pin" }, values: [1, undefined, 3] })).toEqual({ name: "Jadwal", nested: { icon: "pin" }, values: [1, undefined, 3] });
  });
});

describe("AI action parser", () => {
  it("rejects an empty schedule update action", () => {
    const parsed = extractAssistantAction('Siap.<duit-action>{"type":"scheduleUpdate","scheduleName":"Olahraga"}</duit-action>');
    expect(parsed.action).toBeUndefined();
    expect(parsed.text).toBe("Siap.");
  });

  it("parses a valid transfer action", () => {
    const parsed = extractAssistantAction('<duit-action>{"type":"transfer","fromWalletName":"BCA","toWalletName":"Cash","amount":100000}</duit-action>');
    expect(parsed.action).toEqual({ type: "transfer", fromWalletName: "BCA", toWalletName: "Cash", amount: 100000 });
  });

  it("rejects a fractional Rupiah action", () => {
    const parsed = extractAssistantAction('<duit-action>{"type":"transaction","transactionType":"out","amount":1000.5,"category":"Makan","walletName":"Cash","date":"2026-08-05"}</duit-action>');
    expect(parsed.action).toBeUndefined();
  });

  it("parses clear-field schedule updates", () => {
    const parsed = extractAssistantAction('<duit-action>{"type":"scheduleUpdate","scheduleName":"Olahraga","clearEnd":true}</duit-action>');
    expect(parsed.action).toMatchObject({ type: "scheduleUpdate", scheduleName: "Olahraga", clearEnd: true });
  });

  it("binds an update action to one stable schedule id", () => {
    const schedules = [{ id: 7, name: "Olahraga", date: "2026-08-05", start: "19:00" }];
    const action = { type: "scheduleUpdate" as const, scheduleName: "Olahraga", targetDate: "2026-08-05", targetStart: "19:00", date: "2026-08-08" };
    expect(resolveScheduleAction(action, schedules)).toMatchObject({ scheduleId: 7, targetDate: "2026-08-05", targetRecurring: false, date: "2026-08-08" });
  });
});

describe("backup relational validation", () => {
  it("rejects an orphaned transfer pair", () => {
    expect(() => sanitizeImportedUserData({
      wallets: [{ id: 1, name: "Cash", balance: 100000, icon: "cash", color: "teal" }],
      scheds: [], goals: [], moods: {}, settings: {},
      txs: [{ id: 10, type: "out", amt: 10000, cat: "Transfer", desc: "", date: "2026-08-01", walletId: 1, transferId: 9 }],
    })).toThrow("pasangan transfer");
  });

  it("rejects a goal transaction whose goal is absent", () => {
    expect(() => sanitizeImportedUserData({
      wallets: [{ id: 1, name: "Cash", balance: 100000, icon: "cash", color: "teal" }],
      scheds: [], goals: [], moods: {}, settings: {},
      txs: [{ id: 10, type: "out", amt: 10000, cat: "Tabungan", desc: "", date: "2026-08-01", walletId: 1, goalId: 99 }],
    })).toThrow("goal tidak ada");
  });
});

describe("schedule occurrences", () => {
  const recurring: ScheduleItem = {
    id: 1, name: "Olahraga", date: "2026-07-20", start: "07:00", recurring: true, untilDate: "2026-08-03",
  };

  it("honours the weekly pattern and end date", () => {
    expect(scheduleOccursOnDate(recurring, "2026-07-27")).toBe(true);
    expect(scheduleOccursOnDate(recurring, "2026-07-28")).toBe(false);
    expect(scheduleOccursOnDate(recurring, "2026-08-10")).toBe(false);
  });

  it("accepts an overnight schedule when restoring data", () => {
    const data = sanitizeImportedUserData({
      wallets: [{ id: 1, name: "Cash", balance: 100000, icon: "cash", color: "teal" }],
      txs: [], goals: [], moods: {}, settings: {},
      scheds: [{ id: 1, name: "Kerja malam", date: "2026-08-10", start: "23:00", end: "01:00" }],
    });
    expect(data.scheds[0].end).toBe("01:00");
  });

  it("finds the next valid occurrence", () => {
    expect(getNextScheduleOccurrence(recurring, "2026-07-21")).toBe("2026-07-27");
  });
});
