# 🔍 DUIT — Laporan Audit Bug #2
**Tanggal:** 16 Juli 2026  
**Cakupan:** Re-audit seluruh source setelah fix A1-C2  

---

## ✅ Bug dari Audit #1 yang SUDAH Diperbaiki

| Bug | Status |
|-----|--------|
| A1 EditTransactionModal transfer warning | ✅ Fixed |
| A2 normalizeUserData sanitize icons | ✅ Fixed |
| A3 JadwalView schedule icon | ✅ Fixed |
| B1 EmptyState `text-4xl` | ✅ Fixed |
| B2 KeuanganView Dompet button custom SVG | ✅ Fixed |
| B3 Card duplicate `<style>` tags | ✅ Fixed |
| B4 `getGreeting()` emoji → SVG | ✅ Fixed |
| C1 EditWalletModal balance comment | ✅ Fixed |
| C2 Card hover glow dead code | ✅ Fixed |

---

## 🐛 Bug Baru Ditemukan

### 🟡 Bug D1 — `normalizeUserData` tidak sanitize `settings` dari Firestore
- **File:** `src/lib/store.tsx` baris 372-390
- **Masalah:** `normalizeUserData` sekarang sanitize `scheds`, `goals`, `wallets` — tapi `settings` masih menggunakan spread operator mentah:
  ```ts
  settings: {
    name: "Kamu",
    themeMode: "time",
    ...(remote?.settings && typeof remote.settings === "object" ? remote.settings : {}),
  },
  ```
  Ini berarti field `avatar`, `calendarToken`, `fabCorner` dari Firestore lolos tanpa validasi. `sanitizeImportedUserData` menggunakan `sanitizeSettings()` tapi `normalizeUserData` tidak.
- **Dampak:** Rendah — `avatar` yang tidak valid (bukan `data:image/...`) atau `fabCorner` yang tidak valid bisa lolos ke UI. Namun, `ThemeStoreSync` hanya membaca `settings.themeMode` yang sudah di-hardcode default-nya.
- **Fix:** Ganti spread settings dengan `sanitizeSettings(remote?.settings)`.

### 🟡 Bug D2 — `normalizeUserData` tidak sanitize `txs` dari Firestore
- **File:** `src/lib/store.tsx` baris 373
- **Masalah:** `normalizeUserData` sekarang sanitize scheds/goals/wallets tapi `txs` MASIH menggunakan array mentah:
  ```ts
  txs: Array.isArray(remote?.txs) ? remote.txs : [],
  ```
  Ini inkonsisten — jika data Firestore memiliki txs dengan field tidak valid, mereka lolos tanpa sanitasi.
- **Dampak:** Sedang — `sanitizeImportedUserData` sanitize txs, tapi `normalizeUserData` tidak. Jika ada txs corrupt di Firestore (misal `amt` bukan number), bisa menyebabkan bug di derived values (balance, score, dll).
- **Fix:** Ganti dengan `remote.txs.map(sanitizeTransaction).filter(...)` seperti `sanitizeImportedUserData`.

### 🟡 Bug D3 — `normalizeUserData` tidak sanitize `moods` dari Firestore
- **File:** `src/lib/store.tsx` baris 377
- **Masalah:** `moods` diterima mentah dari Firestore tanpa validasi. `sanitizeImportedUserData` memvalidasi format key (`YYYY-MM-DD`) dan field mood, tapi `normalizeUserData` tidak.
- **Dampak:** Rendah — moods corrupt mungkin tampil aneh tapi tidak crash.
- **Fix:** Tambahkan validasi moods di `normalizeUserData`.

### 🔵 Bug D4 — `Card.tsx` glow opacity default tidak ter-set untuk dark mode
- **File:** `src/index.css` (CSS yang baru ditambahkan)
- **Masalah:** CSS rule:
  ```css
  .card-glow { opacity: 0 !important; transition: opacity 0.5s; }
  .group:hover > .card-glow { opacity: 0.15 !important; }
  @media (prefers-color-scheme: dark) {
    .group:hover > .card-glow { opacity: 0.2 !important; }
  }
  ```
  Media query `prefers-color-scheme: dark` mengikuti OS setting, BUKAN DUIT's internal theme (Pagi/Auto/Malam). User bisa punya OS light mode tapi DUIT dark mode — glow opacity hover akan salah (0.15 padahal seharusnya 0.20).
- **Dampak:** Rendah — hanya beda 0.05 opacity di hover glow, hampir tidak terlihat.
- **Fix:** Gunakan class-based approach (`.dark .group:hover > .card-glow`) alih-alih media query, karena DUIT mengelola dark mode via class.

### 🔵 Bug D5 — `GoalModal` initial tabungan `current` tidak dikurangi dari saldo dompet
- **File:** `src/components/GoalModal.tsx`
- **Masalah:** Saat membuat goal baru dengan "Tabungan Awal" terisi, `addGoal` dipanggil dengan `current: currentNum`. Tapi saldo ini TIDAK dikurangi dari dompet manapun — tabungan awal seolah-olah muncul dari udara. Bandingkan dengan `fundGoal` yang membuat transaksi "out" dari dompet.
- **Dampak:** Sedang — saldo goal + dompet menjadi inflated. Total saldo di dashboard benar (karena goal bukan dompet), tapi goal "sudah terisi" tanpa ada dana yang benar-benar dipindahkan.
- **Catatan:** Ini mungkin by design (user bisa set tabungan awal sebagai dana yang sudah ditabung di tempat lain). Tapi jika user berharap dana dikurangi dari dompet, ini bug.
- **Fix:** Opsional — tambahkan opsi "Kurangi dari dompet?" atau hapus field "Tabungan Awal" dan arahkan ke "Nabung" setelah goal dibuat.

---

## Ringkasan

| Kategori | Jumlah |
|----------|--------|
| 🟡 Prioritas Sedang | 3 |
| 🔵 Prioritas Rendah / Catatan | 2 |
| **Total Bug Baru** | **5** |

### Bug dari Audit #1 yang tidak muncul lagi: 0 (semua sudah fixed ✅)

### Rekomendasi
- **D1-D3** — Sebaiknya fix sekaligus, karena inkonsistensi sanitasi antara `normalizeUserData` dan `sanitizeImportedUserData` bisa menyebabkan data corrupt masuk ke app.
- **D4** — Fix minor, tapi akan membuat dark mode glow konsisten dengan DUIT's internal theme.
- **D5** — Diskusikan dengan user apakah ini bug atau by design.
