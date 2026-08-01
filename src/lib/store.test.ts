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

  it("binds an update action to one stable schedule id", () => {
    const schedules = [{ id: 7, name: "Olahraga", date: "2026-08-05", start: "19:00" }];
    const action = { type: "scheduleUpdate" as const, scheduleName: "Olahraga", targetDate: "2026-08-05", targetStart: "19:00", date: "2026-08-08" };
    expect(resolveScheduleAction(action, schedules)).toMatchObject({ scheduleId: 7, targetDate: "2026-08-05", date: "2026-08-08" });
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

  it("finds the next valid occurrence", () => {
    expect(getNextScheduleOccurrence(recurring, "2026-07-21")).toBe("2026-07-27");
  });
});
