# DUIT — Feature & Bug Audit Round 14

**Tanggal audit:** 2026-07-30 (WIB)  
**Scope:** AI Action untuk transaksi/jadwal/goal/transfer serta persistent chat context.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 5/5 |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R14-01 — [HIGH] Preview AI Action yang tersimpan di localStorage dapat dikonfirmasi kembali setelah refresh

**Lokasi:** `src/components/ChatWidget.tsx`, `readChatHistory()` dan persistence `messages`.

**Masalah:** message assistant beserta properti `action` disimpan ke localStorage. Setelah refresh, preview action lama—termasuk delete schedule—dapat muncul kembali dan tombol konfirmasi masih aktif. Data target memang divalidasi ulang, tetapi action lama tetap berpotensi dijalankan pada jadwal/wallet/goal yang kebetulan masih cocok.

**Dampak:** user dapat secara tidak sengaja mengonfirmasi tindakan lama. Risiko tertinggi adalah `scheduleDelete` dan transfer.

**Rekomendasi:** jangan persist properti `action`; simpan hanya `id`, `role`, dan `text` ke history. Preview action hanya berlaku selama sesi chat aktif. Tambahkan label "Preview perlu dikonfirmasi sekarang" bila diperlukan.

---

### R14-02 — [MEDIUM] AI update jadwal dapat menghasilkan aksi kosong tetapi tetap sukses

**Lokasi:** `src/components/ChatWidget.tsx`, parser `scheduleUpdate`; `confirmAction()`.

**Masalah:** parser menerima `scheduleUpdate` yang hanya berisi `scheduleName`, tanpa field perubahan (`date`, `start`, `end`, `desc`, `recurring`, atau `untilDate`). `updateSched()` kemudian memvalidasi jadwal lama dan berhasil menulis ulang data tanpa perubahan, sementara AI mengatakan jadwal sudah diperbarui.

**Dampak:** user menerima konfirmasi perubahan palsu.

**Rekomendasi:** tolak action `scheduleUpdate` jika tidak ada minimal satu field patch yang valid.

---

### R14-03 — [MEDIUM] Transfer yang dibuat lewat AI masih optimistis dan dapat memberi konfirmasi sukses sebelum write cloud selesai

**Lokasi:** `src/lib/store.tsx`, `transferWallet()`; `src/components/ChatWidget.tsx`.

**Masalah:** add transaction, add schedule, dan delete/update schedule sudah async terhadap Firestore. Namun transfer wallet masih memakai `updateData()` optimistis lalu langsung mengembalikan `{ ok: true }`. AI dapat menampilkan "Transfer sudah dibuat" walau write kemudian gagal.

**Dampak:** user salah mengira saldo antar wallet sudah dipindahkan.

**Rekomendasi:** ubah `transferWallet()` menjadi async menggunakan `enqueueFirestoreUpdate`, seperti `fundGoal` dan `withdrawGoal`; UI TransferModal dan AI Action perlu menunggu hasilnya.

---

### R14-04 — [LOW] Persisted chat history tidak memiliki masa kedaluwarsa

**Lokasi:** `src/components/ChatWidget.tsx`.

**Masalah:** history dibatasi 32 pesan, tetapi tidak memiliki TTL. Percakapan lama tetap dipakai sebagai konteks saat user kembali setelah periode panjang, walau prioritas atau kondisi user sudah berubah.

**Dampak:** jawaban dapat membawa konteks percakapan lama yang sudah tidak relevan.

**Rekomendasi:** simpan metadata `savedAt`; setelah 7–30 hari, tampilkan history untuk dibaca tetapi jangan otomatis kirim sebagai context AI, atau mulai sesi baru secara otomatis dengan ringkasan singkat.

---

### R14-05 — [LOW] AI Action belum memiliki test end-to-end/parser test

**Lokasi:** `src/components/ChatWidget.tsx`, `src/lib/store.test.ts`.

**Masalah:** parser action, pencocokan wallet/goal/jadwal, action ambigu, dan konfirmasi update/delete belum memiliki test otomatis.

**Dampak:** perubahan persona/prompt atau refactor parser mudah merusak action tanpa ketahuan build/typecheck.

**Rekomendasi:** extract parser action dan resolver target menjadi pure utility, lalu tambah test untuk transaksi, jadwal, transfer, goal, schedule update kosong, schedule duplicate, dan stale action.

---

## Status perbaikan — 2026-07-30

| ID | Status | Perbaikan |
|---|---|---|
| R14-01 | Fixed | Chat history sekarang menyimpan hanya `id`, `role`, dan `text`; preview AI Action tidak pernah dipulihkan setelah refresh. |
| R14-02 | Fixed | Parser dan confirmation handler menolak `scheduleUpdate` tanpa field perubahan. |
| R14-03 | Fixed | `transferWallet()` sekarang async dan menunggu commit Firestore; TransferModal serta AI Action menunggu hasilnya sebelum sukses. |
| R14-04 | Fixed | History memiliki TTL 30 hari; setelah itu konteks tidak otomatis dipakai lagi. |
| R14-05 | Fixed | Ditambahkan test parser untuk update jadwal kosong dan transfer valid. |

Validasi pascaperbaikan: `npm test` **7/7 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
