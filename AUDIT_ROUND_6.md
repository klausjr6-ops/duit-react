# Audit Round 6 — Bug Report

**Tanggal:** 17 Juli 2026  
**Cakupan:** Re-audit seluruh source setelah fix round 1–5 + mobile auto-logout + logo loader + G1–G8 fixes

---

## Critical Bugs

### H1. ChatWidget: logo D status check still has `inMonth > 0` guard (same as G3)
**Severity:** High (inconsistent — FAB was fixed in G3, but ChatWidget still uses old logic)

In `ChatWidget.tsx` lines 345–348:
```ts
const dStatus = (outMonth > inMonth && inMonth > 0)
  ? "danger"
  : (outMonth > inMonth * 0.8 && inMonth > 0)
    ? "warning"
    : ...
```

This is the **exact same bug** as G3, but in ChatWidget instead of DraggableFAB. The FAB was fixed to `outMonth > inMonth ? "danger"`, but the ChatWidget header logo D still uses the old `inMonth > 0` guard.

With 0 income + expenses: ChatWidget logo shows "neutral" (teal shadow) while FAB shows "danger" (red). Inconsistent.

**Fix:** Same fix as G3 — remove `inMonth > 0` guards:
```ts
const dStatus = outMonth > inMonth
  ? "danger"
  : (inMonth > 0 && outMonth > inMonth * 0.8)
    ? "warning"
    : score >= 70
      ? "good"
      : "neutral";
```

---

## Medium Bugs

### H2. DraggableFAB: inline `<style>` tag still injected per instance
**Severity:** Medium (same pattern as B3 from audit #1 — Card was fixed, but FAB wasn't)

`DraggableFAB.tsx` lines 321–338 injects a `<style>` tag with `@keyframes fab-pulse`, `.fab-pulse`, `.fab-dragging`, `.fab-btn:hover`, `.fab-btn:active` rules. This was acceptable when B3 was fixed for Card (moved to `index.css`), but FAB was overlooked.

While there's only 1 FAB instance (so no duplication issue), it's inconsistent with the approach used for Card glow. More importantly, the `<style>` tag re-injects on every re-render.

**Fix:** Move the FAB CSS to `index.css` and remove the `<style>` tag from the component.

---

### H3. CSV export: goal withdrawal transactions labeled incorrectly
**Severity:** Medium (data integrity — export mislabels financial data)

In `AccountModal.tsx` line 221:
```ts
transaction.type === "in" ? "Pemasukan" : transaction.goalId ? "Transfer Goal" : "Pengeluaran",
```

This classifies ALL goal transactions (both funding AND withdrawal) as "Transfer Goal". But:
- Goal funding (`type: "out"` + `goalId`) → correctly "Transfer Goal" (moving money out to goal)
- Goal withdrawal (`type: "in"` + `goalId`) → incorrectly "Transfer Goal" — it should be "Penarikan Goal" or "Pemasukan Goal"

Also, `transferId` transactions (wallet-to-wallet) aren't labeled — they appear as "Pemasukan"/"Pengeluaran" without any transfer indication. And CF entries aren't distinguished either.

**Fix:** Differentiate transaction types properly in CSV:
```ts
transaction.isCarryForward ? "Saldo Bulan Lalu"
  : transaction.transferId ? "Transfer"
  : transaction.goalId && transaction.type === "in" ? "Penarikan Goal"
  : transaction.goalId && transaction.type === "out" ? "Nabung Goal"
  : transaction.type === "in" ? "Pemasukan"
  : "Pengeluaran",
```

---

### H4. `delGoal` doesn't restore wallet balance for deleted goal funding/withdrawal txs
**Severity:** Medium (balance corruption — deleting a goal permanently alters wallet balances)

When `delGoal(id)` is called, it removes all transactions with `goalId === id`:
```ts
txs: previous.txs.filter((transaction) => transaction.goalId !== id),
```

But it does NOT adjust `wallet.balance` for the deleted transactions. Let's trace what happens:

1. User creates goal with 100k initial savings from BCA → creates funding tx `{type: "out", goalId, walletId: BCA, amt: 100k}`
2. BCA's derived balance = BCA.base - 100k (funding tx is "out")
3. User deletes the goal → `delGoal` removes the funding tx
4. BCA's derived balance = BCA.base (funding tx gone, balance restored) ✅

Wait — actually this works correctly because `walletsWithBalance` computes derived balance from txs + base. When the funding tx is removed, the "out" is no longer subtracted, so balance is restored. The `wallet.balance` field (base) is never changed by `addGoal`/`fundGoal`/`withdrawGoal`.

However, there's a subtle issue: if a user had deleted goal transactions via `delTx` (which IS allowed for goal txs — edit is blocked but delete isn't for non-CF/non-transfer), `delTx` correctly adjusts `goal.current`. But `delGoal` doesn't do the reverse — it doesn't need to adjust goals (it's deleting the goal), and it doesn't need to adjust wallet base balance (because that was never changed).

Actually, re-examining: this is correct behavior. The derived balance calculation in `walletsWithBalance` automatically reflects the removal of the funding/withdrawal transactions. No balance corruption occurs. **Downgrading to informational.**

**Update:** Not a bug — `walletsWithBalance` recalculates from base + net txs. Removing goal txs naturally restores the balance.

---

### H5. `isSessionStale()`: first-time users with no localStorage key are treated as "fresh"
**Severity:** Medium (security — first login on a device auto-skips the stale check)

```ts
export function isSessionStale(): boolean {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false; // No record = first use, not stale
```

On a brand-new device or after clearing localStorage, `isSessionStale()` returns `false`, so the user is never logged out on first visit. This is actually fine for first-time users — they just logged in, so they should be fresh.

But consider: Firebase Auth also persists. If a user:
1. Logs in on Device A
2. Doesn't use the app for months
3. Clears localStorage on Device A (or uses a different browser on same device)
4. Opens the app → Firebase auto-restores the session → `isSessionStale()` returns `false` (no key) → user gets in without the 5-min check

This is a very narrow edge case (user must clear localStorage but NOT clear cookies/indexedDB where Firebase Auth lives). Acceptable risk.

**Update:** Downgrading to informational. The edge case is extremely narrow.

---

## Low Bugs

### H6. `Score` calculation can exceed 100 in edge cases
**Severity:** Low (defensive — Math.min(100) guard exists, but the formula can produce values > 100 before clamping)

The score formula:
```ts
const score = Math.max(0, Math.min(100, Math.round(50 + savingsRate * 55 - (overspend ? 20 : 0) + (goals.length > 0 ? 5 : 0))));
```

If `savingsRate = 1` (100% savings rate, meaning 0 expenses), `overspend = false`, and `goals.length > 0`:
```
score = 50 + 1 * 55 - 0 + 5 = 110 → clamped to 100
```

The `Math.min(100)` guard prevents this from being displayed, but it means the "health score" can never differentiate between "good" (score ~85) and "excellent" (score 100) because the formula overshoots.

This is a design issue rather than a bug. The formula was simplified from an earlier version. Not critical.

---

### H7. `index.css` iOS zoom fix doesn't cover `type="search"` inputs
**Severity:** Low (cosmetic — search inputs would zoom on iOS if any were used)

The iOS auto-zoom prevention covers:
```css
input[type="text"], input[type="email"], input[type="password"],
input[type="number"], input[type="date"], input[type="time"],
textarea, select
```

Missing: `input[type="search"]` and `input[type="url"]` and `input[type="tel"]`. Currently no search/tel/url inputs exist in the app, so this is defensive.

---

### H8. `addGoal` race condition: goal can be created without funding tx if Firestore write fails midway
**Severity:** Low (same as F4 from round 4 — acknowledged as rare edge case)

Still unfixed. The `updateData` updater double-checks balance and may silently reject the funding tx while still creating the goal. `addGoal` returns `{ok: true}` regardless.

**No change from round 4.** Accepting as rare edge case.

---

## Summary

| ID | Severity | Component | Description |
|----|----------|-----------|-------------|
| H1 | 🔴 High | ChatWidget | Logo D status still has `inMonth > 0` guard (same as G3, not fixed) |
| H2 | 🟡 Medium | DraggableFAB | Inline `<style>` tag should be in `index.css` |
| H3 | 🟡 Medium | AccountModal | CSV export mislabels goal withdrawals and doesn't distinguish transfers/CF |
| H4 | ℹ️ Info | store/delGoal | Not a bug — derived balance auto-corrects |
| H5 | ℹ️ Info | useAutoLogout | isSessionStale first-use edge case — extremely narrow |
| H6 | 🟢 Low | store/score | Formula can exceed 100 but is clamped |
| H7 | 🟢 Low | index.css | iOS zoom fix missing `type="search"` and `type="tel"` |
| H8 | 🟢 Low | store/addGoal | Race condition — same as F4, accepted |

### Bugs to Fix (H1–H3)

1. **H1** — Sync ChatWidget logo D status with FAB (remove `inMonth > 0` guard)
2. **H2** — Move FAB CSS to `index.css`, remove inline `<style>` tag
3. **H3** — Fix CSV export labels for goal withdrawals, transfers, and CF
