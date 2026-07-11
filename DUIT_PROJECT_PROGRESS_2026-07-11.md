# DUIT — Project Progress & Handover Context

**Dibuat:** 11 Juli 2026  
**Tujuan dokumen:** Copy seluruh isi file ini ke chat AI baru bila konteks percakapan sebelumnya sudah penuh.

---

## UPDATE BERIKUTNYA — Ringkas dan Prioritas

### Wajib dilakukan sebelum lanjut fitur baru

- [ ] Apply/deploy **`duit-fix-complete-v4.zip`**.
- [ ] Test Safari: tab/toolbar harus mengikuti **system device**, bukan tema DUIT.
- [ ] Tambahkan `FIREBASE_SERVICE_ACCOUNT_BASE64` di Vercel Preview + Production lalu redeploy.
- [ ] Test Calendar private link dan Chat setelah service account aktif.
- [ ] Test transaksi dari dua tab/device agar Firestore sync terbukti aman.
- [ ] Test Goal transfer: wallet turun, Goal naik, pengeluaran konsumtif tidak bertambah.

### Update fitur paling direkomendasikan setelah itu

1. **Withdraw dana Goal ke Wallet** — tarik nominal tertentu tanpa harus menghapus Goal.
2. **Edit data** — edit transaksi, Goal, wallet, dan jadwal.
3. **Forgot Password + email verification** — tombol `Lupa?` saat ini belum aktif.
4. **Avatar ke Firebase Storage** — versi saat ini sudah dikompres, tetapi Storage lebih ideal daripada base64 Firestore.
5. **Export/Import JSON/CSV** — backup dan restore data user.
6. **Pecah Firestore document** — penting bila histori transaksi tumbuh karena satu dokumen punya limit 1 MiB.
7. **Chat history Firestore** — gunakan collection terpisah, jangan `data/main`.
8. **Rate limit global Chat** — Vercel WAF/Redis/KV, karena rate limit sekarang masih in-memory.
9. **PWA + code splitting** — untuk install app dan loading mobile lebih cepat.
10. **Automated tests/CI** — Vitest, Playwright, GitHub Actions.

> Detail alasan, file terkait, dan keputusan produk ada pada section **8.1 Update yang Masih Perlu Dikerjakan** di bawah.

---

## 1. Identitas Proyek

**DUIT** adalah dashboard keuangan personal harian dengan AI assistant.

| Item | Nilai |
|---|---|
| Production | `https://duit-app-ten.vercel.app` |
| GitHub | `https://github.com/klausjr6-ops/duit-react` |
| Repo lokal user | `/Users/christianbahyuardianto/Downloads/modern-animated-html-clone` |
| Workspace AI | `/home/user/duit-react` |
| Branch target | `main` |
| Deployment | Vercel auto-deploy dari push ke `main` |
| Firebase project | `finance-daily-reporting` |
| Region | `asia-southeast2` |

### Stack

- Vite 7.3.2 + React 19 + TypeScript
- TailwindCSS v4 + Framer Motion
- Firebase Auth (Email/Password + Google)
- Firestore realtime (`users/{uid}/data/main`)
- Vercel serverless function
- Gemini 2.5 Flash primary + Groq Llama 3.3 70B fallback

---

## 2. Preferensi User yang Penting

1. User suka diberi **file lengkap untuk replace**, bukan patch kecil.
2. User lebih nyaman menerima **ZIP** dengan struktur folder yang sama dengan repo lalu overwrite menggunakan `rsync`.
3. Bahasa aplikasi: Indonesia.
4. Design: teal → blue gradient, dark/light mode warm soft.
5. **Jangan pernah mengubah persona, system prompt, gaya bahasa, topik, provider, atau fallback AI DUIT tanpa permintaan eksplisit user.**
6. User menginginkan pilihan tema sederhana di menu Akun:
   - 🌤️ **Pagi** = manual light
   - 🌓 **Auto** = light pukul 06.00–18.00, dark pukul 18.00–06.00
   - 🌙 **Malam** = manual dark

---

## 3. Paket Terbaru yang Harus Dipakai

### ZIP final terbaru

```text
/home/user/duit-fix-complete-v4.zip
```

Nama folder di dalam ZIP:

```text
duit-fix-complete-v4/
```

**Pakai ZIP v4 saja.** Paket ini sudah mencakup semua ZIP/P0/Batch lama, Goal Transfer, UI polish, simplifikasi tema, dan perbaikan Safari browser chrome.

### Cara apply di Mac Terminal

Jalankan dari root repo lokal user:

```bash
cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone

rm -rf /tmp/duit-fix-complete-v4-extract
unzip -o ~/Downloads/duit-fix-complete-v4.zip -d /tmp/duit-fix-complete-v4-extract
rsync -av /tmp/duit-fix-complete-v4-extract/duit-fix-complete-v4/ ./

npm install
npm run typecheck
npm run build
git diff --check
```

Lalu commit dan push:

```bash
git add src api index.html package.json
git commit -m "feat: improve DUIT data sync, goals and UI"
git push origin main
```

> File notes/README dari ZIP bersifat opsional untuk ikut di-commit.

### Jika `git diff --check` hanya memunculkan `Markdown.md:402: trailing whitespace`

Itu tidak menghambat build. Bila ingin bersih:

```bash
perl -pi -e 's/[ \t]+$//' Markdown.md
git diff --check
```

---

## 4. Status Validasi Terakhir

Pada workspace AI, versi terakhir telah lolos:

```bash
npm run typecheck
npm run build
git diff --check
```

Build terakhir menghasilkan Vite single-file HTML sekitar **1.07 MB** / **~311 KB gzip**.

Catatan:
- Warning Node `DEP0205 module.register()` pernah muncul di komputer user; itu warning dependency dan tidak memblokir build.
- `node_modules` tidak persisten di workspace AI, sehingga AI kadang perlu menjalankan `npm ci` sebelum test ulang. Bukan bug proyek user.

---

## 5. Perubahan yang Sudah Diimplementasikan

### A. Data, tanggal, dan Firestore

#### 1. Tanggal Asia/Jakarta
Sebelumnya beberapa fitur memakai `toISOString().slice(0, 10)` (UTC), sehingga pada 00.00–06.59 WIB dapat terbaca sebagai hari sebelumnya.

Sudah diperbaiki:

- `dateKeyInJakarta()`
- `todayStr()` memakai Asia/Jakarta
- helper `addDaysToDateKey()` aman dari timezone shift
- transaksi, mood, laporan hari ini/bulan ini, grafik 7 hari, dan jadwal memakai date key WIB

#### 2. Loading gate Firestore
Sebelumnya app bisa merender data default sebelum snapshot Firestore user selesai. Risiko: perubahan awal menimpa data cloud lama.

Sekarang:

- `StoreProvider` punya `loadedUserId`, `loading`, `syncing`, dan `syncError`
- `App.tsx` menunggu snapshot user yang benar sebelum merender dashboard interaktif
- UI menampilkan `Menyimpan perubahan…` atau error sinkronisasi bila diperlukan

#### 3. Write Firestore lebih aman

- Mutasi diserialkan melalui queue.
- Write memakai `runTransaction` dan updater dimainkan kembali terhadap dokumen terbaru.
- Inisialisasi dokumen baru / migrasi localStorage dibuat atomik.
- Ini memperbaiki konflik dasar antar tab/device.

> Arsitektur masih memakai satu dokumen user. Transaction mengurangi risiko race, tetapi batas Firestore 1 MiB tetap merupakan risiko jangka panjang.

#### 4. Total saldo

- Saldo awal wallet sekarang masuk ke **Total Saldo**.
- Label kartu Keuangan diperbaiki menjadi `TOTAL SALDO`, bukan `SALDO BULAN INI`.

---

### B. Jadwal dan Calendar feed

#### 1. Jadwal recurring

- Jadwal berulang sekarang tampil pada Timeline dan card Hari Ini pada minggu berikutnya.
- `untilDate` diperhitungkan.
- Legacy schedule dengan field `day` masih didukung.
- AI context memasukkan jadwal terdekat.

#### 2. Calendar feed
File `api/calendar.ics.js` sudah:

- diubah menjadi **ES Module**;
- membaca Firestore path baru `users/{uid}/data/main`;
- mendukung recurring schedule sebagai `RRULE` weekly;
- menggunakan link privat dengan `uid` + `calendarToken`;
- tombol **Salin Link** tersedia di Account modal;
- tidak lagi membocorkan jadwal hanya dengan mengetahui uid;
- jika server service account belum ada, merespons HTTP 503 yang jelas, bukan 500 generic.

### Environment Vercel yang wajib untuk Calendar

Tambahkan pada **Preview** dan **Production**:

```text
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 JSON Firebase service account>
```

Setelah menambah env var, redeploy.

Link Calendar adalah capability URL: siapa pun yang memiliki link dapat membaca jadwal. UI sudah menampilkan peringatan untuk tidak membagikannya.

---

### C. Theme: Pagi / Auto / Malam

#### Theme aplikasi

File utama: `src/lib/ThemeContext.tsx`, `src/components/AccountModal.tsx`

- 🌤️ **Pagi** → mode light manual
- 🌓 **Auto** → light 06.00–17.59, dark 18.00–05.59
- 🌙 **Malam** → mode dark manual
- Preference disimpan di localStorage (load cepat) dan Firestore (sync antar-device).
- Nilai legacy `system` tetap didukung untuk user lama, tetapi pada UI ditampilkan sebagai Auto.
- Weekly chart sudah memiliki warna grid/axis/legend untuk mode light.

#### Safari toolbar/tab browser
User menemukan Safari toolbar/tab terlihat dark khusus pada DUIT walau aplikasi light.

Penyebab yang ditemukan:

1. ThemeContext dulu memakai `root.style.colorScheme = resolved`, sehingga Safari dapat membaca theme per halaman.
2. `src/index.css` dulu memaksa `body` background menjadi `#0B1120` sepanjang waktu, jadi Safari dapat menganggap halaman DUIT sebagai halaman dark pada tahap awal.

Perbaikan terbaru v4:

- `ThemeContext` memakai `root.style.removeProperty("color-scheme")` sehingga aplikasi tidak memaksa Safari chrome.
- `index.html` sekarang memiliki dua meta `theme-color` berbasis media query system:

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f5f7" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0B1120" />
```

- `src/index.css` memakai `Canvas` / `CanvasText` sebagai background awal berbasis system, bukan hard-coded dark.

**Expected behavior:**

- Pagi/Auto/Malam hanya mengubah konten DUIT.
- Toolbar/tab/address bar Safari mengikuti **Appearance system macOS/device**.

Setelah Vercel deploy, lakukan hard refresh Safari:

```text
Command + Shift + R
```

Jika masih tampak lama, tutup tab lalu buka URL DUIT lagi.

---

### D. Goal Transfer dari Dompet

User memilih opsi **transfer nyata dari wallet**.

#### Perilaku `+ Nabung` sekarang

1. User klik `+ Nabung` pada Goal.
2. Modal meminta pilihan **dompet sumber** dan nominal.
3. Sistem memeriksa saldo wallet dan sisa target.
4. Dalam satu Firestore transaction:
   - `goal.current` bertambah;
   - transaksi dibuat dengan `desc: Tabungan Goal: <nama goal>`;
   - transaksi diberi `goalId`;
   - saldo wallet berkurang karena transaksi outgoing.

#### Pelaporan transfer Goal

- Total saldo dan wallet balance **berkurang**.
- Tabungan Terkumpul / progress Goal **bertambah**.
- Transfer Goal **tidak dianggap pengeluaran konsumtif**:
  - tidak masuk Pengeluaran Bulan Ini;
  - tidak masuk grafik expense;
  - tidak masuk kategori spending;
  - tidak menurunkan health score sebagai belanja.
- TransactionList menampilkan transfer Goal dengan icon **🎯**, warna biru, dan label `Transfer ke Goal`.

#### Hapus Goal

Bila Goal dihapus, transaksi transfer yang memiliki `goalId` tersebut ikut dihapus. Ini otomatis mengembalikan derived balance dompet sumber. Dialog konfirmasi menjelaskan perilaku ini.

#### Catatan data lama

Nilai `goal.current` dari data lama dianggap tabungan awal/progress legacy dan tidak memaksa pengurangan wallet mundur ke masa lalu.

---

### E. Avatar safety

Avatar tetap disimpan di Firestore setting user untuk saat ini, tetapi sekarang lebih aman:

- hanya menerima JPG, PNG, WebP;
- file sumber maksimum 5 MB;
- resize otomatis bertahap (maksimal awal 512 px);
- kompresi JPEG progresif dengan target sekitar maksimum 160 KB;
- loading state saat foto diproses;
- error inline bila file invalid/terlalu besar;
- input file direset agar foto yang sama dapat dipilih ulang setelah error.

Tujuan: mengurangi risiko dokumen Firestore melebihi batas 1 MiB.

> Long-term ideal: pindahkan avatar ke Firebase Storage dan simpan URL saja di Firestore.

---

### F. UI polish, modal, accessibility

#### `useModalDialog`
File baru: `src/hooks/useModalDialog.ts`

Dipakai pada Chat, Account, Goal, Add Fund, Schedule, Wallet, dan ConfirmDialog.

Fitur:

- ESC menutup modal;
- Tab focus trap;
- fokus kembali ke elemen pemicu saat modal tertutup;
- body scroll lock;
- role dialog / aria modal / labelled dialog.

#### ConfirmDialog
File baru: `src/components/ConfirmDialog.tsx`

Menggantikan browser native `window.confirm()` untuk:

- hapus transaksi;
- hapus jadwal;
- hapus wallet;
- hapus Goal;
- reset seluruh data.

Dialog konsisten dark/light dan memakai z-index di atas modal lain.

#### Validasi inline
`window.alert()` sudah dihapus dari source aplikasi.

Validasi sekarang muncul inline pada:

- Tambah Goal;
- Tambah Jadwal;
- Kelola Dompet;
- Tambah Transaksi;
- Nabung ke Goal.

Tambahan validasi:

- tabungan awal Goal tidak boleh melebihi target;
- jam selesai jadwal harus setelah jam mulai;
- untilDate recurring tidak boleh sebelum tanggal mulai;
- nama wallet tidak boleh duplikat;
- transaksi pengeluaran tidak boleh melebihi balance wallet terpilih.

#### Reduced motion
`src/index.css` memiliki `prefers-reduced-motion: reduce` untuk mengurangi animation/transition bagi user yang mengaktifkan setting accessibility tersebut.

---

### G. Chat — teknis, tanpa mengubah sifat AI

**PENTING:** `SYSTEM_PROMPT` dan sifat AI tidak diubah.

Yang tetap sama:

- Persona teman ngobrol santai/supportive.
- Bahasa Indonesia casual.
- Bisa membahas finance, curhat, politik, tech, hiburan, dan lain-lain.
- Gemini primary, Groq fallback.
- Conditional finance context.
- Temperatur/model/fallback message tetap.

Yang diperbaiki hanya teknis:

- input maksimum 4.000 karakter;
- API menerima maksimum 16 message terbaru;
- server memvalidasi payload;
- format image block backend masih didukung dengan limit payload;
- request dibatalkan saat Chat modal ditutup agar respons lama tidak muncul;
- rate limit dasar 12 request/menit/IP pada warm instance;
- frontend mengirim Firebase ID token;
- setelah `FIREBASE_SERVICE_ACCOUNT_BASE64` ada, API chat otomatis memverifikasi Firebase session user.

> Rate limiting masih in-memory. Untuk perlindungan kuota global lintas serverless instance, pertimbangkan Vercel WAF/Firewall atau Redis/KV di fase selanjutnya.

---

### H. Build quality

`package.json` sekarang memiliki:

```json
"typecheck": "tsc --noEmit",
"build": "npm run typecheck && vite build"
```

Jadi build tidak bisa lolos bila TypeScript error.

---

## 6. Daftar File Utama yang Diubah di ZIP v4

```text
package.json
index.html
src/App.tsx
src/index.css
src/lib/store.tsx
src/lib/ThemeContext.tsx
src/hooks/useModalDialog.ts
src/components/AccountModal.tsx
src/components/AddFundModal.tsx
src/components/ChatWidget.tsx
src/components/ConfirmDialog.tsx
src/components/GoalModal.tsx
src/components/KeuanganView.tsx
src/components/ScheduleModal.tsx
src/components/TransactionList.tsx
src/components/WalletManager.tsx
src/components/WeeklyChart.tsx
src/views/GoalsView.tsx
src/views/JadwalView.tsx
api/calendar.ics.js
api/chat.js
```

Dokumen pendukung di ZIP:

```text
P0_FIX_NOTES.md
BATCH_2_FIX_NOTES.md
GOAL_TRANSFER_NOTES.md
UI_POLISH_NOTES.md
README_TIMPA.txt
```

---

## 7. Checklist Tes Setelah Deploy v4

### Theme dan Safari

- [ ] Buka DUIT dengan system macOS Light: Safari toolbar/tab harus mengikuti Light.
- [ ] Buka DUIT dengan system macOS Dark: Safari toolbar/tab harus mengikuti Dark.
- [ ] Ubah Pagi/Auto/Malam: isi aplikasi berubah, tetapi Safari chrome tetap mengikuti system macOS.
- [ ] Hard refresh Safari dengan `Command + Shift + R` setelah deploy.

### Firestore dan data

- [ ] Buka di dua tab/device, tambah transaksi bergantian; keduanya muncul.
- [ ] Buat transaksi antara pukul 00.00–06.59 WIB; tanggal harus benar.
- [ ] Tambah dompet dengan saldo awal; Total Saldo ikut bertambah.

### Goal transfer

- [ ] Buat Goal dan pastikan wallet punya saldo.
- [ ] Tambah tabungan dari wallet.
- [ ] Wallet turun, Goal naik, transaksi 🎯 muncul.
- [ ] Pengeluaran Bulanan tidak ikut naik karena transfer Goal.
- [ ] Hapus Goal; saldo dompet kembali.

### Jadwal

- [ ] Buat jadwal recurring mingguan.
- [ ] Pastikan tampil di halaman Jadwal dan Timeline pada minggu berikutnya.
- [ ] Jika Calendar env aktif, salin private link dan subscribe di Calendar.

### Account/UI

- [ ] Upload avatar besar; harus dikompres atau muncul error inline.
- [ ] Hapus transaksi/jadwal/wallet/goal; harus memakai modal DUIT, bukan popup browser.
- [ ] Coba Tab/Shift+Tab dan ESC pada modal.

### Chat

- [ ] Persona tetap sama seperti sebelumnya.
- [ ] Tutup Chat ketika request berjalan; respons lama tidak muncul sesudah modal ditutup.
- [ ] Jika service account sudah dikonfigurasi, chat user login tetap berfungsi.

---

## 8. Backlog / Rekomendasi Selanjutnya

Urutan yang disarankan:

1. **Deploy dan test v4 di Safari** terlebih dahulu, khususnya browser toolbar/tab.
2. Pastikan `FIREBASE_SERVICE_ACCOUNT_BASE64` terpasang di Vercel Preview + Production; test Calendar dan Chat.
3. **Firebase Storage untuk avatar** agar tidak ada limit Firestore yang relevan untuk image.
4. **Refactor data Firestore** dari satu dokumen ke subcollection bila histori transaksi membesar mendekati limit 1 MiB.
5. Rate limit global dengan Vercel WAF/Redis/KV bila pemakaian chat meningkat.
6. Chat history persistence ke Firestore (roadmap lama).
7. Export/import JSON/CSV.
8. PWA support.
9. Code splitting / hapus `vite-plugin-singlefile` bila ingin loading awal mobile lebih ringan. Saat ini single-file dipertahankan.
10. Tambah fitur **withdraw dari Goal kembali ke wallet** bila dibutuhkan. Saat ini cara pembalikan transfer tersedia melalui hapus Goal, bukan withdraw parsial.

---

## 8.1 Update yang Masih Perlu Dikerjakan (Detail Prioritas)

Bagian ini adalah daftar kerja lanjutan yang lebih detail. Tidak semuanya harus dikerjakan sekaligus.

### P0 — Wajib diverifikasi setelah deploy v4

| Update / pengecekan | Alasan | Status / tindakan |
|---|---|---|
| Deploy ZIP v4 lalu test Safari | Perbaikan `theme-color`, background awal body, dan `color-scheme` belum terbukti sampai diuji di Safari production user. | Push ke `main`, tunggu Vercel, lalu hard refresh `Command + Shift + R`. |
| Tambahkan `FIREBASE_SERVICE_ACCOUNT_BASE64` di Vercel Preview + Production | Calendar feed tidak aktif tanpa env ini. Setelah env tersedia, Chat API juga akan memverifikasi Firebase ID token user. | Tambahkan env, redeploy, test Calendar dan Chat. Jangan gunakan prefix `VITE_`. |
| Test Goal Transfer end-to-end | Fitur baru mengubah saldo wallet, transaksi, dan progress Goal. | Test tambah tabungan, saldo kurang, Goal mencapai target, lalu hapus Goal. |
| Test dua tab/device | Store sudah memakai transaction/queue, tetapi perlu pembuktian pada perangkat nyata. | Tambah transaksi/jadwal bergantian dari dua tab/device dan cek tidak ada data hilang. |

### P1 — Perbaikan fitur/data yang direkomendasikan berikutnya

| Prioritas | Update | Detail keputusan / implementasi |
|---|---|---|
| 1 | **Withdraw dari Goal ke Wallet** | Saat ini transfer Goal bisa dibalik dengan menghapus seluruh Goal. Tambahkan tombol `Tarik Dana` agar user dapat menarik nominal tertentu kembali ke wallet tanpa menghapus Goal. Buat transaksi transfer balik dan kurangi `goal.current`. |
| 2 | **Edit transaksi, Goal, wallet, dan jadwal** | Saat ini mayoritas data hanya bisa tambah/hapus. Tambahkan modal edit untuk koreksi nominal, tanggal, deskripsi, target, atau saldo awal. Untuk transaksi Goal, edit harus tetap menjaga goal/wallet konsisten. |
| 3 | **Forgot Password dan email verification** | Tombol `Lupa?` pada LoginScreen belum punya alur aktif. Tambahkan `sendPasswordResetEmail`. Setelah register, pertimbangkan `sendEmailVerification`, indikator status verifikasi, dan resend email. |
| 4 | **Avatar ke Firebase Storage** | Kompresi avatar sudah mengurangi risiko, tetapi base64 tetap memakai ruang dokumen Firestore. Upload ke Firebase Storage, simpan URL di `settings.avatar`, lalu buat Storage Rules per-user. |
| 5 | **Pecah dokumen Firestore per collection** | Saat ini semua transaksi/jadwal/goal/wallet berada di satu dokumen `users/{uid}/data/main`. Firestore memiliki limit 1 MiB per dokumen. Untuk histori panjang, migrasikan secara bertahap misalnya ke `users/{uid}/transactions/{txId}`, `goals/{goalId}`, dan seterusnya. |
| 6 | **Export dan import backup** | Tambahkan export JSON/CSV dan import JSON tervalidasi. Ini penting sebelum perubahan struktur Firestore besar dan memberi user kontrol atas data. |
| 7 | **Regenerate/revoke Calendar Link** | Calendar token sekarang dibuat otomatis dan bersifat rahasia. Tambahkan tombol `Buat Ulang Link` agar user dapat mencabut link yang terlanjur dibagikan. |

### P1 — Chat/API security dan privacy

| Update | Alasan / arah implementasi |
|---|---|
| Global rate limit | Rate limit sekarang in-memory dan hanya berlaku per warm serverless instance. Tambahkan Vercel WAF/Firewall, Upstash Redis, atau Vercel KV untuk quota global per uid/IP. |
| Chat quota per user | Tambahkan batas request harian/bulanan bila biaya Gemini/Groq menjadi perhatian. Simpan counter server-side, bukan client-side. |
| Refinement finance-context detector | Keyword saat ini mencakup kata umum seperti `beli`, `total`, dan `berapa`; percakapan non-finansial dapat ikut mengirim konteks finansial. Perbaiki deteksi dengan kombinasi intent/regex atau tambahkan toggle privacy `Kirim konteks keuangan ke AI`. |
| Chat history persistence | Fitur roadmap lama: simpan percakapan per user di Firestore, dengan tombol hapus chat dan batas retensi. Pastikan tidak menambah ukuran dokumen `data/main`; pakai collection terpisah. |
| Observability provider | Tambahkan log aman/terstruktur untuk provider Gemini/Groq, latency, fallback count, dan error rate. Jangan pernah log API key atau isi finansial user secara penuh. |

### P2 — UX dan performa

| Update | Alasan / detail |
|---|---|
| Code splitting | Project masih memakai `vite-plugin-singlefile`; initial bundle sekitar 311 KB gzip. Jika prioritas loading mobile, hapus plugin dan lazy-load Keuangan, Goals, Jadwal, serta Chat. Output akan menjadi beberapa asset biasa di Vercel. |
| PWA | Tambahkan manifest, service worker, icon, offline fallback, dan install prompt. Perlu dipikirkan data offline/Firestore cache. |
| Toast system | Validasi utama sudah inline dan aksi destruktif memakai ConfirmDialog. Tambahkan toast global untuk sukses: transaksi tersimpan, goal transfer berhasil, avatar diperbarui, link calendar disalin, dan sync selesai. |
| Skeleton loading | App saat ini memiliki loading screen. Tambahkan skeleton per card jika ingin transisi data yang lebih halus pada koneksi lambat. |
| Empty states dan onboarding | Tambahkan panduan singkat untuk akun baru: buat wallet, tambah pemasukan awal, buat Goal, dan tambah jadwal. |
| Responsive audit nyata | Test iPhone Safari, Android Chrome, tablet, desktop kecil, serta font scaling/accessibility. Chat safe-area sudah ditambahkan tetapi perlu device test nyata. |

### P2 — Testing dan quality assurance

| Update | Detail |
|---|---|
| Unit test store | Tambahkan Vitest untuk date key Jakarta, schedule recurrence, wallet balance, Goal funding, dan reversal saat Goal dihapus. |
| Component test | Test modal focus trap, validation inline, ThemeContext, dan Account theme picker. |
| E2E test | Gunakan Playwright untuk register/login, tambah transaksi, Goal transfer, recurring schedule, theme refresh, dan Chat modal. |
| CI | GitHub Actions menjalankan `npm ci`, `npm run typecheck`, `npm run build`, dan test sebelum merge ke `main`. |

### Keputusan produk yang perlu ditanya ke user bila dikerjakan

1. Apakah **withdraw parsial Goal** diperlukan? Jika ya, apakah dana harus kembali ke wallet asal atau user boleh memilih wallet tujuan?
2. Apakah saldo Goal dianggap rekening/tabungan nyata atau hanya alokasi virtual? Implementasi saat ini memperlakukannya sebagai alokasi yang mengurangi wallet dan tidak dihitung sebagai spending.
3. Apakah chat history perlu dipersist permanen, atau hanya sejumlah hari tertentu?
4. Apakah user menginginkan PWA/offline mode, atau lebih memilih app tetap web-only ringan?
5. Apakah code splitting boleh dilakukan? Ini membuat output Vercel bukan lagi satu file HTML, tetapi loading awal lebih ringan.

## 9. Catatan Keamanan

- Jangan menyimpan API key di source atau ZIP.
- `GEMINI_API_KEY` dan `GROQ_API_KEY` hanya di Vercel server env, tanpa prefix `VITE_`.
- `FIREBASE_SERVICE_ACCOUNT_BASE64` juga hanya server-side, tanpa prefix `VITE_`.
- Link Calendar adalah link rahasia/capability URL dan jangan dibagikan.

---

## 10. Instruksi untuk AI Berikutnya

1. Baca seluruh dokumen ini sebelum mengubah source.
2. Jangan mengubah persona AI DUIT tanpa persetujuan eksplisit user.
3. User menyukai ZIP lengkap, bukan patch parsial.
4. Gunakan `npm run typecheck`, `npm run build`, dan `git diff --check` sebelum memberi ZIP.
5. Jika perlu menjalankan tools di workspace AI dan `tsc` tidak ditemukan, jalankan `npm ci` dulu karena `node_modules` tidak persisten di workspace.
6. Paket source final yang relevan saat dokumen ini dibuat adalah `duit-fix-complete-v4.zip`.
