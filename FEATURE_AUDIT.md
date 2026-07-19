# FEATURE AUDIT — DUIT (Round 7)

**Tanggal:** 2026-07-19  
**Fokus:** Audit logika fitur end-to-end — bukan cuma bug visual/typo, tapi fitur yang jalan tidak sesuai harapan

---

## Bug Fitur Ditemukan

### F1 — updateTx: Perubahan tipe "in" → "out" lolos validasi saldo
**Severity:** HIGH  
**File:** `src/lib/store.tsx`

**Masalah:**
`updateTx` hanya mengecek `existing.type === "out"` untuk validasi saldo. Jika user mengedit transaksi dan mengubah tipe dari **Pemasukan ("in")** ke **Pengeluaran ("out")**, validasi saldo sama sekali tidak berjalan. Hasilnya: saldo dompet bisa jadi **negatif**.

**Contoh:**
1. Wallet saldo Rp50.000
2. User punya tx "Gaji" (in) Rp100.000 → saldo jadi Rp150.000
3. User edit tx tsb, ubah jadi "Makan" (out) Rp100.000
4. `existing.type` masih "in" → balance check **dilewati**
5. Setelah patch: saldo = 50.000 - 100.000 = **-Rp50.000** 💥

**Fix:** Cek tipe hasil patch, bukan tipe existing:
- `patch.type === "out"` (tipe baru) ATAU `patch.type === undefined && existing.type === "out"` (tetap out)
- Validasi saldo dompet untuk semua skenario di mana tipe akhir = "out"

---

### F2 — EditWalletModal: "Saldo Awal" salah ketika dompet punya tx goal/transfer
**Severity:** MEDIUM  
**File:** `src/components/EditWalletModal.tsx`

**Masalah:**
`netTxAmount` mengecualikan transaksi goal dan transfer (`!t.transferId && !t.goalId`), tapi `walletsWithBalance` **memasukkan** semua tx non-CF termasuk goal dan transfer. Akibatnya, rumus `wallet.balance - netTxAmount` **tidak** mengembalikan base balance yang benar.

**Contoh:**
1. Wallet base balance = Rp100.000
2. Goal funding "out" Rp50.000 (goalId)
3. Goal withdrawal "in" Rp30.000 (goalId)
4. Regular income Rp20.000, Regular expense Rp10.000

```
walletsWithBalance.balance = 100k + 30k + 20k - 50k - 10k = 90k (derived)
netTxAmount = 20k - 10k = 10k (excludes goal/transfer)
initialBalance = 90k - 10k = 80k ← SALAH! Harusnya 100k
```

**Fix:** Ubah filter `netTxAmount` menjadi `!t.isCarryForward` saja (tanpa exclude goal/transfer), agar semua kontribusi tx dikurangkan dari derived balance untuk mendapatkan base balance.

---

### F3 — EditTransactionModal: Mengubah tipe transaksi "in" → "out" tanpa warning validasi
**Severity:** MEDIUM  
**File:** `src/components/EditTransactionModal.tsx`

**Masalah:**
UI mengizinkan perubahan tipe (dropdown "Pemasukan"/"Pengeluaran"), tapi tidak ada validasi di frontend untuk cek saldo cukup saat berubah ke "out". Store juga tidak memvalidasi (lihat F1). Double miss.

**Fix:** Tambahkan validasi di handleSubmit EditTransactionModal: jika tipe baru "out", cek saldo dompet cukup.

---

## Fix yang Diapply

| ID | Bug | File | Fix |
|----|-----|------|-----|
| F1 | updateTx type change bypass balance check | store.tsx | Validasi saldo berdasarkan tipe AKHIR (`patch.type ?? existing.type`) |
| F2 | EditWalletModal wrong Saldo Awal | EditWalletModal.tsx | `netTxAmount` filter jadi `!t.isCarryForward` saja |
| F3 | EditTransactionModal no balance check on type change | EditTransactionModal.tsx | Tambah validasi saldo di handleSubmit |
