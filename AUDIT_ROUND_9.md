# DUIT — Feature & Bug Audit Round 9

**Tanggal audit:** 2026-07-21 (WIB)  
**Repository yang diaudit:** `klausjr6-ops/duit-react`, commit `702cfa0` (`fix: feature audit — balance validation on type change + correct Saldo Awal`)  
**Metode:** code review statis, pemeriksaan alur bisnis, serta validasi build produksi.

> **Catatan penting:** repository `main` yang tersedia tidak sepenuhnya cocok dengan handover. Handover menyebut Audit Round 8 dan perbaikan validasi pindah dompet, tetapi commit yang diaudit tidak memiliki `AUDIT_ROUND_8.md` dan implementasi `updateTx` masih memiliki bug pindah dompet di bawah. Temuan mengacu pada kode repository aktual.

## Hasil validasi teknis

| Pemeriksaan | Hasil |
|---|---|
| `npm ci` | Lulus |
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `git diff --check` | Lulus |
| `npm audit` | 10 vulnerability dependency: 1 low, 8 moderate, 1 high |

Tidak ada test suite otomatis untuk business logic kritis (saldo, transfer, goal, carry-forward) pada repository saat ini.

---

## Temuan

### R9-01 — [HIGH] Edit transaksi saat dompet diganti dapat membuat saldo dompet baru negatif

**Lokasi:** `src/lib/store.tsx`, `updateTx()` sekitar baris 910–946; pre-check serupa di `src/components/EditTransactionModal.tsx`.

**Masalah:** validasi saldo hanya membaca saldo `finalWalletId`, lalu “membatalkan” efek transaksi lama pada dompet baru. Efek transaksi lama seharusnya dibatalkan pada **dompet lama**, bukan dompet tujuan baru.

**Reproduksi:**
1. Wallet A memiliki saldo Rp100.000 dari transaksi pemasukan Rp100.000.
2. Wallet B memiliki saldo Rp0.
3. Edit transaksi tersebut: ubah tipe menjadi `out`, nominal Rp100.000, dan dompet menjadi B.
4. Validasi saat ini menghitung B: `0 + 100.000 - 100.000 = 0` dan menyetujui perubahan.
5. Setelah transaksi benar-benar dipindahkan, A kehilangan Rp100.000 dan B mendapat pengeluaran Rp100.000 → saldo B menjadi **-Rp100.000**.

**Dampak:** integritas saldo wallet rusak; user dapat menyimpan pengeluaran melebihi saldo di dompet tujuan.

**Perbaikan:** gunakan kontribusi per wallet seperti spesifikasi handover:
- bila wallet sama: `balance + contributionNew - contributionOld >= 0`;
- bila wallet berbeda: validasi independen dompet lama setelah transaksi lama dihapus dan dompet baru setelah transaksi baru diterapkan;
- juga validasi bahwa wallet tujuan benar-benar ada, baik untuk pemasukan maupun pengeluaran.

---

### R9-02 — [HIGH] Endpoint AI chat menjadi publik apabila Firebase Admin service account belum dikonfigurasi

**Lokasi:** `api/chat.js`, `hasValidFirebaseSession()`.

**Masalah:** ketika `FIREBASE_SERVICE_ACCOUNT_BASE64` tidak ada, fungsi mengembalikan `true`. Artinya siapa pun dapat memanggil `/api/chat` tanpa Firebase ID token.

**Dampak:** penyalahgunaan quota/biaya Gemini dan Groq, spam, serta endpoint chat tidak memenuhi arsitektur handover yang mensyaratkan Bearer token tervalidasi server-side.

**Perbaikan:** fail closed. Jika konfigurasi Admin tidak tersedia, respons `503`; jika header Bearer/token tidak valid, respons `401`. Pastikan environment variable dipasang di seluruh deployment Vercel (Preview dan Production).

---

### R9-03 — [MEDIUM] Mode tema “time” memakai jam lokal browser, bukan Asia/Jakarta

**Lokasi:** `src/lib/ThemeContext.tsx`, `getTimeIsDark()`.

**Masalah:** kode memakai `date.getHours()`. Bila user membuka aplikasi dari zona waktu selain WIB, mode Pagi/Auto/Malam berubah menurut zona perangkat, bukan Jakarta.

**Dampak:** melanggar aturan timezone aplikasi dan menghasilkan tema yang keliru bagi user yang sedang bepergian atau perangkatnya salah timezone.

**Perbaikan:** ambil jam dengan `Intl.DateTimeFormat(..., { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" })`, lalu parse hasilnya. Jangan memakai browser local time untuk logika berbasis WIB.

---

### R9-04 — [MEDIUM] `transferWallet()` tidak memvalidasi dompet tujuan, dompet sama, dan nominal pada lapisan business logic

**Lokasi:** `src/lib/store.tsx`, `transferWallet()`.

**Masalah:** UI modal memang memvalidasi input, tetapi fungsi store hanya memeriksa saldo dompet asal. Ia tidak memastikan `toId` ada, `fromId !== toId`, dan `amount` adalah finite positif.

**Dampak:** pemanggilan dari komponen baru, race saat wallet tujuan baru dihapus dari tab lain, atau pemanggilan programatik dapat membuat transaksi masuk yatim ke wallet yang tidak ada. Nilai tersebut tidak muncul di wallet mana pun, sedangkan transaksi keluar tetap mengurangi saldo total.

**Perbaikan:** lakukan seluruh validasi lagi di pre-check **dan** updater/transaksi Firestore: kedua wallet harus ada, berbeda, dan nominal finite `> 0`.

---

### R9-05 — [MEDIUM] Core `delTx()` masih dapat menghapus transaksi goal yang seharusnya terkunci

**Lokasi:** `src/lib/store.tsx`, `delTx()`.

**Masalah:** `delTx()` memblokir carry-forward dan menangani transfer, namun tidak menghentikan transaksi dengan `goalId`. Ia bahkan menyesuaikan `goal.current` dan menghapus transaksi tersebut.

**Dampak:** aturan bisnis pada handover menyatakan transaksi fund/withdraw goal tidak boleh dihapus manual dan harus dikoreksi melalui UI Goal. Saat ini proteksi bergantung pada UI `TransactionList`; proteksi inti dapat terlewati oleh komponen lain atau perubahan UI di masa depan.

**Perbaikan:** tambahkan `if (tx.goalId) return previous;` sebelum mekanisme delete. Koreksi saldo goal tetap melalui `fundGoal`, `withdrawGoal`, atau penghapusan goal.

---

### R9-06 — [MEDIUM] `updateTx()` dapat menerima `walletId` yang tidak ada untuk transaksi pemasukan

**Lokasi:** `src/lib/store.tsx`, `updateTx()`.

**Masalah:** pengecekan keberadaan wallet hanya dijalankan jika hasil akhir bertipe `out`. Mengedit transaksi pemasukan ke ID wallet yang sudah tidak ada akan diterima dan menjadi transaksi orphan.

**Dampak:** nilai transaksi masuk tidak terlihat di dompet mana pun, sedangkan `balance` global tetap dapat memasukkannya. Total saldo dan jumlah wallet menjadi tidak konsisten.

**Perbaikan:** bila transaksi memiliki `walletId`, validasi keberadaan wallet untuk semua tipe final. Terapkan validasi ini bersamaan dengan R9-01.

---

### R9-07 — [LOW] Carry-forward dapat tampil sebagai “Saldo Bulan Lalu” pada wallet baru yang hanya memiliki saldo awal

**Lokasi:** `src/lib/store.tsx`, effect carry-forward sekitar baris 653–830.

**Masalah:** semua wallet selalu dimasukkan ke bulan berjalan. Untuk wallet baru dengan `balance > 0` dan tanpa transaksi sebelum bulan berjalan, kode tetap membuat CF pada tanggal 1 bulan ini karena kondisi hanya skip saat `wallet.balance <= 0`.

**Dampak:** label “Saldo Bulan Lalu” dapat menyesatkan: dana itu adalah saldo awal yang baru dimasukkan, bukan carry-forward dari bulan sebelumnya.

**Perbaikan:** hanya buat CF bila terdapat aktivitas non-CF yang benar-benar lebih tua dari tanggal 1 bulan target, atau simpan tanggal efektif saldo awal bila produk memang membutuhkan saldo awal historis.

---

### R9-08 — [LOW] Import/normalisasi backup tidak menjamin ID unik

**Lokasi:** `src/lib/store.tsx`, `sanitizeImportedUserData()` dan `normalizeUserData()`.

**Masalah:** transaksi, goal, wallet, dan jadwal dari backup dapat memiliki ID duplikat. Sanitizer memeriksa bentuk data, tetapi tidak melakukan deduplikasi atau regenerasi ID.

**Dampak:** edit/hapus berdasarkan ID dapat mengenai item yang salah atau lebih dari satu item; pasangan transfer/goal juga berisiko tidak konsisten pada backup rusak/manual.

**Perbaikan:** saat import, pertahankan ID pertama yang valid dan generate ID baru untuk duplikat (serta perbarui referensi `walletId`/`goalId` bila ID entitas berubah), atau tolak backup dengan ringkasan error yang jelas.

---

### R9-09 — [LOW] Renderer chat memuat gambar HTTP dari respons AI

**Lokasi:** `src/components/ChatWidget.tsx`, `isSafeImageSource()`.

**Masalah:** renderer menerima gambar dari `http:` selain `https:`.

**Dampak:** mixed content dapat diblokir pada production HTTPS; jika tidak diblokir, privasi user dapat bocor ke host gambar (IP, user-agent, referer bergantung kebijakan browser). Ini tidak menjadi XSS karena React meng-escape teks dan URL dibatasi, tetapi tetap tidak ideal.

**Perbaikan:** terima `https:` saja (dan data-image yang sudah dibatasi), gunakan `referrerPolicy="no-referrer"` pada gambar, serta pertimbangkan CSP di Vercel.

---

## Rekomendasi prioritas

1. **Perbaiki R9-01, R9-04, R9-05, R9-06 bersama-sama** dalam satu perubahan core store dan buat test untuk skenario saldo lintas wallet.
2. **Tutup endpoint chat (R9-02)** sebelum mengandalkan rate limit sebagai kontrol biaya/akses.
3. Perbaiki **timezone tema (R9-03)** agar konsisten dengan kebijakan WIB aplikasi.
4. Tambahkan test unit untuk: `updateTx`, transfer, delete goal tx, `getWalletBalance`, carry-forward, dan helper tanggal Jakarta.
5. Tinjau dependency vulnerabilities dari `npm audit` dengan perubahan versi yang teruji; jangan menjalankan `npm audit fix --force` tanpa regression test.

## Status perbaikan — 2026-07-21

Seluruh temuan aplikasi di atas telah diperbaiki setelah audit:

| ID | Status | Implementasi |
|---|---|---|
| R9-01 | Fixed | Validasi `updateTx` memakai kontribusi lama/baru per dompet; modal edit memakai validasi yang sama. |
| R9-02 | Fixed | Chat fail-closed dan merespons 503 apabila Firebase Admin belum dikonfigurasi. |
| R9-03 | Fixed | Mode tema waktu sekarang membaca jam `Asia/Jakarta`. |
| R9-04 | Fixed | Store transfer memvalidasi nominal, wallet asal/tujuan, dompet berbeda, serta mengulang pengecekan pada updater. |
| R9-05 | Fixed | `delTx` menolak carry-forward dan semua transaksi goal. |
| R9-06 | Fixed | `updateTx` menolak `walletId` tujuan yang tidak ada untuk semua tipe transaksi. |
| R9-07 | Fixed | CF tidak lagi dibuat untuk wallet baru yang hanya memiliki saldo awal; CF lama yang tidak valid dibersihkan. |
| R9-08 | Fixed | Restore menolak backup dengan ID duplikat; normalisasi dokumen legacy mempertahankan ID pertama agar operasi core aman. |
| R9-09 | Fixed | Gambar chat eksternal dibatasi ke HTTPS dan memakai `referrerPolicy="no-referrer"`. |

Dependensi juga diperbarui: **Vite 7.3.6** dan **firebase-admin 13.10.0**. Temuan audit dependency turun dari **1 high + 8 moderate + 1 low** menjadi **8 moderate, tanpa high/critical**. Delapan moderate yang tersisa berasal dari dependency transitif Firebase Admin menurut database `npm audit`; perintah audit saat ini menawarkan downgrade ke `firebase-admin@10.3.0`, sehingga tidak diterapkan karena akan memperburuk versi dan tidak merupakan perbaikan yang valid.

Validasi pascaperbaikan: `npx tsc --noEmit`, `npm run build`, dan `git diff --check` semuanya **lulus**.
