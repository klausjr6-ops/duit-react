# DUIT — Feature & Bug Audit Round 11

**Tanggal audit:** 2026-07-21 (WIB)  
**Baseline:** source setelah perbaikan Round 9 dan 10  
**Metode:** static code review pada core store, UI mutator, API calendar, Firebase config/rules, dan validasi build.

## Validasi teknis

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate transitif, 0 high, 0 critical |

---

## Temuan

### R11-01 — [MEDIUM] `addTx()` core tidak memvalidasi nominal finite/positif dan tipe transaksi final

**Lokasi:** `src/lib/store.tsx`, `addTx()`.

**Masalah:** UI Keuangan memvalidasi input, tetapi core hanya memeriksa saldo bila `tx.type === "out"`. Ia tidak menolak nominal `0`, negatif, `NaN`, atau `Infinity`; juga tidak menormalisasi field `type` bila dipanggil dari kode lain/legacy integration.

**Dampak:** komponen baru atau pemanggilan internal yang keliru dapat menyimpan transaksi yang merusak total, grafik, saldo wallet, dan carry-forward. Ini berlawanan dengan pola hardening yang sudah diterapkan pada transfer, fund goal, withdraw goal, update wallet, dan update goal.

**Rekomendasi:** sebelum membuat objek transaksi dan ulangi di updater Firestore: pastikan `type` hanya `in|out`, `amt` finite `> 0`, `date` date key valid, dan bila `walletId` ada, wallet benar-benar tersedia.

---

### R11-02 — [MEDIUM] `addGoal()` core masih dapat membuat goal invalid atau inconsistent bila bypass UI

**Lokasi:** `src/lib/store.tsx`, `addGoal()`.

**Masalah:** fungsi menerima `target`, `current`, nama, dan icon secara langsung tanpa memvalidasi `target > 0`, `current >= 0`, `current <= target`, dan nama non-kosong. Modal memang melakukannya, tetapi core tidak.

**Dampak:** goal dengan target nol/negatif atau current di atas target dapat tersimpan oleh consumer baru. Jika `current` negatif, tidak ada funding transaction dibuat namun UI goal menjadi negatif; jika target/current inconsistent, progress dan funding limit tidak dapat dipercaya.

**Rekomendasi:** normalisasi/validasi seluruh invariant sebelum pre-check wallet dan ulangi dalam updater. Kembalikan `{ ok, message }` seperti API mutator sekarang.

---

### R11-03 — [MEDIUM] `addWallet()`, `addSched()`, dan `updateSched()` belum memiliki validation boundary di core store

**Lokasi:** `src/lib/store.tsx`, mutator wallet/schedule.

**Masalah:** Round 10 sudah memperkuat update wallet/goal, tetapi pembuatan wallet dan pembuatan/edit jadwal masih langsung menyimpan payload UI.

**Skenario:**
- `addWallet()` bisa menerima nama kosong atau base balance negatif.
- `addSched()` / `updateSched()` bisa menerima nama kosong, tanggal/jam invalid, end time lebih awal, recurring tanpa batas tanggal, atau batas sebelum tanggal mulai.

**Dampak:** data invalid dapat dibuat oleh komponen masa depan atau keadaan race, dan untuk jadwal dapat merusak dashboard/AI/iCalendar. Sanitizer hanya memperbaiki sebagian saat snapshot berikutnya—bukan menolak operasi dengan pesan yang jelas.

**Rekomendasi:** sediakan validator schedule/wallet bersama di store, gunakan pada add/update dan UI. Mutator yang mungkin gagal sebaiknya mengembalikan `{ ok, message }` dan caller menangani hasilnya.

---

### R11-04 — [LOW] FEED iCalendar melakukan `RRULE` pada schedule legacy tanpa `date`, tetapi `DTSTART` bergantung pada tanggal saat feed diakses

**Lokasi:** `api/calendar.ics.js`, `nextDateForDay()` dan `scheduleRule()`.

**Masalah:** untuk schedule legacy yang hanya menyimpan `day`, server menghitung DTSTART sebagai occurrence terdekat dari **hari ketika feed diminta**. Saat feed direfresh pada hari/jam berbeda, DTSTART event yang sama dapat berubah.

**Dampak:** calendar client dapat menganggap event sebagai seri baru/berbeda, memunculkan duplikasi atau perubahan tidak stabil. Schedule baru dari UI sudah memiliki `date`, sehingga dampaknya terbatas pada data legacy.

**Rekomendasi:** migrasikan schedule legacy saat normalisasi data dengan `date` stabil (misalnya occurrence pertama saat migrasi), atau gunakan deterministic anchor date yang tidak berubah. Jangan menjadikan waktu request sebagai source DTSTART recurring.

---

### R11-05 — [LOW] Tidak ada automated test untuk invariant finansial dan perubahan audit sebelumnya

**Lokasi:** repository (tidak ada folder/file test dan tidak ada script `test`).

**Masalah:** perbaikan Round 8–10 menyentuh saldo lintas wallet, goal transaction, carry-forward, import/restore, Jakarta timezone, dan iCalendar, tetapi hanya diverifikasi typecheck/build.

**Dampak:** regresi dapat lolos saat refactor berikutnya walaupun build hijau. Contoh paling rentan: rumus kontribusi `updateTx`, rekonsiliasi goal backup, serta perhitungan CF lintas bulan.

**Rekomendasi:** tambahkan Vitest dan test unit untuk helper date Jakarta, saldo wallet, transfer, edit transaksi berpindah dompet, fund/withdraw goal, backup reconciliation, carry-forward, serta generator iCalendar.

---

## Prioritas

1. Perbaiki validation boundary core untuk **R11-01 sampai R11-03** dalam satu perubahan store agar mutator tidak bergantung pada UI.
2. Migrasikan schedule legacy untuk **R11-04**.
3. Tambahkan test suite untuk **R11-05** sebelum perubahan business logic berikutnya.

## Status perbaikan — 2026-07-21

| ID | Status | Implementasi |
|---|---|---|
| R11-01 | Fixed | `addTx` memvalidasi tipe, nominal finite positif, date key, dan wallet; invariant diulang dalam updater. |
| R11-02 | Fixed | `addGoal` memvalidasi nama, target/current, deadline, dan invariant diulang dalam updater. |
| R11-03 | Fixed | Add wallet serta add/edit schedule kini memiliki validation boundary di core store dan mengembalikan `{ ok, message }` yang ditangani UI. |
| R11-04 | Fixed | Calendar feed memakai anchor date legacy yang deterministik (`2000-01-02` + hari), tidak lagi bergantung pada tanggal request. |
| R11-05 | Fixed | Ditambahkan Vitest, script `npm test`, dan 4 regression tests untuk helper tanggal Jakarta serta occurrence jadwal. |

Validasi pascaperbaikan: `npm test` (**4/4 lulus**), `npx tsc --noEmit`, `npm run build`, dan `git diff --check` semuanya **lulus**. Vitest diperbarui ke 4.1.10 agar dependency audit tidak menambah vulnerability critical. `npm audit` menunjukkan 8 moderate transitif Firebase Admin, tanpa high/critical.
