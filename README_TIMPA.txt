DUIT — AI Data Integration + Pull to Refresh
============================================

Perubahan di paket ini:

1. AI Context: dari ringkasan agregat → detail terstruktur
   - Dompet (nama + saldo masing-masing)
   - Transaksi hari ini (detail per item: kategori, nominal, dompet, deskripsi)
   - Transaksi 7 hari terakhir (max 30 item)
   - Rekap bulan ini + top 5 kategori pengeluaran
   - Goals (nama, nominal current/target, persentase, deadline)
   - Jadwal hari ini (detail per item)
   - Jadwal terdekat (5 terdekat selain hari ini)
   - Mood hari ini
   - Skor kesehatan keuangan

2. Hapus keyword-gating: context SELALU dikirim ke AI
   - Sebelumnya: context hanya dikirim kalau ada keyword keuangan
   - Sekarang: context selalu dilampirkan, AI selalu bisa akses data user

3. SYSTEM_PROMPT update: instruksi eksplisit cara pakai data
   - WAJIB pakai data kalau ditanya soal keuangan/jadwal/goals
   - JANGAN bilang "aku tidak tahu" kalau datanya ada
   - Panduan mapping: tanya pengeluaran → bagian Transaksi Hari Ini, dll

4. Pull to Refresh
   - Tarik layar ke bawah dari posisi paling atas → muncul indikator refresh
   - Lepas setelah threshold (70px) → data refresh
   - Indikator: ikon rotasi dengan animasi
   - Hanya aktif di mobile (touch events)
   - Rubber-band feel: resistance setelah threshold
   - File baru: src/hooks/usePullToRefresh.ts, src/components/PullToRefreshIndicator.tsx

File yang berubah:
- src/lib/store.tsx (buildAIContext rewrite)
- src/components/ChatWidget.tsx (hapus keyword-gating, update prompt)
- src/AuthenticatedApp.tsx (integrate pull to refresh + AI context)
- src/hooks/usePullToRefresh.ts (BARU)
- src/components/PullToRefreshIndicator.tsx (BARU)

Validasi:
- npm run typecheck: lolos
- npm run build: lolos
- git diff --check: lolos
