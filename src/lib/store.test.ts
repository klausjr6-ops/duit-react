import { describe, expect, it, vi } from "vitest";

// Store date/schedule helpers are pure, but the module also exports the React
// store. Keep Firebase/Auth out of this unit-test environment.
vi.mock("./firebaseDb", () => ({ db: {} }));
vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import {
  addDaysToDateKey,
  dateKeyInJakarta,
  getNextScheduleOccurrence,
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
