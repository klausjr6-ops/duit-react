# Audit Round 34 — Status Perbaikan

Seluruh temuan Audit Round 34 sudah diperbaiki pada source ini.

## Perbaikan yang diterapkan

1. **Validasi data sebelum Firestore write**
   - Mutator transaksi, jadwal, goal, dan dompet kini memvalidasi panjang teks sebelum optimistic state maupun write cloud.
   - Validasi yang sama diulang di transaksi Firestore untuk mencegah bypass/race.
   - Kategori/deskripsi transaksi dibatasi 80/240 karakter; nama jadwal dan goal 120; nama dompet 80; icon 12; warna dompet 120.

2. **Escape modal bersarang**
   - `useModalDialog` kini memakai stack modal global.
   - Hanya modal paling atas yang dapat merespons Escape; modal induk tidak lagi tertutup ketika dialog anak aktif atau sibuk.

3. **Penghapusan dompet dan transfer**
   - Menghapus dompet kini hanya menghapus transaksi milik dompet tersebut.
   - Transaksi transfer pada dompet yang bertahan dipertahankan dan `transferId`-nya dilepas agar saldo dompet penerima/pengirim tidak berubah secara keliru.

4. **Nama duplikat dan AI**
   - Tambah/edit dompet dan goal menolak nama duplikat secara case-insensitive, juga diverifikasi ulang dalam transaksi Firestore.
   - Resolver AI menolak nama dompet atau goal yang tidak unik, bukan memilih kecocokan pertama.

5. **Registrasi akun**
   - Jika akun Firebase sudah berhasil dibuat tetapi update nama profil gagal, pendaftaran tetap dianggap berhasil. Kegagalan nama hanya dicatat sebagai peringatan dan pengguna tidak terjebak dengan email yang sudah terdaftar.

## Validasi

- `npm test` — 13/13 lulus
- `npx tsc --noEmit` — lulus
- `npm run build` — lulus
- `git diff --check` — lulus

`npm audit` tetap melaporkan 8 kerentanan moderate transitive Firebase Admin/Google Cloud yang sudah diketahui; tidak dilakukan `npm audit fix --force`.
