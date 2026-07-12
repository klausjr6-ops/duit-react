DUIT — AI Data Integration v1 + Chat Icon
===========================================

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

4. Removed: FINANCE_KEYWORDS array, needsFinanceContext function
   - Tidak lagi diperlukan karena context selalu dikirim

5. Chat AI icon diganti dengan gambar custom user
   - FAB button (kanan bawah): dari SVG chat bubble → gambar custom
   - Chat header logo: dari huruf "D" → gambar custom
   - Gambar di-import sebagai Vite module (bukan /public) supaya di-hash & di-bundle
   - File: src/assets/duit-chat-icon.png (17KB, 128x128)
   - Juga ada di public/duit-chat-icon-sq.png dan public/duit-chat-icon.png (legacy)

File yang berubah:
- src/lib/store.tsx (buildAIContext rewrite)
- src/components/ChatWidget.tsx (hapus keyword-gating, update prompt, ganti icon)
- src/AuthenticatedApp.tsx (ganti FAB icon)
- public/duit-chat-icon-sq.png (BARU - icon square 128x128)
- public/duit-chat-icon.png (BARU - icon asli ratio 128x80)

Validasi:
- npm run typecheck: lolos
- npm run build: lolos
- git diff --check: lolos
