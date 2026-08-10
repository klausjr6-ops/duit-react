# DUIT — Full-Stack AI/API Audit Round 27

**Tanggal audit:** 2026-08-01  
**Scope:** Vercel API chat, provider fallback, auth/session edge cases, client action boundary, and test coverage.

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

### R27-01 — [MEDIUM] Provider timeout tidak membatalkan fetch upstream

**Lokasi:** `api/chat.js`, `withTimeout()`.

**Masalah:** timeout memakai `Promise.race`, tetapi fetch Gemini/Groq yang kalah race tetap berjalan di background. Setelah timeout, fallback provider dimulai, sehingga request lama dan fallback dapat berjalan bersamaan.

**Dampak:** potensi biaya/quota ganda dan warm serverless instance tetap memegang request yang tidak diperlukan.

**Rekomendasi:** gunakan `AbortController` per provider dan teruskan signal ke fetch; abort ketika timeout tercapai.

---

### R27-02 — [MEDIUM] Rate limit chat hanya per IP, bukan per authenticated user

**Lokasi:** `api/chat.js`, `getClientKey()` dan `isRateLimited()`.

**Masalah:** 12 request/menit dihitung berdasarkan forwarded IP. Banyak user di jaringan kantor/kampus/NAT yang sama dapat saling terkena limit. Sebaliknya, satu user dapat menghindari limit dengan berganti IP.

**Dampak:** UX buruk untuk shared network dan proteksi abuse kurang presisi.

**Rekomendasi:** setelah Firebase token divalidasi, gunakan kombinasi `uid + IP` atau `uid` sebagai rate-limit key; tetap gunakan IP fallback untuk request tidak valid.

---

### R27-03 — [MEDIUM] Fallback stale logout aman dari dashboard, tetapi user dapat terjebak di error screen

**Lokasi:** `App.tsx`, `SessionEndError`.

**Masalah:** jika signOut stale benar-benar gagal, UI menampilkan layar aman “Sesi perlu diakhiri” dengan reload. Jika error auth storage persisten, reload akan kembali ke layar sama dan user tidak punya tindakan lain selain browser clear storage.

**Dampak:** user dapat lockout sendiri pada perangkat/browser tertentu.

**Rekomendasi:** tambahkan tombol `Coba Keluar Lagi` dan fallback `auth.signOut()` retry; tampilkan instruksi clear browser storage hanya sebagai langkah terakhir.

---

### R27-04 — [LOW] Chat action execution berada seluruhnya di client

**Lokasi:** `ChatWidget.tsx`.

**Masalah:** AI hanya menghasilkan metadata action, lalu client mengeksekusi mutator. Ini aman karena Firebase rules membatasi UID dan UI meminta konfirmasi, tetapi tidak ada audit log server-side atau idempotency token action.

**Dampak:** action tidak dapat ditelusuri sebagai “dibuat AI”, dan duplicate action dari refresh/race perlu ditangani client.

**Rekomendasi:** untuk major AI planner, pertimbangkan action ID dan audit log lokal/cloud; tidak perlu memindahkan write ke server sekarang.

---

### R27-05 — [LOW] API/serverless routes tidak memiliki test otomatis

**Lokasi:** `api/chat.js`, `api/calendar.ics.js`.

**Masalah:** test suite hanya helper/store/client parser. Auth validation, rate limit, timeout, provider truncation, calendar token comparison, dan iCalendar output belum diuji.

**Rekomendasi:** tambah unit test handler dengan mocked request/response/fetch, terutama setelah perubahan provider/timeout.

---

## Status

Audit Round 27: **belum clean** — 3 MEDIUM dan 2 LOW. Tidak ada source aplikasi yang diubah oleh audit ini.
