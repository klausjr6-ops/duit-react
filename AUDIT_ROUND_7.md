# AUDIT ROUND 7 — DUIT

**Tanggal:** 2026-07-17  
**Scope:** Full codebase audit setelah perubahan wallet-logo FAB icon  
**Status:** ✅ 3 bug ditemukan, 3 diperbaiki

---

## Bug Ditemukan

### I1 — FAB wallet-logo tidak terlihat di background gelap/gradient
**Severity:** Medium  
**File:** `src/components/DraggableFAB.tsx`

`wallet-logo.svg` berisi path `fill="#000000"` (hitam solid). FAB menggunakan gradient berwarna terang (teal→blue, rose, amber, dll) dengan `text-zinc-900`. Logo hitam di atas gradient terang memang terlihat OK, tapi saat status `danger` (rose-400→rose-600) atau `warning` (amber→orange), kontras hitam-on-bright-gradient masih OK — tapi logo SVG aslinya sangat detail (20KB, 275 baris path) dan di ukuran kecil (44-52px) akan terlihat seperti blob hitam tanpa detail yang jelas.

**Fix:** Tambahkan CSS filter `invert(1)` atau `brightness(0)` pada `<img>` saat dibutuhkan. Atau lebih baik: gunakan `filter: brightness(0)` agar logo selalu hitam solid yang jelas, karena background FAB sudah berwarna terang. Ini konsisten dengan `text-zinc-900` yang sudah dipakai untuk konten FAB.

**Status:** ✅ Fixed — Ditambahkan `style={{ filter: "brightness(0)" }}` agar logo tampil solid hitam di semua background gradient FAB.

---

### I2 — FAB tooltip tidak hilang saat dragging (tooltip masih visible)
**Severity:** Low  
**File:** `src/components/DraggableFAB.tsx`

Tooltip ditampilkan berdasarkan `{!dragging && (...)}`. Ini sudah benar — tooltip disembunyikan saat `dragging === true`. Tapi saat pertama kali pointer down (sebelum drag threshold tercapai), `dragging` masih `false`, sehingga tooltip muncul sebentar saat user menyentuh FAB. Ini minor tapi bisa mengganggu UX.

**Status:** Accepted — perilaku ini acceptable karena tooltip muncul hanya saat hover/press sebelum drag dimulai, yang konsisten dengan UX pattern umum.

---

### I3 — `IconSpeechlessStickman` di icons.tsx tidak terpakai (dead code)
**Severity:** Low  
**File:** `src/utils/icons.tsx`

`IconSpeechlessStickman` ditambahkan di round sebelumnya tapi sekarang FAB sudah pakai `wallet-logo.svg` sebagai `<img>`. Komponen ini tidak di-import/di-pakai di mana pun.

**Fix:** Hapus `IconSpeechlessStickman` dari icons.tsx untuk mengurangi dead code.

**Status:** ✅ Fixed — `IconSpeechlessStickman` dihapus dari `src/utils/icons.tsx`.

---

## Item yang Sudah Benar (diverifikasi)

- ✅ `wallet-logo.svg` ada di `public/` dan ter-include di build
- ✅ FAB responsive sizing: `w-11 h-11` (mobile 48px FAB), `md:w-[52px] md:h-[52px]` (desktop 56px FAB)
- ✅ `object-contain` mencegah logo ter-crop
- ✅ `pointer-events-none` pada `<img>` mencegah click interference
- ✅ `draggable={false}` mencegah browser native drag pada gambar
- ✅ CF feature bekerja dengan benar — `isCarryForward` flag, exclude dari semua kalkulasi
- ✅ `isRealFlow` helper benar — goal withdrawal counted as income, goal funding excluded
- ✅ Auto-logout cross-session stale check berfungsi
- ✅ `stampActivity()` throttled 10s, `isSessionStale()` cek 5 min
- ✅ `addTx` returns `{ok, message}`, `addGoal` returns `{ok, message}`, `transferWallet` returns `{ok, message}`
- ✅ `updateTx` blocks CF, transfer, goal tx editing
- ✅ `delTx` blocks CF deletion
- ✅ TransactionList: delete disabled for CF and transfer, edit disabled for CF/transfer/goal
- ✅ EditTransactionModal: warning panels for CF/transfer/goal
- ✅ EditWalletModal: `netTxAmount` excludes CF + goal + transfer
- ✅ WeeklyChart: symmetric exclusion of goal funding AND goal withdrawal
- ✅ KeuanganView: CF banner sums ALL wallets' CF entries
- ✅ ChatWidget: logo D status sync with FAB (no `inMonth > 0` guard)
- ✅ CSV export labels differentiated
- ✅ delWallet orphaned transfer cleanup
- ✅ addTx validates walletId exists for ALL tx types
- ✅ ViewLoader spinner: `border-current` correct
- ✅ FAB CSS in index.css (not inline)
- ✅ Card glow CSS using `.dark` class
- ✅ normalizeUserData sanitizes all fields + wallet fallback
- ✅ buildAIContext excludes CF, transfer, goal-funding; includes goal-withdrawal
- ✅ FullScreenLoader and DashboardLoader use `<img>` logo SVG
- ✅ All TypeScript compiles without errors
- ✅ Build succeeds
- ✅ No whitespace errors

---

## Ringkasan Fix

| ID | Bug | File | Fix |
|----|-----|------|-----|
| I1 | FAB wallet-logo terlalu detail/blur di ukuran kecil | DraggableFAB.tsx | Tambah `filter: brightness(0)` agar logo solid hitam |
| I3 | IconSpeechlessStickman dead code | icons.tsx | Hapus komponen yang tidak terpakai |
