importScripts("storage.js");

const IDLE_SECONDS = 60;
const HEARTBEAT_MINUTES = 0.5;
const STATE_KEY = "timetraceTrackingState";
let queue = Promise.resolve();

function serialized(task) {
  queue = queue.then(task).catch(error => console.error("TimeTrace:", error));
  return queue;
}

function supportedTab(tab) {
  const domain = tab && tab.url ? TimeTraceStore.domainFromUrl(tab.url) : null;
  return domain ? { domain: domain, tabId: tab.id } : null;
}

async function getCandidate() {
  const win = await chrome.windows.getLastFocused({ populate: true });
  if (!win.focused || win.state === "minimized") return null;
  return supportedTab((win.tabs || []).find(tab => tab.active));
}

async function notifyGoalProgress(day, domain) {
  const data = await TimeTraceStore.getData();
  const goal = data.goals[domain];
  const used = data.days[day] && data.days[day][domain] || 0;
  if (!goal || used <= 0) return;

  for (const threshold of [80, 100]) {
    if (used < goal * threshold / 100) continue;
    const claimed = await TimeTraceStore.claimAlert(day, domain, threshold);
    if (!claimed) continue;

    const message = threshold === 100
      ? domain + " reached its daily limit of " + Math.round(goal / 60) + " minutes."
      : domain + " has used " + Math.round(used / 60) + " of " + Math.round(goal / 60) + " goal minutes.";
    try {
      await chrome.notifications.create("timetrace-" + day + "-" + encodeURIComponent(domain) + "-" + threshold, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icon128.png"),
        title: threshold === 100 ? "TimeTrace: daily limit reached" : "TimeTrace: 80% of daily limit",
        message: message,
        priority: 0
      });
    } catch (error) {
      console.warn("TimeTrace notification could not be shown:", error);
    }
  }
}

async function reconcile() {
  const now = Date.now();
  const stored = await chrome.storage.session.get(STATE_KEY);
  const previous = stored[STATE_KEY] || null;
  const candidate = await getCandidate().catch(() => null);
  let idleState = "active";
  try {
    idleState = await chrome.idle.queryState(IDLE_SECONDS);
  } catch (error) {
    console.warn("TimeTrace idle state unavailable:", error);
  }

  if (previous && previous.domain && Number.isFinite(previous.lastAt)) {
    // The cap prevents a delayed alarm or suspended browser from inflating usage.
    const elapsed = Math.max(0, Math.min(now - previous.lastAt, 45_000));
    if (elapsed > 0) {
      const segments = await TimeTraceStore.addDuration(previous.domain, previous.lastAt, previous.lastAt + elapsed);
      for (const segment of segments) await notifyGoalProgress(segment.day, segment.domain);
    }
  }

  const next = idleState === "active" ? candidate : null;
  await chrome.storage.session.set({
    [STATE_KEY]: next ? { domain: next.domain, tabId: next.tabId, lastAt: now } : null
  });
}

async function initializeTracker() {
  try { chrome.idle.setDetectionInterval(IDLE_SECONDS); } catch {}
  await chrome.alarms.create("timetrace-heartbeat", { periodInMinutes: HEARTBEAT_MINUTES });
  await reconcile();
}

chrome.runtime.onInstalled.addListener(() => serialized(initializeTracker));
chrome.runtime.onStartup.addListener(() => serialized(initializeTracker));
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "timetrace-heartbeat") serialized(reconcile);
});
chrome.tabs.onActivated.addListener(() => serialized(reconcile));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") serialized(reconcile);
});
chrome.tabs.onRemoved.addListener(() => serialized(reconcile));
chrome.windows.onFocusChanged.addListener(() => serialized(reconcile));
chrome.idle.onStateChanged.addListener(() => serialized(reconcile));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && (message.type === "GET_SUMMARY" || message.type === "RECONCILE")) {
    serialized(async () => {
      await reconcile();
      if (message.type === "GET_SUMMARY") {
        const data = await TimeTraceStore.getData();
        sendResponse({ ok: true, data: data });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;
  }
  if (message && message.type === "OPEN_DASHBOARD") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
});