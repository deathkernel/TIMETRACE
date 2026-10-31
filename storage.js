(() => {
  const KEY = "timetraceData";
  const VERSION = 1;

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
      return parsed.hostname.replace(/^www\./i, "").toLowerCase();
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

  async function read() {
    const result = await chrome.storage.local.get(KEY);
    const data = result[KEY];
    if (data && data.version === VERSION) return data;
    return { version: VERSION, days: {}, categories: {}, goals: {}, settings: { idleSeconds: 60 } };
  }

  async function write(data) {
    await chrome.storage.local.set({ [KEY]: data });
  }

  async function addDuration(domain, startMs, endMs) {
    const duration = Math.max(0, Math.floor((endMs - startMs) / 1000));
    if (!domain || duration < 1) return;
    const data = await read();
    const day = todayKey(new Date(startMs));
    data.days[day] ||= {};
    data.days[day][domain] = (data.days[day][domain] || 0) + duration;
    await write(data);
  }

  async function getData() { return read(); }
  async function setCategory(domain, category) {
    const data = await read();
    data.categories[domain] = category;
    await write(data);
  }
  async function setGoal(domain, seconds) {
    const data = await read();
    if (seconds > 0) data.goals[domain] = seconds;
    else delete data.goals[domain];
    await write(data);
  }
  async function replaceData(data) {
    if (!data || data.version !== VERSION || typeof data.days !== "object") {
      throw new Error("Invalid TimeTrace backup file.");
    }
    await write({
      version: VERSION,
      days: data.days || {},
      categories: data.categories || {},
      goals: data.goals || {},
      settings: data.settings || { idleSeconds: 60 }
    });
  }

  globalThis.TimeTraceStore = { todayKey, domainFromUrl, defaultCategory, read, write, addDuration, getData, setCategory, setGoal, replaceData };
})();