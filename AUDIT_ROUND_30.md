# DUIT — CSP & Authentication Regression Audit Round 30

**Tanggal audit:** 2026-08-01  
**Scope:** post-CSP deployment compatibility, Google Auth, browser security headers, and client-side regression. Firestore data architecture excluded.

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

### R30-01 — [HIGH] CSP can block Firebase Google Auth iframe/popup flow

**Location:** `vercel.json` Content-Security-Policy.

**Issue:** CSP has no `frame-src`, so browser falls back to `default-src 'self'`. Firebase Auth `signInWithPopup` may use Firebase/Auth handler iframes or Google identity frames from `*.firebaseapp.com`, `accounts.google.com`, and `*.google.com`. Those frames can be blocked after CSP deploy even though `connect-src` is allowed.

**Impact:** Google sign-in can fail only in production after the security headers deploy.

**Fix:** explicitly add `frame-src https://*.firebaseapp.com https://accounts.google.com https://*.google.com;` and `object-src 'none'` to CSP. Validate Google login in Vercel Production after deploy.

---

### R30-02 — [MEDIUM] CSP does not define `worker-src`

**Location:** `vercel.json`.

**Issue:** Firebase/browser SDK behavior can use worker/blob resources depending on browser/version. Without `worker-src`, it falls back to restrictive default-src self. This may be fine today, but can cause difficult-to-diagnose compatibility issues after Firebase SDK updates.

**Fix:** add `worker-src 'self' blob:` after testing.

---

### R30-03 — [LOW] No automated CSP/Google login smoke test

**Location:** test suite.

**Issue:** build/typecheck cannot verify CSP behavior. Google popup/iframe failure is browser/runtime only.

**Fix:** add manual production checklist now; add Playwright smoke test with CSP header verification later.

---

### R30-04 — [LOW] Header policy is applied uniformly to API and HTML routes

**Location:** `vercel.json` source `/(.*)`.

**Issue:** CSP/security headers on API JSON/calendar responses are harmless but unnecessary. Calendar already sets its own Cache-Control, but a route-specific header policy would be clearer.

**Fix:** optional refinement: scope CSP to HTML/static routes and retain only relevant headers for `/api/*`.

---

## Status

Audit Round 30: **not clean** — 1 HIGH, 1 MEDIUM, 2 LOW. No source code changed by this audit.
