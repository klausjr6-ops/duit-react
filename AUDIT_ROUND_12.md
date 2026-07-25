# DUIT — Feature & Bug Audit Round 12

**Tanggal audit:** 2026-07-25 (WIB)  
**Scope:** perubahan contextual dashboard, transisi Liquid/Sunset/Moon, Mode Laporan Bulanan, dan Transaction Detail Popup.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 4/4 |
| `git diff --check` | Lulus |
| `npm audit` | 1 high + 8 moderate |

---

## Temuan

### R12-01 — [MEDIUM] Progress hari pada Clock Card masih memakai timezone perangkat, bukan WIB

**Lokasi:** `src/components/ClockCard.tsx`, perhitungan day-progress dengan `now.getHours()`, `getMinutes()`, dan `getSeconds()`.

**Masalah:** format jam/tanggal utama sudah memakai Jakarta melalui helper `formatTime`, tetapi lebar progress bar harian masih dihitung dari timezone browser. User yang perangkatnya berada di timezone selain Asia/Jakarta akan melihat jam digital WIB tetapi progress hari yang berbeda.

**Dampak:** Clock Card menjadi tidak konsisten dengan seluruh aturan waktu DUIT.

**Rekomendasi:** gunakan helper `jakartaTimeParts()` dan tambahkan second Jakarta pada formatter/helper agar day-progress dihitung dari Asia/Jakarta.

---

### R12-02 — [MEDIUM] Urutan saldo berjalan pada Mode Laporan tidak dapat dijamin kronologis untuk transaksi pada tanggal yang sama

**Lokasi:** `src/components/MonthlyReportView.tsx`, `sorted` menggunakan `date` lalu `id`.

**Masalah:** ID transaksi dibuat dari UUID/angka acak, bukan timestamp urutan input. Saat beberapa transaksi berada pada tanggal yang sama, tabel dapat mengurutkan transaksi berdasarkan ID acak. Nilai saldo akhir bulan tetap benar, tetapi **urutan saldo berjalan antar baris** dapat tidak sesuai dengan urutan pencatatan user.

**Dampak:** laporan dapat membingungkan saat user mengaudit transaksi dalam satu hari, terutama jika saldo sementara tampak naik/turun pada urutan yang tidak masuk akal.

**Rekomendasi:** tambahkan field `createdAt` atau `sequence` yang stabil saat transaksi dibuat. Untuk data lama, pertahankan urutan array saat tanggal sama, bukan mengurutkan berdasarkan ID.

---

### R12-03 — [LOW] FAB Chat masih berpotensi muncul satu frame ketika membuka Mode Laporan

**Lokasi:** `src/components/KeuanganView.tsx` dan `src/AuthenticatedApp.tsx`.

**Masalah:** status `reportMode` dikirim ke parent lewat `useEffect`, yang berjalan setelah render tab Laporan. FAB memang kemudian disembunyikan, tetapi pada perangkat lambat ada peluang satu frame FAB terlihat sebelum effect aktif.

**Dampak:** minor visual flicker; tidak mengganggu data, tetapi bertentangan dengan tujuan laporan tanpa elemen AI floating.

**Rekomendasi:** angkat state mode tab Keuangan ke `DashboardApp`, atau panggil callback saat tombol `Laporan` ditekan sebelum `setViewMode("report")`.

---

### R12-04 — [LOW] Tombol Edit/Hapus pada row transaksi tetap terlihat walau detail popup sudah menjadi aksi utama

**Lokasi:** `src/components/TransactionList.tsx`.

**Masalah:** row transaksi sekarang dapat diklik untuk membuka detail popup, namun tombol Edit/Hapus kecil masih selalu ditampilkan di sisi kanan. Pada mobile atau list padat, ini mengurangi ruang untuk nominal dan membuat row terasa ramai.

**Dampak:** bukan bug fungsional, tetapi UX duplication. Popup sudah menyediakan aksi Edit/Hapus untuk transaksi reguler.

**Rekomendasi:** pada mobile, sembunyikan aksi inline dan jadikan popup sebagai satu-satunya tempat aksi; pertahankan aksi inline hanya pada desktop bila memang diperlukan.

---

### R12-05 — [HIGH] Dependency `postcss` yang terpasang terkena advisory path traversal

**Lokasi:** dependency tree, `postcss <= 8.5.17`.

**Masalah:** `npm audit` melaporkan advisory `GHSA-r28c-9q8g-f849` dengan severity high untuk PostCSS path traversal pada auto-loading source map.

**Dampak:** terutama relevan pada environment build/dev yang memproses CSS/source map dari input tidak tepercaya. Tidak terlihat sebagai exploit runtime aplikasi produksi, tetapi dependency high tetap perlu dibersihkan.

**Rekomendasi:** update dependency yang membawa PostCSS ke versi patched melalui update Tailwind/Vite/PostCSS yang kompatibel. Jalankan build dan visual regression test setelah update; jangan memakai `npm audit fix --force` tanpa review lockfile.

---

## Status perbaikan — 2026-07-25

| ID | Status | Perbaikan |
|---|---|---|
| R12-01 | Fixed | `jakartaTimeParts()` sekarang menyertakan second; Clock Card memakai hour/minute/second Asia/Jakarta untuk day-progress. |
| R12-02 | Fixed | Laporan tidak lagi memakai ID acak sebagai penentu urutan; carry-forward selalu pertama dan transaksi tanggal sama memakai urutan array stabil dari data. |
| R12-03 | Fixed | Status Mode Laporan dikirim secara sinkron saat user menekan tab, sehingga FAB disembunyikan sebelum render Laporan. |
| R12-04 | Fixed | Tombol Edit/Hapus inline hanya muncul desktop (`sm+`); pada mobile aksi tersedia melalui popup detail. |
| R12-05 | Fixed | `npm audit fix` memperbarui PostCSS ke versi patched. Tidak ada lagi high/critical vulnerability. |

Sisa `npm audit`: 8 moderate transitif Firebase Admin/Google Cloud. Rekomendasi audit saat ini mengarah ke downgrade `firebase-admin@10.3.0`, sehingga tidak diterapkan karena bukan perbaikan yang valid.

Validasi pascaperbaikan: TypeScript, production build, tests, dan `git diff --check` semuanya lulus.
