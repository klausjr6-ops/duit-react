# DUIT — Deep Non-Firestore Audit Round 23

**Tanggal audit:** 2026-08-01  
**Scope:** browser performance, accessibility, rendering, persistent chat behavior, and gesture UX. Firestore data-size architecture is intentionally out of scope.

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

### R23-01 — [MEDIUM] FAB Chat tidak dapat dibuka dengan keyboard

**Lokasi:** `src/components/DraggableFAB.tsx`.

**Masalah:** FAB adalah elemen `<button>`, tetapi pembukaan chat hanya dipasang melalui native `pointerdown` listener. Tidak ada `onClick` atau `onKeyDown` React handler. Enter/Space pada FAB dapat menghasilkan click browser, tetapi tidak ada handler click untuk membuka chat.

**Dampak:** user keyboard/screen reader tidak dapat memakai entry point Chat AI.

**Rekomendasi:** tambahkan click handler yang membuka chat jika pointer gesture tidak dianggap drag; cegah duplicate open setelah pointer click. Tambahkan keyboard behavior eksplisit.

---

### R23-02 — [MEDIUM] Pull-to-refresh dapat bentrok dengan scroll horizontal laporan/grafik pada mobile

**Lokasi:** `usePullToRefresh` dipasang pada root `AuthenticatedApp`.

**Masalah:** root menerima seluruh touch event, termasuk saat user melakukan gesture di tabel laporan horizontal atau SVG chart. Jika halaman berada di atas dan gesture memiliki komponen vertikal kecil, pull indicator bisa aktif ketika user sebenarnya berniat scroll/geser tabel.

**Dampak:** UX mobile terasa tidak stabil pada laporan dan grafik.

**Rekomendasi:** hanya mulai pull bila gesture dimulai dari area non-interaktif atau tambahkan axis lock: jika horizontal movement lebih besar dari vertical, cancel pull gesture.

---

### R23-03 — [MEDIUM] Chat context lama ditambahkan ke system prompt tanpa batas token terpadu

**Lokasi:** `ChatWidget.tsx`.

**Masalah:** 4.000 karakter history tambahan dimasukkan setelah financial context yang dapat mencapai 14.000 karakter. Frontend tidak menghitung batas gabungan sebelum mengirim. Backend memotong system pada 18.000 karakter, sehingga bagian akhir—biasanya history percakapan—dapat terpotong tanpa disadari.

**Dampak:** perbaikan context percakapan dapat tidak efektif saat data user panjang; hasilnya tidak deterministik.

**Rekomendasi:** budget system prompt secara eksplisit, misalnya data user 11.000 char + history 3.500 char + persona, dan potong di frontend sebelum request.

---

### R23-04 — [LOW] Tidak ada global reduced-motion policy

**Lokasi:** seluruh UI Framer Motion dan CSS animation.

**Masalah:** banyak animation repeat/infinite dan hover transforms tetap aktif untuk user yang memilih `prefers-reduced-motion` di OS. Ini memengaruhi aksesibilitas dan baterai/performa perangkat rendah.

**Rekomendasi:** gunakan `useReducedMotion()` Framer Motion pada animation penting atau CSS media rule untuk mematikan/sederhanakan motion non-esensial.

---

### R23-05 — [LOW] Label form manual tidak selalu terhubung dengan input melalui `htmlFor`/`id`

**Lokasi:** Login, Goal, Wallet, Schedule, Transaction, dan modal edit.

**Masalah:** beberapa label hanya berada berdekatan secara visual tanpa association semantic.

**Dampak:** screen reader tidak selalu membacakan label saat field menerima focus.

**Rekomendasi:** tambahkan id stabil pada input/select dan `htmlFor` pada label, terutama login dan form transaksi yang sering digunakan.

---

### R23-06 — [LOW] Detail transaksi menampilkan saldo wallet saat ini, bukan saldo setelah transaksi historis

**Lokasi:** `TransactionDetailDrawer.tsx`.

**Masalah:** label sudah menyebut “saat ini”, sehingga tidak menyesatkan, tetapi user bisa mengira ini dampak transaksi yang sedang dibuka. Untuk histori lama nilainya berbeda jauh.

**Rekomendasi:** pertahankan label saat ini, atau tambahkan perhitungan saldo historis setelah transaction bila feature ini diperlukan.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R23-01 | Fixed | FAB kini memiliki click handler sehingga keyboard Enter/Space membuka chat; pointer synthetic click tetap dicegah dari double open. |
| R23-02 | Fixed | Pull-to-refresh memakai horizontal axis lock dan tidak aktif saat swipe horizontal dominan. |
| R23-03 | Fixed | Financial context dan conversation history diberi budget karakter terpisah sebelum request AI. |
| R23-04 | Already covered | `index.css` sudah memiliki `prefers-reduced-motion` global yang menurunkan animation/transition. |
| R23-05 | Fixed | Generic login input memakai `useId`, `htmlFor`, dan password control mempunyai aria label. |
| R23-06 | Fixed | Detail secara eksplisit menyebut `Saldo wallet saat ini`, bukan saldo historis transaksi. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
