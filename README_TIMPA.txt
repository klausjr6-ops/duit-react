DUIT — Calendar Link Revoke + Export/Import Backup + Forgot Password + Performance Optimization
Tanggal: 11 Juli 2026

Isi update terbaru:

1) Regenerate / Revoke Calendar Link
- Tambah tombol "Buat Ulang Link" di section Kalender pada Account modal.
- Saat diklik, muncul ConfirmDialog karena link lama akan dicabut.
- Setelah konfirmasi:
  - `settings.calendarToken` diganti token baru.
  - Link kalender lama otomatis tidak valid.
  - User perlu klik "Salin Link" lagi untuk subscribe ulang dengan link baru.
- Cocok dipakai kalau private Calendar link pernah tersebar.

2) Export / Import Backup
- Section "Backup Data" di Account modal.
- Export JSON full backup:
  - transaksi
  - jadwal
  - goals
  - mood
  - settings termasuk theme/avatar/calendar token bila ada
  - wallet raw/base balance
- Export CSV transaksi untuk spreadsheet.
- Import JSON backup DUIT dengan validasi dan sanitasi data.
- Import JSON memakai ConfirmDialog karena akan mengganti data akun saat ini.
- File JSON dibatasi maksimum 5 MB.
- Import menolak format non-JSON.
- Setelah import, data disimpan lewat flow Firestore transaction/queue yang sudah ada.
- Export memakai data raw, bukan wallet balance turunan, supaya saldo awal wallet tidak berubah saat restore.

3) Forgot Password
- Tombol "Lupa?" di halaman login aktif.
- User wajib mengisi email dulu sebelum request reset password.
- Sistem mengirim email reset password via Firebase Auth `sendPasswordResetEmail`.
- UI menampilkan loading "Mengirim..." saat proses berjalan.
- UI menampilkan pesan sukses inline: cek inbox/spam.
- Error tetap inline, tanpa alert browser.

4) Optimasi lanjutan bundle/chunk
- App root dipisah dari dashboard login agar bagian dashboard baru dimuat setelah user login.
- Dashboard authenticated dipindahkan ke `src/AuthenticatedApp.tsx` dan dilazy-load.
- `StoreProvider`/Firestore hanya masuk flow authenticated, bukan initial app shell.
- Firebase client dipisah:
  - `src/lib/firebase.ts` untuk Firebase App + Auth.
  - `src/lib/firebaseDb.ts` untuk Firestore.
- `ThemeContext` dibuat independen dari Store/Firestore agar tema bisa jalan di login screen tanpa menarik Firestore chunk.
- Theme tetap tersinkron ke Firestore setelah user login melalui bridge `ThemeStoreSync`.
- `vite.config.ts` memakai `manualChunks()` untuk memecah Firebase core/auth/firestore, React, dan Motion.

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
rm -rf /tmp/duit-calendar-link-revoke-v1-extract
unzip -o ~/Downloads/duit-calendar-link-revoke-v1.zip -d /tmp/duit-calendar-link-revoke-v1-extract
rsync -av /tmp/duit-calendar-link-revoke-v1-extract/duit-calendar-link-revoke-v1/ ./

npm install
npm run typecheck
npm run build
git diff --check

git add src vite.config.ts README_TIMPA.txt
git commit -m "feat: add calendar link revoke and backup tools"
git push origin main

Checklist test setelah deploy:
- Account > Kalender > Salin Link: link `.ics` tercopy.
- Account > Kalender > Buat Ulang Link: muncul ConfirmDialog.
- Setelah confirm, link lama harus tidak valid setelah Firestore sync.
- Klik Salin Link lagi dan test link baru di browser/calendar.
- Account > Backup Data > Export JSON: file `.json` terdownload dan bisa dibuka.
- Account > Backup Data > Export CSV: file `.csv` terdownload dan kolom transaksi benar.
- Account > Backup Data > Import JSON: pilih file backup JSON, muncul ConfirmDialog.
- Setelah import, data dashboard berubah sesuai backup dan sync ke Firestore.
- Test login screen: tombol "Lupa?" minta email dan mengirim link reset.
- Test login email/password dan Google.
- Test setelah login: data Firestore tetap loading gate dengan benar, tidak ada data default menimpa cloud.
- Test tema Pagi/Auto/Malam di Account modal dan refresh halaman.
- Test Safari toolbar/tab tetap mengikuti system device.

Catatan keamanan:
- Calendar link adalah capability URL. Siapa pun yang punya link bisa membaca jadwal.
- Gunakan "Buat Ulang Link" untuk mencabut link lama bila terlanjur dibagikan.
- File JSON backup bisa berisi data finansial pribadi dan avatar base64. Simpan di tempat aman.
- Import JSON akan mengganti data akun saat ini setelah konfirmasi. Sebaiknya export JSON dulu sebelum import.
