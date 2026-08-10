# DUIT — Authentication & Session Audit Round 25

**Tanggal audit:** 2026-08-01  
**Scope:** login, password reset, session readiness, Auth UI, and dependency state.

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

### R25-01 — [MEDIUM] Password dikosongkan pada seluruh login error, termasuk network failure

**Lokasi:** `LoginScreen.tsx`, `handleSubmit()`.

**Masalah:** perbaikan sebelumnya mengosongkan password di semua blok `catch`. Ini benar untuk `wrong-password` dan `invalid-credential`, tetapi juga terjadi pada `network-request-failed`, service outage, atau error sementara Firebase.

**Dampak:** user yang passwordnya sebenarnya benar harus mengetik ulang setelah error koneksi.

**Rekomendasi:** kosongkan password hanya untuk code credential/authentication error, bukan error jaringan/unknown.

---

### R25-02 — [LOW] Field password tidak menerima focus kembali setelah credential gagal

**Lokasi:** `LoginScreen.tsx`.

**Masalah:** password sudah dikosongkan, tetapi focus tetap tidak diarahkan ke field password. Keyboard user harus tab/click lagi sebelum mengetik ulang.

**Rekomendasi:** gunakan ref password input; setelah clear password pada credential error, `focus()` field tersebut.

---

### R25-03 — [LOW] Google login tidak memetakan beberapa error popup umum secara spesifik

**Lokasi:** `mapFirebaseError()`.

**Masalah:** code seperti `auth/popup-blocked` dan `auth/cancelled-popup-request` masuk ke generic error.

**Dampak:** user tidak mendapat instruksi untuk mengizinkan popup atau mencoba ulang.

**Rekomendasi:** tambah pesan lokal yang spesifik untuk popup blocked/cancelled.

---

### R25-04 — [LOW] Session Ready dapat tetap false jika logout stale check gagal di luar auth callback

**Lokasi:** `App.tsx`.

**Masalah:** stale session branch memanggil `logout()` tanpa `await` dan langsung return. Biasanya `onAuthStateChanged` mengubah user menjadi null, tetapi jika signOut gagal sementara, app dapat terus menampilkan FullScreenLoader sampai auth state berubah.

**Rekomendasi:** await/handle logout error dan fallback `setSessionReady(true)` dengan LoginScreen/error state bila signout gagal.

---

### Dependency note

8 vulnerability moderate transitif Firebase Admin/Google Cloud tetap ada. Tidak ada high/critical. Rekomendasi audit otomatis mengarah ke downgrade incompatible; tidak diterapkan.

## Status

Audit Round 25: **belum clean** — 1 MEDIUM dan 3 LOW. Tidak ada source aplikasi yang diubah oleh audit ini.
