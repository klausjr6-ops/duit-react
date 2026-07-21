# DUIT — Feature & Bug Audit Round 10

**Tanggal audit:** 2026-07-21 (WIB)  
**Baseline:** working tree setelah perbaikan Round 9 (belum di-commit)  
**Metode:** code review statis lintas UI, store, Auth, API chat/calendar, backup/restore, dan konfigurasi repository.

## Validasi teknis

| Pemeriksaan | Hasil |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Lulus |
| Production build (`npm run build`) | Lulus |
| Whitespace (`git diff --check`) | Lulus |
| Dependency audit | 8 moderate, 0 high, 0 critical |

> Tidak ditemukan test suite otomatis untuk business logic kritis. Temuan di bawah diverifikasi melalui penelusuran alur kode dan skenario reproduksi.

---

## Temuan

### R10-01 — [MEDIUM] Jam, tanggal, greeting, dan timeline dashboard masih memakai timezone lokal perangkat

**Lokasi:**
- `src/lib/format.ts`: `formatTime`, `formatDayDate`, `getGreeting`
- `src/components/TimelineCard.tsx`: `new Date()`, `getHours()`, `getMinutes()`

**Masalah:** Round 9 sudah memperbaiki mode tema agar mengikuti Jakarta, tetapi formatter UI dan Timeline masih memakai local browser time. Header/Clock Card memanggil formatter ini; Timeline juga memilih jadwal terdekat berdasarkan jam perangkat.

**Reproduksi:** buka aplikasi dari perangkat yang timezone-nya UTC atau negara lain pada pukul 00:30 WIB. Tanggal transaksi dan schedule menggunakan WIB, tetapi header dapat menampilkan hari/tanggal sebelumnya; greeting, progress timeline, dan schedule “terdekat” juga salah.

**Dampak:** pengalaman inti aplikasi tidak konsisten dengan kebijakan aplikasi Indonesia/WIB dan dapat menampilkan jadwal hari ini secara menyesatkan.

**Rekomendasi:** seluruh helper di `format.ts` harus memakai `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"`. Buat helper `jakartaHourMinute(date)` untuk Timeline agar tidak memakai `Date#getHours()`/`getMinutes()`.

---

### R10-02 — [MEDIUM] Import backup dapat berhasil di UI walaupun write cloud gagal atau belum diterima store

**Lokasi:** `src/components/AccountModal.tsx`, `confirmImportBackup()`; `src/lib/store.tsx`, `replaceAll()` → `updateData()`.

**Masalah:** setelah `replaceAll(pendingImport.data)`, UI langsung menutup konfirmasi dan menampilkan toast “Backup berhasil diimport”. Namun `replaceAll` tidak mengembalikan Promise/hasil write. Bila koneksi putus, Firestore ditolak, atau `updateData()` menolak karena user data belum siap, backup belum tentu tersimpan.

**Dampak:** untuk aksi destruktif (mengganti seluruh data), user mendapat konfirmasi sukses palsu dan berisiko menganggap backup telah dipulihkan padahal tidak.

**Rekomendasi:** jadikan `replaceAll` async dan gunakan `enqueueFirestoreUpdate` agar hasil sukses/gagal dapat ditunggu. Selama proses, disable tombol; tampilkan sukses hanya setelah commit berhasil dan error yang eksplisit bila gagal.

---

### R10-03 — [MEDIUM] Nilai `Goal.current` pada restore tidak diverifikasi terhadap transaksi funding/withdrawal

**Lokasi:** `src/lib/store.tsx`, `sanitizeImportedUserData()` / `sanitizeGoal()`.

**Masalah:** backup dapat berisi `goals[].current` yang tidak sama dengan akumulasi transaksi `goalId` terkait. Sanitizer hanya clamp ke 0–target dan menerima nilai tersebut tanpa rekonsiliasi.

**Reproduksi:** ubah JSON backup: goal target Rp1.000.000, `current` Rp900.000, tetapi tidak ada transaksi funding; kemudian import. UI menunjukkan Rp900.000 tabungan padahal saldo wallet tidak pernah berkurang.

**Dampak:** data goal, total tabungan, progress, dan AI context menjadi tidak akurat. Karena backup merupakan format yang bisa diedit, kasus ini realistis bahkan tanpa akses pihak ketiga.

**Rekomendasi:** setelah import, hitung ulang setiap `goal.current` dari transaksi goal (`out` menambah, `in` mengurangi), clamp 0–target, lalu tolak atau beri peringatan jika backup tidak konsisten. Untuk kompatibilitas backup lama yang tidak memiliki transaksi goal, gunakan migrasi yang eksplisit, bukan menerima dua sumber kebenaran diam-diam.

---

### R10-04 — [MEDIUM] Tidak ada Firestore Security Rules atau konfigurasi deployment security yang dapat diaudit di repository

**Lokasi:** repository root — tidak terdapat `firestore.rules`, `firebase.json`, maupun dokumentasi rules yang dapat dievaluasi.

**Masalah:** aplikasi mengandalkan dokumen privat `users/{uid}/data/main`, tetapi aturan akses Firestore tidak dipelihara bersama source. API calendar memakai Firebase Admin dan chat sekarang memverifikasi token, namun keamanan data langsung dari client sepenuhnya tergantung konfigurasi Firebase Console yang tidak terlihat/terversioning.

**Dampak:** konfigurasi rules yang salah dapat membuat data finansial antar-user bisa dibaca/ditulis, meskipun source client sudah benar. Ini adalah risiko privasi besar dan sulit direview/regresi.

**Rekomendasi:** tambahkan `firestore.rules` versioned dengan prinsip minimal: user terautentikasi hanya boleh read/write `users/{uid}/data/main` miliknya sendiri; sertakan `firebase.json` dan langkah deploy rules. Audit rule Firebase Console production agar sama dengan source.

---

### R10-05 — [LOW] Validator date/time menerima nilai kalender yang tidak nyata dari import/legacy data

**Lokasi:** `src/lib/store.tsx`, `toDateKey()` dan `toTimeValue()`.

**Masalah:** regex hanya memeriksa bentuk `YYYY-MM-DD` / `HH:MM`; misalnya `2026-99-99`, `2026-02-31`, atau `29:75` lolos. Data itu kemudian dipakai untuk filter string, `Date.UTC`, format UI, dan iCalendar.

**Dampak:** backup rusak dapat menyebabkan tanggal bergeser saat diformat, transaksi tidak muncul pada laporan semestinya, atau feed kalender menghasilkan VEVENT tidak valid.

**Rekomendasi:** validasi range dan round-trip kalender: parse sebagai UTC, lalu pastikan year/month/day hasil parse sama dengan input. Untuk waktu, batasi jam 00–23 dan menit 00–59.

---

### R10-06 — [LOW] iCalendar dapat menghasilkan `DTEND` lebih awal daripada `DTSTART` untuk schedule legacy yang melewati tengah malam

**Lokasi:** `api/calendar.ics.js`, `defaultEndTime()` dan pembentukan `DTEND`.

**Masalah:** `defaultEndTime("23:30")` menjadi `00:30`, tetapi `DTEND` tetap memakai `startDate` yang sama. Hal serupa dapat terjadi untuk data legacy yang memiliki `end < start`; UI baru memang mencegahnya, tetapi server menerima data Firestore tanpa sanitasi ulang.

**Dampak:** beberapa calendar client menolak event atau menampilkan durasi negatif.

**Rekomendasi:** bila end time <= start time, naikkan date `DTEND` satu hari untuk VEVENT, atau tolak/normalisasi schedule invalid saat data dimuat.

---

### R10-07 — [LOW] `updateGoal()` dan `updateWallet()` di core store mempercayai validasi UI sepenuhnya

**Lokasi:** `src/lib/store.tsx`, `updateGoal()` dan `updateWallet()`.

**Masalah:** `EditGoalModal` dan `EditWalletModal` memvalidasi input, tetapi mutator core dapat menerima patch yang membuat target goal di bawah `current`, balance wallet negatif, atau field tidak valid. Berbeda dengan transfer/fund/withdraw/updateTx, tidak ada safety net dalam updater transaction.

**Dampak:** komponen baru, perubahan UI, race condition, atau pemanggilan internal yang keliru dapat melanggar invariant data tanpa penolakan.

**Rekomendasi:** validasi dan normalisasi patch di core: target harus finite > 0 dan >= current; wallet balance harus finite >= 0; nama/icon/color dibatasi sesuai schema. Mutator sebaiknya mengembalikan `{ ok, message }` bila validasi dapat gagal.

---

## Prioritas perbaikan

1. **R10-01** — konsistensi Jakarta/WIB pada dashboard utama.
2. **R10-02 dan R10-03** — agar restore tidak mengonfirmasi data finansial yang gagal atau tidak konsisten.
3. **R10-04** — versioning dan audit Firestore Rules production sebelum rilis berikutnya.
4. **R10-05 sampai R10-07** — hardening data legacy/import dan invariant core.

## Status perbaikan — 2026-07-21

Seluruh temuan Round 10 telah ditangani:

| ID | Status | Implementasi |
|---|---|---|
| R10-01 | Fixed | `format.ts` dan `TimelineCard` kini membaca waktu/tanggal/jam dari `Asia/Jakarta`; Timeline juga diperbarui tiap 30 detik. |
| R10-02 | Fixed | Restore menunggu `enqueueFirestoreUpdate`; dialog terkunci saat proses dan sukses hanya muncul setelah write cloud berhasil. |
| R10-03 | Fixed | Import merekonsiliasi `Goal.current` dari transaksi funding/withdrawal, lalu clamp ke target. |
| R10-04 | Fixed | Ditambahkan `firestore.rules` dan `firebase.json` untuk deployment/versioning rule akses dokumen private per UID. |
| R10-05 | Fixed | Date/time normalizer melakukan validasi kalender nyata dan range jam/menit; API calendar juga memvalidasi legacy data. |
| R10-06 | Fixed | API calendar memindahkan `DTEND` ke hari berikutnya saat end time <= start time. |
| R10-07 | Fixed | `updateGoal` dan `updateWallet` memvalidasi invariant pada core store serta mengembalikan hasil yang ditangani modal edit. |

Validasi pascaperbaikan: `npx tsc --noEmit`, `npm run build`, dan `git diff --check` semuanya **lulus**. `npm audit` tetap menunjukkan 8 moderate transitif Firebase Admin, tanpa high/critical; lihat catatan Round 9 mengenai rekomendasi downgrade audit yang tidak valid.
