DUIT — Today Card Quick Actions + Chat Markdown Rendering + Account Polish
Tanggal: 11 Juli 2026

Isi update terbaru:

1) Today Card Quick Actions
- Row di card "HARI INI" sekarang clickable dan punya tanda `›`:
  - "Masuk Hari Ini" membuka halaman Keuangan dan otomatis memilih tipe Pemasukan.
  - "Keluar Hari Ini" membuka halaman Keuangan dan otomatis memilih tipe Pengeluaran.
  - "Jadwal Aktif" membuka halaman Jadwal.
- Saat masuk ke Keuangan dari Beranda, form "Tambah Transaksi" otomatis discroll ke posisi form.
- Ada hint kecil "Mode cepat dari Beranda" pada form transaksi.
- Setelah transaksi cepat berhasil disimpan, mode cepat otomatis dibersihkan.
- Navigasi biasa ke Keuangan dari bottom nav/sidebar tidak memaksa mode cepat.

2) Chat Markdown Rendering Fix
- Bubble jawaban AI merender markdown ringan.
- `**tebal**` tampil tebal tanpa simbol `**`.
- `*italic*` tampil italic tanpa simbol `*`.
- Inline code tampil sebagai code style.
- Markdown image `![alt](url)` atau data URL image yang aman dirender sebagai gambar.
- Tidak mengubah persona, system prompt, provider, model, temperature, atau fallback AI DUIT.

3) UI polish Account Modal
- "Kalender" dan "Backup Data" di halaman utama Account modal tampil sebagai menu card dengan tanda `›`, sama seperti "Ganti Email" dan "Ganti Password".
- Detail Kalender dan Backup Data berada di sub-halaman sendiri.

4) Regenerate / Revoke Calendar Link
- Di sub-halaman Kalender ada tombol "Salin Link" dan "Buat Ulang Link".
- "Buat Ulang Link" memakai ConfirmDialog dan mengganti `settings.calendarToken`.

5) Export / Import Backup
- Di sub-halaman Backup Data ada Export JSON, Export CSV, dan Import JSON.
- Import JSON memakai validasi, sanitasi, batas file 5 MB, dan ConfirmDialog.

6) Forgot Password
- Tombol "Lupa?" di halaman login aktif via Firebase Auth `sendPasswordResetEmail`.

7) Optimasi bundle/chunk
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
- src/components/LoginScreen.tsx
- src/components/AccountModal.tsx
- src/components/ChatWidget.tsx
- src/components/TodayCard.tsx
- src/components/KeuanganView.tsx
- vite.config.ts
- README_TIMPA.txt

Validasi workspace:
- npm run typecheck: Lolos
- npm run build: Lolos
- git diff --check: Lolos
- Warning "Some chunks are larger than 500 kB" tidak muncul.

Cara apply dari root repo lokal:

cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone
rm -rf /tmp/duit-today-card-quick-actions-v1-extract
unzip -o ~/Downloads/duit-today-card-quick-actions-v1.zip -d /tmp/duit-today-card-quick-actions-v1-extract
rsync -av /tmp/duit-today-card-quick-actions-v1-extract/duit-today-card-quick-actions-v1/ ./

npm install
npm run typecheck
npm run build
git diff --check

git add src vite.config.ts README_TIMPA.txt
git commit -m "feat: add today card quick actions"
git push origin main

Checklist test setelah deploy:
- Beranda > HARI INI > tap "Masuk Hari Ini": masuk Keuangan, form transaksi discroll, tipe Pemasukan terpilih.
- Beranda > HARI INI > tap "Keluar Hari Ini": masuk Keuangan, form transaksi discroll, tipe Pengeluaran terpilih.
- Beranda > HARI INI > tap "Jadwal Aktif": masuk Jadwal.
- Simpan transaksi dari mode cepat, lalu pastikan mode cepat hilang.
- Tap Keuangan dari bottom nav/sidebar secara normal, pastikan tidak memaksa mode cepat.
- Test Chat markdown: `**judul**` harus tampil bold tanpa simbol `**`.
- Test Account modal, Backup, Calendar revoke, Forgot Password, login, theme, dan Safari toolbar/tab.
