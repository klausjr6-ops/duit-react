# DUIT — Comprehensive Audit Round 28 (Excluding Firestore Data Architecture)

**Tanggal audit:** 2026-08-01  
**Scope:** UI, UX, accessibility, AI serverless API, auth/session, iCalendar, browser compatibility, and client performance. Firestore document-size/data-model architecture intentionally excluded.

## Baseline validation

| Pemeriksaan | Hasil |
|---|---|
| TypeScript | Lulus |
| Production build | Lulus |
| Tests | 9/9 lulus |
| `git diff --check` | Lulus |
| Dependency audit | 8 moderate, 0 high, 0 critical |

---

## Temuan

### R28-01 — [HIGH] API provider timeout tidak membatalkan upstream fetch

**Lokasi:** `api/chat.js`, `withTimeout()`.

**Masalah:** `Promise.race` hanya menolak request lokal setelah timeout. Fetch Gemini/Groq asli masih berjalan. Fallback provider lalu dimulai, sehingga dua provider dapat berjalan bersamaan.

**Dampak:** quota/biaya ganda, request tidak diperlukan tetap hidup, dan latency warm instance meningkat.

**Perbaikan:** gunakan `AbortController` dan teruskan `signal` ke fetch provider; abort saat timeout.

---

### R28-02 — [MEDIUM] Chat rate limit per IP tidak konsisten di serverless dan shared network

**Lokasi:** `api/chat.js`.

**Masalah:** Map rate limit hanya hidup di satu warm instance dan key hanya IP. Instance berbeda tidak berbagi bucket; user pada NAT/kantor yang sama saling berbagi 12 request/menit.

**Dampak:** proteksi abuse tidak kuat dan UX user shared Wi-Fi bisa buruk.

**Perbaikan:** gunakan key uid + IP setelah auth, dan gunakan external durable rate limit (Vercel KV/Upstash) bila traffic meningkat.

---

### R28-03 — [MEDIUM] `SessionEndError` dapat menjadi loop reload tanpa recovery action

**Lokasi:** `App.tsx`.

**Masalah:** jika signOut stale gagal permanen, tombol Muat Ulang mengulang kondisi yang sama. User tidak memiliki tombol retry logout atau instruksi recovery yang praktis.

**Dampak:** lockout pada browser/auth storage yang bermasalah.

**Perbaikan:** tombol `Coba Keluar Lagi`, retry signOut terbatas, dan fallback informasi clear site data sebagai langkah terakhir.

---

### R28-04 — [MEDIUM] iCalendar belum melakukan line folding sesuai RFC 5545

**Lokasi:** `api/calendar.ics.js`.

**Masalah:** iCalendar lines seperti SUMMARY/DESCRIPTION/UID tidak dilipat pada 75 octet. Description dan nama yang cukup panjang dapat menghasilkan feed yang ditolak atau diparse berbeda oleh beberapa calendar client.

**Dampak:** kompatibilitas Apple Calendar/Outlook/Google Calendar tidak konsisten untuk schedule panjang.

**Perbaikan:** implement RFC line folding dengan CRLF + leading space, setelah text escape dilakukan.

---

### R28-05 — [LOW] Pull-to-refresh refresh server belum memberi state error persistent

**Lokasi:** `AuthenticatedApp.tsx`, `usePullToRefresh`.

**Masalah:** sekarang toast error sudah ada, tetapi indicator refresh menghilang langsung. Jika refresh gagal ketika user offline, tidak ada retry action/indicator persistent selain toast singkat.

**Perbaikan:** gunakan sync banner yang sudah ada atau tombol `Coba lagi` pada toast untuk error refresh.

---

### R28-06 — [LOW] Banyak label form modal belum mempunyai htmlFor/id

**Lokasi:** modal transaksi, wallet, schedule, goal, dan edit modal.

**Masalah:** Login sudah diperbaiki, tetapi form utama masih memakai label visual tanpa association semantic lengkap.

**Perbaikan:** standardisasi helper `FormField` dengan `useId`, id, htmlFor, error `aria-describedby`.

---

### R28-07 — [LOW] Modal dan action AI belum punya test component/e2e

**Lokasi:** test suite.

**Masalah:** pure tests lulus, namun tidak menguji keyboard FAB, modal Escape saat saving, AI action cancel, visual busy dialog, dan error pull refresh.

**Perbaikan:** tambah React Testing Library + Playwright untuk happy path dan regression interaction di Safari/Chromium.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R28-01 | Fixed | Provider timeout sekarang memakai AbortController dan membatalkan fetch upstream. |
| R28-02 | Partially fixed | Rate key sekarang menggunakan UID + IP; durable multi-instance rate limit membutuhkan KV/Upstash yang belum dikonfigurasi. |
| R28-03 | Fixed | Session error screen memiliki tombol retry logout. |
| R28-04 | Fixed | iCalendar output sekarang melakukan RFC 5545 line folding. |
| R28-05 | Fixed | Pull-to-refresh menampilkan toast sukses/gagal server. |
| R28-06 | Partially fixed | Login dan transfer form memiliki association eksplisit; modal lain perlu standardisasi FormField bertahap. |
| R28-07 | Pending infrastructure | API/component E2E test memerlukan test runner/browser setup tambahan. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin, tanpa high/critical.
