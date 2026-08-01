# DUIT — Feature & Bug Audit Round 17

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** AI Action resolver, avatar modal, dan transisi Liquid/Sunset/Moon.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 8/8 |
| `git diff --check` | Lulus |
| `npm audit` | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R17-01 — [MEDIUM] Transition overlay tidak memblokir input saat animasi berjalan

**Lokasi:** `src/components/ViewTransitionLoader.tsx`.

**Masalah:** wrapper transisi memakai class `pointer-events-none`. Saat Liquid/Sunset/Moon berjalan selama ~1 detik, user masih bisa menekan tombol/field di bawah layer visual meskipun layar terlihat sedang berpindah mode.

**Dampak:** input dapat terjadi pada tampilan yang sedang berubah; terutama berisiko jika user menekan tombol action tepat sebelum atau saat transisi dimulai.

**Rekomendasi:** gunakan pointer events aktif pada overlay (`pointer-events-auto`) selama transisi. Overlay tidak perlu memiliki handler klik; fungsinya hanya menyerap input sampai animasi selesai.

---

### R17-02 — [MEDIUM] AI Action update jadwal belum dapat menghapus field opsional

**Lokasi:** `AssistantAction.scheduleUpdate`, parser dan `confirmAction()` di `ChatWidget.tsx`.

**Masalah:** schema hanya menerima string untuk `end`, `desc`, dan `untilDate`. Jika user berkata “hapus jam selesai” atau “hapus deskripsi jadwal”, AI tidak dapat menyampaikan intent `null`/clear ke store. Action tidak melakukan perubahan atau AI harus menjawab manual.

**Dampak:** kemampuan ubah jadwal melalui AI tidak lengkap untuk field opsional.

**Rekomendasi:** gunakan nilai eksplisit seperti `clearEnd`, `clearDescription`, dan `clearUntilDate`, lalu update store dengan field dihapus/di-set undefined sebelum sanitizer Firestore.

---

### R17-03 — [LOW] Popup avatar dapat tertutup ketika menu Account induknya ditutup tanpa reset state eksplisit

**Lokasi:** `src/components/AccountModal.tsx`.

**Masalah:** popup avatar bergantung pada `avatarPreviewOpen`; ketika Account Modal ditutup, parent unmount/AnimatePresence umumnya menutupnya, tetapi state tidak di-reset dalam `handleClose`. Saat modal dibuka kembali sangat cepat, state preview dapat berisiko terbawa sesaat tergantung lifecycle animation.

**Rekomendasi:** set `avatarPreviewOpen(false)` dan `avatarMenuOpen(false)` secara eksplisit di `handleClose()`.

---

### R17-04 — [LOW] Preview AI action tidak menunjukkan status recurring pada target schedule

**Lokasi:** `ActionPreview()` di `ChatWidget.tsx`.

**Masalah:** target date/jam sudah tampil, tetapi user tidak dapat melihat apakah jadwal target adalah recurring atau one-off sebelum update/delete dikonfirmasi.

**Dampak:** user mungkin menyangka hanya satu event akan diubah/dihapus, padahal recurring schedule memengaruhi occurrence mendatang.

**Rekomendasi:** simpan `targetRecurring` saat resolve target dan tampilkan badge `Berulang setiap minggu` pada preview.

---

### R17-05 — [LOW] Tests belum mencakup transition input blocking dan clear-field AI schedule action

**Lokasi:** test suite.

**Masalah:** test saat ini mencakup parser basic dan resolver target ID, tetapi belum mencakup schema clear field atau behavior transisi UI.

**Rekomendasi:** tambah pure parser test untuk clear field; UI transition dapat diverifikasi melalui component test/e2e saat test infrastructure diperluas.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R17-01 | Fixed | Transition overlay sekarang menyerap pointer events selama animasi. |
| R17-02 | Fixed | AI dapat memakai `clearEnd`, `clearDescription`, dan `clearUntilDate`. |
| R17-03 | Fixed | `handleClose()` mereset state menu dan preview avatar secara eksplisit. |
| R17-04 | Fixed | Preview update/delete menampilkan badge `Berulang mingguan` untuk target recurring. |
| R17-05 | Fixed | Ditambahkan test parser clear field dan resolver schedule recurring. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
