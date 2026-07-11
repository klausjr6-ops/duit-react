DUIT — Account Modal Menu Polish + Calendar Link Revoke + Backup Tools
Tanggal: 11 Juli 2026

Isi update terbaru:

1) UI polish Account Modal
- Section "Kalender" dan "Backup Data" di halaman utama Account modal sekarang tampil sebagai menu card dengan tanda `›`, sama seperti "Ganti Email" dan "Ganti Password".
- Detail Kalender dipindah ke sub-halaman sendiri.
- Detail Backup Data dipindah ke sub-halaman sendiri.
- Header sub-halaman menampilkan tombol kembali `←`.
- Tujuan: modal akun terlihat lebih rapi, tidak terlalu penuh, dan konsisten.

2) Regenerate / Revoke Calendar Link
- Di sub-halaman Kalender ada tombol "Salin Link" dan "Buat Ulang Link".
- "Buat Ulang Link" memakai ConfirmDialog.
- Setelah konfirmasi, `settings.calendarToken` diganti token baru.
- Link kalender lama otomatis tidak valid.

3) Export / Import Backup
- Di sub-halaman Backup Data ada:
  - Export JSON full backup.
  - Export CSV transaksi.
  - Import JSON backup DUIT.
- Import JSON memakai validasi, sanitasi, batas file 5 MB, dan ConfirmDialog.
- Export memakai data raw, bukan wallet balance turunan, supaya saldo awal wallet tidak dobel saat restore.

4) Forgot Password
- Tombol "Lupa?" di halaman login aktif via Firebase Auth `sendPasswordResetEmail`.
- Ada loading dan pesan sukses/error inline.

5) Optimasi bundle/chunk
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
- vite.config.ts
- README_TIMPA.txt

Validasi workspace:
- npm run typecheck: Lolos
- npm run build: Lolos
- git diff --check: Lolos
- Warning "Some chunks are larger than 500 kB" tidak muncul.

Cara apply dari root repo lokal:

cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone
rm -rf /tmp/duit-account-modal-menu-polish-v1-extract
unzip -o ~/Downloads/duit-account-modal-menu-polish-v1.zip -d /tmp/duit-account-modal-menu-polish-v1-extract
rsync -av /tmp/duit-account-modal-menu-polish-v1-extract/duit-account-modal-menu-polish-v1/ ./

npm install
npm run typecheck
npm run build
git diff --check

git add src vite.config.ts README_TIMPA.txt
git commit -m "style: tidy account modal menus"
git push origin main

Checklist test setelah deploy:
- Account modal halaman utama: "Kalender" dan "Backup Data" muncul sebagai card dengan tanda `›`.
- Klik Kalender: masuk sub-halaman Kalender, tombol kembali berfungsi.
- Kalender > Salin Link: link `.ics` tercopy.
- Kalender > Buat Ulang Link: muncul ConfirmDialog dan link lama dicabut setelah confirm.
- Klik Backup Data: masuk sub-halaman Backup Data, tombol kembali berfungsi.
- Backup Data > Export JSON: file `.json` terdownload.
- Backup Data > Export CSV: file `.csv` terdownload.
- Backup Data > Import JSON: pilih file backup JSON dan muncul ConfirmDialog.
- Test login, forgot password, theme Pagi/Auto/Malam, dan Safari toolbar/tab.
