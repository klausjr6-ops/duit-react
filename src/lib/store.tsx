import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "./firebaseDb";
import { useAuth } from "./AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */
export interface Transaction {
  id: number;
  type: "in" | "out";
  amt: number;
  cat: string;
  desc: string;
  date: string;
  walletId?: number;
  /** Present when this outgoing transaction is a transfer into a savings goal. */
  goalId?: number;
  /** Present when this transaction is part of a wallet-to-wallet transfer. */
  transferId?: number;
}

export interface ScheduleItem {
  id: number;
  name: string;
  desc?: string;
  day?: string;
  date?: string;
  start: string;
  end?: string;
  icon?: string;
  recurring?: boolean;
  untilDate?: string;
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  icon: string;
}

export interface MoodEntry {
  mood: string;
  label: string;
  note: string;
}

export type ThemeMode = "system" | "time" | "light" | "dark";

export interface Settings {
  name: string;
  avatar?: string;
  themeMode?: ThemeMode;
  /** Secret capability used by the private iCalendar feed. */
  calendarToken?: string;
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

/* ══════════════════════════════════════════════════════════════
   DATE HELPERS — all financial date keys use Asia/Jakarta
   ══════════════════════════════════════════════════════════════ */
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/** Returns a stable YYYY-MM-DD key in Asia/Jakarta, never UTC. */
export function dateKeyInJakarta(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayStr() {
  return dateKeyInJakarta();
}

/** Adds calendar days to a YYYY-MM-DD key without a timezone shift. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKeyDayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function dayNameFromDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  // Noon UTC is still the same Gregorian calendar day in Asia/Jakarta.
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: JAKARTA_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function todayDayName() {
  return dayNameFromDateKey(todayStr());
}

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/** Whether a one-off, recurring, or legacy weekly schedule occurs on a date key. */
export function scheduleOccursOnDate(schedule: ScheduleItem, dateKey: string): boolean {
  if (!schedule.date) {
    return Boolean(schedule.day && schedule.day === dayNameFromDateKey(dateKey));
  }

  if (!schedule.recurring) {
    return schedule.date === dateKey;
  }

  if (dateKey < schedule.date) return false;
  if (schedule.untilDate && dateKey > schedule.untilDate) return false;

  return dateKeyDayIndex(schedule.date) === dateKeyDayIndex(dateKey);
}

/** Returns the nearest occurrence on or after fromDate, if any. */
export function getNextScheduleOccurrence(
  schedule: ScheduleItem,
  fromDate = todayStr()
): string | null {
  if (schedule.date && !schedule.recurring) {
    return schedule.date >= fromDate ? schedule.date : null;
  }

  const firstDate = schedule.date && schedule.date > fromDate ? schedule.date : fromDate;

  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDaysToDateKey(firstDate, offset);
    if (schedule.untilDate && candidate > schedule.untilDate) return null;
    if (scheduleOccursOnDate(schedule, candidate)) return candidate;
  }

  return null;
}

const DEFAULT_WALLETS: Wallet[] = [
  { id: 1, name: "BCA", balance: 0, icon: "card", color: "emerald" },
  { id: 2, name: "Cash", balance: 0, icon: "cash", color: "teal" },
];

/* ══════════════════════════════════════════════════════════════
   FIRESTORE DATA SHAPE
   ══════════════════════════════════════════════════════════════ */
export interface UserData {
  txs: Transaction[];
  scheds: ScheduleItem[];
  goals: Goal[];
  moods: Record<string, MoodEntry>;
  settings: Partial<Settings>;
  wallets: Wallet[];
}

type DataUpdater = (previous: UserData) => UserData;

function createDefaultData(): UserData {
  return {
    txs: [],
    scheds: [],
    goals: [],
    moods: {},
    settings: { name: "Kamu", themeMode: "time" },
    wallets: DEFAULT_WALLETS.map((wallet) => ({ ...wallet })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toDateKey(value: unknown, fallback = todayStr()): string {
  const raw = toStringValue(value, fallback);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallback;
}

function toTimeValue(value: unknown, fallback = "09:00"): string {
  const raw = toStringValue(value, fallback);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : fallback;
}

function toThemeMode(value: unknown): ThemeMode | undefined {
  return value === "system" || value === "time" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function sanitizeTransaction(value: unknown): Transaction | null {
  if (!isRecord(value)) return null;
  const type = value.type === "in" || value.type === "out" ? value.type : null;
  const amt = toPositiveNumber(value.amt);
  if (!type || amt <= 0) return null;

  const walletId = value.walletId === undefined ? undefined : toFiniteNumber(value.walletId, NaN);
  const goalId = value.goalId === undefined ? undefined : toFiniteNumber(value.goalId, NaN);
  const transferId = value.transferId === undefined ? undefined : toFiniteNumber(value.transferId, NaN);

  return {
    id: toFiniteNumber(value.id, createId()),
    type,
    amt,
    cat: toStringValue(value.cat, "Lainnya").slice(0, 80),
    desc: toStringValue(value.desc, "").slice(0, 240),
    date: toDateKey(value.date),
    ...(Number.isFinite(walletId) ? { walletId } : {}),
    ...(Number.isFinite(goalId) ? { goalId } : {}),
    ...(Number.isFinite(transferId) ? { transferId } : {}),
  };
}

function sanitizeSchedule(value: unknown): ScheduleItem | null {
  if (!isRecord(value)) return null;
  const name = toStringValue(value.name).trim();
  if (!name) return null;

  const day = toStringValue(value.day);
  const date = typeof value.date === "string" && value.date ? toDateKey(value.date) : undefined;
  const end = typeof value.end === "string" && value.end ? toTimeValue(value.end) : undefined;
  const untilDate = typeof value.untilDate === "string" && value.untilDate ? toDateKey(value.untilDate) : undefined;

  return {
    id: toFiniteNumber(value.id, createId()),
    name: name.slice(0, 120),
    desc: toStringValue(value.desc, "").slice(0, 240),
    ...(day ? { day: day.slice(0, 20) } : {}),
    ...(date ? { date } : {}),
    start: toTimeValue(value.start),
    ...(end ? { end } : {}),
    icon: toStringValue(value.icon, "📌").slice(0, 12),
    recurring: Boolean(value.recurring),
    ...(untilDate ? { untilDate } : {}),
  };
}

function sanitizeGoal(value: unknown): Goal | null {
  if (!isRecord(value)) return null;
  const name = toStringValue(value.name).trim();
  const target = toPositiveNumber(value.target);
  if (!name || target <= 0) return null;

  const deadline = typeof value.deadline === "string" && value.deadline ? toDateKey(value.deadline) : undefined;

  return {
    id: toFiniteNumber(value.id, createId()),
    name: name.slice(0, 120),
    target,
    current: Math.min(toPositiveNumber(value.current), target),
    ...(deadline ? { deadline } : {}),
    icon: toStringValue(value.icon, "🎯").slice(0, 12),
  };
}

function sanitizeWallet(value: unknown): Wallet | null {
  if (!isRecord(value)) return null;
  const name = toStringValue(value.name).trim();
  if (!name) return null;

  return {
    id: toFiniteNumber(value.id, createId()),
    name: name.slice(0, 80),
    balance: toFiniteNumber(value.balance),
    icon: toStringValue(value.icon, "💳").slice(0, 12),
    color: toStringValue(value.color, "emerald").slice(0, 120),
  };
}

function sanitizeSettings(value: unknown): Partial<Settings> {
  if (!isRecord(value)) return { name: "Kamu", themeMode: "time" };

  const themeMode = toThemeMode(value.themeMode);
  const avatar = typeof value.avatar === "string" && value.avatar.startsWith("data:image/")
    ? value.avatar
    : undefined;
  const calendarToken = typeof value.calendarToken === "string" && value.calendarToken.length <= 200
    ? value.calendarToken
    : undefined;

  return {
    name: toStringValue(value.name, "Kamu").trim().slice(0, 80) || "Kamu",
    themeMode: themeMode ?? "time",
    ...(avatar ? { avatar } : {}),
    ...(calendarToken ? { calendarToken } : {}),
  };
}

export function sanitizeImportedUserData(value: unknown): UserData {
  if (!isRecord(value)) throw new Error("Format backup tidak valid.");

  const wallets = Array.isArray(value.wallets)
    ? value.wallets.map(sanitizeWallet).filter((item): item is Wallet => Boolean(item))
    : [];

  return {
    txs: Array.isArray(value.txs)
      ? value.txs.map(sanitizeTransaction).filter((item): item is Transaction => Boolean(item))
      : [],
    scheds: Array.isArray(value.scheds)
      ? value.scheds.map(sanitizeSchedule).filter((item): item is ScheduleItem => Boolean(item))
      : [],
    goals: Array.isArray(value.goals)
      ? value.goals.map(sanitizeGoal).filter((item): item is Goal => Boolean(item))
      : [],
    moods: isRecord(value.moods)
      ? Object.fromEntries(
          Object.entries(value.moods).flatMap(([date, mood]) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isRecord(mood)) return [];
            return [[
              date,
              {
                mood: toStringValue(mood.mood, "🙂").slice(0, 12),
                label: toStringValue(mood.label, "Biasa").slice(0, 80),
                note: toStringValue(mood.note, "").slice(0, 500),
              },
            ]];
          })
        )
      : {},
    settings: sanitizeSettings(value.settings),
    wallets: wallets.length > 0 ? wallets : DEFAULT_WALLETS.map((wallet) => ({ ...wallet })),
  };
}

function normalizeUserData(remote?: Partial<UserData>): UserData {
  return {
    txs: Array.isArray(remote?.txs) ? remote.txs : [],
    scheds: Array.isArray(remote?.scheds) ? remote.scheds : [],
    goals: Array.isArray(remote?.goals) ? remote.goals : [],
    moods: remote?.moods && typeof remote.moods === "object" ? remote.moods : {},
    settings: {
      name: "Kamu",
      themeMode: "time",
      ...(remote?.settings && typeof remote.settings === "object" ? remote.settings : {}),
    },
    wallets: Array.isArray(remote?.wallets)
      ? remote.wallets
      : DEFAULT_WALLETS.map((wallet) => ({ ...wallet })),
  };
}

function createId(): number {
  // Numeric IDs retain compatibility with existing Firestore data while avoiding
  // a collision for quick successive actions in the same millisecond.
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function getWalletBalance(data: UserData, walletId: number): number | null {
  const wallet = data.wallets.find((item) => item.id === walletId);
  if (!wallet) return null;

  const walletTransactions = data.txs.filter((transaction) => transaction.walletId === walletId);
  const income = walletTransactions
    .filter((transaction) => transaction.type === "in")
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const expense = walletTransactions
    .filter((transaction) => transaction.type === "out")
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  return wallet.balance + income - expense;
}

class GoalFundingError extends Error {}

/* ══════════════════════════════════════════════════════════════
   LOCALSTORAGE MIGRATION (one-time)
   ══════════════════════════════════════════════════════════════ */
const OLD_KEYS = {
  txs: "duit_txs",
  scheds: "duit_scheds",
  goals: "duit_goals",
  moods: "duit_moods",
  settings: "duit_settings",
  wallets: "duit_wallets",
};

const MIGRATION_KEY = "duit_migrated_to_firestore";

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getLocalStorageData(): UserData | null {
  if (localStorage.getItem(MIGRATION_KEY)) return null;

  const hasAnyData =
    localStorage.getItem(OLD_KEYS.txs) ||
    localStorage.getItem(OLD_KEYS.scheds) ||
    localStorage.getItem(OLD_KEYS.goals) ||
    localStorage.getItem(OLD_KEYS.wallets);

  if (!hasAnyData) return null;

  return {
    txs: readLS<Transaction[]>(OLD_KEYS.txs, []),
    scheds: readLS<ScheduleItem[]>(OLD_KEYS.scheds, []),
    goals: readLS<Goal[]>(OLD_KEYS.goals, []),
    moods: readLS<Record<string, MoodEntry>>(OLD_KEYS.moods, {}),
    settings: readLS<Partial<Settings>>(OLD_KEYS.settings, { name: "Kamu", themeMode: "time" }),
    wallets: readLS<Wallet[]>(OLD_KEYS.wallets, DEFAULT_WALLETS.map((wallet) => ({ ...wallet }))),
  };
}

function markMigrated() {
  localStorage.setItem(MIGRATION_KEY, "1");
  Object.values(OLD_KEYS).forEach((key) => localStorage.removeItem(key));
}

/* ══════════════════════════════════════════════════════════════
   INTERNAL STORE HOOK
   ══════════════════════════════════════════════════════════════ */
function useDuitStoreInternal() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<UserData>(createDefaultData);
  const [loading, setLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingWriteCountRef = useRef(0);
  const initializingUidRef = useRef<string | null>(null);

  /* ─── Subscribe real-time ke Firestore ──────────────────── */
  useEffect(() => {
    let active = true;

    if (!uid) {
      setData(createDefaultData());
      setLoading(false);
      setLoadedUserId(null);
      setSyncError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setLoadedUserId(null);
    setSyncError(null);
    const ref = doc(db, "users", uid, "data", "main");

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!active) return;

        if (snap.exists()) {
          setData(normalizeUserData(snap.data() as Partial<UserData>));
          setLoading(false);
          setLoadedUserId(uid);
          return;
        }

        // A missing document is initialized atomically, so two tabs cannot
        // overwrite a localStorage migration with an empty default document.
        if (initializingUidRef.current === uid) return;
        initializingUidRef.current = uid;

        const localData = getLocalStorageData();
        const initialData = localData ?? createDefaultData();

        try {
          const initializedData = await runTransaction(db, async (transaction) => {
            const current = await transaction.get(ref);
            if (current.exists()) {
              return normalizeUserData(current.data() as Partial<UserData>);
            }
            transaction.set(ref, initialData);
            return initialData;
          });

          if (!active) return;
          if (localData && initializedData === initialData) markMigrated();
          setData(initializedData);
          setSyncError(null);
        } catch (error) {
          console.error("Firestore initialization error:", error);
          if (!active) return;
          setSyncError("Data belum bisa dimuat dari cloud. Coba periksa koneksi lalu refresh.");
        } finally {
          if (initializingUidRef.current === uid) initializingUidRef.current = null;
          if (active) {
            setLoading(false);
            setLoadedUserId(uid);
          }
        }
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        if (!active) return;
        setSyncError("Sinkronisasi data bermasalah. Perubahan baru mungkin belum tersimpan.");
        setLoading(false);
        setLoadedUserId(uid);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [uid]);

  /* ─── Serialized, transactional Firestore updates ───────── */
  const enqueueFirestoreUpdate = useCallback(
    (updater: DataUpdater): Promise<void> => {
      if (!uid) return Promise.reject(new Error("User belum login"));

      const mutationUid = uid;
      pendingWriteCountRef.current += 1;
      setSyncing(true);
      setSyncError(null);

      const task = writeQueueRef.current.then(async () => {
        const ref = doc(db, "users", mutationUid, "data", "main");

        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          const current = snapshot.exists()
            ? normalizeUserData(snapshot.data() as Partial<UserData>)
            : createDefaultData();
          const next = updater(current);
          transaction.set(ref, next);
        });
      });

      // Keep the queue available after a failed write, but preserve the error
      // for this mutation so the user can be notified by the app later.
      writeQueueRef.current = task.catch(() => undefined);

      void task
        .catch((error) => {
          console.error("Firestore write error:", error);
          if (!(error instanceof GoalFundingError)) {
            setSyncError("Perubahan belum tersimpan ke cloud. Coba lagi saat koneksi stabil.");
          }
        })
        .finally(() => {
          pendingWriteCountRef.current -= 1;
          if (pendingWriteCountRef.current === 0) setSyncing(false);
        });

      return task;
    },
    [uid]
  );

  // Optimistic UI is retained, while each mutation is replayed against the
  // most recent Firestore document inside a transaction.
  const updateData = useCallback(
    (updater: DataUpdater) => {
      if (!uid || loadedUserId !== uid) return;

      setData((previous) => updater(previous));
      enqueueFirestoreUpdate(updater);
    },
    [enqueueFirestoreUpdate, loadedUserId, uid]
  );

  /* ─── Derived: settings dengan default ─────────────────────── */
  const settings: Settings = useMemo(
    () => ({ name: "Kamu", themeMode: "time", ...data.settings }),
    [data.settings]
  );

  const backupData: UserData = useMemo(
    () => ({
      txs: data.txs.map((transaction) => ({ ...transaction })),
      scheds: data.scheds.map((schedule) => ({ ...schedule })),
      goals: data.goals.map((goal) => ({ ...goal })),
      moods: Object.fromEntries(
        Object.entries(data.moods).map(([date, mood]) => [date, { ...mood }])
      ),
      settings: { ...settings },
      wallets: data.wallets.map((wallet) => ({ ...wallet })),
    }),
    [data.goals, data.moods, data.scheds, data.txs, data.wallets, settings]
  );

  /* ══════════════════════════════════════════════════════════
     TRANSACTIONS
     ══════════════════════════════════════════════════════════ */
  const addTx = useCallback(
    (tx: Omit<Transaction, "id">) => {
      const transaction: Transaction = { ...tx, id: createId() };
      updateData((previous) => ({
        ...previous,
        txs: [transaction, ...previous.txs],
      }));
    },
    [updateData]
  );

  const delTx = useCallback(
    (id: number) =>
      updateData((previous) => {
        const tx = previous.txs.find((t) => t.id === id);
        if (!tx) return previous;

        // Collect IDs to remove: the target tx + any paired transfer
        const idsToRemove = new Set([id]);
        if (tx.transferId) {
          for (const t of previous.txs) {
            if (t.transferId === tx.transferId && t.id !== id) {
              idsToRemove.add(t.id);
            }
          }
        }

        // Adjust goal.current for deleted goal transactions:
        //   "out" (funding)   → was +amt to goal, undo by -amt
        //   "in"  (withdrawal) → was -amt from goal, undo by +amt
        let goals = previous.goals;
        for (const t of previous.txs) {
          if (!idsToRemove.has(t.id) || !t.goalId) continue;
          const delta = t.type === "out" ? -t.amt : t.amt;
          goals = goals.map((g) =>
            g.id === t.goalId
              ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) }
              : g
          );
        }

        return {
          ...previous,
          txs: previous.txs.filter((t) => !idsToRemove.has(t.id)),
          goals,
        };
      }),
    [updateData]
  );

  const updateTx = useCallback(
    (id: number, patch: Partial<Omit<Transaction, "id" | "goalId">>) =>
      updateData((previous) => ({
        ...previous,
        txs: previous.txs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     SCHEDULES
     ══════════════════════════════════════════════════════════ */
  const addSched = useCallback(
    (schedule: Omit<ScheduleItem, "id">) => {
      const item: ScheduleItem = { ...schedule, id: createId() };
      updateData((previous) => ({
        ...previous,
        scheds: [...previous.scheds, item],
      }));
    },
    [updateData]
  );

  const delSched = useCallback(
    (id: number) =>
      updateData((previous) => ({
        ...previous,
        scheds: previous.scheds.filter((schedule) => schedule.id !== id),
      })),
    [updateData]
  );

  const updateSched = useCallback(
    (id: number, patch: Partial<Omit<ScheduleItem, "id">>) =>
      updateData((previous) => ({
        ...previous,
        scheds: previous.scheds.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     GOALS
     ══════════════════════════════════════════════════════════ */
  const addGoal = useCallback(
    (goal: Omit<Goal, "id">) => {
      const item: Goal = { ...goal, id: createId() };
      updateData((previous) => ({
        ...previous,
        goals: [...previous.goals, item],
      }));
    },
    [updateData]
  );

  const delGoal = useCallback(
    (id: number) =>
      updateData((previous) => ({
        ...previous,
        goals: previous.goals.filter((goal) => goal.id !== id),
        // Removing the goal also reverses its internal transfers, restoring
        // the derived balance of the original source wallet(s).
        txs: previous.txs.filter((transaction) => transaction.goalId !== id),
      })),
    [updateData]
  );

  const updateGoal = useCallback(
    (id: number, patch: Partial<Omit<Goal, "id" | "current">>) =>
      updateData((previous) => ({
        ...previous,
        goals: previous.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      })),
    [updateData]
  );

  const fundGoal = useCallback(
    async (goalId: number, walletId: number, amount: number) => {
      if (!uid || loadedUserId !== uid) {
        return { ok: false as const, message: "Data akun masih dimuat. Coba lagi sebentar." };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false as const, message: "Jumlah tabungan tidak valid." };
      }

      const date = todayStr();
      const savingTransaction: Transaction = {
        id: createId(),
        type: "out",
        amt: amount,
        cat: "Tabungan",
        desc: "",
        date,
        walletId,
        goalId,
      };

      try {
        await enqueueFirestoreUpdate((current) => {
          const goal = current.goals.find((item) => item.id === goalId);
          if (!goal) throw new GoalFundingError("Goal ini sudah tidak tersedia.");

          const remaining = goal.target - goal.current;
          if (remaining <= 0) throw new GoalFundingError("Goal ini sudah tercapai.");
          if (amount > remaining) {
            throw new GoalFundingError(`Maksimal tabungan untuk goal ini adalah Rp${remaining.toLocaleString("id-ID")}.`);
          }

          const sourceBalance = getWalletBalance(current, walletId);
          if (sourceBalance === null) throw new GoalFundingError("Dompet sumber tidak ditemukan.");
          if (sourceBalance < amount) {
            throw new GoalFundingError("Saldo dompet tidak mencukupi untuk nominal tersebut.");
          }

          const transaction: Transaction = {
            ...savingTransaction,
            desc: `Tabungan Goal: ${goal.name}`,
          };

          return {
            ...current,
            goals: current.goals.map((item) =>
              item.id === goalId ? { ...item, current: item.current + amount } : item
            ),
            txs: [transaction, ...current.txs],
          };
        });

        return { ok: true as const };
      } catch (error) {
        if (error instanceof GoalFundingError) {
          return { ok: false as const, message: error.message };
        }

        console.error("Goal funding error:", error);
        return {
          ok: false as const,
          message: "Tabungan belum berhasil dipindahkan. Coba lagi saat koneksi stabil.",
        };
      }
    },
    [enqueueFirestoreUpdate, loadedUserId, uid]
  );

  const withdrawGoal = useCallback(
    async (goalId: number, walletId: number, amount: number) => {
      if (!uid || loadedUserId !== uid) {
        return { ok: false as const, message: "Data akun masih dimuat. Coba lagi sebentar." };
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false as const, message: "Jumlah penarikan tidak valid." };
      }

      const date = todayStr();
      const withdrawTransaction: Transaction = {
        id: createId(),
        type: "in",
        amt: amount,
        cat: "Tabungan",
        desc: "",
        date,
        walletId,
        goalId,
      };

      try {
        await enqueueFirestoreUpdate((current) => {
          const goal = current.goals.find((item) => item.id === goalId);
          if (!goal) throw new GoalFundingError("Goal ini sudah tidak tersedia.");

          if (amount > goal.current) {
            throw new GoalFundingError(
              `Maksimal penarikan adalah Rp${goal.current.toLocaleString("id-ID")}.`
            );
          }

          const walletExists = current.wallets.some((w) => w.id === walletId);
          if (!walletExists) throw new GoalFundingError("Dompet tujuan tidak ditemukan.");

          const transaction: Transaction = {
            ...withdrawTransaction,
            desc: `Tarik Goal: ${goal.name}`,
          };

          return {
            ...current,
            goals: current.goals.map((item) =>
              item.id === goalId ? { ...item, current: item.current - amount } : item
            ),
            txs: [transaction, ...current.txs],
          };
        });

        return { ok: true as const };
      } catch (error) {
        if (error instanceof GoalFundingError) {
          return { ok: false as const, message: error.message };
        }

        console.error("Goal withdraw error:", error);
        return {
          ok: false as const,
          message: "Penarikan belum berhasil. Coba lagi saat koneksi stabil.",
        };
      }
    },
    [enqueueFirestoreUpdate, loadedUserId, uid]
  );

  /* ══════════════════════════════════════════════════════════
     WALLETS
     ══════════════════════════════════════════════════════════ */
  const addWallet = useCallback(
    (wallet: Omit<Wallet, "id">) => {
      const item: Wallet = { ...wallet, id: createId() };
      updateData((previous) => ({
        ...previous,
        wallets: [...previous.wallets, item],
      }));
    },
    [updateData]
  );

  const delWallet = useCallback(
    (id: number) =>
      updateData((previous) => {
        // Find all transferIds originating from this wallet so we can
        // remove the paired transaction on the other wallet too.
        const walletTransferIds = new Set(
          previous.txs
            .filter((t) => t.walletId === id && t.transferId)
            .map((t) => t.transferId)
        );

        // Collect all transaction IDs to remove
        const idsToRemove = new Set<number>();
        for (const t of previous.txs) {
          if (t.walletId === id) idsToRemove.add(t.id);
          if (t.transferId && walletTransferIds.has(t.transferId)) idsToRemove.add(t.id);
        }

        // Adjust goal.current for deleted goal transactions
        let goals = previous.goals;
        for (const t of previous.txs) {
          if (!idsToRemove.has(t.id) || !t.goalId) continue;
          const delta = t.type === "out" ? -t.amt : t.amt;
          goals = goals.map((g) =>
            g.id === t.goalId
              ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) }
              : g
          );
        }

        return {
          ...previous,
          wallets: previous.wallets.filter((w) => w.id !== id),
          txs: previous.txs.filter((t) => !idsToRemove.has(t.id)),
          goals,
        };
      }),
    [updateData]
  );

  const updateWallet = useCallback(
    (id: number, patch: Partial<Wallet>) =>
      updateData((previous) => ({
        ...previous,
        wallets: previous.wallets.map((wallet) =>
          wallet.id === id ? { ...wallet, ...patch } : wallet
        ),
      })),
    [updateData]
  );

  const transferWallet = useCallback(
    (fromId: number, toId: number, amount: number) => {
      const transferId = createId();
      const date = todayStr();
      const outTx: Transaction = {
        id: createId(),
        type: "out",
        amt: amount,
        cat: "Transfer",
        desc: "Transfer antar dompet",
        date,
        walletId: fromId,
        transferId,
      };
      const inTx: Transaction = {
        id: createId(),
        type: "in",
        amt: amount,
        cat: "Transfer",
        desc: "Transfer antar dompet",
        date,
        walletId: toId,
        transferId,
      };
      updateData((previous) => {
        // Validate source wallet balance inside the update to avoid stale reads
        const sourceBalance = getWalletBalance(previous, fromId);
        if (sourceBalance === null || sourceBalance < amount) {
          // Silently skip — TransferModal already pre-validates, this is a safety net
          return previous;
        }
        return {
          ...previous,
          txs: [outTx, inTx, ...previous.txs],
        };
      });
    },
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     MOODS
     ══════════════════════════════════════════════════════════ */
  const setTodayMood = useCallback(
    (mood: string, label: string) => {
      const date = todayStr();
      updateData((previous) => ({
        ...previous,
        moods: {
          ...previous.moods,
          [date]: {
            mood,
            label,
            note: previous.moods[date]?.note || "",
          },
        },
      }));
    },
    [updateData]
  );

  const setTodayNote = useCallback(
    (note: string) => {
      const date = todayStr();
      updateData((previous) => ({
        ...previous,
        moods: {
          ...previous.moods,
          [date]: {
            mood: previous.moods[date]?.mood || "🙂",
            label: previous.moods[date]?.label || "Biasa",
            note,
          },
        },
      }));
    },
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     SETTINGS
     ══════════════════════════════════════════════════════════ */
  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      updateData((previous) => ({
        ...previous,
        settings: { ...previous.settings, ...patch },
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     RESET
     ══════════════════════════════════════════════════════════ */
  const resetAll = useCallback(
    () => updateData(() => createDefaultData()),
    [updateData]
  );

  const replaceAll = useCallback(
    (nextData: UserData) => updateData(() => sanitizeImportedUserData(nextData)),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     DERIVED VALUES
     ══════════════════════════════════════════════════════════ */
  const { txs, scheds, goals, moods, wallets } = data;

  // Gross totals include goal transfers – needed for wallet balance.
  const totalInGross = txs
    .filter((transaction) => transaction.type === "in")
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const totalOutGross = txs
    .filter((transaction) => transaction.type === "out")
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  // Reporting totals exclude goal transfers and wallet transfers – they are
  // internal moves, not real income/spending.
  const totalIn = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId && !transaction.transferId)
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const totalOut = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && !transaction.transferId)
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  const initialWalletBalance = wallets.reduce((amount, wallet) => amount + wallet.balance, 0);
  const balance = initialWalletBalance + totalInGross - totalOutGross;

  const thisMonth = todayStr().slice(0, 7);
  const outMonth = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && !transaction.transferId && transaction.date?.startsWith(thisMonth))
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const inMonth = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId && !transaction.transferId && transaction.date?.startsWith(thisMonth))
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  const totalSaved = goals.reduce((amount, goal) => amount + goal.current, 0);

  const today = todayStr();
  const todayIncome = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId && !transaction.transferId && transaction.date === today)
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const todayExpense = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && !transaction.transferId && transaction.date === today)
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  const todaySchedules = scheds
    .filter((schedule) => scheduleOccursOnDate(schedule, today))
    .sort((a, b) => (a.start > b.start ? 1 : -1));

  const savingsRate = totalIn > 0 ? Math.max(0, (totalIn - totalOut) / totalIn) : 0;
  const overspend = inMonth > 0 && outMonth > inMonth;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(50 + savingsRate * 55 - (overspend ? 20 : 0) + (goals.length > 0 ? 5 : 0))
    )
  );

  const categories = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && !transaction.transferId)
    .reduce<Record<string, number>>((result, transaction) => {
      const category = transaction.cat || "Lainnya";
      result[category] = (result[category] || 0) + transaction.amt;
      return result;
    }, {});

  const savingsPct = totalIn > 0 ? Math.round((totalSaved / totalIn) * 100) : 0;
  const todayMood = moods[today];

  const walletsWithBalance: Wallet[] = wallets.map((wallet) => {
    const walletTransactions = txs.filter((transaction) => transaction.walletId === wallet.id);
    const income = walletTransactions
      .filter((transaction) => transaction.type === "in")
      .reduce((amount, transaction) => amount + transaction.amt, 0);
    const expense = walletTransactions
      .filter((transaction) => transaction.type === "out")
      .reduce((amount, transaction) => amount + transaction.amt, 0);
    return { ...wallet, balance: wallet.balance + income - expense };
  });

  const buildAIContext = () => {
    const fmt = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
    const lines: string[] = [];

    lines.push(`Hari ini: ${today}`);
    lines.push("");

    // ── Dompet ──
    lines.push("### Dompet");
    for (const w of walletsWithBalance) {
      lines.push(`- ${w.name}: ${fmt(w.balance)}`);
    }
    lines.push(`Total saldo: ${fmt(balance)}`);
    lines.push("");

    // ── Transaksi hari ini ──
    const todayTxList = txs.filter((t) => t.date === today && !t.goalId && !t.transferId);
    const todayInList = todayTxList.filter((t) => t.type === "in");
    const todayOutList = todayTxList.filter((t) => t.type === "out");

    lines.push("### Transaksi Hari Ini");
    if (todayTxList.length === 0) {
      lines.push("Belum ada transaksi.");
    } else {
      if (todayInList.length > 0) {
        lines.push("Pemasukan:");
        for (const t of todayInList) {
          const w = walletsWithBalance.find((ww) => ww.id === t.walletId);
          lines.push(`- ${t.cat}: ${fmt(t.amt)}${w ? ` (${w.name})` : ""}${t.desc ? ` — ${t.desc}` : ""}`);
        }
      }
      if (todayOutList.length > 0) {
        lines.push("Pengeluaran:");
        for (const t of todayOutList) {
          const w = walletsWithBalance.find((ww) => ww.id === t.walletId);
          lines.push(`- ${t.cat}: ${fmt(t.amt)}${w ? ` (${w.name})` : ""}${t.desc ? ` — ${t.desc}` : ""}`);
        }
      }
      lines.push(`Total: masuk ${fmt(todayIncome)}, keluar ${fmt(todayExpense)}`);
    }
    lines.push("");

    // ── Transaksi 7 hari terakhir (selain hari ini) ──
    const sevenDaysAgo = addDaysToDateKey(today, -7);
    const recentTxList = txs
      .filter((t) => !t.goalId && !t.transferId && t.date !== today && t.date >= sevenDaysAgo)
      .slice(0, 30);

    if (recentTxList.length > 0) {
      lines.push("### Transaksi 7 Hari Terakhir");
      for (const t of recentTxList) {
        const w = walletsWithBalance.find((ww) => ww.id === t.walletId);
        const arrow = t.type === "in" ? "↑" : "↓";
        lines.push(`- ${t.date} ${arrow} ${t.cat}: ${fmt(t.amt)}${w ? ` (${w.name})` : ""}${t.desc ? ` — ${t.desc}` : ""}`);
      }
      lines.push("");
    }

    // ── Rekap bulan ini ──
    lines.push("### Rekap Bulan Ini");
    lines.push(`- Pemasukan: ${fmt(inMonth)}`);
    lines.push(`- Pengeluaran: ${fmt(outMonth)}`);
    const topCats = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => `${cat} ${fmt(amt)}`)
      .join(", ");
    if (topCats) {
      lines.push(`- Top pengeluaran: ${topCats}`);
    }
    lines.push("");

    // ── Goals ──
    if (goals.length > 0) {
      lines.push("### Goals");
      for (const g of goals) {
        const pct = Math.round((g.current / (g.target || 1)) * 100);
        const dl = g.deadline ? ` (target: ${g.deadline})` : "";
        lines.push(`- ${g.icon} ${g.name}: ${fmt(g.current)} / ${fmt(g.target)} (${pct}%)${dl}`);
      }
      lines.push(`Total ditabung: ${fmt(totalSaved)}`);
      lines.push("");
    }

    // ── Jadwal hari ini ──
    if (todaySchedules.length > 0) {
      lines.push("### Jadwal Hari Ini");
      for (const s of todaySchedules) {
        lines.push(`- ${s.start}${s.end ? `–${s.end}` : ""} ${s.icon} ${s.name}${s.desc ? ` — ${s.desc}` : ""}`);
      }
      lines.push("");
    }

    // ── Jadwal terdekat (selain hari ini) ──
    const upcoming = scheds
      .map((s) => ({ s, date: getNextScheduleOccurrence(s, today) }))
      .filter((item): item is { s: ScheduleItem; date: string } => Boolean(item.date) && item.date !== today)
      .sort((a, b) =>
        a.date === b.date ? a.s.start.localeCompare(b.s.start) : a.date.localeCompare(b.date)
      )
      .slice(0, 5);

    if (upcoming.length > 0) {
      lines.push("### Jadwal Terdekat");
      for (const { s, date } of upcoming) {
        lines.push(`- ${date}: ${s.start}${s.end ? `–${s.end}` : ""} ${s.icon} ${s.name}`);
      }
      lines.push("");
    }

    // ── Mood ──
    if (todayMood) {
      lines.push(`Mood: ${todayMood.mood} ${todayMood.label}${todayMood.note ? ` — "${todayMood.note}"` : ""}`);
      lines.push("");
    }

    // ── Skor ──
    lines.push(`Skor kesehatan keuangan: ${score}/100`);

    // Safety: cap context length to avoid exceeding system prompt limit
    let context = lines.join("\n");
    if (context.length > 14000) {
      const cutIndex = context.indexOf("### Transaksi 7 Hari Terakhir");
      if (cutIndex !== -1) {
        const nextSection = context.indexOf("### Rekap Bulan Ini", cutIndex);
        context = nextSection !== -1
          ? context.slice(0, cutIndex) + context.slice(nextSection)
          : context.slice(0, cutIndex);
      }
    }

    return context;
  };

  return {
    // Data
    txs,
    scheds,
    goals,
    moods,
    settings,
    backupData,
    wallets: walletsWithBalance,
    // Loading & sync states
    loading,
    loadedUserId,
    syncing,
    syncError,
    // Mutators
    addTx,
    updateTx,
    delTx,
    addSched,
    updateSched,
    delSched,
    addGoal,
    updateGoal,
    delGoal,
    fundGoal,
    withdrawGoal,
    addWallet,
    delWallet,
    updateWallet,
    transferWallet,
    setTodayMood,
    setTodayNote,
    updateSettings,
    resetAll,
    replaceAll,
    // Derived
    totalIn,
    totalOut,
    balance,
    outMonth,
    inMonth,
    totalSaved,
    todayIncome,
    todayExpense,
    todaySchedules,
    score,
    categories,
    savingsPct,
    todayMood,
    buildAIContext,
  };
}

/* ══════════════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════════════ */
type DuitStore = ReturnType<typeof useDuitStoreInternal>;

const StoreContext = createContext<DuitStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useDuitStoreInternal();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): DuitStore {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return context;
}
