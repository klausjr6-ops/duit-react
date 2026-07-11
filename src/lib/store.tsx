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
import { db } from "./firebase";
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
  { id: 1, name: "BCA", balance: 0, icon: "💳", color: "from-emerald-500/20 to-emerald-500/5" },
  { id: 2, name: "Cash", balance: 0, icon: "💵", color: "from-emerald-500/20 to-emerald-500/5" },
];

/* ══════════════════════════════════════════════════════════════
   FIRESTORE DATA SHAPE
   ══════════════════════════════════════════════════════════════ */
interface UserData {
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
      updateData((previous) => ({
        ...previous,
        txs: previous.txs.filter((transaction) => transaction.id !== id),
      })),
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
      updateData((previous) => ({
        ...previous,
        wallets: previous.wallets.filter((wallet) => wallet.id !== id),
      })),
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

  // Reporting totals exclude goal transfers – they are internal moves,
  // not real income/spending.
  const totalIn = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId)
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const totalOut = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId)
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  const initialWalletBalance = wallets.reduce((amount, wallet) => amount + wallet.balance, 0);
  const balance = initialWalletBalance + totalInGross - totalOutGross;

  const thisMonth = todayStr().slice(0, 7);
  const outMonth = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && transaction.date?.startsWith(thisMonth))
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const inMonth = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId && transaction.date?.startsWith(thisMonth))
    .reduce((amount, transaction) => amount + transaction.amt, 0);

  const totalSaved = goals.reduce((amount, goal) => amount + goal.current, 0);

  const today = todayStr();
  const todayIncome = txs
    .filter((transaction) => transaction.type === "in" && !transaction.goalId && transaction.date === today)
    .reduce((amount, transaction) => amount + transaction.amt, 0);
  const todayExpense = txs
    .filter((transaction) => transaction.type === "out" && !transaction.goalId && transaction.date === today)
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
    .filter((transaction) => transaction.type === "out" && !transaction.goalId)
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
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => `${category} Rp${Math.round(amount).toLocaleString("id-ID")}`)
      .join(", ");
    const goalsSummary = goals
      .map((goal) => `${goal.name} ${Math.round((goal.current / (goal.target || 1)) * 100)}%`)
      .join(", ");
    const upcomingSchedules = scheds
      .map((schedule) => ({ schedule, date: getNextScheduleOccurrence(schedule, today) }))
      .filter((item): item is { schedule: ScheduleItem; date: string } => Boolean(item.date))
      .sort((a, b) => (a.date === b.date ? a.schedule.start.localeCompare(b.schedule.start) : a.date.localeCompare(b.date)))
      .slice(0, 5)
      .map(({ schedule, date }) => `${date} ${schedule.start}${schedule.end ? `-${schedule.end}` : ""} ${schedule.name}`)
      .join("; ");

    return [
      `Saldo saat ini: Rp${Math.round(balance).toLocaleString("id-ID")}.`,
      `Total pemasukan: Rp${Math.round(totalIn).toLocaleString("id-ID")}, total pengeluaran: Rp${Math.round(totalOut).toLocaleString("id-ID")}.`,
      `Pengeluaran bulan ini: Rp${Math.round(outMonth).toLocaleString("id-ID")}.`,
      topCategories ? `Kategori pengeluaran terbesar: ${topCategories}.` : "",
      goalsSummary ? `Progress goals: ${goalsSummary}.` : "",
      upcomingSchedules ? `Jadwal terdekat: ${upcomingSchedules}.` : "",
      `Skor kesehatan keuangan: ${score}/100.`,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return {
    // Data
    txs,
    scheds,
    goals,
    moods,
    settings,
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
    setTodayMood,
    setTodayNote,
    updateSettings,
    resetAll,
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
