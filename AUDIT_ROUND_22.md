# DUIT — Non-Firestore Deep Audit Round 22

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** client performance, modal accessibility, session behavior, rendering, AI UX, and browser-side reliability. Temuan limit Firestore tidak diulang sebagai fokus utama.

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

### R22-01 — [MEDIUM] Auto logout mereset timer pada setiap `mousemove`

**Lokasi:** `src/hooks/useAutoLogout.ts`.

**Masalah:** localStorage sudah ditahan setiap 10 detik, tetapi `resetTimer()` tetap memanggil `clearTimeout()` dan `setTimeout()` untuk setiap mousemove/scroll. Pada desktop dan browser mobile dengan banyak event touch/move, ini menciptakan churn timer yang tidak perlu.

**Dampak:** overhead kecil namun terus-menerus pada UI yang sudah memiliki animasi, chart, dan Firestore listener. Paling terasa pada perangkat mobile kelas menengah.

**Rekomendasi:** throttle reset timer untuk high-frequency events (misalnya maksimal satu reset per 1–2 detik), sementara keydown/click/touchstart tetap reset segera.

---

### R22-02 — [MEDIUM] Chat context hanya mengirim 16 pesan terakhir tanpa ringkasan percakapan lama

**Lokasi:** `ChatWidget.tsx`.

**Masalah:** history lokal menyimpan maksimal 32 pesan, tetapi API hanya menerima 16 pesan terakhir. Saat percakapan panjang, konteks awal hilang secara mendadak, bukan diringkas.

**Dampak:** AI dapat lupa keputusan/penjelasan yang dibuat pada awal percakapan aktif, meski user menganggap chat masih satu sesi.

**Rekomendasi:** ketika history melewati batas, buat ringkasan client/server yang aman atau simpan `conversationSummary` terpisah; kirim summary + 12–16 pesan terakhir.

---

### R22-03 — [LOW] Pull-to-refresh menjalankan re-render visual tetapi tidak benar-benar memaksa Firestore refresh

**Lokasi:** `AuthenticatedApp.tsx`, `refreshData()`.

**Masalah:** comment menyebut detach/reattach snapshot listener, tetapi implementasi hanya `setTimeout(600)`. Firestore memang real-time, namun gesture memberi kesan data benar-benar dimuat ulang padahal tidak ada network refresh atau cache invalidation.

**Dampak:** UX misleading saat user sedang mencoba memulihkan data setelah koneksi bermasalah.

**Rekomendasi:** ubah copy menjadi “Memeriksa pembaruan…” atau gunakan `getDocFromServer`/mekanisme refresh benar-benar bila diperlukan.

---

### R22-04 — [LOW] Monthly Report menampilkan semua row sekaligus tanpa pagination/virtualization

**Lokasi:** `MonthlyReportView.tsx`.

**Masalah:** setiap transaksi bulan dipetakan ke row tabel dalam satu render. Dengan ratusan/ribuan transaksi, render tabel dan horizontal scrolling pada mobile akan berat.

**Dampak:** performa laporan turun untuk user aktif, walau saat ini transaksi user masih sedikit.

**Rekomendasi:** tampilkan 50–100 row awal dengan “Muat lebih banyak”, atau gunakan virtualization bila arsitektur transaksi sudah dipindah ke subcollection.

---

### R22-05 — [LOW] Form login password eye button memiliki `tabIndex={-1}`

**Lokasi:** `LoginScreen.tsx`, `PasswordInput()`.

**Masalah:** tombol tampil/sembunyikan password tidak dapat dijangkau keyboard.

**Dampak:** aksesibilitas keyboard kurang baik; user tidak dapat toggle visibility tanpa mouse/touch.

**Rekomendasi:** hapus `tabIndex={-1}` dan beri `aria-label` dinamis (`Tampilkan password` / `Sembunyikan password`).

---

### R22-06 — [LOW] Detail transaksi popup belum menunjukkan wallet balance sebelum/after transaksi

**Lokasi:** `TransactionDetailDrawer.tsx`.

**Masalah:** popup menampilkan nominal dan wallet, tetapi tidak menjelaskan dampak transaksi terhadap saldo wallet. Ini terutama berguna untuk transfer, goal, atau koreksi transaksi.

**Dampak:** bukan bug data, tetapi transparansi UX belum maksimal.

**Rekomendasi:** tambahkan `Saldo wallet setelah transaksi` bila perhitungan historis per row tersedia.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R22-01 | Fixed | Auto logout throttle timer reset untuk mousemove/scroll menjadi maksimal sekali per detik. |
| R22-02 | Fixed | Chat mengirim referensi percakapan lebih lama (maksimal 4.000 karakter) bersama 16 pesan terbaru. |
| R22-03 | Fixed | Pull-to-refresh memakai `getDocFromServer` untuk membaca Firestore server. |
| R22-04 | Fixed | Laporan merender 100 transaksi awal dan memiliki tombol `Muat 100 transaksi lagi`. |
| R22-05 | Fixed | Tombol tampil/sembunyikan password sekarang keyboard accessible dengan aria label. |
| R22-06 | Fixed | Detail transaksi menampilkan saldo wallet saat ini secara eksplisit. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
