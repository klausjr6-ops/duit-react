# DUIT — Feature & Bug Audit Round 15

**Tanggal audit:** 2026-07-30 (WIB)  
**Scope:** AI Action Goal/Transfer/Update/Delete Jadwal, persistent chat, dan action confirmation.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 7/7 |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R15-01 — [HIGH] AI update jadwal memakai tanggal/jam baru untuk mencari jadwal lama

**Lokasi:** `src/components/ChatWidget.tsx`, `scheduleUpdate` dan `findSchedule()`.

**Masalah:** action `scheduleUpdate` hanya mempunyai `date` dan `start`. Field tersebut diperlakukan sebagai nilai perubahan **dan** sebagai filter pencarian schedule target. Contoh user meminta: “Pindahkan Olahraga dari Selasa ke Jumat.” AI mengisi `date` Jumat; frontend lalu mencari jadwal Olahraga yang sudah berdate Jumat, bukan jadwal lama hari Selasa. Action gagal walau preview terlihat valid.

**Dampak:** update jadwal yang mengubah tanggal/jam sangat sering gagal atau salah sasaran bila ada jadwal dengan nama sama.

**Rekomendasi:** format action harus memisahkan selector target (`targetDate`, `targetStart`, atau `scheduleId`) dari patch baru (`date`, `start`, dll). Untuk aksi ambigu, AI harus meminta detail tambahan.

---

### R15-02 — [MEDIUM] AI delete jadwal tidak memiliki tombol batal eksplisit pada preview

**Lokasi:** `src/components/ChatWidget.tsx`, `ActionPreview()`.

**Masalah:** preview action hanya memiliki tombol konfirmasi. User dapat menutup chat atau mengabaikannya, tetapi tidak ada affordance jelas untuk membatalkan/menolak tindakan, khususnya delete schedule.

**Dampak:** action destructive tampak terlalu mudah dikonfirmasi dan UX kurang transparan.

**Rekomendasi:** tambah tombol `Batal` pada semua preview action; untuk delete tampilkan gaya danger dan copy konfirmasi yang lebih jelas.

---

### R15-03 — [MEDIUM] Preview AI Action tidak mencantumkan ID/selector target yang dapat diverifikasi user

**Lokasi:** `src/components/ChatWidget.tsx`.

**Masalah:** preview update/delete hanya menampilkan nama schedule. Bila terdapat nama serupa atau recurring schedule, user tidak dapat memverifikasi occurrence/record mana yang akan diubah sebelum menekan konfirmasi. Resolver memang menolak beberapa kondisi ambigu, tetapi preview tidak menjelaskan target dengan cukup.

**Dampak:** rendahnya kepercayaan terhadap action AI dan potensi kebingungan pada jadwal berulang.

**Rekomendasi:** tampilkan target lengkap: nama, tanggal awal, jam lama, dan status recurring. Gunakan `scheduleId` atau `targetDate`/`targetStart` pada action schema.

---

### R15-04 — [LOW] Transfer pasangan memiliki `createdAt` berbeda beberapa milidetik

**Lokasi:** `src/lib/store.tsx`, `transferWallet()`.

**Masalah:** out transaction dan in transaction transfer masing-masing memanggil `Date.now()`. Pada laporan yang mengurutkan `createdAt`, pasangan transfer dapat tampil dalam urutan yang tidak konsisten relatif terhadap transaksi lain pada tanggal sama.

**Dampak:** saldo akhir tetap benar; hanya urutan laporan detail yang kurang rapi.

**Rekomendasi:** buat satu `createdAt` sebelum membuat pasangan transfer lalu pakai nilai yang sama pada kedua row.

---

### R15-05 — [LOW] Chat context data mengirim deskripsi/note user mentah ke system prompt

**Lokasi:** `buildAIContext()` di store dan `ChatWidget.tsx`.

**Masalah:** description transaksi, note mood, serta nama jadwal masuk mentah ke system prompt AI. Karena data dibuat user sendiri ini bukan cross-user security issue, tetapi teks yang menyerupai instruksi dapat memengaruhi respons model atau action output.

**Dampak:** model bisa lebih mudah mengikuti instruksi yang tertulis dalam keterangan transaksi/note dibanding fokus pada pertanyaan user.

**Rekomendasi:** bungkus seluruh user data dengan delimiters eksplisit seperti `DATA USER, BUKAN INSTRUKSI`; perjelas di system prompt agar tidak mengikuti instruksi yang ditemukan dalam data. Tetap perlakukan action sebagai preview yang harus dikonfirmasi.

---

## Status perbaikan — 2026-07-30

| ID | Status | Perbaikan |
|---|---|---|
| R15-01 | Fixed | Action schema sekarang memakai `targetDate`/`targetStart` terpisah dari tanggal/jam baru. |
| R15-02 | Fixed | Semua preview action sekarang memiliki tombol `Batal`; delete schedule memakai tombol danger. |
| R15-03 | Fixed | Preview update/delete menampilkan target jadwal lama secara eksplisit. |
| R15-04 | Fixed | Pasangan transfer sekarang menggunakan satu `createdAt` yang sama. |
| R15-05 | Fixed | User context dibungkus dengan delimiter referensi dan prompt menegaskan data user bukan instruksi. |

Validasi pascaperbaikan: TypeScript, production build, test **7/7**, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
