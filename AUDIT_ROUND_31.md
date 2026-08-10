# DUIT — Runtime Resilience Audit Round 31

**Tanggal audit:** 2026-08-01  
**Scope:** runtime crash resilience, offline UX, client error handling, component lifecycle, and non-Firestore release readiness.

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

### R31-01 — [MEDIUM] No global React Error Boundary

**Location:** `src/main.tsx` / root tree.

**Issue:** no `ErrorBoundary` is present. A runtime render exception in one lazy view, chart, modal, or browser-specific API can blank/unmount the app tree with no recovery UI.

**Impact:** user can lose access to all app UI until manual refresh; dangerous for financial app because error state looks like broken app without explanation.

**Fix:** add root Error Boundary with DUIT branded fallback, reload action, and a safe non-sensitive error message. Log underlying error to console only.

---

### R31-02 — [MEDIUM] No offline/online state indicator or retry path outside Firestore sync error

**Location:** root app/client behavior.

**Issue:** Firestore sync error covers write failures, but browser connectivity state is not surfaced globally. AI, font, refresh, and auth requests can fail while user sees no persistent offline state.

**Impact:** user may repeatedly trigger actions believing app is online.

**Fix:** add global online/offline listener with small non-blocking banner; automatically remove it on `online` and provide retry refresh action.

---

### R31-03 — [LOW] AI 503 becomes generic assistant bubble and is persisted as chat history

**Location:** `ChatWidget.tsx`.

**Issue:** API now correctly returns 503 on provider outage, but client catches all non-OK HTTP as generic connection error and appends a fake assistant message. That fallback is persisted into local chat history as if DUIT actually said it.

**Fix:** parse API error/status; show transient error banner/toast without appending a normal assistant message for 429/503.

---

### R31-04 — [LOW] Legacy `useFinanceData` hook remains in source and uses old localStorage state

**Location:** `src/hooks/useFinanceData.ts`.

**Issue:** hook appears unused, but contains a parallel `duit_app_state` localStorage implementation. Future contributors may accidentally use it and split source of truth from Firestore.

**Fix:** remove/deprecate hook or add explicit comment/export guard that it is legacy and must not be used.

---

### R31-05 — [LOW] No manual production smoke-test checklist is versioned

**Location:** repository docs.

**Issue:** CSP, Google login, calendar feed, AI API, and Vercel environment variables have runtime dependencies that build/test cannot validate.

**Fix:** add `PRODUCTION_SMOKE_TEST.md` with a short reproducible checklist after each deploy.

---

## Status perbaikan — 2026-08-01

| ID | Status | Perbaikan |
|---|---|---|
| R31-01 | Fixed | Root `AppErrorBoundary` dengan recovery reload UI ditambahkan. |
| R31-02 | Fixed | `NetworkStatusBanner` global menampilkan offline/online state. |
| R31-03 | Fixed | Chat 429/503 tampil sebagai error transient dan tidak dipersist menjadi bubble assistant. |
| R31-04 | Fixed | Hook `useFinanceData` legacy localStorage dihapus. |
| R31-05 | Fixed | Ditambahkan `PRODUCTION_SMOKE_TEST.md`. |

Rate limit durable dan E2E browser tetap memerlukan layanan/dependency tambahan. Validasi source: tests 9/9, build dan typecheck lulus.
