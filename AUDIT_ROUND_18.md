# DUIT — Feature & Bug Audit Round 18

**Tanggal audit:** 2026-08-01 (WIB)  
**Scope:** async submit guard, transisi tampilan, dan modal/form UI.

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

### R18-01 — [MEDIUM] Modal async masih dapat ditutup ketika write cloud sedang berjalan

**Lokasi:** `TransferModal`, `ScheduleModal`, `EditScheduleModal`, dan `WalletManager`.

**Masalah:** tombol submit sekarang disabled saat saving, tetapi backdrop dan tombol close masih aktif. User dapat menutup modal ketika request berjalan, lalu tidak mengetahui hasil akhir write. Jika membuka modal lagi dengan cepat, state user terlihat membingungkan.

**Dampak:** tidak membuat duplikasi lagi, tetapi feedback write gagal/sukses dapat hilang dari user yang menutup modal terlalu cepat.

**Rekomendasi:** selama `saving`, disable tombol close dan abaikan click backdrop. Atau tampilkan pending toast global yang tetap hidup setelah modal ditutup.

---

### R18-02 — [LOW] Input transfer tetap dapat diedit saat saving pada beberapa kontrol UI

**Lokasi:** `TransferModal.tsx`.

**Masalah:** select dan nominal sudah disabled, tetapi close/backdrop masih aktif; beberapa tombol/label interaktif tidak mempunyai visual busy state konsisten.

**Rekomendasi:** pakai satu `fieldset disabled={saving}` atau helper class konsisten pada seluruh input/action modal.

---

### R18-03 — [LOW] Transition overlay menyerap pointer event tetapi tidak memindahkan focus keyboard

**Lokasi:** `ViewTransitionLoader.tsx`.

**Masalah:** pointer click sudah diblokir, tetapi focus keyboard sebelumnya tetap berada di control bawah overlay. User keyboard dapat masih mengaktifkan tombol dengan Enter/Space selama animasi singkat.

**Rekomendasi:** transition sangat singkat sehingga dampak kecil; jika ingin sempurna, gunakan focus guard/inert pada app root selama transition aktif.

---

### R18-04 — [LOW] UpdateSettings masih optimistis tanpa hasil write yang dapat ditunggu UI

**Lokasi:** `AccountModal.tsx` dan `store.updateSettings()`.

**Masalah:** ganti nama, avatar, theme mode, dashboard mode, dan calendar token dapat menunjukkan perubahan lokal sebelum Firestore berhasil commit. Sync error global ada, tetapi UI account tidak memberi error spesifik.

**Rekomendasi:** buat `updateSettings` async untuk aksi penting atau tampilkan status `Menyimpan…` yang jelas di Account Modal.

---

## Status

Audit Round 18: **belum clean** — 1 MEDIUM dan 3 LOW. Tidak ada source aplikasi yang diubah oleh audit ini.
