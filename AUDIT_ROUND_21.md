# DUIT — Deep Architecture & Reliability Audit Round 21

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** reliability destructive actions, Firestore document architecture, async dialogs, mood/settings writes, multi-tab behavior, and data retention.

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

### R21-01 — [HIGH] Seluruh data user dalam satu Firestore document berisiko mencapai limit 1 MiB

**Lokasi:** model `users/{uid}/data/main` dan seluruh mutator store.

**Masalah:** transactions, schedules, goals, moods, avatar base64, settings, serta backup-related data disimpan dalam satu document. Firestore membatasi ukuran document sekitar 1 MiB. Setiap transaksi baru juga menulis ulang document penuh.

**Dampak:** user aktif dengan histori transaksi panjang, avatar, note, dan schedule dapat tiba-tiba tidak bisa menyimpan apa pun ketika limit terlewati. Error terlihat sebagai write failure generik dan tidak mudah dipulihkan tanpa export/delete data.

**Rekomendasi:** major migration jangka panjang: pecah transaksi menjadi subcollection `users/{uid}/transactions/{txId}` dan schedules/goals sesuai kebutuhan. Minimal jangka pendek: tampilkan usage warning, limit history yang dimuat, atau archive transaksi lama.

---

### R21-02 — [MEDIUM] Delete transaksi, wallet, dan goal masih optimistis tanpa hasil commit cloud

**Lokasi:** `delTx`, `delWallet`, `delGoal` di `store.tsx`; caller `TransactionList`, `WalletManager`, `GoalsView`.

**Masalah:** add/update critical sudah banyak dibuat async, tetapi delete transaksi/wallet/goal masih melalui `updateData()`. UI menampilkan toast sukses sebelum Firestore selesai. Jika write gagal, perubahan dapat kembali setelah snapshot dan user telah menerima sukses palsu.

**Dampak:** terutama berbahaya untuk hapus wallet/goal karena menghapus banyak transaksi terkait.

**Rekomendasi:** jadikan seluruh delete action async transactional dan gunakan busy ConfirmDialog, sama seperti reset/import/delete schedule.

---

### R21-03 — [MEDIUM] Mood dan note masih dapat memberi feedback tersimpan sebelum cloud commit

**Lokasi:** `setTodayMood`, `setTodayNote`, `MoodCard.tsx`.

**Masalah:** MoodCard langsung menampilkan toast `Catatan tersimpan`, sementara mutator memakai `updateData()` optimistis.

**Dampak:** user dapat mengira refleksi/mood tercatat padahal koneksi cloud gagal. Ini lebih rendah risiko finansial, tetapi bertentangan dengan pola save reliable yang baru diterapkan pada jadwal/transaksi.

**Rekomendasi:** buat mood/note async atau ubah toast menjadi `Disinkronkan` hingga write selesai.

---

### R21-04 — [MEDIUM] ConfirmDialog busy masih dapat ditutup via backdrop/Escape

**Lokasi:** `ConfirmDialog.tsx`.

**Masalah:** tombol Batal/Confirm disabled ketika `busy`, tetapi backdrop memakai `onClick={onClose}` dan `useModalDialog(open, onClose)` masih menutup saat Escape. Ini memengaruhi reset, import, regenerate calendar token, dan delete jadwal async.

**Dampak:** dialog dapat hilang saat write berjalan; user kehilangan status proses dan dapat mengira action dibatalkan padahal request tetap berjalan.

**Rekomendasi:** gunakan guarded close yang tidak melakukan `onClose` saat `busy`, untuk backdrop dan Escape.

---

### R21-05 — [LOW] Calendar token regeneration error ditampilkan sebagai notice sukses berwarna hijau

**Lokasi:** `AccountModal.tsx`, `regenerateCalendarFeedUrl()`.

**Masalah:** saat update token gagal, code memanggil `showCalendarNotice()` yang dirender dengan style emerald/sukses. Pesan error bisa tampil hijau seolah proses berhasil.

**Rekomendasi:** gunakan `calendarError`/toast error terpisah dan jangan menutup dialog sebelum write sukses atau error ditampilkan jelas.

---

### R21-06 — [LOW] Theme update gagal tidak rollback local UI atau localStorage

**Lokasi:** Account theme picker dan ThemeContext.

**Masalah:** perbaikan sebelumnya menunggu save cloud sebelum `setThemeMode`, tetapi jika ThemeStoreSync atau localStorage memiliki state lama/berbeda, user masih dapat melihat preference lokal yang tidak sama dengan cloud sampai sync berikutnya. Ini sempit tetapi bisa terjadi saat tab lain mengubah theme bersamaan.

**Rekomendasi:** saat save gagal, set ulang theme dari `settings.themeMode` cloud/current atau tampilkan status persistence yang eksplisit.

---

### R21-07 — [LOW] Test suite belum menguji failure Firestore dan destructive multi-entity action

**Lokasi:** `src/lib/store.test.ts`.

**Masalah:** tests saat ini fokus helper tanggal/parser. Tidak ada mock transaction failure untuk reset, delete wallet/goal/transaction, import, dan mood write.

**Rekomendasi:** extract pure mutation functions atau gunakan Firestore emulator/in-memory adapter untuk test rollback/failure dan invariants wallet-goal-transfer.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R21-01 | Mitigated | Preflight ukuran document (~850 KB) mencegah Firestore 1 MiB failure tanpa pesan; migration subcollection tetap major refactor terpisah. |
| R21-02 | Fixed | Delete transaksi, goal, dan wallet sekarang async transactional dengan busy confirmation di caller yang diperbarui. |
| R21-03 | Fixed | Mood dan note sekarang menunggu commit cloud sebelum feedback sukses. |
| R21-04 | Fixed | ConfirmDialog busy sekarang menolak backdrop/Escape dan tombol Batal. |
| R21-05 | Fixed | Error token kalender memakai toast error, bukan notice sukses. |
| R21-06 | Fixed | Theme lokal hanya diterapkan setelah persistence berhasil. |
| R21-07 | Partially fixed | Test existing tetap lulus; test failure Firestore/emulator masih direkomendasikan sebagai investasi test suite berikutnya. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
