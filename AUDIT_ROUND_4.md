# Audit Round 4 — Bug Report

## Critical Bugs

### F1. TransactionList: CF delete confirm dialog still fires for CF entries
**Severity:** High (UX break — user sees "tidak bisa dihapus" message but the confirm button still says "Ya, Hapus")

When user clicks delete on a CF entry, the button is disabled (`disabled={isCF}`), so normally they can't click it. But if somehow triggered (keyboard, screen reader), the `ConfirmDialog` opens with message "Transaksi Saldo Bulan Lalu tidak bisa dihapus. Entri ini dibuat otomatis." yet the onConfirm still calls `delTx()` + `toast.success("Transaksi dihapus")`. The store blocks deletion silently, so the toast says "Transaksi dihapus" but nothing actually happens — confusing.

**Fix:** Add early return in `onConfirm` for CF entries, or close dialog + show toast error instead.

---

### F2. EditWalletModal: `netTxAmount` doesn't exclude CF and goal transactions
**Severity:** High (data corruption — wrong initial balance calculated)

```tsx
const netTxAmount = txs.filter(t => t.walletId === wallet.id && !t.transferId)
  .reduce((s, t) => s + (t.type === "in" ? t.amt : -t.amt), 0);
```

This includes `isCarryForward` entries and `goalId` entries in the net calculation. But `walletsWithBalance` in the store excludes CF entries (`!transaction.isCarryForward`) for balance calculation. So `wallet.balance - netTxAmount` will give a WRONG initial balance that's off by the CF and goal tx amounts.

Example: wallet base=0, CF income=50k, real income=100k, expense=30k → `walletsWithBalance` = 0 + 100k - 30k = 70k. But `netTxAmount` = 50k + 100k - 30k = 120k. Initial balance = 70k - 120k = **-50k** (WRONG, should be 0).

**Fix:** Filter out CF and goal transactions from `netTxAmount`:
```tsx
const netTxAmount = txs.filter(t => t.walletId === wallet.id && !t.transferId && !t.isCarryForward && !t.goalId)
  .reduce((s, t) => s + (t.type === "in" ? t.amt : -t.amt), 0);
```

---

### F3. KeuanganView: `currentCF` only finds the FIRST CF entry — but there may be multiple (one per wallet)
**Severity:** Medium (misleading display — only shows one wallet's CF amount)

```tsx
const currentCF = txs.find(
  (t) => t.isCarryForward && t.date === `${thisMonth}-01`
);
```

If user has 2 wallets (BCA, Cash), there will be 2 CF entries on the 1st. The banner shows only the first one found. Could show "Saldo Bulan Lalu: Rp50.000" when the real total across all wallets is Rp150.000.

**Fix:** Sum all CF entries for the current month, not just find the first:
```tsx
const cfTotal = txs
  .filter(t => t.isCarryForward && t.date === `${thisMonth}-01`)
  .reduce((sum, t) => sum + t.amt, 0);
```

---

## Medium Bugs

### F4. addGoal: `addGoal` returns `{ok: true}` even when the inner `updateData` silently rejects due to race condition
**Severity:** Medium (silent failure — user thinks goal was created with savings, but the funding tx wasn't added)

In `addGoal`, the `updateData` updater has a double-check:
```tsx
if (fundingTx && fundingTx.walletId) {
  const bal = getWalletBalance(previous, fundingTx.walletId);
  if (bal === null || bal < fundingTx.amt) {
    return previous; // silently reject — but we already returned {ok: true}
  }
}
```

If the race condition triggers, the goal is still added (without the funding tx), but `addGoal` already returned `{ok: true}`. The user sees "Goal berhasil ditambahkan" toast, but the initial savings didn't actually move from wallet to goal.

**Fix:** Return `{ok: false}` in this case. But since `updateData` is a fire-and-forget updater, we can't easily return from inside it. A pragmatic fix: move the `return {ok: true}` to after `updateData` and add a post-check. Or accept this edge case as rare enough.

---

### F5. WeeklyChart: goal withdrawal income is shown in chart but goal funding expense is excluded — asymmetric
**Severity:** Medium (chart imbalance — income bar inflated by goal withdrawals, expense bar deflated)

Currently:
- Income: `transaction.type === "in" && !transaction.transferId` → **includes** goal withdrawals
- Expense: `transaction.type === "out" && !transaction.transferId && !transaction.goalId` → **excludes** goal funding

This means withdrawing from a goal shows as income in the chart, but putting money into a goal doesn't show as expense. While this matches the reporting logic (`isRealFlow`), it makes the chart asymmetric for the same money flow.

When user puts 500k into goal → no bar change. When user takes 500k back → income bar jumps 500k. This is confusing.

**Fix:** Either exclude both or include both. Best: exclude goal withdrawal income from chart too, to match the weekly spending view:
```tsx
const income = dayTransactions
  .filter(t => t.type === "in" && !t.transferId && !t.goalId)
  .reduce(...)
```

---

### F6. `cfProcessingRef` 2-second timeout is a magic number — could be too short or too long
**Severity:** Low-Medium (edge case — potential double CF write on slow connections)

The 2-second `setTimeout` is arbitrary. On a slow connection, the Firestore write might take longer than 2s, and the flag would reset while the write is still in flight, causing a potential re-entry when the snapshot arrives.

**Fix:** Use `requestAnimationFrame` or tie the flag to the Firestore write promise instead of a timer. Or increase timeout to 5s.

---

## Low Bugs

### F7. Header: `GreetingIcon` could be undefined if `iconKey` doesn't match
**Severity:** Low (defensive — currently all keys are mapped)

```tsx
const GreetingIcon = GREETING_ICONS[greeting.iconKey];
// ...
{GreetingIcon && <GreetingIcon size={28} />}
```

The `&&` guard protects against undefined, but if `getGreeting()` ever returns an unmapped key, no icon shows. Minor.

---

### F8. `score` calculation uses `inMonth > 0` check for `overspend` but not for `outMonth`
**Severity:** Low (edge case — 0 income with high spending won't show overspend badge)

```tsx
const overspend = inMonth > 0 && outMonth > inMonth;
```

If user has 0 income (new month, just started) but has expenses, `overspend` is false even though spending exceeds income. This means the ReportCard won't show the "Overspend" warning when it should.

**Fix:** Change to `outMonth > inMonth` (remove the `inMonth > 0` guard).

---

### F9. `addWallet` doesn't validate for duplicate names
**Severity:** Low (inconsistency — WalletManager validates, but store doesn't)

`WalletManager.handleAdd()` checks for duplicate names before calling `addWallet`. But `addWallet` itself has no such check. If someone calls `addWallet` directly (e.g., via import/replaceAll), duplicate names could be created.

Not urgent since all UI paths validate, but inconsistent.

---

### F10. `TimelineCard` uses `new Date()` directly instead of Jakarta time
**Severity:** Low (cosmetic — timeline position may be slightly off for users not in WIB timezone)

```tsx
const now = new Date();
const hour = now.getHours() + now.getMinutes() / 60;
```

Uses local browser time, not Asia/Jakarta. If user is in a different timezone, the timeline position and "closest schedule" could be wrong.

---

## Summary

| ID | Severity | Component | Description |
|----|----------|-----------|-------------|
| F1 | 🔴 High | TransactionList | CF delete confirm dialog still fires, shows confusing toast |
| F2 | 🔴 High | EditWalletModal | netTxAmount includes CF+goal tx → wrong initial balance |
| F3 | 🟡 Medium | KeuanganView | currentCF only shows first wallet's CF, not total |
| F4 | 🟡 Medium | store/addGoal | Returns ok:true even when funding tx silently rejected |
| F5 | 🟡 Medium | WeeklyChart | Asymmetric: goal withdrawal=income shown, goal funding=expense hidden |
| F6 | 🟡 Medium | store/CF | cfProcessingRef 2s timeout is fragile |
| F7 | 🟢 Low | Header | GreetingIcon undefined guard (defensive) |
| F8 | 🟢 Low | store/score | overspend check requires inMonth>0, misses 0-income case |
| F9 | 🟢 Low | store/addWallet | No duplicate name validation in store |
| F10 | 🟢 Low | TimelineCard | Uses browser time instead of Asia/Jakarta |

**Recommendation:** Fix F1, F2, F3, F5 immediately. F4 and F6 are acceptable risks for now. F7-F10 are minor polish items.
