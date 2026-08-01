# DUIT — Deep Bug Audit Round 19

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** async modal writes, theme/settings persistence, report ordering, AI action execution, dan transition accessibility.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 9/9 |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R19-01 — [MEDIUM] Escape masih dapat menutup modal selama write berjalan

**Lokasi:** `useModalDialog.ts`, `TransferModal`, `ScheduleModal`, `EditScheduleModal`, `WalletManager`.

**Masalah:** backdrop dan tombol close telah dikunci saat `saving`, tetapi `useModalDialog` menerima `onClose` asli. Menekan Escape saat write cloud sedang berjalan masih dapat menutup modal.

**Dampak:** hasil write dapat selesai setelah modal tertutup dan user kehilangan feedback error/sukses spesifik.

**Rekomendasi:** kirim guarded close handler ke `useModalDialog`, misalnya `() => { if (!saving) onClose(); }`.

---

### R19-02 — [MEDIUM] Theme mode lokal berubah sebelum persistence cloud dipastikan berhasil

**Lokasi:** `AccountModal.tsx`, handler theme mode.

**Masalah:** handler menjalankan `setThemeMode(opt.id)` sebelum `saveAccountSetting()` selesai. Bila Firestore gagal, theme UI dan localStorage sudah berubah tetapi settings cloud tidak berubah. Di perangkat lain theme dapat kembali ke nilai lama.

**Dampak:** preferensi theme tidak konsisten antar perangkat dan user bisa mengira setting tersimpan.

**Rekomendasi:** simpan ke cloud dulu, lalu commit theme lokal saat hasil `ok`; atau simpan previous theme dan rollback localStorage/UI saat write gagal.

---

### R19-03 — [LOW] Calendar token regeneration tidak mengunci ConfirmDialog selama write async

**Lokasi:** `AccountModal.tsx`, `regenerateCalendarFeedUrl()` dan ConfirmDialog calendar reset.

**Masalah:** function regeneration sudah async, tetapi ConfirmDialog tidak menerima `busy` state untuk aksi ini. User dapat menekan konfirmasi beberapa kali sebelum write pertama selesai dan menghasilkan beberapa token berbeda.

**Dampak:** link yang user salin dapat bukan token terakhir bila click terjadi cepat.

**Rekomendasi:** tambahkan `calendarRegenerating` dan teruskan `busy` ke ConfirmDialog.

---

### R19-04 — [LOW] Same-day transfer pair masih dapat tampil masuk sebelum keluar pada laporan

**Lokasi:** `MonthlyReportView.tsx`.

**Masalah:** pasangan transfer sekarang memakai `createdAt` sama. Ketika sort jatuh ke fallback urutan array, array disusun `[outTx, inTx, ...]` tetapi sort fallback membalik index untuk menunjukkan transaksi lama dulu, sehingga `inTx` dapat tampil sebelum `outTx` pada laporan.

**Dampak:** saldo akhir tetap benar, tetapi saldo berjalan di row transfer dapat terlihat naik dahulu lalu turun.

**Rekomendasi:** sort secara eksplisit pasangan transfer dengan `type: out` sebelum `type: in` bila `transferId` dan `createdAt` sama.

---

### R19-05 — [LOW] Transition overlay tidak memiliki semantics accessibility loading state

**Lokasi:** `ViewTransitionLoader.tsx`.

**Masalah:** overlay memblokir pointer dan keyboard, tetapi tidak memiliki `role="status"`, `aria-live`, atau `aria-busy`. Screen reader tidak mengetahui UI sementara sedang berpindah mode.

**Rekomendasi:** tambahkan `role="status"`, `aria-live="polite"`, dan label singkat yang sesuai tipe transisi tanpa menampilkan teks visual bila desain tidak menginginkannya.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R19-01 | Fixed | Escape sekarang memakai guarded close handler saat `saving`. |
| R19-02 | Fixed | Theme lokal hanya diterapkan setelah persistence cloud berhasil. |
| R19-03 | Fixed | Calendar token regeneration memakai busy state ConfirmDialog. |
| R19-04 | Fixed | Laporan menampilkan transfer keluar sebelum transfer masuk pada pasangan yang sama. |
| R19-05 | Fixed | Transition overlay mempunyai `role=status`, `aria-live`, dan label state. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
