DUIT — Chat Markdown Rendering Fix + Account Modal Polish + Backup Tools
Tanggal: 11 Juli 2026

Isi update terbaru:

1) Chat Markdown Rendering Fix
- Bubble jawaban AI sekarang merender markdown ringan, bukan menampilkan simbol mentah.
- Teks seperti `**Interstellar:**` sekarang tampil sebagai bold `Interstellar:` tanpa simbol `**`.
- Teks italic `*mood*` tampil italic tanpa simbol `*`.
- Inline code dengan backtick tampil sebagai code style.
- Markdown image `![alt](https://...)` atau data URL image yang aman akan dirender sebagai gambar, bukan ditampilkan sebagai teks panjang.
- Tidak mengubah persona, system prompt, provider, model, temperatur, atau fallback AI DUIT.
- Catatan: ini bukan enkripsi. Simbol `**` adalah format Markdown dari AI, sebelumnya UI chat belum merender Markdown.

2) UI polish Account Modal
- Section "Kalender" dan "Backup Data" di halaman utama Account modal tampil sebagai menu card dengan tanda `›`, sama seperti "Ganti Email" dan "Ganti Password".
- Detail Kalender dan Backup Data dipindah ke sub-halaman sendiri.

3) Regenerate / Revoke Calendar Link
- Di sub-halaman Kalender ada tombol "Salin Link" dan "Buat Ulang Link".
- "Buat Ulang Link" memakai ConfirmDialog.
- Setelah konfirmasi, `settings.calendarToken` diganti token baru sehingga link lama tidak valid.

4) Export / Import Backup
- Di sub-halaman Backup Data ada:
  - Export JSON full backup.
  - Export CSV transaksi.
  - Import JSON backup DUIT.
- Import JSON memakai validasi, sanitasi, batas file 5 MB, dan ConfirmDialog.

5) Forgot Password
- Tombol "Lupa?" di halaman login aktif via Firebase Auth `sendPasswordResetEmail`.
- Ada loading dan pesan sukses/error inline.

6) Optimasi bundle/chunk
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
- vite.config.ts
- README_TIMPA.txt

Validasi workspace:
- npm run typecheck: Lolos
- npm run build: Lolos
- git diff --check: Lolos
- Warning "Some chunks are larger than 500 kB" tidak muncul.

Cara apply dari root repo lokal:

cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone
rm -rf /tmp/duit-chat-markdown-render-v1-extract
unzip -o ~/Downloads/duit-chat-markdown-render-v1.zip -d /tmp/duit-chat-markdown-render-v1-extract
rsync -av /tmp/duit-chat-markdown-render-v1-extract/duit-chat-markdown-render-v1/ ./

npm install
npm run typecheck
npm run build
git diff --check

git add src vite.config.ts README_TIMPA.txt
git commit -m "fix: render chat markdown formatting"
git push origin main

Checklist test setelah deploy:
- Tanya Chat: "rekomendasi film dong".
- Pastikan judul yang dikirim AI sebagai `**judul**` tampil bold tanpa simbol `**`.
- Jika AI mengirim `*mood*`, tampil italic tanpa simbol `*`.
- Jika AI mengirim markdown image `![alt](url)`, gambar tampil sebagai preview.
- Test Account modal: Kalender dan Backup Data tetap tampil sebagai card `›`.
- Test Backup export/import, Calendar link revoke, Forgot Password, theme, dan login.
