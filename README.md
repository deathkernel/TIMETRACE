# TimeTrace

A privacy-first Chrome extension that tracks active browsing time locally.

## Features
- Tracks the active tab only while Chrome is focused and the user is not idle.
- Daily website usage totals and recent activity.
- Built-in website categories (Work, Learning, Social, Entertainment, Other).
- Editable category rules and per-site daily goals.
- Dashboard with today / 7-day / 30-day summaries.
- Local-only data using `chrome.storage.local`; no AI, analytics server, or account.
- Export and import backups as JSON.

## Install (developer mode)
1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this folder.
5. Pin TimeTrace.

## Privacy and tracking notes
TimeTrace records domain-level activity durations, not page contents, URLs, form values, or keystrokes. Tracking pauses when Chrome loses focus, the active tab is not a normal web page, or Chrome's idle API reports the user idle/locked. Browser APIs can delay suspend events; the service worker reconciles elapsed time with a short heartbeat and caps each accounting interval to reduce over-counting.

All records remain in Chrome local extension storage. Clearing extension data removes the local history.

## Project layout
- `manifest.json`: Manifest V3 permissions and entry points.
- `background.js`: tracking engine, idle/focus/tab lifecycle handling.
- `storage.js`: local persistence and aggregation helpers.
- `popup/`: quick today summary.
- `dashboard/`: detailed reports, site categories, goals and backup controls.

## Development
No build step or third-party dependency is required. The dashboard charts are drawn with native SVG/CSS, keeping the extension fully offline.
