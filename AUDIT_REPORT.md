# 🔍 DUIT — Laporan Audit Bug Lengkap
**Tanggal audit:** 16 Juli 2026  
**Cakupan:** Semua file source di `src/`  

---

## Bug Prioritas Tinggi

### 🐛 Bug A1 — EditTransactionModal tidak tampilkan peringatan untuk transfer tx
- **File:** `src/components/EditTransactionModal.tsx`
- **Masalah:** Modal menampilkan peringatan untuk goal tx (`tx.goalId`) tapi **tidak** untuk transfer tx (`tx.transferId`). Store `updateTx` mem-blokir edit transfer tx secara diam-diam (return `previous`), tapi user tidak mendapat penjelasan mengapa perubahan tidak tersimpan.
- **Dampak:** User bingung — edit transfer tx tapi perubahan tidak tersimpan tanpa pesan error.
- **Fix:** Tambahkan pengecekan `tx.transferId` di EditTransactionModal, tampilkan peringatan seperti goal tx.

### 🐛 Bug A2 — normalizeUserData tidak sanitize icon dari Firestore
- **File:** `src/lib/store.tsx` (baris 372)
- **Masalah:** `normalizeUserData` meneruskan `remote.scheds`, `remote.goals`, `remote.wallets` langsung tanpa validasi icon. Jika data Firestore lama memiliki emoji sebagai icon (misal `"💰"`), emoji tersebut lolos tanpa disanitasi. `sanitizeImportedUserData` melakukan sanitasi, tapi `normalizeUserData` tidak.
- **Dampak:** Icon emoji lama dari Firestore dirender sebagai teks fallback oleh `getWalletIcon`/`getGoalIcon`/`getScheduleIcon` — tampilan tidak konsisten.
- **Fix:** Terapkan `sanitizeSchedule`, `sanitizeGoal`, `sanitizeWallet` pada array di `normalizeUserData` (sama seperti `sanitizeImportedUserData`).

### 🐛 Bug A3 — JadwalView tidak menampilkan icon jadwal
- **File:** `src/views/JadwalView.tsx`
- **Masalah:** Setiap item jadwal memiliki field `icon` (key SVG seperti "pin", "meeting", dll), tapi JadwalView **tidak merender icon** tersebut. Hanya menampilkan nama, waktu, dan date box.
- **Dampak:** Icon jadwal yang user pilih saat membuat jadwal tidak terlihat di daftar jadwal.
- **Fix:** Import `getScheduleIcon` dan tampilkan `getScheduleIcon(schedule.icon, 18)` di setiap row jadwal.

---

## Bug Prioritas Sedang

### 🐛 Bug B1 — EmptyState icon container `text-4xl` terlalu besar untuk SVG icons
- **File:** `src/components/EmptyState.tsx` (baris 49)
- **Masalah:** Container icon memiliki class `text-4xl` yang di-desain untuk emoji. Saat SVG icon dipass (misal `<IconCalendar size={32} />`), container 16×16 (`h-16 w-16`) sudah tepat, tapi `text-4xl` tidak diperlukan dan bisa menyebabkan inkonsistensi ukuran.
- **Dampak:** Kecil — visual sedikit inconsistent, SVG icons mungkin terlalu kecil di dalam container yang di-size untuk emoji.
- **Fix:** Hapus `text-4xl` dari container, atau ubah menjadi `flex items-center justify-center` saja (container `h-16 w-16` sudah cukup).

### 🐛 Bug B2 — KeuanganView "Dompet" add button pakai custom inline SVG
- **File:** `src/components/KeuanganView.tsx` (baris 173-180)
- **Masalah:** Tombol "Dompet" (add wallet) menggunakan custom inline SVG yang bukan dari sistem icon (`getWalletIcon`). Visual berbeda dari icon Lucide/Feather style yang digunakan di tempat lain.
- **Dampak:** Inkonsistensi visual — icon dompet di tombol "Dompet" berbeda gaya dari icon dompet di card wallet.
- **Fix:** Ganti inline SVG dengan `<IconPlus size={28} />` atau icon yang sesuai dari sistem icon.

### 🐛 Bug B3 — Card component inject `<style>` tag duplikat per instance
- **File:** `src/components/Card.tsx` (baris 39-42)
- **Masalah:** Setiap instance Card merender `<style>` tag sendiri dengan CSS rule yang identik. Jika ada 10 Card di halaman, ada 10 `<style>` tag duplikat.
- **Dampak:** Waste DOM nodes, potensi konflik CSS. Tidak crash, tapi tidak efisien.
- **Fix:** Pindahkan CSS rule ke `index.css` atau gunakan CSS module. Atau gunakan `useInsertionEffect` / `useId` untuk dedup.

### 🐛 Bug B4 — `getGreeting()` return emoji, bukan SVG icon
- **File:** `src/lib/format.ts` (baris 26-29)
- **Masalah:** `getGreeting()` return emoji (`🌤️`, `☀️`, `🌇`, `🌙`) sebagai `icon`. Header component merender emoji ini langsung.
- **Dampak:** Inkonsistensi dengan preferensi user untuk SVG icons (Lucide/Feather style). Namun, emoji greeting umumnya diterima di banyak app.
- **Fix:** Buat SVG icons untuk setiap waktu (pagi/siang/sore/malam) dan return ReactNode bukan string. Atau biarkan jika user OK dengan emoji di greeting.

---

## Bug Prioritas Rendah / Catatan

### 📝 Bug C1 — EditWalletModal balance calculation fragile
- **File:** `src/components/EditWalletModal.tsx`
- **Masalah:** Menghitung saldo awal dengan `wallet.balance - netTxAmount`, dimana `wallet.balance` adalah derived balance (dari `walletsWithBalance`). Ini bekerja sekarang, tapi rapuh — jika store mengubah cara `walletsWithBalance` bekerja, perhitungan ini bisa rusak.
- **Dampak:** Tidak ada bug saat ini, tapi potensi regresi di masa depan.
- **Fix:** Simpan `initialBalance` asli terpisah, atau hitung dari data mentah.

### 📝 Bug C2 — Card hover glow opacity: `opacity: 0` inline + `group-hover:opacity-20` class = dead code
- **File:** `src/components/Card.tsx` (baris 35-38)
- **Masalah:** Div hover glow punya `style={{ opacity: 0 }}` yang menimpa Tailwind class `group-hover:opacity-20`. CSS rule di `<style>` tag pakai `!important` untuk override. Class Tailwind `group-hover:opacity-20` jadi dead code.
- **Dampak:** Tidak crash, tapi misleading code.
- **Fix:** Hapus `group-hover:opacity-20` dari className, biarkan CSS rule handle opacity.

### 📝 Bug C3 — `dateAtJakartaNoon` di JadwalView: BUKAN bug
- **Catatan:** Fungsi `dateAtJakartaNoon` menggunakan `Date.UTC(year, month-1, day, 5)`. Angka `5` bukan offset yang salah — ini jam 05:00 UTC = 12:00 siang WIB (UTC+7). Jadi nama fungsi dan implementasi sudah benar. **Tidak perlu fix.**

---

## Ringkasan

| Kategori | Jumlah |
|----------|--------|
| 🔴 Prioritas Tinggi | 3 |
| 🟡 Prioritas Sedang | 4 |
| 🔵 Prioritas Rendah / Catatan | 3 |
| **Total** | **10** |

### Rekomendasi Fix (urutan prioritas):
1. **A1** — EditTransactionModal transfer warning
2. **A2** — normalizeUserData sanitize icons
3. **A3** — JadwalView tampilkan schedule icon
4. **B1** — EmptyState icon container
5. **B2** — KeuanganView Dompet button icon
6. **B3** — Card duplicate `<style>` tags
7. **B4** — getGreeting emoji → SVG (opsional)
