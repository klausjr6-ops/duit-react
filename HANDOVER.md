# 📘 HANDOVER DOCUMENT — DUIT (Daily Finance Dashboard)

**Tanggal:** 17 Juli 2026  
**Versi:** Audit #4 fixes + CF feature + Goal deduction + Logo loader fix  
**Author:** Bot Assistant (Arena.ai Agent Mode)

---

## 1. Gambaran Umum

**DUIT** adalah aplikasi dashboard keuangan personal harian dengan AI assistant. User bisa mencatat pemasukan/pengeluaran, mengelola dompet, menabung untuk goals, melihat jadwal, dan mengobrol dengan AI yang memiliki akses ke data keuangan user secara real-time.

| Info | Detail |
|------|--------|
| **Production URL** | https://duit-app-ten.vercel.app |
| **GitHub** | https://github.com/klausjr6-ops/duit-react |
| **User's local repo** | `/Users/christianbahyuardianto/Downloads/modern-animated-html-clone` |
| **Firebase Project** | `finance-daily-reporting`, region `asia-southeast2` |
| **Branch** | `main` (auto-deploy ke Vercel on push) |
| **Bahasa Aplikasi** | Indonesia |

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| **Build Tool** | Vite | 7.3.2 |
| **UI Framework** | React | 19.2.6 |
| **Language** | TypeScript | 5.9.3 |
| **CSS** | TailwindCSS v4 + `@tailwindcss/vite` | 4.1.17 |
| **Animation** | Framer Motion | 12.42.2 |
| **Auth** | Firebase Auth (Email + Google) | 12.15.0 |
| **Database** | Firestore (real-time snapshot) | 12.15.0 |
| **Hosting** | Vercel (serverless functions) | — |
| **AI — Primary** | Gemini 2.5 Flash | via Vercel serverless |
| **AI — Fallback** | Groq Llama 3.3 70B | via Vercel serverless |
| **Font** | Space Grotesk (sans), JetBrains Mono (mono) | Google Fonts |

---

## 3. Struktur Folder

```
duit-react/
├── api/
│   ├── chat.js              # Vercel serverless — AI chat endpoint (Gemini + Groq fallback)
│   └── calendar.ics.js      # Vercel serverless — Private iCalendar feed
├── public/
│   └── logo_d_ukuran_disesuaikan.svg   # Logo DUIT (viewBox 160 40 360 360, gradient emerald→cyan→blue→violet, white "D")
├── src/
│   ├── main.tsx             # Entry point — AuthProvider > ThemeProvider > App
│   ├── App.tsx              # Routing: auth loading → LoginScreen → AuthenticatedApp (lazy)
│   ├── AuthenticatedApp.tsx  # StoreProvider > DashboardApp — main app shell
│   ├── index.css            # Global CSS — Tailwind import, card glow, iOS font fix, reduced motion
│   ├── components/
│   │   ├── AccountModal.tsx      # Profil user — ganti nama, avatar, email, password, tema
│   │   ├── AddFundModal.tsx      # Nabung ke goal (buat transaksi "out" dari dompet)
│   │   ├── Card.tsx              # Reusable card wrapper — glow effect via .card-glow CSS
│   │   ├── ChatWidget.tsx        # AI chat popup — Gemini 2.5 Flash + Groq fallback, system prompt, image upload
│   │   ├── CircleProgress.tsx    # SVG circular progress (used in GoalsView)
│   │   ├── ClockCard.tsx         # Jam real-time + tanggal
│   │   ├── ConfirmDialog.tsx     # Reusable confirm dialog
│   │   ├── DraggableFAB.tsx      # FAB draggable — snaps to nearest corner, debounced Firestore save
│   │   ├── EditGoalModal.tsx     # Edit goal — nama, target, deadline, icon
│   │   ├── EditScheduleModal.tsx # Edit jadwal — nama, waktu, hari/tanggal, icon
│   │   ├── EditTransactionModal.tsx # Edit transaksi — CF warning, goal/transfer warning, balance validation
│   │   ├── EditWalletModal.tsx   # Edit dompet — nama, icon, warna, saldo awal (netTxAmount excludes CF+goal+transfer)
│   │   ├── EmptyState.tsx        # Empty state placeholder with SVG icon
│   │   ├── GoalModal.tsx         # Buat goal baru — opsi tabungan awal (deduct from wallet)
│   │   ├── Header.tsx            # Greeting + logo D (color/emoji changes by financial score)
│   │   ├── HealthCard.tsx        # Skor kesehatan keuangan (0-100)
│   │   ├── KeuanganView.tsx      # View keuangan — dompet, transaksi, CF banner, weekly chart
│   │   ├── LoginScreen.tsx       # Login/register — email, Google, session expired notification
│   │   ├── MoodCard.tsx          # Mood tracker harian
│   │   ├── PizzaChart.tsx        # Donut chart for expense categories (DO NOT modify unless asked)
│   │   ├── PullToRefreshIndicator.tsx # Pull-to-refresh UI
│   │   ├── ReportCard.tsx        # Rekap bulanan — pemasukan vs pengeluaran, overspend badge
│   │   ├── ScheduleModal.tsx     # Buat jadwal baru
│   │   ├── Sidebar.tsx           # Navigasi — Home, Keuangan, Jadwal, Goals
│   │   ├── StatCard.tsx          # Statistik card — animated count-up (uses useCountUp)
│   │   ├── TimelineCard.tsx      # Timeline hari ini (transaksi + jadwal)
│   │   ├── ToastContainer.tsx    # Global toast notifications (z-[100], auto-dismiss 3s)
│   │   ├── TodayCard.tsx         # Summary hari ini — income, expense, jadwal count
│   │   ├── TransactionList.tsx   # Daftar transaksi — CF styling, goal withdrawal vs funding, delete guard
│   │   ├── TransferModal.tsx     # Transfer antar dompet
│   │   ├── WalletManager.tsx     # CRUD dompet — name dupe check in UI
│   │   ├── WeeklyChart.tsx       # Bar chart mingguan — excludes CF + goal flows (symmetric)
│   │   └── WithdrawFundModal.tsx # Tarik dana dari goal (buat transaksi "in" ke dompet)
│   ├── hooks/
│   │   ├── useAutoLogout.ts      # 5 menit inaktivitas → auto logout + sessionStorage flag
│   │   ├── useCountUp.ts         # Animated number count-up (used by StatCard)
│   │   ├── useModalDialog.ts     # Reusable modal open/close/confirm logic
│   │   ├── usePullToRefresh.ts   # Pull-to-refresh gesture handler
│   │   └── useToast.ts           # Toast singleton — toast.success/error/info/warning()
│   ├── lib/
│   │   ├── AuthContext.tsx        # Firebase Auth — login, register, Google, logout, change email/password
│   │   ├── ThemeContext.tsx       # Theme mode — system/time/light/dark, isDark, localStorage + Firestore sync
│   │   ├── firebase.ts           # Firebase app init (env vars), Auth, GoogleAuthProvider
│   │   ├── firebaseDb.ts         # Firestore instance
│   │   ├── format.ts             # formatRupiah, formatTime, formatDayDate, getGreeting (returns iconKey)
│   │   └── store.tsx             # **CORE** — state management, all business logic (1673 lines)
│   ├── utils/
│   │   ├── cn.ts                  # clsx + tailwind-merge utility
│   │   ├── icons.tsx              # SVG icon system — wallet/goal/schedule/greeting icons (551 lines)
│   │   └── walletColors.tsx       # Wallet color system — 8 colors with hex resolution
│   ├── views/
│   │   ├── GoalsView.tsx          # Goals page — list, progress, fund/withdraw
│   │   └── JadwalView.tsx         # Jadwal page — calendar, schedule list with icons
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts                # Manual chunks for Firebase, React, Motion
└── AUDIT_REPORT.md / AUDIT_REPORT_2.md / AUDIT_ROUND_4.md
```

---

## 4. Arsitektur & Alur Data

### 4.1 Auth Flow
```
App.tsx
  ├── authLoading → FullScreenLoader (SVG logo + "Memuat...")
  ├── !user → LoginScreen (email/Google login, session expired check)
  └── user → Suspense > AuthenticatedApp (lazy)
                └── StoreProvider
                      └── DashboardApp
                            ├── appLoading (authLoading || storeLoading) → DashboardLoader (SVG logo)
                            └── main content (Sidebar + Views + FAB + Chat)
```

### 4.2 Data Flow
```
Firestore (users/{uid})
  └── onSnapshot → normalizeUserData() → setData()
        └── Zustand-like state via useState + useCallback
              └── updateData(updater) → runTransaction → Firestore write
                    └── onSnapshot fires again → normalizeUserData → setData
```

- **Read path**: Firestore `onSnapshot` → `normalizeUserData()` (sanitize all fields) → `setData()`
- **Write path**: Component calls action (e.g., `addTx`) → `updateData(updater)` → `runTransaction()` → Firestore
- **Sync indicator**: `syncing` flag set before write, cleared after onSnapshot confirms. `syncError` if write fails.
- **Race condition protection**: `dataRef` pattern (`const dataRef = useRef(data); dataRef.current = data;`) ensures latest data in closures.

### 4.3 AI Chat Flow
```
ChatWidget (client)
  → POST /api/chat (Vercel serverless)
    → Verify Firebase ID token (firebase-admin)
    → Rate limit check (12 req/min per IP)
    → Try: Gemini 2.5 Flash API
    → Fallback: Groq Llama 3.3 70B API
    → Stream response back to client
```

### 4.4 Calendar Feed
```
Browser/Calendar app → GET /api/calendar.ics?uid=xxx&token=yyy
  → Verify calendarToken against Firestore (timingSafeEqual)
  → Generate iCal from schedules
  → Return .ics file
```

---

## 5. Core Business Logic (store.tsx)

### 5.1 Transaction Types

| Tipe | Field Kunci | Masuk Hitungan? | Keterangan |
|------|-------------|-----------------|------------|
| **Pemasukan** | `type: "in"` | ✅ Ya | Income biasa |
| **Pengeluaran** | `type: "out"` | ✅ Ya | Expense biasa |
| **Transfer** | `transferId` | ❌ Tidak | Pair in/out antar dompet |
| **Carry Forward** | `isCarryForward: true` | ❌ Tidak | "Saldo Bulan Lalu" auto-generated |
| **Goal Funding** | `goalId` + `type: "out"` | ❌ Expense | Nabung ke goal — BUKAN real expense |
| **Goal Withdrawal** | `goalId` + `type: "in"` | ✅ Income | Tarik dari goal — MASUK real income |

### 5.2 `isRealFlow` Helper
```ts
const isRealFlow = (t: Transaction) =>
  !t.transferId && !t.isCarryForward && !(t.goalId && t.type === "out");
```
- Goal withdrawal ("in"+goalId) = **counted** as income ✅
- Goal funding ("out"+goalId) = **NOT** counted as expense ❌
- Transfer = excluded ❌
- Carry Forward = excluded ❌

### 5.3 Balance Calculation
```
Wallet Balance = wallet.balance (initial) + Σ(in tx, excluding CF) - Σ(out tx, excluding CF)
Total Balance  = Σ(all wallet balances)
```

### 5.4 Score Calculation
```
score = Math.max(0, Math.min(100,
  100
  - (outMonth > inMonth ? 30 : 0)          // overspend penalty
  - (totalSaved === 0 ? 15 : 0)             // no savings penalty
  - (topCategoryRatio * 20)                  // concentration risk
  + (savingsBonus)                           // savings reward
))
```
- `overspend = outMonth > inMonth` (no `inMonth > 0` guard)

### 5.5 Saldo Bulan Lalu (Carry Forward)

**Tujuan**: Setiap tanggal 1, otomatis generate transaksi per wallet yang menampilkan saldo akhir bulan lalu.

**Mekanisme**:
1. `useEffect` di store mendeteksi gap bulan — jika bulan ini belum ada CF, generate
2. CF amount = `wallet.balance + Σ(in tx before 1st, excl CF) - Σ(out tx before 1st, excl CF)`
3. Jika amount = 0 dan tidak ada tx sebelumnya + balance = 0 → skip (tidak buat CF)
4. Jika bulan sudah ada CF tapi amount berubah → update
5. Jika wallet dihapus → hapus CF terkait

**Proteksi**:
- `cfProcessingRef` (boolean) mencegah re-entrancy selama Firestore write
- Timeout 5000ms → reset flag (menghindari deadlock)
- `updateTx` dan `delTx` memblokir edit/hapus CF (return previous silently)
- EditTransactionModal menampilkan warning teal untuk CF
- TransactionList: tombol edit+delete disabled, onConfirm guard + toast.error

**Dikecualikan dari**:
- `getWalletBalance` (balance calculation)
- `walletsWithBalance`
- `totalInGross` / `totalOutGross`
- `isRealFlow`
- `WeeklyChart`
- `buildAIContext`
- `EditWalletModal.netTxAmount`
- `KeuanganView` CF banner (tampilan saja, total semua CF bulan ini)

**nextMonth() helper**:
```ts
function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
```
Digunakan untuk gap-filling — jika user buka app di September padahal terakhir aktif Juli, CF untuk Agustus juga di-generate.

### 5.6 Goal Initial Savings (D5 Fix)

Saat membuat goal baru dengan "Tabungan Awal" > 0:
- `GoalModal` menampilkan dropdown dompet (dengan balance) untuk memilih sumber dana
- `addGoal` menerima `walletId` opsional
- Jika `walletId` diset: buat funding "out" transaction dengan `goalId`
- Double-check balance di dalam `updateData` updater (race condition safety)
- Return `{ ok: boolean; message?: string }`

### 5.7 Transfer Antar Dompet

- Membuat pair transaksi: "out" dari dompet sumber + "in" ke dompet tujuan
- Keduanya memiliki `transferId` yang sama
- Tidak dihitung dalam reporting/charts (bukan real income/expense)
- `updateTx` memblokir edit transfer tx

### 5.8 Sanitization

**`normalizeUserData`** (dipanggil setiap onSnapshot):
- `txs` → `sanitizeTransaction` (validasi id, type, amt, cat, date; preserve `isCarryForward === true`)
- `scheds` → `sanitizeSchedule` (validasi id, name, icon)
- `goals` → `sanitizeGoal` (validasi id, name, target, current, icon)
- `wallets` → `sanitizeWallet` (validasi id, name, icon, color, balance)
- `settings` → `sanitizeSettings` (validasi name, themeMode, fabCorner)
- `moods` → validasi key format + field mood
- Jika semua wallet gagal sanitasi → fallback ke `DEFAULT_WALLETS` (BCA + Cash)

**`sanitizeImportedUserData`** (dipanggil saat import/replaceAll):
- Sama dengan di atas tapi juga validasi struktur top-level

**DEFAULT_WALLETS**:
```ts
[
  { id: 1, name: "BCA", balance: 0, icon: "card", color: "emerald" },
  { id: 2, name: "Cash", balance: 0, icon: "cash", color: "teal" },
]
```

---

## 6. Icon System

### 6.1 Wallet Icons
Key → SVG icon via `getWalletIcon()` di `src/utils/icons.tsx`:
`card`, `cash`, `bank`, `savings`, `phone`, `gem`, `coin`, `expense`

### 6.2 Goal Icons
Key → SVG icon via `getGoalIcon()`:
`target`, `home`, `plane`, `laptop`, `car`, `emergency`, `graduation`, `ring`

### 6.3 Schedule Icons
Key → SVG icon via `getScheduleIcon()`:
`pin`, `meeting`, `workout`, `food`, `bill`, `study`, `medicine`, `alarm`

### 6.4 Greeting Icons
`getGreeting()` returns `{ text, iconKey }`:
- `sunrise` → `IconSunrise` (pagi)
- `sun` → `IconSun` (siang)
- `sunset` → `IconSunset` (sore)
- `moon` → `IconMoon` (malam)

### 6.5 Backward Compatibility
Legacy emoji icon keys (e.g., `"💰"`) render as text fallback with "Ganti ke baru" button.

---

## 7. Wallet Color System

`src/utils/walletColors.tsx` — 8 warna:

| Key | Hex | Label |
|-----|-----|-------|
| emerald | #10b981 | Emerald |
| blue | #3b82f6 | Biru |
| amber | #f59e0b | Amber |
| rose | #f43f5e | Rose |
| violet | #8b5cf6 | Violet |
| teal | #14b8a6 | Teal |
| cyan | #06b6d4 | Cyan |
| orange | #f97316 | Oranye |

`getWalletHex()` resolves key → hex. `walletCardStyle()` dan `walletCardHoverBorder()` untuk inline styles.

---

## 8. Logo System

- **File**: `public/logo_d_ukuran_disesuaikan.svg`
- **viewBox**: `160 40 360 360` (cropped dari `0 0 680 440` untuk hilangkan transparent padding)
- **Gradient**: `<linearGradient id="dGrad">` dengan stops: #059669 → #0891B2 → #2563EB → #7C3AED
- **Content**: White "D" letter on rounded rect background
- **Usage**: `<img>` tag dengan `object-contain`, **bukan** `object-cover`
- **NO** additional bg-gradient container yang wrap logo

### Logo "D" Dynamic Status
Logo di `Header.tsx` berubah warna/emoji berdasarkan skor keuangan:
- 😊 Green — skor bagus (score ≥ 70)
- 😅 Amber — skor sedang (score 40-69)
- 😰 Red — skor buruk (score < 40)
- 👋 Teal — netral / baru mulai

**JANGAN** tambahkan fungsi ke logo D kecuali user meminta secara eksplisit.

---

## 9. Dark Mode System

- **ThemeContext** mengelola 4 mode: `system`, `time`, `light`, `dark`
- `time` mode: light 06:00–17:59, dark 18:00–05:59
- Dark mode ditoggle via class `.dark` / `.light` di `<html>` element
- **JANGAN** pakai `prefers-color-scheme` media query untuk styling app — selalu pakai `.dark` class
- Card glow CSS menggunakan `.dark .group:hover > .card-glow` (bukan media query)
- `color-scheme` property di-removed dari `<html>` agar browser chrome mengikuti OS, bukan DUIT theme

---

## 10. Key Components Detail

### 10.1 DraggableFAB
- Native DOM events (bukan react-draggable library)
- CSS `transform: translate(x, y)` untuk movement
- Position saved langsung ke Firestore via `updateDoc` (bypass store queue)
- Debounced 3 detik (`DEBOUNCE_MS = 3000`)
- Snaps ke nearest corner saat drag selesai
- `hidden` prop menyembunyikan FAB saat chat open
- Chat icon: SVG messenger bubble di FAB, "D" letter di chat header (ORIGINAL — do NOT replace)

### 10.2 ChatWidget
- System prompt: persona "DUIT" — teman ngobrol serba bisa (bukan sekadar asisten keuangan)
- `buildAIContext()` melampirkan data user ke setiap pesan:
  - Saldo per dompet
  - Transaksi hari ini (excl CF, transfer, goal-funding; incl goal-withdrawal)
  - Transaksi 7 hari terakhir
  - Rekap bulan ini
  - Goals progress
  - Jadwal hari ini
  - Mood hari ini
  - Skor kesehatan
- Icon keys di-convert ke emoji via `goalIconLabel()` dan `schedIconLabel()` agar AI bisa baca
- Image upload support (max 1.5MB data URL)
- Rate limit: 12 req/min per IP
- **JANGAN** ubah persona/system prompt/provider/fallback tanpa permintaan eksplisit user

### 10.3 Auto Logout
- `useAutoLogout` hook — 5 menit inaktivitas → auto logout
- `sessionStorage.setItem("duit_session_expired", "1")` saat logout
- `LoginScreen` cek `consumeSessionExpired()` → tampilkan notifikasi "Sesi telah berakhir"

### 10.4 Toast System
- Module-level singleton di `src/hooks/useToast.ts`
- `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`
- Auto-dismiss 3 detik
- `ToastContainer.tsx` render di z-[100] top-right

### 10.5 StatCard + useCountUp
- `StatCard.tsx` menggunakan `useCountUp` hook untuk animasi angka
- `useCountUp` **BUKAN** orphan — masih dipakai aktif

---

## 11. API Endpoints (Vercel Serverless)

### 11.1 `/api/chat`
- **Method**: POST
- **Auth**: Firebase ID token (Bearer header) — jika admin SDK tersedia
- **Rate limit**: 12 req/min per IP
- **Primary**: Gemini 2.5 Flash
- **Fallback**: Groq Llama 3.3 70B
- **Environment vars**: `GEMINI_API_KEY`, `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_BASE64`

### 11.2 `/api/calendar.ics`
- **Method**: GET
- **Params**: `uid`, `token` (calendarToken dari Firestore)
- **Auth**: `timingSafeEqual` comparison token
- **Returns**: iCal file (.ics) dari jadwal user
- **Environment vars**: `FIREBASE_SERVICE_ACCOUNT_BASE64`

---

## 12. Deployment

### Build & Deploy
```bash
# Validasi sebelum deploy
npm ci
./node_modules/.bin/tsc --noEmit
npm run build
git diff --check

# Deploy (push to main = auto deploy ke Vercel)
git add -A
git commit -m "pesan commit"
git push
```

### ZIP + rsync (user preference)
```bash
# Di sandbox: buat ZIP lengkap
cd /home/user/duit-react
zip -r /home/user/duit-fix.zip . -x "node_modules/*" ".git/*" "dist/*" ".cache/*"

# Di local user: extract lalu rsync
unzip duit-fix.zip -d /tmp/duit-fix
cd /Users/christianbahyuardianto/Downloads/modern-animated-html-clone
rsync -av /tmp/duit-fix/ ./
```

**PENTING**: ZIP structure — files at root, no subfolder. rsync source harus `/tmp/<extract-dir>/` (dengan trailing slash).

### Environment Variables (Vercel)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
GEMINI_API_KEY
GROQ_API_KEY
FIREBASE_SERVICE_ACCOUNT_BASE64
```

---

## 13. Changelog — Semua Perubahan

### Audit #1 (10 bugs fixed)
| ID | Bug | Fix |
|----|-----|-----|
| A1 | EditTransactionModal tidak tampilkan peringatan untuk transfer tx | Tambahkan cek `tx.transferId`, tampilkan warning |
| A2 | normalizeUserData tidak sanitize icon dari Firestore | Terapkan `sanitizeSchedule/goal/wallet` pada array |
| A3 | JadwalView tidak menampilkan icon jadwal | Import `getScheduleIcon`, render di setiap row |
| B1 | EmptyState icon container `text-4xl` terlalu besar | Hapus `text-4xl`, cukup `h-16 w-16` |
| B2 | KeuanganView "Dompet" add button pakai custom inline SVG | Ganti ke `<IconPlus>` |
| B3 | Card component inject `<style>` tag duplikat per instance | Pindahkan ke `index.css` (`.card-glow` class) |
| B4 | `getGreeting()` return emoji, bukan SVG icon | Return `iconKey`, buat IconSunrise/IconSunset, Header render SVG |
| C1 | EditWalletModal balance calculation fragile | Tambahkan comment penjelasan |
| C2 | Card hover glow opacity dead code | Hapus `group-hover:opacity-20` dari className |

### Audit #2 (4 bugs fixed)
| ID | Bug | Fix |
|----|-----|-----|
| D1 | normalizeUserData tidak sanitize settings | Ganti spread dengan `sanitizeSettings()` |
| D2 | normalizeUserData tidak sanitize txs | Ganti dengan `remote.txs.map(sanitizeTransaction).filter(...)` |
| D3 | normalizeUserData tidak sanitize moods | Tambahkan validasi moods |
| D4 | Card glow CSS pakai `prefers-color-scheme` media query | Ganti ke `.dark` class-based |

### Audit #3 (3 bugs fixed)
| ID | Bug | Fix |
|----|-----|-----|
| E1 | `updateTx` balance validation logic inverted/broken | Fix: `newBalance = sourceBalance + oldAmt - patch.amt`, reject jika < 0 |
| E2 | normalizeUserData wallet fallback missing | Jika semua wallet gagal sanitasi → fallback ke `DEFAULT_WALLETS` |
| E3 | todaySchedules sort return missing | Tambahkan `return 0` di sort comparator |

### Feature: Saldo Bulan Lalu (Carry Forward)
- `isCarryForward?: boolean` field pada Transaction interface
- Auto-generate CF entry per wallet di tanggal 1
- Auto-update jika amount berubah
- Auto-delete jika balance = 0 atau wallet dihapus
- Gap-filling untuk bulan yang terlewat (via `nextMonth()` helper)
- `cfProcessingRef` mencegah re-entrancy (5s timeout)
- Dikecualikan dari semua kalkulasi keuangan
- UI: teal styling, IconCalendar, "↗" prefix, "Saldo Bulan Lalu" label
- KeuanganView: teal banner menampilkan total CF semua wallet

### Feature: Goal Initial Savings (D5 Fix)
- GoalModal: wallet dropdown muncul saat tabungan awal > 0
- `addGoal` signature: `Omit<Goal, "id"> & { walletId?: number }` → `{ ok, message? }`
- Buat funding "out" transaction dengan `goalId` saat initial savings > 0
- Double-check balance di dalam `updateData` updater

### Feature: Goal Withdrawal as Income
- `isRealFlow` updated: goal withdrawal ("in"+goalId) = real income
- TransactionList: goal withdrawal = emerald + "+" + "Tarik dari Goal"; goal funding = blue + "→" + "Nabung Goal"
- EditTransactionModal: warning text berbeda untuk withdrawal vs funding
- WeeklyChart: symmetric — both goal flows excluded from chart bars

### Audit #4 (6 bugs fixed)
| ID | Bug | Fix |
|----|-----|-----|
| F1 | TransactionList CF delete confirm dialog still fires | Tambahkan onConfirm guard + toast.error |
| F2 | EditWalletModal netTxAmount includes CF+goal | Filter: `!t.transferId && !t.isCarryForward && !t.goalId` |
| F3 | KeuanganView CF banner only shows first wallet | Sum semua CF entries |
| F5 | WeeklyChart asymmetric goal flows | Exclude goal withdrawal from income AND goal funding from expense |
| F6 | cfProcessingRef 2s timeout too short | Increase to 5000ms |
| F8 | overspend check requires inMonth > 0 | Change to `outMonth > inMonth` |

### Logo Loader Fix (latest)
| Bug | Fix |
|-----|-----|
| FullScreenLoader di App.tsx masih pakai logo lama (gradient div + "D") | Ganti ke `<img src="/logo_d_ukuran_disesuaikan.svg">` — sama dengan DashboardLoader |

---

## 14. Known Issues / Accepted Trade-offs

| ID | Deskripsi | Status |
|----|-----------|--------|
| F4 | `addGoal` returns `{ok: true}` even when inner `updateData` silently rejects funding tx due to race condition | **Accepted** — rare edge case, no clean fix without major refactor |
| F7 | Header GreetingIcon undefined guard | **Already guarded** — cosmetic, `&&` check in place |
| F9 | `addWallet` no duplicate name check in store | **All UI paths validate** — low risk |
| F10 | TimelineCard uses browser time instead of Asia/Jakarta | **Cosmetic** — only affects non-WIB users |

---

## 15. Developer Notes & Rules

### WAJIB PATUHI
1. **Bahasa aplikasi**: Indonesia — semua UI text, toast, label dalam Bahasa Indonesia
2. **ZIP deployment**: ZIP lengkap → extract → `rsync -av /tmp/<dir>/ ./` (trailing slash penting!)
3. **JANGAN ubah** persona/system prompt/provider/fallback AI DUIT tanpa permintaan eksplisit
4. **JANGAN ganti** chat icon — tetap SVG messenger bubble di FAB, "D" letter di chat header
5. **JANGAN hapus** `savingsPct` dari store return — masih di-compute dan di-export
6. **JANGAN modifikasi** PizzaChart kecuali diminta secara eksplisit
7. **JANGAN tambahkan** fungsi ke logo D kecuali diminta secara eksplisit
8. **Logo SVG**: NO additional bg-gradient container. `<img>` dengan `object-contain` saja.
9. **Wallet/Goal names** di dropdown/text: tampilkan nama user-given saja (tanpa icon key)
10. **Modern outline SVG icons** (Lucide/Feather style) — bukan emoji — di semua tempat
11. **Validasi sebelum ZIP**: `npm ci`, `tsc --noEmit`, `npm run build`, `git diff --check`

### Return Value Patterns
- `addTx()` → `{ ok: boolean; message?: string }` — selalu handle return value
- `transferWallet()` → `{ ok: boolean; message?: string }` — selalu handle return value
- `addGoal()` → `{ ok: boolean; message?: string }` — selalu handle return value
- `updateTx()` → blocks CF, transfer, goalId transactions — do NOT bypass
- `delTx()` → blocks CF transactions — do NOT bypass

### Key Patterns
- `dataRef` pattern: `const dataRef = useRef(data); dataRef.current = data;` — avoid stale closures
- `createId()`: `crypto.randomUUID()` with fallback `Date.now() * 10000 + Math.floor(Math.random() * 10000)`
- Dark mode: selalu pakai `.dark` class, JANGAN `prefers-color-scheme` media query
- Date keys: selalu `dateKeyInJakarta()` — JANGAN `new Date().toISOString()` atau local browser time

---

## 16. Firestore Schema

### Document: `users/{uid}`
```typescript
{
  txs: Transaction[]       // Semua transaksi
  scheds: ScheduleItem[]   // Jadwal
  goals: Goal[]            // Goals
  wallets: Wallet[]        // Dompet
  moods: Record<string, { mood: string; label: string; note: string }>  // Key: "YYYY-MM-DD"
  settings: Settings       // { name, avatar?, themeMode?, calendarToken?, fabCorner? }
}
```

### Transaction
```typescript
{
  id: number               // createId()
  type: "in" | "out"
  amt: number              // Jumlah (positive)
  cat: string              // Kategori
  desc: string             // Deskripsi
  date: string             // "YYYY-MM-DD" (Asia/Jakarta)
  walletId?: number        // Dompet terkait
  goalId?: number          // Jika transaksi goal
  transferId?: number      // Jika transfer antar dompet (pair id)
  isCarryForward?: boolean // Jika CF entry
}
```

---

## 17. Quick Reference Commands

```bash
# Dev server
cd duit-react && npm run dev

# Type check
./node_modules/.bin/tsc --noEmit

# Build production
npm run build

# Create deployment ZIP
zip -r duit-deploy.zip . -x "node_modules/*" ".git/*" "dist/*" ".cache/*"

# Extract & rsync to local repo
unzip duit-deploy.zip -d /tmp/duit-deploy
rsync -av /tmp/duit-deploy/ /path/to/local/repo/

# Git push (from user's local machine, NOT sandbox)
git add -A && git commit -m "message" && git push
```

---

*Dokumen ini dibuat sebagai handover lengkap untuk developer berikutnya yang melanjutkan development DUIT.*
