# TimeTrace

A privacy-first Chrome Manifest V3 extension for understanding active browsing time.

## Features
- Tracks the active website while the Chrome window is focused and the user is active.
- Daily, 7-day and 30-day website analytics.
- Hourly activity heatmap and daily website timeline.
- Work + Learning focus-time totals and peak focus hour.
- Week-over-week browsing comparison.
- Editable website categories and daily time goals.
- Optional browser notifications at 80% and 100% of a website's daily goal.
- Configurable history retention: 30, 90, 180, 365 days, or keep forever.
- JSON backup and restore.
- Local-only storage. No AI, account, analytics server or external service.

## Install
1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked and select this folder.
5. Pin TimeTrace to the toolbar.

## Privacy
TimeTrace stores domain-level durations, hourly buckets, category choices, goals and alert markers in `chrome.storage.local`. Its current tracking interval is stored in `chrome.storage.session` so it survives service-worker suspension. Chrome clears this session state if the extension is disabled, reloaded or updated, and when the browser restarts; tracking then resumes with a fresh interval. It does not record page contents, full URLs, form values or keystrokes.

The extension requests tabs, storage, idle, alarms and notifications permissions. Broad HTTP/HTTPS host access is used only to read the active tab's hostname. All analysis runs locally.

## Tracking accuracy
The tracker reconciles on tab, window, focus and idle events, plus a 30-second heartbeat. Each interval is capped at 45 seconds so a delayed worker does not add an arbitrarily large amount of time. Intervals are split at hour boundaries and local midnight. Browser lifecycle and API scheduling can still cause small measurement gaps; this is an estimate of active tab time, not operating-system-wide screen time.

## History retention
History retention defaults to 365 days. Users can select 30, 90, 180 or 365 days, or keep history forever. The cleanup runs on startup and daily. Categories and daily goals are retained when older browsing records are cleaned up. Backups contain local history and settings; store exported backup files somewhere private.

## Development
No third-party runtime dependency or build step is required.

Run tests with Node.js:
```sh
npm test
```
