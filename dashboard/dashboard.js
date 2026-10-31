let appData;
let selectedRange = 7;
const $ = id => document.getElementById(id);
const categories = ["Work", "Learning", "Social", "Entertainment", "Other"];

function fmt(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  if (value < 60) return value + "s";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return hours ? hours + "h " + minutes + "m" : minutes + "m";
}

function dateKey(date) {
  return TimeTraceStore.todayKey(date);
}

function dayTotal(day) {
  return Object.values(day || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function categoryFor(domain) {
  return appData.categories[domain] || TimeTraceStore.defaultCategory(domain);
}

function getDates(count, offset = 0) {
  const dates = [];
  for (let i = count - 1 + offset; i >= offset; i--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
}

function aggregateCategories(dates) {
  const totals = Object.fromEntries(categories.map(category => [category, 0]));
  for (const date of dates) {
    const day = appData.days[dateKey(date)] || {};
    for (const [domain, seconds] of Object.entries(day)) {
      const category = categoryFor(domain);
      totals[category] = (totals[category] || 0) + Number(seconds || 0);
    }
  }
  return totals;
}

function renderStats(today) {
  const entries = Object.entries(today).sort((a, b) => b[1] - a[1]);
  const total = dayTotal(today);
  $("todayTotal").textContent = fmt(total);
  $("siteCount").textContent = entries.length;
  $("siteCountLabel").textContent = entries.length + " websites";

  const grouped = aggregateCategories([new Date()]);
  const top = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  $("topCategory").textContent = top && top[1] > 0 ? top[0] : "—";
  $("categoryTime").textContent = top && top[1] > 0 ? fmt(top[1]) + " tracked today" : "No activity yet";

  const goals = Object.entries(appData.goals);
  const withinLimit = goals.filter(([domain, limit]) => (today[domain] || 0) <= limit).length;
  $("goalsMet").textContent = withinLimit + "/" + goals.length;
  $("goalsMeta").textContent = goals.length ? "Currently within daily limits" : "No daily goals configured";

  const currentWeek = getDates(7);
  const previousWeek = getDates(7, 7);
  const currentTotal = currentWeek.reduce((sum, date) => sum + dayTotal(appData.days[dateKey(date)]), 0);
  const previousTotal = previousWeek.reduce((sum, date) => sum + dayTotal(appData.days[dateKey(date)]), 0);
  if (previousTotal > 0) {
    const change = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
    $("todayChange").textContent = Math.abs(change) + "% " + (change > 0 ? "more" : change < 0 ? "less" : "same") + " than previous 7 days";
  } else {
    $("todayChange").textContent = "Across all websites";
  }
}

function renderChart() {
  const dates = getDates(selectedRange);
  const values = dates.map(date => dayTotal(appData.days[dateKey(date)]));
  const max = Math.max(...values, 1);
  $("chart").innerHTML = "";

  dates.forEach((date, index) => {
    const column = document.createElement("div");
    column.className = "bar-column";
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = Math.max(2, values[index] / max * 100) + "%";
    bar.title = date.toLocaleDateString() + ": " + fmt(values[index]);
    wrap.append(bar);

    const label = document.createElement("label");
    label.textContent = selectedRange === 7
      ? date.toLocaleDateString(undefined, { weekday: "short" })
      : (index % 3 === 0 || index === dates.length - 1 ? date.getDate() : "");
    column.append(wrap, label);
    $("chart").append(column);
  });

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  $("average").textContent = "Daily average: " + fmt(Math.round(average));
}

function renderCategories() {
  const totals = aggregateCategories(getDates(selectedRange));
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  $("categoryPeriod").textContent = "Last " + selectedRange + " days";
  $("categoryBreakdown").innerHTML = "";

  for (const category of categories) {
    const seconds = totals[category] || 0;
    const percent = sum ? Math.round(seconds / sum * 100) : 0;
    const row = document.createElement("div");
    row.className = "category-row";

    const heading = document.createElement("div");
    heading.className = "category-heading";
    const name = document.createElement("strong");
    name.textContent = category;
    const stats = document.createElement("span");
    stats.textContent = fmt(seconds) + " · " + percent + "%";
    heading.append(name, stats);

    const track = document.createElement("div");
    track.className = "category-track";
    const fill = document.createElement("i");
    fill.className = "category-fill category-" + category.toLowerCase();
    fill.style.width = percent + "%";
    track.append(fill);

    row.append(heading, track);
    $("categoryBreakdown").append(row);
  }

  if (!sum) {
    const note = document.createElement("p");
    note.className = "empty-note";
    note.textContent = "Your category report will appear after you browse for a while.";
    $("categoryBreakdown").append(note);
  }
}

function renderWebsites(today) {
  const entries = Object.entries(today).sort((a, b) => b[1] - a[1]);
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
    fill.style.width = Math.max(1, seconds / max * 100) + "%";
    meter.append(fill);

    const time = document.createElement("div");
    time.className = "duration";
    time.textContent = fmt(seconds);

    const select = document.createElement("select");
    select.className = "category-select";
    select.setAttribute("aria-label", "Category for " + domain);
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      option.selected = categoryFor(domain) === category;
      select.append(option);
    }
    select.addEventListener("change", async () => {
      await TimeTraceStore.setCategory(domain, select.value);
      await render();
    });
    row.append(name, meter, time, select);
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
    const used = today[domain] || 0;
    const percent = Math.min(100, Math.round(used / limit * 100));
    const status = used >= limit ? "Limit reached" : percent >= 80 ? "Near limit" : used > 0 ? "On track" : "Not started";
    const row = document.createElement("div");
    row.className = "goal-item";

    const top = document.createElement("div");
    top.className = "goal-row";
    const label = document.createElement("span");
    label.textContent = domain + " · " + fmt(used) + " / " + fmt(limit);
    const right = document.createElement("div");
    right.className = "goal-actions";
    const statusText = document.createElement("span");
    statusText.className = "goal-status " + (percent >= 100 ? "danger" : percent >= 80 ? "warning" : "");
    statusText.textContent = status;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await TimeTraceStore.setGoal(domain, 0);
      await render();
    });
    right.append(statusText, remove);
    top.append(label, right);

    const track = document.createElement("div");
    track.className = "goal-progress";
    const fill = document.createElement("i");
    fill.style.width = percent + "%";
    if (percent >= 100) fill.className = "over";
    else if (percent >= 80) fill.className = "near";
    track.append(fill);

    row.append(top, track);
    $("goalList").append(row);
  }
}

async function render() {
  appData = await TimeTraceStore.getData();
  const today = appData.days[TimeTraceStore.todayKey()] || {};
  renderStats(today);
  renderChart();
  renderCategories();
  renderWebsites(today);
  renderGoals(today);
}

document.querySelectorAll("[data-range]").forEach(button => {
  button.addEventListener("click", () => {
    selectedRange = Number(button.dataset.range);
    document.querySelectorAll("[data-range]").forEach(item => item.classList.toggle("selected", item === button));
    renderChart();
    renderCategories();
  });
});

$("goalForm").addEventListener("submit", async event => {
  event.preventDefault();
  const domain = TimeTraceStore.normalizeDomain($("goalDomain").value);
  const minutes = Number($("goalMinutes").value);
  const feedback = $("goalFeedback");
  if (!domain) {
    feedback.textContent = "Enter a valid domain, for example example.com.";
    feedback.className = "form-feedback error";
    return;
  }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    feedback.textContent = "Choose a daily limit between 1 and 1,440 minutes.";
    feedback.className = "form-feedback error";
    return;
  }
  await TimeTraceStore.setGoal(domain, minutes * 60);
  $("goalForm").reset();
  feedback.textContent = "Daily goal saved for " + domain + ".";
  feedback.className = "form-feedback success";
  await render();
});

$("exportBtn").addEventListener("click", async () => {
  const data = await TimeTraceStore.getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
  } finally {
    event.target.value = "";
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.timetraceData) render().catch(console.error);
});

render().catch(console.error);
