let appData;
let selectedRange = 7;
const $ = id => document.getElementById(id);
const categories = ["Work", "Learning", "Social", "Entertainment", "Other"];

function fmt(seconds) {
  if (seconds < 60) return seconds + "s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? h + "h " + m + "m" : m + "m";
}
function dateKey(date) {
  return TimeTraceStore.todayKey(date);
}
function dayTotal(day) {
  return Object.values(day || {}).reduce((a,b) => a + b, 0);
}
function categoryFor(domain) {
  return appData.categories[domain] || TimeTraceStore.defaultCategory(domain);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderStats(today) {
  const entries = Object.entries(today).sort((a,b) => b[1] - a[1]);
  const total = dayTotal(today);
  $("todayTotal").textContent = fmt(total);
  $("siteCount").textContent = entries.length;
  $("siteCountLabel").textContent = entries.length + " websites";
  const grouped = {};
  for (const [domain, seconds] of entries) grouped[categoryFor(domain)] = (grouped[categoryFor(domain)] || 0) + seconds;
  const top = Object.entries(grouped).sort((a,b) => b[1] - a[1])[0];
  $("topCategory").textContent = top?.[0] || "—";
  $("categoryTime").textContent = top ? fmt(top[1]) + " tracked" : "No activity yet";
  const goals = Object.entries(appData.goals);
  const met = goals.filter(([domain, limit]) => (today[domain] || 0) <= limit).length;
  $("goalsMet").textContent = met + "/" + goals.length;
}
function renderChart() {
  const dates = [];
  for (let i = selectedRange - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  const values = dates.map(date => dayTotal(appData.days[dateKey(date)]));
  const max = Math.max(...values, 1);
  $("chart").innerHTML = "";
  dates.forEach((date, i) => {
    const col = document.createElement("div");
    col.className = "bar-column";
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = Math.max(2, values[i] / max * 100) + "%";
    bar.title = fmt(values[i]);
    wrap.append(bar);
    const label = document.createElement("label");
    label.textContent = selectedRange === 7 ? date.toLocaleDateString(undefined,{weekday:"short"}) : (date.getDate() % 2 === 0 ? date.getDate() : "");
    col.append(wrap,label);
    $("chart").append(col);
  });
  const avg = values.reduce((a,b) => a+b,0) / values.length;
  $("average").textContent = "Daily average: " + fmt(Math.round(avg));
}
function renderWebsites(today) {
  const entries = Object.entries(today).sort((a,b) => b[1] - a[1]);
  $("websiteList").innerHTML = "";
  if (!entries.length) {
    $("websiteList").innerHTML = '<div class="empty">No browsing activity yet. Keep TimeTrace installed while you browse.</div>';
    return;
  }
  const max = entries[0][1];
  for (const [domain, seconds] of entries) {
    const row = document.createElement("div");
    row.className = "website-row";
    const name = document.createElement("div");
    name.className = "domain";
    name.textContent = domain;
    const meter = document.createElement("div");
    meter.className = "meter";
    const fill = document.createElement("i");
    fill.style.width = Math.max(1, seconds/max*100) + "%";
    meter.append(fill);
    const time = document.createElement("div");
    time.className = "duration";
    time.textContent = fmt(seconds);
    const select = document.createElement("select");
    select.className = "category-select";
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      option.selected = categoryFor(domain) === category;
      select.append(option);
    }
    select.addEventListener("change", async () => {
      await TimeTraceStore.setCategory(domain, select.value);
      appData = await TimeTraceStore.getData();
      renderStats(today);
    });
    row.append(name,meter,time,select);
    $("websiteList").append(row);
  }
}
function renderGoals(today) {
  $("goalList").innerHTML = "";
  const entries = Object.entries(appData.goals);
  if (!entries.length) {
    $("goalList").innerHTML = '<div class="empty">No goals yet. Add a website and daily minute limit above.</div>';
    return;
  }
  for (const [domain, limit] of entries) {
    const row = document.createElement("div");
    row.className = "goal-row";
    const label = document.createElement("span");
    label.textContent = domain + " · " + fmt(today[domain] || 0) + " / " + fmt(limit);
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await TimeTraceStore.setGoal(domain, 0);
      appData = await TimeTraceStore.getData();
      renderGoals(today);
      renderStats(today);
    });
    row.append(label,remove);
    $("goalList").append(row);
  }
}
async function render() {
  appData = await TimeTraceStore.getData();
  const today = appData.days[TimeTraceStore.todayKey()] || {};
  renderStats(today);
  renderChart();
  renderWebsites(today);
  renderGoals(today);
}
document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => {
  selectedRange = Number(button.dataset.range);
  document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("selected", item === button));
  renderChart();
}));
$("goalForm").addEventListener("submit", async event => {
  event.preventDefault();
  const domain = $("goalDomain").value.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"").replace(/^www\./,"");
  const minutes = Number($("goalMinutes").value);
  if (!domain || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return;
  await TimeTraceStore.setGoal(domain, minutes * 60);
  $("goalForm").reset();
  render();
});
$("exportBtn").addEventListener("click", async () => {
  const data = await TimeTraceStore.getData();
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "timetrace-backup-" + TimeTraceStore.todayKey() + ".json";
  link.click();
  URL.revokeObjectURL(url);
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await TimeTraceStore.replaceData(data);
    await render();
    alert("TimeTrace backup imported.");
  } catch (error) {
    alert("Could not import backup: " + error.message);
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.timetraceData) render();
});
render().catch(console.error);