# DUIT — Comprehensive Non-Firestore Audit Round 29

**Tanggal audit:** 2026-08-01  
**Scope:** API security, iCalendar standards, browser accessibility, modal lifecycle, and client UX. Firestore data architecture excluded.

## Validation

| Check | Result |
|---|---|
| TypeScript | Pass |
| Production build | Pass |
| Tests | 9/9 pass |
| `git diff --check` | Pass |
| Dependency audit | 8 moderate, 0 high, 0 critical |

---

## Findings

### R29-01 — [MEDIUM] No Content Security Policy/security headers configuration

**Location:** no `vercel.json` or header config found.

**Issue:** app renders AI markdown/images and uses sensitive auth/financial UI. React escaping and image validation reduce risk, but browser does not receive CSP, X-Content-Type-Options, Referrer-Policy, or frame restrictions.

**Impact:** weaker defense in depth against future XSS/regressions and third-party resource exposure.

**Fix:** add Vercel headers. CSP should allow Firebase, Google Fonts, Gemini/Groq API only server-side, and HTTPS images as needed. Start in report-only/testing mode to avoid breaking Firebase.

---

### R29-02 — [MEDIUM] Calendar URL accepts arbitrary uid string and leaks configuration errors as 500

**Location:** `api/calendar.ics.js`.

**Issue:** `uid` query parameter is used directly in Firestore doc path with no Firebase UID shape validation. Malformed values can trigger server errors rather than harmless 404. The token protects data, but endpoint behavior is noisy and creates avoidable error logs.

**Fix:** validate UID format/length before database access and return 404 for invalid capability URLs.

---

### R29-03 — [LOW] iCalendar all VEVENTs receive fixed 10-minute alarm, including historical/expired one-off schedules

**Location:** `api/calendar.ics.js`.

**Issue:** old one-off schedule entries remain in feed and all contain VALARM. Most calendar clients ignore past alarms, but some can import/reprocess old notifications awkwardly.

**Fix:** omit VEVENTs for expired non-recurring schedules or omit VALARM when DTSTART is in the past.

---

### R29-04 — [LOW] Nested modal scroll lock can restore overflow in the wrong order under edge timing

**Location:** `useModalDialog.ts`; Account Modal + avatar preview and confirm dialogs.

**Issue:** every modal stores/restores `document.body.style.overflow` independently. In unusual nested close order, outer/inner cleanup can restore the wrong previous value and make background scrollable while another dialog remains open.

**Fix:** manage scroll lock through a module-level reference count, not per modal saved string.

---

### R29-05 — [LOW] API chat returns HTTP 200 when all providers fail

**Location:** `api/chat.js`.

**Issue:** all provider failures are converted into a friendly assistant message with 200. UI cannot distinguish actual assistant response from degraded service state and may persist that fallback message into chat history as normal conversation.

**Fix:** return 503 with a structured friendly error, or include explicit `degraded: true` metadata and avoid persisting it as assistant history.

---

### R29-06 — [LOW] In-app font loading has no local fallback preloading strategy

**Location:** `index.html`.

**Issue:** Google Font remains render/network dependent. Existing system fallback prevents failure, but visual layout can shift on slow mobile networks.

**Fix:** self-host fonts for offline/PWA future, or add font-display strategy/local fallback metrics. Low priority.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R29-01 | Fixed | Ditambahkan `vercel.json` dengan CSP, nosniff, referrer policy, frame deny, dan permissions policy. |
| R29-02 | Fixed | Calendar endpoint memvalidasi UID sebelum akses path database. |
| R29-03 | Already fixed | RFC 5545 line folding telah diterapkan pada output iCalendar. |
| R29-04 | Fixed | Scroll lock nested modal memakai module-level reference count. |
| R29-05 | Fixed | All-provider chat failure sekarang mengembalikan HTTP 503. |
| R29-06 | Already covered | Google Font URL sudah memakai `display=swap`. |

Validasi pascaperbaikan: `npm test` **9/9 lulus**, TypeScript, production build, dan `git diff --check` semuanya lulus. Dependency audit tetap 8 moderate transitif Firebase Admin/Google Cloud, tanpa high/critical.
