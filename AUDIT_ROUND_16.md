# DUIT — Feature & Bug Audit Round 16

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** AI schedule actions, avatar action menu/preview, dan persistent chat.

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

### R16-01 — [MEDIUM] Preview AI update/delete schedule dapat tetap ambigu jika target selector tidak lengkap

**Lokasi:** `src/components/ChatWidget.tsx`, `findSchedule()`.

**Masalah:** schema sudah memiliki `targetDate`/`targetStart`, tetapi keduanya opsional. Jika nama jadwal unik saat preview dibuat lalu user menambah jadwal lain dengan nama sama sebelum konfirmasi, preview yang sama akan gagal/menjadi ambigu. Ini aman karena resolver menolak lebih dari satu match, namun user perlu mengulang perintah.

**Dampak:** bukan salah sasaran, tetapi action AI bisa gagal pada data yang berubah antar preview dan konfirmasi.

**Rekomendasi:** saat action dibuat, simpan `scheduleId` dari resolver lokal atau gunakan confirmation token yang mengikat ID target. Ini memerlukan tahap resolusi sebelum preview dirender.

---

### R16-02 — [MEDIUM] Avatar menu dan preview belum memakai focus trap/Escape/scroll lock yang sama dengan modal DUIT

**Lokasi:** `src/components/AccountModal.tsx`.

**Masalah:** popup avatar preview dibuat dengan `motion.div` sendiri, bukan `useModalDialog`. Tidak ada focus restoration, focus trap, Escape close, atau body scroll lock. Menu kecil avatar juga tidak otomatis close saat user klik di luar area.

**Dampak:** aksesibilitas keyboard kurang baik dan pada mobile user dapat scroll konten di belakang preview.

**Rekomendasi:** ekstrak AvatarPreviewModal menggunakan `useModalDialog`; close menu saat click-away/Escape.

---

### R16-03 — [LOW] Riwayat chat lama format array tidak memiliki TTL efektif pada pembacaan pertama

**Lokasi:** `readChatHistory()` di `ChatWidget.tsx`.

**Masalah:** format history baru memiliki `savedAt` dan TTL 30 hari. Namun history lama yang masih array-only tetap dimuat sekali tanpa timestamp, lalu baru ditulis ulang ke format baru setelah render.

**Dampak:** user yang memiliki history format lama dapat menerima konteks sangat lama pada satu sesi pertama setelah upgrade.

**Rekomendasi:** saat menemukan format array legacy, mulai sesi baru atau set savedAt konservatif agar tidak otomatis menjadi context AI.

---

### R16-04 — [LOW] Tombol “Batal” AI Action menghapus preview tanpa feedback eksplisit

**Lokasi:** `ActionPreview` di `ChatWidget.tsx`.

**Masalah:** action dibatalkan dengan menghilangkan card preview, tetapi tidak ada bubble/copy “Tindakan dibatalkan”. Ini aman, namun user dapat ragu apakah action benar-benar dibatalkan atau UI gagal.

**Rekomendasi:** setelah cancel, ubah preview menjadi state nonaktif bertuliskan `Tindakan dibatalkan` atau tambahkan pesan sistem singkat tanpa memanggil AI.

---

### R16-05 — [LOW] Test AI Action belum mencakup resolver jadwal, cancel action, dan transfer persistence

**Lokasi:** `src/lib/store.test.ts`.

**Masalah:** parser action punya dua test, tetapi alur end-to-end resolver schedule, selector ambigu, cancel preview, dan commit transfer belum diuji otomatis.

**Rekomendasi:** extract resolver target dan action state reducer menjadi utility pure; tambah fixture untuk schedule duplicate dan target date/start.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R16-01 | Fixed | Preview action update/delete mengikat `scheduleId` pada schedule target saat preview dibuat. |
| R16-02 | Fixed | Avatar preview kini memakai `useModalDialog`; focus trap, Escape, scroll lock, dan focus restoration aktif. Avatar menu juga close saat click-away. |
| R16-03 | Fixed | History array legacy tidak lagi dipakai sebagai AI context; sesi baru dimulai setelah upgrade. |
| R16-04 | Fixed | Tombol Batal menghapus preview dan menambahkan pesan `Tindakan dibatalkan. Tidak ada data yang diubah.` |
| R16-05 | Fixed | Ditambah test resolver yang mengikat action update ke `scheduleId` stabil. |

Validasi pascaperbaikan: `npm test` **8/8 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
