# DUIT — Dashboard Keuangan Harian

> **Context Document** — Untuk digunakan di sesi AI baru sebagai starting point.
> Last updated: 9 Juli 2025

---

## 🎯 Overview Project

**DUIT** adalah aplikasi dashboard keuangan harian personal dengan fitur AI assistant. Dibangun dengan React + Vite + TypeScript + TailwindCSS + Framer Motion. Deployed di Vercel dengan Firebase sebagai backend.

- **Production URL:** https://duit-app-ten.vercel.app
- **GitHub Repo:** https://github.com/klausjr6-ops/duit-react
- **Local Path:** `/Users/christianbahyuardianto/Downloads/modern-animated-html-clone`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Vite 7.3.2 + React + TypeScript |
| **Styling** | TailwindCSS + Framer Motion |
| **Auth & DB** | Firebase v12.15.0 (Auth + Firestore) |
| **Hosting** | Vercel (Git integration) |
| **AI Backend** | Multi-provider: Google Gemini 2.5 Flash (primary) + Groq Llama 3.3 70B (fallback) |

---

## 🔥 Firebase Setup

- **Project ID:** `finance-daily-reporting`
- **Region:** `asia-southeast2`
- **Auth Methods:** Email/Password + Google Sign-in
- **Authorized Domains:** `duit-app-ten.vercel.app` (production ready)

### Firestore Structure
```
users/{userId}/data/main → {
  txs: Transaction[],
  scheds: ScheduleItem[],
  goals: Goal[],
  moods: MoodEntry[],
  wallets: Wallet[],
  settings: Settings
}
```

Single document per user, semua data di dalamnya (efisien untuk data kecil).

### Security Rules (published)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🎨 Design System

### Palette (Dark Mode — current default)
- Background main: `bg-slate-950` / `bg-[#0f0f0f]`
- Card background: `bg-[#1a1a1a]`
- Border: `border-zinc-800`
- Text primary: `text-slate-100`
- Text muted: `text-slate-400`

### Accent
- Primary gradient: `bg-gradient-to-br from-teal-400 to-blue-500`
- Text on gradient: `text-zinc-900` (dark text on bright gradient)
- Link/highlight: `text-teal-400`

### Logo DUIT
- Kotak `w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500`
- Huruf "D" bold hitam di dalamnya
- Tulisan "DUIT" white bold di sebelahnya (horizontal)

---

## 📁 Struktur Folder Penting

```
src/
├── components/
│   ├── AccountModal.tsx        ← Modal profile (logout, ganti email/password)
│   ├── AddFundModal.tsx
│   ├── Card.tsx
│   ├── ChatWidget.tsx          ← Modal Chat AI (popup)
│   ├── CircleProgress.tsx
│   ├── ClockCard.tsx
│   ├── GoalModal.tsx
│   ├── Header.tsx
│   ├── HealthCard.tsx
│   ├── KeuanganView.tsx
│   ├── LoginScreen.tsx         ← Login + Register split view
│   ├── MoodCard.tsx
│   ├── MultiDonut.tsx
│   ├── ReportCard.tsx
│   ├── ScheduleModal.tsx
│   ├── Sidebar.tsx
│   ├── StatCard.tsx
│   ├── TimelineCard.tsx
│   ├── TodayCard.tsx
│   ├── TransactionList.tsx
│   ├── WalletManager.tsx
│   └── WeeklyChart.tsx
├── hooks/
├── lib/
│   ├── AuthContext.tsx         ← Full auth provider (login/register/google/logout/changeEmail/changePassword)
│   ├── firebase.ts             ← Export auth, db, googleProvider
│   └── store.tsx               ← Firestore-based store dengan onSnapshot real-time sync
├── utils/
├── views/
│   ├── GoalsView.tsx
│   └── JadwalView.tsx
├── App.tsx                     ← Auth guard + main layout + FAB Chat AI
├── index.css
└── main.tsx                    ← Wrap dengan AuthProvider + StoreProvider

api/
├── calendar.ics.js
└── chat.js                     ← Serverless function multi-provider AI (ES Module syntax)
```

---

## 🔑 Environment Variables

### File `.env.local` (dan Vercel)

```bash
# Firebase Config (VITE_ prefix = client-side, aman karena dilindungi Security Rules)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=finance-daily-reporting
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# AI Providers (NO VITE_ prefix = server-side only, aman dari exposure)
GEMINI_API_KEY=...              # Dari https://aistudio.google.com/apikey
GROQ_API_KEY=gsk_...            # Dari https://console.groq.com/keys

# Legacy (masih ada, tidak dipakai aktif)
FIREBASE_SERVICE_ACCOUNT_BASE64=...
```

### Status di Vercel
- ✅ Semua `VITE_FIREBASE_*` di **Development, Preview, Production**
- ✅ `GEMINI_API_KEY` di **Preview, Production**
- ✅ `GROQ_API_KEY` di **Preview, Production**

---

## ✅ Progress Selesai

### Auth & Database
- [x] Firebase Auth (Email/Password + Google Sign-in)
- [x] Login Screen dengan split view Login/Register + password strength indicator
- [x] Auth guard di App.tsx (loading → login → app)
- [x] AccountModal dengan Logout, Ganti Email, Ganti Password (dengan re-authentication)
- [x] Migrasi store dari localStorage → Firestore real-time sync (`onSnapshot`)
- [x] Auto-migration data localStorage → Firestore saat first login
- [x] Firestore Security Rules published & active

### Deployment
- [x] Git integration Vercel ↔ GitHub repo `duit-react`
- [x] Auto-deploy on push to `main` branch
- [x] Production live di `duit-app-ten.vercel.app`
- [x] Firebase Authorized Domains configured

### AI Chat
- [x] Persona baru: teman ngobrol serba bisa (bukan cuma finance bot)
- [x] Bisa bahas: curhat, politik, geopolitik, hiburan, tech, sains, dll
- [x] Bahasa Indonesia natural (casual, kayak temen)
- [x] Conditional context: data keuangan cuma dikirim kalau user tanya finansial
- [x] Modal popup UI (mirip AccountModal — center screen, responsive fullscreen di mobile)
- [x] FAB (Floating Action Button) trigger di App.tsx (pojok kanan bawah)
- [x] Hilangkan suggestion chips
- [x] ESC to close + auto-focus input + textarea auto-grow
- [x] **Multi-provider backend:** Gemini primary + Groq fallback dengan timeout & error handling
- [x] Transparent fallback (user gak tau lagi pakai provider mana)

---

## 🔜 Roadmap / Next Features

### Priority Next (sudah discuss, siap kerjain):
- [ ] **Dark/Light Mode toggle** dengan 4 opsi: Auto (System), Auto (Time-based 06:00-18:00), Manual Light, Manual Dark

### Nice to Have (belum discuss detail):
- [ ] Chat history persist ke Firestore (biar gak hilang tiap tutup modal)
- [ ] Badge "via Gemini/Groq" di UI chat (opsional, informatif)
- [ ] PWA support (install to home screen)
- [ ] Custom domain (misal `duit.app`)
- [ ] Test multi-device sync end-to-end
- [ ] Export data (JSON/CSV backup)
- [ ] Import data (restore backup)

---

## 🐛 Known Issues / Notes

### Vercel Serverless Function
- **HARUS pakai ES Module syntax** (`export default`), BUKAN CommonJS (`module.exports`)
- Karena `package.json` project ini di-treat sebagai `"type": "module"` (default Vite modern)
- File `api/*.js` juga ikutan ES Module

### Firebase VITE_ Prefix
- Firebase config **PAKAI** prefix `VITE_` karena memang di-bundle ke client-side (Firebase SDK butuh di browser)
- Aman karena request diproteksi Firestore Security Rules (per-user auth)

### AI API Keys
- **JANGAN pakai** prefix `VITE_` untuk `GEMINI_API_KEY` / `GROQ_API_KEY`
- Karena kalau pakai `VITE_`, key akan ter-bundle ke JS client dan kelihatan siapa aja (BAHAYA!)
- Ini cuma dipakai di `api/chat.js` (serverless function), aman di server-side

---

## 🎯 Interfaces (dari `src/lib/store.tsx`)

```typescript
interface Transaction {
  id: string;
  type: 'in' | 'out';
  amt: number;
  cat: string;
  desc: string;
  date: string;
  walletId?: string;
}

interface ScheduleItem {
  id: string;
  name: string;
  desc?: string;
  date?: string;
  day?: string;
  start: string;
  end?: string;
  recurring?: boolean;
  untilDate?: string;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  icon: string;
}

interface Wallet {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
}

interface Settings {
  name: string;
  avatar?: string;
}

interface MoodEntry {
  mood: string;
  label: string;
  note?: string;
}
```

### Helper Methods dari `useStore()`
- `buildAIContext()` — generate string context data keuangan untuk AI
- `score` — health score keuangan
- `balance` — total saldo
- `outMonth`, `inMonth` — pengeluaran/pemasukan bulan ini
- `totalSaved` — total tabungan dari goals
- `todayIncome`, `todayExpense` — transaksi hari ini
- `todaySchedules` — jadwal hari ini
- `savingsPct` — persentase tabungan
- `todayMood` — mood hari ini (kalau ada)

---

## 🤖 AI Chat Details

### System Prompt (di `ChatWidget.tsx`)
Persona "DUIT" — asisten personal & teman ngobrol yang santai, cerdas, supportive. Bisa bahas apa aja: curhat, politik, geopolitik, tech, sains, hiburan, filsafat, keuangan (kalau ditanya). Bahasa Indonesia casual, boleh mix Inggris/gaul kalau natural.

### Backend Architecture (`api/chat.js`)
```
User request → /api/chat
    ↓
Try Gemini 2.5 Flash (15s timeout, primary)
    ↓ success → return
    ↓ fail (rate limit / error / safety block / timeout / empty)
Try Groq Llama 3.3 70B (15s timeout, fallback)
    ↓ success → return
    ↓ fail
Return friendly error message
```

### Model Config
- **Gemini:** `gemini-2.5-flash`, temperature 0.9, topP 0.95, safety BLOCK_ONLY_HIGH
- **Groq:** `llama-3.3-70b-versatile`, temperature 0.9, top_p 0.95
- Max tokens: 1200

### Response Format (frontend-facing)
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "_meta": { "provider": "gemini" | "groq" }
}
```

---

## 📚 Firestore Auto-Migration

Saat user first login (belum ada doc di Firestore), store akan cek `localStorage` untuk data lama. Kalau ada, otomatis di-migrate ke `users/{uid}/data/main`. Ini biar user yang dulu pakai versi HTML/localStorage-only bisa transisi mulus.

---

## 🚀 Deployment Workflow

```bash
# Edit code lokal
npm run dev              # Test di http://localhost:5173

# Commit + push
git add .
git commit -m "feat: ..."
git push origin main

# Vercel auto-deploy (~2 menit)
# Test di https://duit-app-ten.vercel.app
```

### Kalau perlu update env vars:
- **Lokal:** edit `.env.local` → restart `npm run dev`
- **Production:** `vercel env add/rm` atau via Dashboard → redeploy (dengan uncheck "Use existing Build Cache")

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/duit-app/duit-app
- **Firebase Console:** https://console.firebase.google.com/project/finance-daily-reporting
- **Google AI Studio (Gemini keys):** https://aistudio.google.com/apikey
- **Groq Console:** https://console.groq.com/keys
- **GitHub Repo:** https://github.com/klausjr6-ops/duit-react

---

## 💬 Continuation Instructions (untuk AI di chat baru)

Kalau kamu adalah AI baru yang membaca file ini:

1. **Baca semua section di atas** untuk paham konteks project
2. **Task selanjutnya:** implement **Dark/Light Mode** dengan 4 opsi:
   - Auto (Follow System)
   - Auto (Time-based: light 06:00-18:00, dark 18:00-06:00)
   - Manual Light
   - Manual Dark
3. **User preferences (sudah didiskusikan):**
   - Level implementasi: **Option B (Hybrid)** — fokus warna utama, ~10-12 file
   - Storage: **Firestore + localStorage** (sync antar device, fast load)
   - Style light mode: **Style 2 (Warm & Soft)** — bg `#f5f5f7`, card putih + shadow-sm
   - Gradient handling: **A** — biarkan gradient teal→blue sama di dark & light
4. **Rencana kerja 3 tahap:**
   - Tahap 1: Infrastruktur (ThemeContext, Settings modal, integrasi)
   - Tahap 2: Komponen utama (App, Sidebar, Header, Card, Modals)
   - Tahap 3: Komponen kartu dashboard (ClockCard, StatCard, dll)
5. **Konfirmasi ke user** apakah plan di atas masih relevan, atau ada perubahan preference. Kalau OK, langsung mulai Tahap 1.

### File yang mungkin perlu dilihat (minta user share kalau perlu):
- `src/App.tsx`
- `src/components/Sidebar.tsx`
- `src/components/AccountModal.tsx`
- `src/lib/store.tsx`
- `tailwind.config.js` / `tailwind.config.ts`

### Constraints yang harus diperhatikan:
- Style HARUS konsisten dengan design system existing (gradient teal→blue, dll)
- Semua modal HARUS pattern serupa: `fixed inset-0 bg-black/60 backdrop-blur`
- Framer Motion animation: `initial={{ opacity: 0, scale: 0.95 }}` `animate={{ opacity: 1, scale: 1 }}`
- Selalu kasih file **lengkap tinggal replace** — user prefer copy-paste total daripada patch parsial


UPDATE TERBARU
1. TEMA LIGHT/DARK MODE SUDAH TERPASANG
2. perbaikan stabilisasi data + date handling
3. Perbaikan membuat DUIT lebih aman, konsisten, dan nyaman dipakai, tanpa mengubah karakter AI DUIT.
---
# DUIT — Batch 2: Reliability, Chat Security, and Accessibility

## Guarantee untuk AI DUIT

**Tidak ada perubahan pada persona AI.** `SYSTEM_PROMPT`, gaya bahasa casual, topik yang bisa dibahas, conditional finance context, model Gemini/Groq, serta fallback response tetap sama seperti implementasi sebelumnya.

Batch ini hanya memperbaiki transport, keamanan endpoint, batas payload, dan UI modal.

## Perubahan batch 2

### Chat (tanpa mengubah sifat AI)

- Riwayat yang dikirim ke API dibatasi pada 16 pesan terbaru agar request tidak makin besar tanpa batas saat chat panjang.
- Input dibatasi hingga 4.000 karakter dan server memvalidasi bentuk/ukuran request.
- Request dibatalkan saat modal ditutup, sehingga respons lama tidak muncul setelah chat ditutup/dibuka lagi.
- Server memasang rate limit dasar: 12 request per menit per IP pada warm instance.
- Setelah `FIREBASE_SERVICE_ACCOUNT_BASE64` dipasang untuk Calendar, chat juga otomatis meminta Firebase ID token dari user yang login. Ini membatasi pemakaian endpoint oleh pihak luar.
- Dukungan format image block pada backend tetap dipertahankan dengan batas payload.

> Rate limit in-memory adalah lapisan dasar. Untuk proteksi kuota tingkat production yang benar-benar global lintas instance, gunakan Vercel Firewall/WAF atau Redis/KV pada tahap berikutnya.

### Aksesibilitas dan mobile UI

- Menambahkan `src/hooks/useModalDialog.ts` untuk semua modal utama: Chat, Akun, Goal, Tambah Tabungan, Jadwal, dan Kelola Dompet.
- Modal kini mendukung: `Escape` untuk menutup, focus trap tombol Tab, pengembalian fokus ke elemen pemicu, lock body scroll, `role="dialog"`, `aria-modal`, judul dialog, dan label tombol close.
- Chat modal diberi safe-area padding untuk iPhone/notch/home indicator.
- Tambah global `prefers-reduced-motion` agar pengguna yang memilih pengurangan animasi di perangkat tidak mendapat animasi berlebihan.

### Quality gate

- Menambahkan script `npm run typecheck`.
- `npm run build` sekarang otomatis menjalankan typecheck lebih dulu, sehingga type error tidak lolos build/deploy.

## File tambahan/berubah pada batch 2

- `api/chat.js`
- `package.json`
- `src/index.css`
- `src/hooks/useModalDialog.ts`
- `src/components/ChatWidget.tsx`
- `src/components/AccountModal.tsx`
- `src/components/AddFundModal.tsx`
- `src/components/GoalModal.tsx`
- `src/components/ScheduleModal.tsx`
- `src/components/WalletManager.tsx`

Selain itu ZIP batch 2 juga menyertakan seluruh file P0 sebelumnya agar dapat dipakai sebagai satu overwrite package lengkap.

## Verifikasi yang sudah lolos

```bash
npm run typecheck
npm run build
git diff --check
```

Chat API smoke test juga dijalankan untuk memastikan payload invalid mendapat HTTP 400 dan payload valid memberi struktur respons yang benar.

## Belum diubah karena perlu keputusan produk / scope berikutnya

1. **+ Nabung Goal:** pilih apakah tracker manual atau transfer nyata dari wallet.
2. **Avatar:** idealnya dipindah/di-kompres ke Firebase Storage agar tidak mendekati limit dokumen Firestore.
3. **Native alert/confirm:** masih perlu diganti dengan toast/confirmation dialog sesuai design system.
4. **Code splitting:** build masih single-file sesuai setting sekarang.


**End of Context Document**