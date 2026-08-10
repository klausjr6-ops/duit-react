# DUIT — Regression & Session Audit Round 26

**Tanggal audit:** 2026-08-01  
**Scope:** login regression, stale session guard, browser compatibility, and persistent chat behavior.

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

### R26-01 — [MEDIUM] Fallback stale logout dapat merender dashboard walau logout gagal

**Lokasi:** `App.tsx`, stale session branch.

**Masalah:** jika `logout()` gagal, catch memanggil `setSessionReady(true)`. Karena `user` masih ada, render path membuka `AuthenticatedApp`, padahal session sudah ditandai stale.

**Dampak:** dalam kegagalan signOut yang jarang, stale session dapat tetap mengakses dashboard. Ini mengalahkan tujuan auto logout.

**Rekomendasi:** gunakan state `forcedLoggedOut` untuk selalu render LoginScreen sampai signout berhasil/halaman direload, atau retry signout tanpa membuka dashboard.

---

### R26-02 — [LOW] FAB keyboard handler masih berpotensi terpengaruh browser pointer event edge case

**Lokasi:** `DraggableFAB.tsx`.

**Masalah:** perbaikan timestamp sudah jauh lebih aman, tetapi native pointer listener dengan `preventDefault()` dan React onClick tetap merupakan kombinasi yang browser-sensitive. Safari/iOS perlu manual testing khusus untuk memastikan keyboard dan touch tidak membuka chat dua kali atau tidak membuka sama sekali.

**Rekomendasi:** gunakan React Pointer Events sepenuhnya atau tambah e2e test Playwright untuk keyboard Enter/Space dan pointer tap.

---

### R26-03 — [LOW] AI history TTL mempercayai jam perangkat

**Lokasi:** `ChatWidget.tsx`, `savedAt` localStorage.

**Masalah:** TTL 30 hari menggunakan `Date.now()` browser. Jika jam perangkat berubah jauh ke masa lampau, history lama dapat bertahan lebih lama; jika berubah ke masa depan, history langsung hilang.

**Rekomendasi:** dampak rendah; gunakan timestamp server bila history kelak dipersist cloud, atau toleransi clock skew pada client.

---

### R26-04 — [LOW] Chart tooltip bergantung pada global `SVGRectElement`

**Lokasi:** `WeeklyChart.tsx`.

**Masalah:** `event.target instanceof SVGRectElement` aman pada browser modern utama, tetapi dapat bermasalah pada browser/WebView yang tidak mengekspos constructor global tersebut seperti standar.

**Rekomendasi:** gunakan `event.currentTarget`/data attribute atau `target.nodeName === "rect"` untuk compat lebih luas.

---

## Status

Audit Round 26: **belum clean** — 1 MEDIUM dan 3 LOW. Tidak ada source aplikasi yang diubah oleh audit ini.
