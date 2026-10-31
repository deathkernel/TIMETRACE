importScripts("storage.js");

const IDLE_SECONDS = 60;
let current = null;
let lastReconcile = Date.now();
let queue = Promise.resolve();

function serialized(fn) {
  queue = queue.then(fn).catch(error => console.error("TimeTrace:", error));
  return queue;
}

function supportedTab(tab) {
  const domain = tab?.url ? TimeTraceStore.domainFromUrl(tab.url) : null;
  return domain ? { domain, tabId: tab.id } : null;
}

async function getCandidate() {
  const windows = await chrome.windows.getLastFocused({ populate: true });
  if (!windows.focused || windows.state === "minimized") return null;
  const active = windows.tabs?.find(tab => tab.active);
  return supportedTab(active);
}

async function reconcile() {
  const now = Date.now();
  const candidate = await getCandidate().catch(() => null);
  let idleState = "active";
  try { idleState = await chrome.idle.queryState(IDLE_SECONDS); } catch {}
  const next = idleState === "active" ? candidate : null;

  if (current) {
    const elapsed = Math.max(0, Math.min(now - lastReconcile, 30_000));
    if (elapsed > 0) {
      await TimeTraceStore.addDuration(current.domain, lastReconcile, lastReconcile + elapsed);
    }
  }

  current = next;
  lastReconcile = now;
}

function scheduleReconcile() {
  serialized(reconcile);
}

chrome.runtime.onStartup.addListener(scheduleReconcile);
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("timetrace-heartbeat", { periodInMinutes: 0.5 });
  scheduleReconcile();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "timetrace-heartbeat") scheduleReconcile();
});
chrome.tabs.onActivated.addListener(scheduleReconcile);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") scheduleReconcile();
});
chrome.tabs.onRemoved.addListener(scheduleReconcile);
chrome.windows.onFocusChanged.addListener(scheduleReconcile);
chrome.idle.onStateChanged.addListener(scheduleReconcile);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SUMMARY") {
    TimeTraceStore.getData().then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "OPEN_DASHBOARD") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
  if (message?.type === "RECONCILE") {
    serialized(reconcile).then(() => sendResponse({ ok: true }));
    return true;
  }
});
