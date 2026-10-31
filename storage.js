(() => {
  const KEY = "timetraceData";
  const VERSION = 1;
  const CATEGORIES = ["Work", "Learning", "Social", "Entertainment", "Other"];

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function domainFromUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.hostname.replace(/^www\./i, "").toLowerCase() || null;
    } catch {
      return null;
    }
  }

  function normalizeDomain(value) {
    const input = String(value || "").trim();
    if (!input) return null;
    try {
      const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : "https://" + input);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (!domain || !domain.includes(".") || domain.length > 253) return null;
      if (!/^[a-z0-9.-]+$/.test(domain) || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return null;
      return domain;
    } catch {
      return null;
    }
  }

  function defaultCategory(domain) {
    const rules = [
      ["Work", /(^|\.)(github|gitlab|stackoverflow|stackexchange|notion|slack|figma|linear|trello|asana|atlassian)\./i],
      ["Learning", /(^|\.)(wikipedia|coursera|udemy|khanacademy|edx|developer\.mozilla|docs\.)/i],
      ["Social", /(^|\.)(facebook|instagram|x|twitter|reddit|linkedin|discord|pinterest)\./i],
      ["Entertainment", /(^|\.)(youtube|netflix|primevideo|hotstar|spotify|twitch|crunchyroll)\./i]
    ];
    return (rules.find(([, regex]) => regex.test(domain)) || ["Other"])[0];
  }

  function emptyData() {
    return { version: VERSION, days: {}, categories: {}, goals: {}, alerts: {}, settings: { idleSeconds: 60 } };
  }

  async function read() {
    const result = await chrome.storage.local.get(KEY);
    const stored = result[KEY];
    if (!stored || stored.version !== VERSION) return emptyData();
    return {
      ...emptyData(),
      ...stored,
      days: stored.days || {},
      categories: stored.categories || {},
      goals: stored.goals || {},
      alerts: stored.alerts || {},
      settings: { idleSeconds: 60, ...(stored.settings || {}) }
    };
  }

  async function write(data) {
    await chrome.storage.local.set({ [KEY]: data });
  }

  // Split intervals at local midnight so each day receives only its own time.
  async function addDuration(domain, startMs, endMs) {
    if (!domain || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
    const data = await read();
    const touched = [];
    let cursor = startMs;

    while (cursor < endMs) {
      const day = todayKey(new Date(cursor));
      const midnight = new Date(cursor);
      midnight.setHours(24, 0, 0, 0);
      const segmentEnd = Math.min(endMs, midnight.getTime());
      const seconds = Math.floor((segmentEnd - cursor) / 1000);

      if (seconds > 0) {
        data.days[day] ||= {};
        data.days[day][domain] = (data.days[day][domain] || 0) + seconds;
        touched.push({ day, domain, seconds, totalSeconds: data.days[day][domain] });
      }
      cursor = segmentEnd;
    }

    if (touched.length) await write(data);
    return touched;
  }

  async function claimAlert(day, domain, threshold) {
    const data = await read();
    const key = day + "|" + domain + "|" + threshold;
    if (data.alerts[key]) return false;
    data.alerts[key] = true;
    await write(data);
    return true;
  }

  async function getData() { return read(); }

  async function setCategory(domain, category) {
    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain || !CATEGORIES.includes(category)) throw new Error("Choose a valid website and category.");
    const data = await read();
    data.categories[cleanDomain] = category;
    await write(data);
  }

  async function setGoal(domain, seconds) {
    const cleanDomain = normalizeDomain(domain);
    const limit = Math.floor(Number(seconds));
    if (!cleanDomain) throw new Error("Enter a valid domain, such as example.com.");
    if (!Number.isFinite(limit) || limit < 0 || limit > 86400) throw new Error("Goal must be between 1 minute and 24 hours.");
    const data = await read();
    if (limit > 0) data.goals[cleanDomain] = limit;
    else delete data.goals[cleanDomain];
    await write(data);
  }

  async function replaceData(data) {
    if (!data || data.version !== VERSION || !data.days || typeof data.days !== "object" || Array.isArray(data.days)) {
      throw new Error("Invalid TimeTrace backup file.");
    }
    const safe = emptyData();
    safe.days = data.days;
    safe.categories = data.categories && typeof data.categories === "object" ? data.categories : {};
    safe.goals = data.goals && typeof data.goals === "object" ? data.goals : {};
    safe.alerts = data.alerts && typeof data.alerts === "object" ? data.alerts : {};
    safe.settings = { idleSeconds: 60, ...(data.settings || {}) };
    await write(safe);
  }

  globalThis.TimeTraceStore = {
    todayKey, domainFromUrl, normalizeDomain, defaultCategory, read, write,
    addDuration, claimAlert, getData, setCategory, setGoal, replaceData
  };
})();