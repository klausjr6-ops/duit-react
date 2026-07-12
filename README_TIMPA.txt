DUIT — Empty State Upgrade + Today Quick Actions + Chat Markdown Rendering
Tanggal: 12 Juli 2026

Isi update terbaru:

1) Empty State Upgrade
- Tambah komponen reusable `src/components/EmptyState.tsx`.
- Empty state dibuat lebih informatif dan actionable, bukan hanya teks kosong.
- Keuangan / Transaksi:
  - Jika belum ada transaksi, tampilkan empty state dengan ikon, penjelasan, contoh kategori, dan tombol "Catat Transaksi".
  - Jika filter dompet aktif dan kosong, pesan menyesuaikan: "Belum ada transaksi di dompet ini".
  - Tombol "Catat Transaksi" scroll ke form Tambah Transaksi.
- Goals:
  - Empty state baru dengan saran target: Dana darurat, Liburan, Laptop, Rumah.
  - Ada tombol "Buat Goal Pertama".
- Jadwal:
  - Empty state baru dengan saran jadwal: Bayar listrik, Olahraga, Meeting, Mingguan.
  - Ada tombol "Tambah Jadwal".

2) Today Card Quick Actions
- Row di card "HARI INI" clickable dan punya tanda `›`:
  - "Masuk Hari Ini" membuka halaman Keuangan dan otomatis memilih tipe Pemasukan.
  - "Keluar Hari Ini" membuka halaman Keuangan dan otomatis memilih tipe Pengeluaran.
  - "Jadwal Aktif" membuka halaman Jadwal.
- Form Tambah Transaksi otomatis discroll saat mode cepat dari Beranda.

3) Chat Markdown Rendering Fix
- Bubble jawaban AI merender markdown ringan.
- `**tebal**` tampil tebal tanpa simbol `**`.
- `*italic*` tampil italic tanpa simbol `*`.
- Inline code tampil sebagai code style.
- Markdown image `![alt](url)` atau data URL image yang aman dirender sebagai gambar.
- Tidak mengubah persona, system prompt, provider, model, temperature, atau fallback AI DUIT.

4) UI polish Account Modal
- "Kalender" dan "Backup Data" di halaman utama Account modal tampil sebagai menu card dengan tanda `›`.
- Detail Kalender dan Backup Data berada di sub-halaman sendiri.

5) Regenerate / Revoke Calendar Link
- Di sub-halaman Kalender ada tombol "Salin Link" dan "Buat Ulang Link".
- "Buat Ulang Link" memakai ConfirmDialog dan mengganti `settings.calendarToken`.

6) Export / Import Backup
- Di sub-halaman Backup Data ada Export JSON, Export CSV, dan Import JSON.
- Import JSON memakai validasi, sanitasi, batas file 5 MB, dan ConfirmDialog.

7) Forgot Password
- Tombol "Lupa?" di halaman login aktif via Firebase Auth `sendPasswordResetEmail`.

8) Optimasi bundle/chunk
- Dashboard authenticated dilazy-load dari `src/AuthenticatedApp.tsx`.
- Firestore hanya masuk flow authenticated.
- Firebase App/Auth dan Firestore dipisah.
- `ThemeContext` independen dari Store/Firestore.
- `vite.config.ts` memakai manual chunk split.

File utama yang berubah/ditambah:
- src/App.tsx
- src/AuthenticatedApp.tsx
- src/main.tsx
- src/lib/AuthContext.tsx
- src/lib/ThemeContext.tsx
- src/lib/firebase.ts
- src/lib/firebaseDb.ts
- src/lib/store.tsx
- src/components/EmptyState.tsx
- src/components/LoginScreen.tsx
- src/components/AccountModal.tsx
- src/components/ChatWidget.tsx
- src/components/TodayCard.tsx
- src/components/KeuanganView.tsx
- src/components/TransactionList.tsx
- src/views/GoalsView.tsx
- src/views/JadwalView.tsx
- vite.config.ts
- README_TIMPA.txt

Validasi workspace:
- npm run typecheck: Lolos
- npm run build: Lolos
- git diff --check: Lolos
- Warning "Some chunks are larger than 500 kB" tidak muncul.

Cara apply dari root repo lokal:

cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone
rm -rf /tmp/duit-empty-state-upgrade-v1-extract
unzip -o ~/Downloads/duit-empty-state-upgrade-v1.zip -d /tmp/duit-empty-state-upgrade-v1-extract
rsync -av /tmp/duit-empty-state-upgrade-v1-extract/duit-empty-state-upgrade-v1/ ./

npm install
npm run typecheck
npm run build
git diff --check

git add src vite.config.ts README_TIMPA.txt
git commit -m "feat: improve empty states and quick actions"
git push origin main

Checklist test setelah deploy:
- Akun baru / data kosong: halaman Keuangan menampilkan empty state transaksi yang rapi.
- Keuangan > filter dompet yang tidak punya transaksi: pesan empty state menyesuaikan.
- Empty transaksi > Catat Transaksi: scroll ke form Tambah Transaksi.
- Goals kosong: tampil saran target dan tombol Buat Goal Pertama.
- Jadwal kosong: tampil saran jadwal dan tombol Tambah Jadwal.
- Beranda > HARI INI > Masuk/Keluar/Jadwal tetap berfungsi.
- Chat markdown: `**judul**` tampil bold tanpa simbol `**`.
- Test Account modal, Backup, Calendar revoke, Forgot Password, login, theme, dan Safari toolbar/tab.
