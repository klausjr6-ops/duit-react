# DUIT Production Smoke Test

Run after every production deploy.

1. Open production in a private/incognito browser and hard refresh.
2. Verify email/password login and Google login.
3. Add a transaction, schedule, transfer, and goal funding; verify each appears after refresh.
4. Open Keuangan → Laporan and verify month navigation and table.
5. Open Chat AI, send a short prompt, then confirm one AI action preview.
6. Open the iCalendar URL from Account and verify the calendar client can read events.
7. Toggle Light/Dark and Default/Kontekstual dashboards.
8. Open browser console and verify no CSP violations or uncaught errors.
9. Verify offline banner by temporarily disabling network, then re-enable it.
