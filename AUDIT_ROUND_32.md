# Audit Bug Round 32 — 11 Agustus 2026

## Validasi

- `npm test`: lulus, 9/9 tes.
- `npx tsc --noEmit`: lulus.
- `npm run build`: lulus.
- `git diff --check`: lulus.

## Bug yang ditemukan dan diperbaiki

### 1. Edit transaksi dapat tampak sukses meski penulisan cloud gagal

**Penyebab:** `updateTx()` memakai mutasi optimistis tanpa menunggu hasil transaksi Firestore. Modal langsung menampilkan toast sukses dan ditutup. Bila jaringan/error Firestore terjadi, UI dapat kembali dari snapshot dan pengguna tidak mendapat pesan bahwa edit gagal.

**Perbaikan:**

- `updateTx()` kini asinkron dan memakai transaksi Firestore terantrikan.
- Validasi ulang dilakukan pada data Firestore terbaru, termasuk saldo setiap dompet yang terpengaruh.
- Modal edit menunggu hasil simpan, menonaktifkan tombol/penutupan selama proses, dan menampilkan error bila gagal.
- Edit transaksi dipertahankan di UI saat snapshot lama datang, sampai snapshot cloud mengonfirmasi nilai edit tersebut.
- Jika simpan gagal, transaksi dikembalikan ke nilai sebelumnya.

## Risiko yang masih ada (arsitektur / perlu proyek migrasi tersendiri)

1. Dokumen tunggal Firestore `users/{uid}/data/main` tetap memiliki batas keras 1 MiB. Avatar besar telah disanitasi dan aplikasi memberi peringatan, tetapi riwayat transaksi panjang tetap perlu dimigrasikan ke subcollection.
2. Batas laju chat AI masih berbasis memori instance serverless, bukan Redis/KV yang durable.
3. Pengujian saat ini unit/type/build; belum ada suite E2E browser untuk alur Firebase sungguhan.

## Catatan

Tidak ditemukan error type, build, atau whitespace diff pada source saat audit ini.
