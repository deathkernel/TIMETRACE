# TimeTrace

A privacy-first Chrome Manifest V3 extension for understanding active browsing time.

## Features
- Tracks the active website while the Chrome window is focused and the user is active.
- Daily, 7-day and 30-day analytics with category breakdowns.
- Editable website categories and daily time goals.
- Optional browser notifications at 80% and 100% of a website's daily goal.
- JSON backup and restore.
- Local-only storage. No AI, account, analytics server or external service.

## Install
1. Clone or download this repository.
2. Open chrome://extensions.
3. Enable Developer mode.
4. Click Load unpacked and select this folder.
5. Pin TimeTrace to the toolbar.

## Privacy
TimeTrace stores domain-level durations, category choices, goals and alert markers in chrome.storage.local. Its tracking session timestamp is stored in chrome.storage.session so it can survive service-worker suspension but is cleared when the browser session ends. It does not record page contents, full URLs, form values or keystrokes.

The extension requests tabs, storage, idle, alarms and notifications permissions. Broad HTTP/HTTPS host access is used only to read the active tab's hostname. All analysis runs locally.

## Tracking accuracy
The tracker reconciles on tab, window, focus and idle events, plus a 30-second heartbeat. Each interval is capped at 45 seconds so a delayed worker does not add an arbitrarily large amount of time. Intervals crossing local midnight are split between the correct dates. Browser lifecycle and API scheduling can still cause small measurement gaps; this is an estimate of active tab time, not operating-system-wide screen time.

## Development
No third-party runtime dependency or build step is required.

Run tests with Node.js:
    npm test
