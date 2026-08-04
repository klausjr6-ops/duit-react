# DUIT — Deep Bug Audit Round 20

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** destructive actions, goal creation, async confirmation dialogs, and settings persistence.

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

### R20-01 — [MEDIUM] Reset All masih menampilkan sukses sebelum write Firestore berhasil

**Lokasi:** `AccountModal.tsx`, `resetAll()`.

**Masalah:** Confirm reset memanggil `resetAll()` berbasis optimistic `updateData()`, segera menampilkan toast sukses, dan menutup Account Modal. Jika write cloud gagal, user sudah menerima sukses palsu.

**Dampak:** tindakan destruktif dapat terlihat selesai padahal cloud masih berisi data lama.

**Rekomendasi:** buat `resetAll()` async memakai `enqueueFirestoreUpdate`, gunakan busy state ConfirmDialog, dan tampilkan sukses hanya setelah commit.

---

### R20-02 — [MEDIUM] Add Goal dengan tabungan awal masih memiliki race-condition sukses palsu

**Lokasi:** `store.tsx`, `addGoal()`.

**Masalah:** `addGoal()` melakukan pre-check balance lalu memanggil optimistic `updateData()`. Jika wallet berubah di tab lain sebelum updater berjalan, updater mengembalikan previous tetapi function tetap mengembalikan `{ ok: true }`. Ini adalah edge case lama yang kembali relevan karena AI Action dan multi-tab penggunaan.

**Dampak:** UI menampilkan “Goal berhasil ditambahkan” walau goal/funding transaction tidak tersimpan.

**Rekomendasi:** refactor addGoal menjadi async transactional, sama seperti fundGoal/withdrawGoal, lalu UI dan AI Action menunggu hasil.

---

### R20-03 — [MEDIUM] Confirm delete jadwal async tidak memakai busy state

**Lokasi:** `JadwalView.tsx`, ConfirmDialog delete schedule.

**Masalah:** `delSched()` sekarang async, tetapi ConfirmDialog tidak diberi `busy` saat delete berjalan. User dapat klik konfirmasi beberapa kali sebelum dialog tertutup.

**Dampak:** write kedua biasanya gagal aman karena schedule sudah terhapus, tetapi menghasilkan request/feedback tidak konsisten.

**Rekomendasi:** tambah `deletingSchedule` state dan pass `busy={deletingSchedule}` ke ConfirmDialog.

---

### R20-04 — [LOW] Edit Goal/Edit Wallet masih optimistis setelah validasi lokal

**Lokasi:** `updateGoal()`, `updateWallet()`, modal edit terkait.

**Masalah:** kedua mutator mengembalikan sukses setelah validation lokal dan menggunakan `updateData()`. Jika write cloud gagal, toast sukses sudah muncul. Tidak sesering addGoal/reset, tetapi masih pola inkonsisten.

**Rekomendasi:** jadikan async transactional atau tampilkan toast `Perubahan sedang disinkronkan` sampai commit berhasil.

---

### R20-05 — [LOW] Modal async tidak menonaktifkan seluruh field dengan satu guard konsisten

**Lokasi:** modal transfer/jadwal/wallet.

**Masalah:** tombol utama dan beberapa select sudah disabled, tetapi beberapa input/picker/icon masih dapat diubah selama saving. Ini tidak membuat write ganda setelah guard button, tetapi state UI dapat berubah dari data yang sedang disimpan.

**Rekomendasi:** bungkus form controls dalam `fieldset disabled={saving}` atau gunakan prop disabled konsisten untuk seluruh control.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R20-01 | Fixed | `resetAll()` sekarang async transactional dan ConfirmDialog memakai busy state. |
| R20-02 | Fixed | `addGoal()` sekarang async transactional; GoalModal menunggu hasil cloud sebelum sukses. |
| R20-03 | Fixed | Delete jadwal memakai `deletingSchedule` dan busy ConfirmDialog. |
| R20-04 | Fixed | `updateGoal()` dan `updateWallet()` sekarang async transactional; modal edit menunggu hasil. |
| R20-05 | Fixed | Tombol submit/control utama dikunci saat saving; backdrop, close button, dan Escape juga diblokir selama write. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
