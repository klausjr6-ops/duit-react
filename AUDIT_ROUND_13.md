# DUIT — Feature & Bug Audit Round 13

**Tanggal audit:** 2026-07-25 (WIB)  
**Scope:** perbaikan Firestore `undefined`, Laporan Bulanan, popup detail transaksi, serta transisi tampilan.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 4/4 |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R13-01 — [MEDIUM] Operasi optimistic masih dapat menampilkan sukses meskipun write cloud gagal

**Lokasi:** `src/lib/store.tsx`, `updateData()`; caller seperti `addSched`, `addTx`, `updateSched`, `addWallet`, dan `updateSettings`.

**Masalah:** mutator berbasis `updateData()` memperbarui UI langsung dan caller segera menampilkan toast sukses. Bila queue Firestore gagal (koneksi putus, permission, quota, atau validasi server), UI hanya menampilkan sync error global setelahnya. Toast sukses sudah terlanjur muncul dan state lokal tidak di-rollback.

**Dampak:** user dapat mengira jadwal/transaksi tersimpan walau perubahan hanya ada di UI sementara. Kasus Firestore `undefined` yang baru terjadi menunjukkan jalur ini nyata.

**Rekomendasi:** untuk aksi penting, gunakan API async seperti `fundGoal`/`withdrawGoal` yang menunggu `enqueueFirestoreUpdate` dan mengembalikan `{ ok, message }`. Alternatif jangka panjang: implement rollback snapshot per mutation bila queue gagal.

---

### R13-02 — [MEDIUM] Laporan belum memiliki timestamp transaksi untuk urutan saldo berjalan yang benar-benar audit-grade

**Lokasi:** data model `Transaction`, `MonthlyReportView.tsx`.

**Masalah:** perbaikan Round 12 menghapus sort berdasarkan ID acak dan memakai urutan array stabil. Namun data transaksi hanya memiliki `date` tanpa jam atau `createdAt`. Untuk beberapa transaksi di tanggal yang sama—terutama data import, restore, multi-tab, atau perubahan lama—urutan saldo berjalan tetap tidak dapat dibuktikan benar-benar kronologis.

**Dampak:** total saldo akhir benar, tetapi urutan saldo sementara di tabel laporan dapat berbeda dari urutan nyata transaksi hari itu.

**Rekomendasi:** tambahkan `createdAt` (timestamp/number) atau `sequence` pada transaksi baru. Untuk data legacy, tampilkan label bahwa urutan dalam tanggal sama adalah urutan pencatatan yang tersedia, bukan waktu transaksi terverifikasi.

---

### R13-03 — [LOW] `removeUndefinedDeep()` berpotensi mengubah object non-plain jika model Firestore nanti memakai Timestamp/Date

**Lokasi:** `src/lib/store.tsx`, `removeUndefinedDeep()`.

**Masalah:** helper saat ini memperlakukan semua object sebagai plain object dan membangun ulang melalui `Object.entries`. Model DUIT saat ini memakai primitive, array, dan object biasa sehingga aman. Namun jika masa depan memakai `Timestamp`, `Date`, `GeoPoint`, `DocumentReference`, atau Firestore FieldValue, object tersebut dapat berubah bentuk sebelum disimpan.

**Dampak:** tidak berdampak pada data model saat ini, tetapi menjadi jebakan saat model berkembang.

**Rekomendasi:** batasi rekursi pada plain object saja, misalnya cek `Object.getPrototypeOf(value) === Object.prototype` sebelum memakai `Object.entries`.

---

### R13-04 — [LOW] Tidak ada test untuk write sanitizer dan laporan bulanan

**Lokasi:** `src/lib/store.test.ts`.

**Masalah:** test saat ini mencakup helper tanggal dan occurrence jadwal. Kasus yang baru diperbaiki—menghapus `undefined` sebelum Firestore write—dan perhitungan laporan (saldo awal, carry-forward, transfer, goal, urutan baris) belum memiliki test otomatis.

**Dampak:** regresi pada jalur yang sudah pernah gagal dapat lolos meski typecheck/build hijau.

**Rekomendasi:** extract helper laporan/sanitizer menjadi pure function dan tambahkan unit test untuk skenario field optional schedule, CF, transfer, goal funding/withdrawal, serta saldo berjalan lintas bulan.

---

### R13-05 — [LOW] Delapan vulnerability moderate transitif Firebase Admin masih tersisa

**Lokasi:** dependency tree Firebase Admin / Google Cloud.

**Status:** tidak ada high atau critical setelah update PostCSS. `npm audit` saat ini menyarankan downgrade ke `firebase-admin@10.3.0`, yang bukan perbaikan valid karena dependency langsung aplikasi sudah `firebase-admin@13.10.0`.

**Rekomendasi:** pantau release Firebase Admin/Google Cloud berikutnya; jangan menjalankan `npm audit fix --force` tanpa review dependency tree dan build test.

---

## Status

Audit Round 13: **belum clean** — 2 MEDIUM dan 3 LOW. Tidak ada source aplikasi yang diubah oleh audit ini.
