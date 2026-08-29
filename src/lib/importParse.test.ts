import { describe, expect, it } from "vitest";
import {
  findDuplicateIndexes,
  MAX_EXTRACTED_PER_IMAGE,
  normalizeExtractedTransactions,
  normalizeTransactionDate,
  parseRupiahAmount,
} from "./importParse";

const TODAY = "2026-08-29";

describe("parseRupiahAmount", () => {
  it("accepts positive integers", () => {
    expect(parseRupiahAmount(50000)).toBe(50000);
    expect(parseRupiahAmount(1250)).toBe(1250);
  });

  it("parses Indonesian thousand separators", () => {
    expect(parseRupiahAmount("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiahAmount("17.500")).toBe(17500);
    expect(parseRupiahAmount("50000")).toBe(50000);
  });

  it("rejects decimal, zero, and negative values", () => {
    expect(parseRupiahAmount("1.000,50")).toBe(null);
    expect(parseRupiahAmount(0)).toBe(null);
    expect(parseRupiahAmount(-5000)).toBe(null);
    expect(parseRupiahAmount(1250.75)).toBe(null);
    expect(parseRupiahAmount("bukan angka")).toBe(null);
  });
});

describe("normalizeTransactionDate", () => {
  it("keeps ISO date keys", () => {
    expect(normalizeTransactionDate("2026-08-25", TODAY)).toBe("2026-08-25");
  });

  it("parses day-first formats", () => {
    expect(normalizeTransactionDate("25-08-2026", TODAY)).toBe("2026-08-25");
    expect(normalizeTransactionDate("25/08/2026", TODAY)).toBe("2026-08-25");
  });

  it("parses Indonesian month names", () => {
    expect(normalizeTransactionDate("25 Agu 2026", TODAY)).toBe("2026-08-25");
    expect(normalizeTransactionDate("3 Januari 2026", TODAY)).toBe("2026-01-03");
  });

  it("falls back to the previous year for undated future months", () => {
    expect(normalizeTransactionDate("25 Des", TODAY)).toBe("2025-12-25");
    expect(normalizeTransactionDate("10 Agu", TODAY)).toBe("2026-08-10");
  });

  it("rejects impossible dates", () => {
    expect(normalizeTransactionDate("2026-02-30", TODAY)).toBe(null);
    expect(normalizeTransactionDate("tgl tidak jelas", TODAY)).toBe(null);
    expect(normalizeTransactionDate(42, TODAY)).toBe(null);
  });
});

describe("normalizeExtractedTransactions", () => {
  it("normalizes type tokens, amounts, and categories", () => {
    const { items, dropped } = normalizeExtractedTransactions(
      {
        transactions: [
          { date: "2026-08-20", type: "DB", amount: "Rp 25.000", description: "Makan siang", category: "makan" },
          { date: "2026-08-21", type: "CR", amount: 1500000, description: "Gaji bulanan", category: "Gaji" },
        ],
      },
      TODAY,
    );
    expect(dropped).toBe(0);
    expect(items).toEqual([
      { date: "2026-08-20", type: "out", amt: 25000, desc: "Makan siang", cat: "Makan" },
      { date: "2026-08-21", type: "in", amt: 1500000, desc: "Gaji bulanan", cat: "Gaji" },
    ]);
  });

  it("drops invalid rows and future dates", () => {
    const { items, dropped } = normalizeExtractedTransactions(
      [
        { date: "2026-08-20", type: "out", amount: -100, description: "negatif" },
        { date: "2026-09-15", type: "out", amount: 1000, description: "masa depan" },
        { date: "tanggal?", type: "out", amount: 1000 },
        { date: "2026-08-20", type: "entah", amount: 1000 },
        "sampah",
        { date: "2026-08-20", type: "out", amount: 1000, description: "valid" },
      ],
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0].desc).toBe("valid");
    expect(dropped).toBe(5);
  });

  it("caps the batch at MAX_EXTRACTED_PER_IMAGE", () => {
    const many = Array.from({ length: MAX_EXTRACTED_PER_IMAGE + 5 }, (_, i) => ({
      date: "2026-08-20",
      type: "out",
      amount: 1000 + i,
      description: `baris ${i}`,
    }));
    const { items, dropped } = normalizeExtractedTransactions(many, TODAY);
    expect(items).toHaveLength(MAX_EXTRACTED_PER_IMAGE);
    expect(dropped).toBe(5);
  });

  it("removes duplicates within the same batch", () => {
    const row = { date: "2026-08-20", type: "out", amount: 25000, description: "Kopi pagi" };
    const { items, dropped } = normalizeExtractedTransactions([row, { ...row }], TODAY);
    expect(items).toHaveLength(1);
    expect(dropped).toBe(1);
  });

  it("handles malformed payloads safely", () => {
    expect(normalizeExtractedTransactions(null, TODAY)).toEqual({ items: [], dropped: 0 });
    expect(normalizeExtractedTransactions("teks", TODAY)).toEqual({ items: [], dropped: 0 });
    expect(normalizeExtractedTransactions({ transactions: "bukan array" }, TODAY)).toEqual({ items: [], dropped: 0 });
  });

  it("truncates long descriptions", () => {
    const { items } = normalizeExtractedTransactions(
      [{ date: "2026-08-20", type: "out", amount: 1000, description: "x".repeat(400) }],
      TODAY,
    );
    expect(items[0].desc.length).toBe(240);
  });
});

describe("findDuplicateIndexes", () => {
  const drafts = [
    { date: "2026-08-20", type: "out" as const, amt: 25000, desc: "Kopi pagi", cat: "Makan" },
    { date: "2026-08-21", type: "in" as const, amt: 1500000, desc: "Gaji bulanan Agustus", cat: "Gaji" },
    { date: "2026-08-22", type: "out" as const, amt: 99000, desc: "Transaksi baru", cat: "Lainnya" },
  ];

  it("flags same date+type+amount with similar descriptions", () => {
    const existing = [
      { date: "2026-08-20", type: "out", amt: 25000, desc: "Kopi pagi" },
      { date: "2026-08-21", type: "in", amt: 1500000, desc: "Gaji bulanan" },
    ];
    const duplicates = findDuplicateIndexes(drafts, existing);
    expect(duplicates.has(0)).toBe(true);
    expect(duplicates.has(1)).toBe(true);
    expect(duplicates.has(2)).toBe(false);
  });

  it("does not flag different amounts or dates", () => {
    const existing = [
      { date: "2026-08-19", type: "out", amt: 25000, desc: "Kopi pagi" },
      { date: "2026-08-22", type: "out", amt: 99001, desc: "Transaksi baru" },
    ];
    expect(findDuplicateIndexes(drafts, existing).size).toBe(0);
  });
});
