/* ══════════════════════════════════════════════════════════════
   IMPOR TRANSAKSI DARI TANGKAPAN LAYAR M-BANKING
   Logika murni (tanpa Firebase/store) untuk menormalkan hasil
   ekstraksi AI menjadi transaksi yang aman dicatat.
   Modul ini sengaja berdiri sendiri supaya mudah diuji.
   ══════════════════════════════════════════════════════════════ */

export const TX_CATEGORIES: Record<"in" | "out", string[]> = {
  in: ["Gaji", "Bonus", "Hadiah", "Investasi", "Lainnya"],
  out: ["Makan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
};

/** Batas baris per gambar agar screenshot panjang tetap diproses per layar. */
export const MAX_EXTRACTED_PER_IMAGE = 30;

/** Draft transaksi hasil normalisasi, siap direview pengguna sebelum disimpan. */
export interface ExtractedDraft {
  date: string;
  type: "in" | "out";
  amt: number;
  desc: string;
  cat: string;
}

/** Referensi minimal transaksi yang sudah tersimpan untuk deteksi duplikat. */
export interface ExistingTxRef {
  date: string;
  type: string;
  amt: number;
  desc: string;
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Nominal Rupiah: bilangan bulat positif. String boleh berformat
 * "Rp 1.250.000" atau "1250000". String berkoma (desimal) ditolak agar
 * tidak ada pembulatan senyap.
 */
export function parseRupiahAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLocaleLowerCase("id-ID").replace(/rp\.?/g, "").replace(/\s+/g, "");
  if (!cleaned || cleaned.includes(",")) return null;
  if (!/^\d+$/.test(cleaned) && !/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return null;
  const digits = cleaned.replace(/\./g, "");
  if (digits.length > 15) return null;
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

const TYPE_IN_TOKENS = new Set([
  "in", "masuk", "kredit", "cr", "credit", "terima", "setor", "setoran",
  "deposit", "pemasukan", "income", "transfermasuk",
]);
const TYPE_OUT_TOKENS = new Set([
  "out", "keluar", "debit", "db", "dr", "bayar", "pembayaran",
  "pengeluaran", "expense", "tarik", "tariktunai", "transferkeluar",
]);

/** Memetakan token tipe apa pun dari model menjadi "in" | "out". */
export function normalizeTransactionType(value: unknown): "in" | "out" | null {
  if (typeof value !== "string") return null;
  const tokens = value
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (tokens.some((token) => TYPE_OUT_TOKENS.has(token))) return "out";
  if (tokens.some((token) => TYPE_IN_TOKENS.has(token))) return "in";
  return null;
}

const ID_MONTHS: Record<string, string> = {
  jan: "01", januari: "01",
  feb: "02", februari: "02",
  mar: "03", maret: "03",
  apr: "04", april: "04",
  mei: "05",
  jun: "06", juni: "06",
  jul: "07", juli: "07",
  agu: "08", ags: "08", agt: "08", agustus: "08",
  sep: "09", september: "09",
  okt: "10", oktober: "10",
  nov: "11", november: "11",
  des: "12", desember: "12",
};

function buildDateKey(year: number, month: number, day: number): string | null {
  const candidate = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return isValidDateKey(candidate) ? candidate : null;
}

/**
 * Mengubah tanggal mentah dari model menjadi date key YYYY-MM-DD.
 * Mendukung "YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", dan nama bulan
 * Indonesia ("25 Agu 2026"). Tanggal tanpa tahun memakai tahun dari
 * `todayKey`; bila hasilnya berada di masa depan, mundur satu tahun.
 */
export function normalizeTransactionDate(value: unknown, todayKey: string): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (isValidDateKey(raw)) return raw;

  let match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(raw);
  if (match) {
    const [, day, month, year] = match;
    return buildDateKey(Number(year), Number(month), Number(day));
  }

  match = /^(\d{1,2})\s+([A-Za-z]+)\s*(\d{4})?$/.exec(raw);
  if (match) {
    const month = ID_MONTHS[match[2].toLocaleLowerCase("id-ID")];
    if (!month) return null;
    const day = Number(match[1]);
    if (match[3]) return buildDateKey(Number(match[3]), Number(month), day);
    const thisYear = Number(todayKey.slice(0, 4));
    const candidateThisYear = buildDateKey(thisYear, Number(month), day);
    if (!candidateThisYear) return null;
    if (candidateThisYear <= todayKey) return candidateThisYear;
    return buildDateKey(thisYear - 1, Number(month), day);
  }

  return null;
}

function normalizeDescText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

const CATEGORY_LOOKUP: Record<"in" | "out", Map<string, string>> = {
  in: new Map(TX_CATEGORIES.in.map((cat) => [cat.toLocaleLowerCase("id-ID"), cat])),
  out: new Map(TX_CATEGORIES.out.map((cat) => [cat.toLocaleLowerCase("id-ID"), cat])),
};

function normalizeCategory(value: unknown, type: "in" | "out"): string {
  if (typeof value === "string") {
    const key = value.trim().toLocaleLowerCase("id-ID");
    const canonical = CATEGORY_LOOKUP[type].get(key);
    if (canonical) return canonical;
  }
  return "Lainnya";
}

/**
 * Menormalkan payload AI menjadi daftar draft yang valid.
 * Baris yang tidak lolos validasi dibuang dan dihitung sebagai `dropped`.
 */
export function normalizeExtractedTransactions(
  raw: unknown,
  todayKey: string,
): { items: ExtractedDraft[]; dropped: number } {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { transactions?: unknown }).transactions)
      ? ((raw as { transactions: unknown[] }).transactions as unknown[])
      : [];
  if (list.length === 0) return { items: [], dropped: 0 };

  const items: ExtractedDraft[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    if (items.length >= MAX_EXTRACTED_PER_IMAGE) {
      dropped += list.length - index;
      break;
    }
    if (!entry || typeof entry !== "object") {
      dropped += 1;
      continue;
    }
    const row = entry as Record<string, unknown>;
    const date = normalizeTransactionDate(row.date ?? row.tanggal, todayKey);
    const type = normalizeTransactionType(row.type ?? row.tipe);
    const amt = parseRupiahAmount(row.amount ?? row.amt ?? row.nominal);
    const desc = normalizeDescText(row.description ?? row.desc ?? row.keterangan) || "Transaksi impor";
    if (!date || !type || amt === null) {
      dropped += 1;
      continue;
    }
    if (date > todayKey) {
      dropped += 1;
      continue;
    }
    const cat = normalizeCategory(row.category ?? row.cat ?? row.kategori, type);
    const dedupeKey = `${date}|${type}|${amt}|${desc.toLocaleLowerCase("id-ID")}`;
    if (seen.has(dedupeKey)) {
      dropped += 1;
      continue;
    }
    seen.add(dedupeKey);
    items.push({ date, type, amt, desc, cat });
  }

  return { items, dropped };
}

function normalizeForMatch(value: string): string {
  return value.toLocaleLowerCase("id-ID").replace(/\s+/g, " ").trim();
}

/**
 * Menandai draft yang berpotensi duplikat dari transaksi yang sudah tersimpan:
 * tanggal + tipe + nominal sama, dan keterangan serupa.
 */
export function findDuplicateIndexes(
  drafts: ExtractedDraft[],
  existingTxs: ExistingTxRef[],
): Set<number> {
  const duplicates = new Set<number>();
  drafts.forEach((draft, index) => {
    const draftDesc = normalizeForMatch(draft.desc);
    const isDuplicate = existingTxs.some((tx) => {
      if (tx.date !== draft.date || tx.type !== draft.type || tx.amt !== draft.amt) return false;
      const txDesc = normalizeForMatch(tx.desc);
      if (!draftDesc || !txDesc) return true;
      if (draftDesc === txDesc) return true;
      const shorter = draftDesc.length <= txDesc.length ? draftDesc : txDesc;
      const longer = shorter === draftDesc ? txDesc : draftDesc;
      return shorter.length >= 12 && (longer.startsWith(shorter) || longer.includes(shorter));
    });
    if (isDuplicate) duplicates.add(index);
  });
  return duplicates;
}
