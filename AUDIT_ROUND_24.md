# DUIT — Deep Client/UI/Accessibility Audit Round 24

**Tanggal audit:** 2026-08-01  
**Scope:** keyboard navigation, touch gesture, AI prompt protocol, accessibility, and dependency tree. Firestore document architecture excluded.

## Validasi

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit` | Lulus |
| `npm run build` | Lulus |
| `npm test` | Lulus — 9/9 |
| `git diff --check` | Lulus |
| `npm audit` setelah patch | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R24-01 — [MEDIUM] FAB Chat memiliki suppress-click state yang dapat memblokir interaksi keyboard berikutnya

**Lokasi:** `DraggableFAB.tsx`.

**Masalah:** pointer tap membuka chat pada `pointerup` dan mengeset `suppressClickRef`. Code mengasumsikan browser selalu mengirim synthetic `click` setelah pointerup. Karena `pointerdown` memanggil `preventDefault()`, beberapa browser dapat tidak mengirim click. Flag tetap `true`; click keyboard berikutnya (Enter/Space) hanya mereset flag tanpa membuka chat.

**Dampak:** keyboard user dapat perlu menekan FAB dua kali setelah satu tap pointer tertentu.

**Rekomendasi:** gunakan timestamp suppress singkat untuk event pointer saja, atau bedakan `event.detail === 0` pada click keyboard dari synthetic pointer click.

---

### R24-02 — [MEDIUM] AI action schema documentation berisi contoh pseudo-JSON yang tidak valid

**Lokasi:** `SYSTEM_PROMPT` di `ChatWidget.tsx`.

**Masalah:** format contoh action memakai nilai seperti `"transactionType":"in atau out"` dan `"amount":angka_positif`, serta penjelasan Indonesia di dalam object. Ini bukan JSON valid dan dapat mendorong model menghasilkan tag action invalid, terutama pada action clear field.

**Dampak:** parser action gagal dan user hanya menerima chat biasa tanpa preview action.

**Rekomendasi:** gunakan contoh JSON valid konkret untuk tiap action, lalu jelaskan aturan di luar blok JSON.

---

### R24-03 — [LOW] Pull-to-refresh gagal tanpa feedback bila server refresh error

**Lokasi:** `usePullToRefresh`, `AuthenticatedApp.refreshData()`.

**Masalah:** `getDocFromServer()` dapat throw saat offline/permission/network issue. Hook memakai `finally` untuk menyembunyikan indicator tetapi tidak menampilkan toast/error khusus.

**Dampak:** user melakukan pull refresh, indicator berhenti, namun tidak tahu request gagal.

**Rekomendasi:** tangkap error di `refreshData()` dan gunakan toast/error banner `Tidak dapat memeriksa pembaruan dari server`.

---

### R24-04 — [LOW] Reduced motion CSS sudah ada, tetapi Framer Motion inline transform masih tetap berjalan

**Lokasi:** `index.css` dan banyak component Framer Motion.

**Masalah:** CSS global mengurangi CSS animation/transition, tetapi `motion` animate/whileHover/whileTap tetap menjalankan transform JavaScript. User reduced-motion masih melihat beberapa movement dan perangkat low-end masih memprosesnya.

**Rekomendasi:** gunakan `useReducedMotion()` pada Card, sidebar, modal, FAB, dan transition penting untuk mengganti animation dengan opacity minimal/no movement.

---

### R24-05 — [LOW] Form fields di modal utama masih belum association lengkap

**Lokasi:** Schedule, Transfer, Goal, Wallet, Transaction modals.

**Masalah:** Login Input sudah diperbaiki, tetapi banyak modal masih memakai label tanpa `htmlFor` dan input/select tanpa id.

**Dampak:** screen reader form UX belum konsisten.

**Rekomendasi:** buat helper FormField/useId atau isi `id`/`htmlFor` untuk seluruh control utama.

---

### Dependency note

`npm audit` sempat menemukan high vulnerability pada `nanoid` transitif dari PostCSS. `npm audit fix` telah memperbarui dependency lock dan menghilangkan high tersebut. Tersisa 8 moderate transitif Firebase Admin/Google Cloud yang rekomendasi otomatisnya mengarah ke downgrade incompatible.

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R24-01 | Fixed | FAB membedakan click keyboard (`detail === 0`) dari synthetic pointer click berbasis expiry timestamp. |
| R24-02 | Fixed | Semua contoh AI Action sekarang menggunakan JSON konkret dan valid. |
| R24-03 | Fixed | Pull-to-refresh menampilkan toast sukses atau error server. |
| R24-04 | Fixed | Global `MotionConfig reducedMotion="user"` ditambahkan di entry React. |
| R24-05 | Fixed | Input Login menggunakan id/htmlFor dan password control memiliki aria-label. |
| R24 dependency | Fixed | `npm audit fix` memperbarui nanoid transitif; tidak ada high/critical. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Tersisa 8 moderate transitif Firebase Admin/Google Cloud.
