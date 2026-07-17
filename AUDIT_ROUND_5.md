# Audit Round 5 — Bug Report

**Tanggal:** 17 Juli 2026  
**Cakupan:** Re-audit seluruh source setelah fix round 1–4 + CF feature + mobile auto-logout + logo loader

---

## Critical Bugs

### G1. App.tsx: Stale session check causes dashboard flicker before logout
**Severity:** High (UX break — user sees dashboard for ~1 frame before being kicked to login)

The cross-session stale check in `App.tsx` is implemented as a `useEffect`, which runs **after** the initial render. The flow:

1. `onAuthStateChanged` fires → `user` is set → `loading = false`
2. App renders: `!user` is false → renders `<AuthenticatedApp />`
3. `useEffect` fires → detects stale session → calls `logout()`
4. `logout()` is async → `user` becomes null → renders `<LoginScreen />`

Between step 2 and 4, the user **briefly sees the full dashboard** (AuthenticatedApp starts loading data, showing DashboardLoader or actual content). On mobile, this flicker is very noticeable.

**Fix:** Add a `sessionChecking` state that delays rendering until the stale check completes:

```tsx
const [sessionReady, setSessionReady] = useState(false);

useEffect(() => {
  if (loading || !user) { setSessionReady(true); return; }
  if (isSessionStale()) {
    try { sessionStorage.setItem("duit_session_expired", "1"); } catch {}
    logout();
    return;
  }
  stampActivity();
  setSessionReady(true);
}, [loading, user, logout]);

if (loading || !sessionReady) return <FullScreenLoader />;
if (!user) return <LoginScreen />;
```

---

### G2. useAutoLogout: `stampActivity()` writes to localStorage on every mousemove — excessive I/O
**Severity:** High (performance — causes jank on mobile, 30–60 synchronous localStorage writes/second)

The `resetTimer` function calls `stampActivity()` which writes `Date.now()` to `localStorage` on **every** activity event. The `mousemove` event fires dozens of times per second during normal use. `localStorage.setItem()` is synchronous and blocks the main thread.

On mobile browsers, this can cause noticeable input lag and battery drain.

**Fix:** Throttle the localStorage write — only write if the last write was more than 10 seconds ago. The timestamp only needs ~minute precision for a 5-minute timeout check.

```ts
let lastStamp = 0;
export function stampActivity(): void {
  const now = Date.now();
  if (now - lastStamp < 10_000) return; // throttle: max 1 write per 10s
  lastStamp = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  } catch {}
}
```

---

## Medium Bugs

### G3. DraggableFAB: overspend status check out of sync with store
**Severity:** Medium (inconsistent — FAB shows "neutral" when it should show "danger" for 0-income overspend)

In `DraggableFAB.tsx`, the financial status logic:
```ts
const status =
  (outMonth > inMonth && inMonth > 0) ? "danger" :  // ← still has inMonth > 0 guard
  (outMonth > inMonth * 0.8 && inMonth > 0) ? "warning" :
  ...
```

But the store's `overspend` check was fixed in audit #4 (F8) to remove the `inMonth > 0` guard:
```ts
const overspend = outMonth > inMonth;  // no inMonth > 0 guard
```

This means: if a user has 0 income but has expenses, the ReportCard shows the "Overspend" badge, but the FAB stays "neutral" instead of turning red. Inconsistent.

**Fix:** Remove `inMonth > 0` guards from DraggableFAB status logic:
```ts
const status =
  outMonth > inMonth ? "danger" :
  (inMonth > 0 && outMonth > inMonth * 0.8) ? "warning" :
  score >= 70 ? "good" : "neutral";
```

---

### G4. WithdrawFundModal: misleading description contradicts actual behavior
**Severity:** Medium (misinformation — tells user the opposite of what actually happens)

`WithdrawFundModal.tsx` says:
> "Saldo Goal berkurang dan **tidak dihitung sebagai pemasukan**."

But `isRealFlow` in the store **DOES** count goal withdrawals as income:
```ts
const isRealFlow = (t: Transaction) =>
  !t.transferId && !t.isCarryForward && !(t.goalId && t.type === "out");
  // goalId + type "in" (withdrawal) → IS counted as income
```

Goal withdrawals appear as emerald "+" in TransactionList and show up in `inMonth` / `todayIncome`. The description is factually wrong.

**Fix:** Change the description text:
```
"Dana akan dikembalikan ke dompet pilihanmu. Saldo Goal berkurang dan dicatat sebagai pemasukan di dompet."
```

---

### G5. ViewLoader spinner has broken CSS — `border current` is not a valid Tailwind class
**Severity:** Medium (visual — spinner may not render correctly)

In `AuthenticatedApp.tsx`:
```tsx
<span className="h-4 w-4 animate-spin rounded-full border-2 border current border-t-transparent opacity-60" />
```

`border current` (with space) is TWO separate classes: `border` (sets border-width: 1px, overriding `border-2`) and `current` (not a valid Tailwind class — does nothing). The correct class is `border-current` (with hyphen), which sets `border-color: currentColor`.

Without `border-current`, the spinner relies on the browser's default border color (which may or may not match the text color depending on the browser and inherited styles).

**Fix:** Change to `border-current` (with hyphen):
```tsx
<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60" />
```

---

## Low Bugs

### G6. `delWallet` leaves orphaned transfer "in" transactions on surviving wallets
**Severity:** Low (no balance corruption, but orphaned transfer entries persist in UI)

When wallet A is deleted, `delWallet` removes all transactions with `walletId === A`. But for transfer pairs:
- `{type: "out", transferId: 123, walletId: A}` — **deleted** ✅
- `{type: "in", transferId: 123, walletId: B}` — **survives** ⚠️

The orphaned "in" transfer on B:
- ✅ Doesn't corrupt B's balance (B legitimately received the money)
- ✅ Doesn't inflate income/expense (transfers excluded from `isRealFlow`)
- ⚠️ Still appears in TransactionList with transfer styling (confusing — one half of a pair is gone)
- ⚠️ `delTx` for this orphan tries to delete its pair (already gone) — no crash, just unnecessary

**Fix (optional):** When deleting a wallet, also delete the paired transfer "in" transactions on other wallets and adjust their base balances accordingly. Or at minimum, remove the `transferId` from orphaned entries so they render as regular income instead of broken transfers.

---

### G7. `addTx` doesn't validate `walletId` for "in" transactions
**Severity:** Low (all UI paths validate, but store lacks defensive check)

For "out" transactions, `addTx` validates the wallet exists:
```ts
if (tx.type === "out" && tx.walletId) {
  const sourceBalance = getWalletBalance(dataRef.current, tx.walletId);
  if (sourceBalance === null) return { ok: false, message: "Dompet tidak ditemukan." };
```

But for "in" transactions, no such check exists. If an "in" tx is created with a non-existent `walletId`, the transaction is created but doesn't affect any wallet balance — effectively lost money.

All UI paths require wallet selection, so this can't happen in practice. But it's an inconsistency.

**Fix:** Add wallet validation for "in" transactions too:
```ts
if (tx.walletId) {
  const walletExists = dataRef.current.wallets.some(w => w.id === tx.walletId);
  if (!walletExists) return { ok: false, message: "Dompet tidak ditemukan." };
}
```

---

### G8. KeuanganView: delete button for transfer transactions is enabled but shouldn't be
**Severity:** Low (UX inconsistency — edit disabled, but delete enabled for transfers)

In `TransactionList.tsx`, the edit button is disabled for goal, transfer, and CF transactions:
```tsx
disabled={isGoal || isTransfer || isCF}
```

But the delete button is only disabled for CF:
```tsx
disabled={isCF}
```

Transfer transactions are paired (in/out). Deleting just one half of a transfer via `delTx` will also delete the other half (the store handles this). But the UX is inconsistent — if you can't edit a transfer, should you be able to delete it? Goal transactions also can't be edited but CAN be deleted (which is fine — the store adjusts the goal balance).

For transfers specifically, allowing deletion is potentially confusing because it affects two wallets at once. The confirm dialog message mentions this for transfers:
> "Pasangan transfer juga akan dihapus."

So the UX is acceptable, but worth noting the inconsistency.

---

## Summary

| ID | Severity | Component | Description |
|----|----------|-----------|-------------|
| G1 | 🔴 High | App.tsx | Stale session check flickers dashboard before logout |
| G2 | 🔴 High | useAutoLogout | stampActivity() writes localStorage on every mousemove |
| G3 | 🟡 Medium | DraggableFAB | Overspend status still has `inMonth > 0` guard (out of sync with store) |
| G4 | 🟡 Medium | WithdrawFundModal | Misleading text: says "tidak dihitung sebagai pemasukan" but it IS counted |
| G5 | 🟡 Medium | AuthenticatedApp | ViewLoader spinner: `border current` → should be `border-current` |
| G6 | 🟢 Low | store/delWallet | Leaves orphaned transfer "in" tx on surviving wallets |
| G7 | 🟢 Low | store/addTx | No walletId validation for "in" transactions |
| G8 | 🟢 Low | TransactionList | Transfer delete enabled but edit disabled — inconsistent |

### Priority Fix Order
1. **G1** — Session check flicker (adds `sessionReady` guard)
2. **G2** — Throttle localStorage writes (10s interval)
3. **G3** — Sync FAB overspend check with store
4. **G4** — Fix WithdrawFundModal description text
5. **G5** — Fix ViewLoader spinner CSS

G6–G8 are low priority and can be deferred.
