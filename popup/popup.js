const totalEl = document.getElementById("total");
const sitesEl = document.getElementById("sites");
const subtitleEl = document.getElementById("subtitle");

function formatTime(seconds) {
  if (seconds < 60) return seconds + "s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? hours + "h " + minutes + "m" : minutes + "m";
}

async function render() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SUMMARY" });
  if (!response?.ok) return;
  const day = response.data.days[TimeTraceStore.todayKey()] || {};
  const entries = Object.entries(day).sort((a,b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);
  totalEl.textContent = formatTime(total);
  subtitleEl.textContent = entries.length + " website" + (entries.length === 1 ? "" : "s") + " tracked today";
  sitesEl.innerHTML = "";
  if (!entries.length) {
    sitesEl.innerHTML = '<div class="empty">No activity recorded yet.<br>Browse normally and your stats will appear here.</div>';
    return;
  }
  const max = entries[0][1];
  for (const [domain, seconds] of entries.slice(0,5)) {
    const row = document.createElement("div");
    row.className = "site";
    const icon = document.createElement("div");
    icon.className = "favicon";
    icon.textContent = domain.charAt(0).toUpperCase();
    const info = document.createElement("div");
    info.className = "site-name";
    const name = document.createElement("strong");
    name.textContent = domain;
    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("i");
    fill.style.width = Math.max(2, seconds / max * 100) + "%";
    track.append(fill);
    info.append(name, track);
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatTime(seconds);
    row.append(icon, info, time);
    sitesEl.append(row);
  }
}

document.getElementById("openDashboard").addEventListener("click", () => chrome.runtime.openOptionsPage());
render().catch(console.error);