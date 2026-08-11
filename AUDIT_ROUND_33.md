# Audit Round 33 — Status Perbaikan

Seluruh temuan Audit Round 33 telah diperbaiki pada source ini.

## Perbaikan yang diterapkan

1. **Proteksi transaksi khusus**
   - `addTx` menolak `goalId`, `transferId`, dan `isCarryForward`.
   - `updateTx` tidak lagi menerima atribut transaksi khusus.
   - `delTx` menolak transfer, goal, dan carry-forward dari jalur transaksi umum.

2. **Carry-forward lintas bulan**
   - Store kini memantau perubahan hari dengan helper WIB `todayStr()` setiap 30 detik.
   - Perubahan hari Jakarta menjadi dependency pembuat carry-forward sehingga aplikasi yang dibiarkan terbuka tetap memproses bulan baru.

3. **Nominal Rupiah**
   - Semua mutator transaksi, transfer, pendanaan/penarikan goal, dan parser aksi AI kini mensyaratkan nominal Rupiah positif, aman, dan bulat.

4. **Concurrent schedule update**
   - Update jadwal parsial hanya menulis `name` ketika nama memang termasuk patch, sehingga nama terbaru dari snapshot Firestore tidak tertimpa state lokal stale.

5. **Validasi backup**
   - Restore kini menolak transaksi yang merujuk dompet/goal yang tidak ada.
   - Restore menolak pasangan transfer tidak lengkap, nominal berbeda, tipe sama, atau dompet asal/tujuan sama.

6. **Batas data mood dan settings**
   - Catatan mood dibatasi maksimum 500 karakter pada UI dan mutator.
   - Mood divalidasi sebelum write.
   - `updateSettings` kini melakukan sanitasi sebelum write Firestore.

7. **Bahasa UI**
   - Navigasi laporan memakai `Sebelumnya` dan `Berikutnya`.

8. **Jadwal lintas tengah malam**
   - Jadwal dengan jam selesai lebih kecil dari jam mulai kini valid dan diberi indikator bahwa jadwal berakhir pada hari berikutnya.

## Pengujian

- `npm test` — 13/13 lulus
- `npx tsc --noEmit` — lulus
- `npm run build` — lulus
- `git diff --check` — lulus

Test baru mencakup penolakan nominal pecahan dari aksi AI, backup transfer yatim, backup goal yatim, dan restore jadwal lintas tengah malam.
