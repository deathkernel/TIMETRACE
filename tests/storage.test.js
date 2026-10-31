process.env.TZ = "UTC";
const test = require("node:test");
const assert = require("node:assert/strict");

const localData = {};
global.chrome = {
  storage: {
    local: {
      async get(key) { return { [key]: localData[key] }; },
      async set(value) { Object.assign(localData, value); }
    }
  }
};

require("../storage.js");
const store = global.TimeTraceStore;

test("normalizes URL and domain inputs", () => {
  assert.equal(store.domainFromUrl("https://www.example.com/path"), "example.com");
  assert.equal(store.domainFromUrl("chrome://extensions"), null);
  assert.equal(store.normalizeDomain("https://www.example.com/path"), "example.com");
  assert.equal(store.normalizeDomain("not a domain"), null);
});

test("splits tracking across local midnight", async () => {
  const start = new Date("2026-10-31T23:59:40.000Z").getTime();
  const end = new Date("2026-11-01T00:00:40.000Z").getTime();
  const result = await store.addDuration("example.com", start, end);
  const data = await store.getData();
  assert.equal(result.length, 2);
  assert.equal(data.days["2026-10-31"]["example.com"], 20);
  assert.equal(data.days["2026-11-01"]["example.com"], 40);
});

test("goal alerts can only be claimed once per threshold", async () => {
  assert.equal(await store.claimAlert("2026-11-01", "example.com", 80), true);
  assert.equal(await store.claimAlert("2026-11-01", "example.com", 80), false);
  assert.equal(await store.claimAlert("2026-11-01", "example.com", 100), true);
});

test("validates categories and goals", async () => {
  await store.setCategory("www.example.com", "Learning");
  await store.setGoal("example.com", 1800);
  const data = await store.getData();
  assert.equal(data.categories["example.com"], "Learning");
  assert.equal(data.goals["example.com"], 1800);
  await assert.rejects(() => store.setGoal("bad", 1800));
  await assert.rejects(() => store.setCategory("example.com", "Unknown"));
});
