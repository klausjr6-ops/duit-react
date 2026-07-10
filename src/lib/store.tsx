import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

/* ══════════════════════════════════════════════════════════════
   TYPES (sama seperti sebelumnya)
   ══════════════════════════════════════════════════════════════ */
export interface Transaction {
  id: number;
  type: "in" | "out";
  amt: number;
  cat: string;
  desc: string;
  date: string;
  walletId?: number;
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
}

export interface Wallet {
  id: number;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function todayDayName() {
  const d = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  return d[0].toUpperCase() + d.slice(1);
}

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

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

const DEFAULT_DATA: UserData = {
  txs: [],
  scheds: [],
  goals: [],
  moods: {},
  settings: { name: "Kamu", themeMode: "system" },
  wallets: DEFAULT_WALLETS,
};

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
  // Kalau udah pernah migrate, skip
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
    settings: readLS<Partial<Settings>>(OLD_KEYS.settings, { name: "Kamu", themeMode: "system" }),
    wallets: readLS<Wallet[]>(OLD_KEYS.wallets, DEFAULT_WALLETS),
  };
}

function markMigrated() {
  localStorage.setItem(MIGRATION_KEY, "1");
  // Optional: clear old data biar gak ambil space
  Object.values(OLD_KEYS).forEach((k) => localStorage.removeItem(k));
}

/* ══════════════════════════════════════════════════════════════
   INTERNAL STORE HOOK
   ══════════════════════════════════════════════════════════════ */
function useDuitStoreInternal() {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /* ─── Subscribe real-time ke Firestore ──────────────────── */
  useEffect(() => {
    if (!user) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "users", user.uid, "data", "main");

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<UserData>;
          // Merge dengan default untuk field yang mungkin missing
          setData({
            txs: remoteData.txs || [],
            scheds: remoteData.scheds || [],
            goals: remoteData.goals || [],
            moods: remoteData.moods || {},
            settings: { name: "Kamu", themeMode: "system" as ThemeMode, ...(remoteData.settings || {}) },
            wallets: remoteData.wallets || DEFAULT_WALLETS,
          });
          setLoading(false);
        } else {
          // Doc belum ada → cek localStorage untuk migrate
          const localData = getLocalStorageData();
          if (localData) {
            console.log("📦 Migrating localStorage data to Firestore...");
            await setDoc(ref, localData);
            markMigrated();
            setData(localData);
          } else {
            // User baru — buat default data
            await setDoc(ref, DEFAULT_DATA);
            setData(DEFAULT_DATA);
          }
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firestore snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  /* ─── Update Firestore (optimistic + debounced-ish) ──────── */
  const saveToFirestore = useCallback(
    async (newData: UserData) => {
      if (!user) return;
      setSyncing(true);
      try {
        const ref = doc(db, "users", user.uid, "data", "main");
        await setDoc(ref, newData, { merge: true });
      } catch (err) {
        console.error("Firestore write error:", err);
      } finally {
        setSyncing(false);
      }
    },
    [user]
  );

  // Helper untuk update state + sync
  const updateData = useCallback(
    (updater: (prev: UserData) => UserData) => {
      setData((prev) => {
        const next = updater(prev);
        // Fire-and-forget ke Firestore
        saveToFirestore(next);
        return next;
      });
    },
    [saveToFirestore]
  );

  /* ─── Derived: settings dengan default ─────────────────────── */
  const settings: Settings = useMemo(
    () => ({ name: "Kamu", themeMode: "system" as ThemeMode, ...data.settings }),
    [data.settings]
  );

  /* ══════════════════════════════════════════════════════════
     TRANSACTIONS
     ══════════════════════════════════════════════════════════ */
  const addTx = useCallback(
    (tx: Omit<Transaction, "id">) =>
      updateData((prev) => ({
        ...prev,
        txs: [{ ...tx, id: Date.now() }, ...prev.txs],
      })),
    [updateData]
  );

  const delTx = useCallback(
    (id: number) =>
      updateData((prev) => ({
        ...prev,
        txs: prev.txs.filter((t) => t.id !== id),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     SCHEDULES
     ══════════════════════════════════════════════════════════ */
  const addSched = useCallback(
    (s: Omit<ScheduleItem, "id">) =>
      updateData((prev) => ({
        ...prev,
        scheds: [...prev.scheds, { ...s, id: Date.now() }],
      })),
    [updateData]
  );

  const delSched = useCallback(
    (id: number) =>
      updateData((prev) => ({
        ...prev,
        scheds: prev.scheds.filter((s) => s.id !== id),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     GOALS
     ══════════════════════════════════════════════════════════ */
  const addGoal = useCallback(
    (g: Omit<Goal, "id">) =>
      updateData((prev) => ({
        ...prev,
        goals: [...prev.goals, { ...g, id: Date.now() }],
      })),
    [updateData]
  );

  const delGoal = useCallback(
    (id: number) =>
      updateData((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
      })),
    [updateData]
  );

  const addToGoal = useCallback(
    (id: number, amount: number) =>
      updateData((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id ? { ...g, current: g.current + amount } : g
        ),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     WALLETS
     ══════════════════════════════════════════════════════════ */
  const addWallet = useCallback(
    (w: Omit<Wallet, "id">) =>
      updateData((prev) => ({
        ...prev,
        wallets: [...prev.wallets, { ...w, id: Date.now() }],
      })),
    [updateData]
  );

  const delWallet = useCallback(
    (id: number) =>
      updateData((prev) => ({
        ...prev,
        wallets: prev.wallets.filter((w) => w.id !== id),
      })),
    [updateData]
  );

  const updateWallet = useCallback(
    (id: number, patch: Partial<Wallet>) =>
      updateData((prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     MOODS
     ══════════════════════════════════════════════════════════ */
  const setTodayMood = useCallback(
    (mood: string, label: string) =>
      updateData((prev) => ({
        ...prev,
        moods: {
          ...prev.moods,
          [todayStr()]: {
            mood,
            label,
            note: prev.moods[todayStr()]?.note || "",
          },
        },
      })),
    [updateData]
  );

  const setTodayNote = useCallback(
    (note: string) =>
      updateData((prev) => ({
        ...prev,
        moods: {
          ...prev.moods,
          [todayStr()]: {
            mood: prev.moods[todayStr()]?.mood || "🙂",
            label: prev.moods[todayStr()]?.label || "Biasa",
            note,
          },
        },
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     SETTINGS
     ══════════════════════════════════════════════════════════ */
  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      updateData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      })),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     RESET
     ══════════════════════════════════════════════════════════ */
  const resetAll = useCallback(
    () => updateData(() => DEFAULT_DATA),
    [updateData]
  );

  /* ══════════════════════════════════════════════════════════
     DERIVED VALUES (sama seperti sebelumnya)
     ══════════════════════════════════════════════════════════ */
  const { txs, scheds, goals, moods, wallets } = data;

  const totalIn = txs.filter((t) => t.type === "in").reduce((a, t) => a + t.amt, 0);
  const totalOut = txs.filter((t) => t.type === "out").reduce((a, t) => a + t.amt, 0);
  const balance = totalIn - totalOut;

  const thisMonth = todayStr().slice(0, 7);
  const outMonth = txs
    .filter((t) => t.type === "out" && t.date?.startsWith(thisMonth))
    .reduce((a, t) => a + t.amt, 0);
  const inMonth = txs
    .filter((t) => t.type === "in" && t.date?.startsWith(thisMonth))
    .reduce((a, t) => a + t.amt, 0);

  const totalSaved = goals.reduce((a, g) => a + g.current, 0);

  const today = todayStr();
  const todayIncome = txs
    .filter((t) => t.type === "in" && t.date === today)
    .reduce((a, t) => a + t.amt, 0);
  const todayExpense = txs
    .filter((t) => t.type === "out" && t.date === today)
    .reduce((a, t) => a + t.amt, 0);

  const todayName = todayDayName();
  const todaySchedules = scheds
    .filter((s) => (!s.date && s.day === todayName) || s.date === today)
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
    .filter((t) => t.type === "out")
    .reduce<Record<string, number>>((acc, t) => {
      const key = t.cat || "Lainnya";
      acc[key] = (acc[key] || 0) + t.amt;
      return acc;
    }, {});

  const savingsPct = totalIn > 0 ? Math.round((totalSaved / totalIn) * 100) : 0;
  const todayMood = moods[today];

  const walletsWithBalance: Wallet[] = wallets.map((w) => {
    const walletTxs = txs.filter((t) => t.walletId === w.id);
    const income = walletTxs.filter((t) => t.type === "in").reduce((a, t) => a + t.amt, 0);
    const expense = walletTxs.filter((t) => t.type === "out").reduce((a, t) => a + t.amt, 0);
    return { ...w, balance: w.balance + income - expense };
  });

  const buildAIContext = () => {
    const topCat = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} Rp${Math.round(v).toLocaleString("id-ID")}`)
      .join(", ");
    const goalsSummary = goals
      .map((g) => `${g.name} ${Math.round((g.current / (g.target || 1)) * 100)}%`)
      .join(", ");
    const weekSchedule = DAYS.map((d) => {
      const items = scheds
        .filter((s) => !s.date && s.day === d)
        .map((s) => `${s.start}${s.end ? "-" + s.end : ""} ${s.name}`)
        .join("; ");
      return items ? `${d}: ${items}` : null;
    })
      .filter(Boolean)
      .join(" | ");

    return [
      `Saldo saat ini: Rp${Math.round(balance).toLocaleString("id-ID")}.`,
      `Total pemasukan: Rp${Math.round(totalIn).toLocaleString("id-ID")}, total pengeluaran: Rp${Math.round(totalOut).toLocaleString("id-ID")}.`,
      `Pengeluaran bulan ini: Rp${Math.round(outMonth).toLocaleString("id-ID")}.`,
      topCat ? `Kategori pengeluaran terbesar: ${topCat}.` : "",
      goalsSummary ? `Progress goals: ${goalsSummary}.` : "",
      weekSchedule ? `Jadwal mingguan berulang: ${weekSchedule}.` : "",
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
    // Loading states (NEW)
    loading,
    syncing,
    // Mutators
    addTx,
    delTx,
    addSched,
    delSched,
    addGoal,
    delGoal,
    addToGoal,
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
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore harus dipakai di dalam <StoreProvider>");
  return ctx;
}