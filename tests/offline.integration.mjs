import { runInNewContext } from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(path.join(tmpdir(), "happy-offline-"));
const load = async (name) => {
  const outfile = path.join(dir, name + ".mjs");
  await build({
    entryPoints: ["src/utils/" + name + ".ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
  });
  return import(pathToFileURL(outfile).href);
};
const store = await load("offlineStore"),
  personal = await load("personalQueue"),
  statements = await load("familyStatement");
test.after(() => rm(dir, { recursive: true, force: true }));
class Storage {
  getItem(key) {
    return this[key] ?? null;
  }
  setItem(key, value) {
    this[key] = String(value);
  }
  removeItem(key) {
    delete this[key];
  }
}
globalThis.localStorage = new Storage();
globalThis.window = new EventTarget();
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  configurable: true,
});
test("personal legacy queue migrates, new revision survives old acknowledgement, account isolation", () => {
  localStorage.setItem(
    "albait_pending_a",
    JSON.stringify([{ type: "POST_TX", id: "one", payload: { amount: 10 } }]),
  );
  const old = personal.personalOps("a")[0];
  assert.ok(old.version);
  assert.equal(localStorage.getItem("albait_pending_a"), null);
  personal.putPersonalOp("a", {
    type: "POST_TX",
    id: "one",
    payload: { amount: 20 },
  });
  personal.acknowledgePersonalOp("a", old);
  assert.equal(personal.personalOps("a")[0].payload.amount, 20);
  assert.equal(personal.personalOps("b").length, 0);
  personal.putPersonalOp("a_b", {
    type: "POST_TX",
    id: "other",
    payload: { amount: 99 },
  });
  assert.equal(personal.personalOps("a").length, 1);
});
test("storage exhaustion preserves unmigrated legacy drafts and never claims a new write succeeded", () => {
  const old = globalThis.localStorage;
  const full = new Storage();
  full.setItem(
    "albait_pending_full",
    JSON.stringify([{ type: "POST_TX", id: "old", payload: { amount: 10 } }]),
  );
  full.setItem = () => {
    throw Error("QuotaExceededError");
  };
  globalThis.localStorage = full;
  try {
    assert.equal(personal.personalOps("full").length, 1);
    assert.ok(full.getItem("albait_pending_full"));
    assert.throws(
      () =>
        store.enqueue("full", {
          url: "/api/transactions",
          body: { id: "new" },
        }),
      /QuotaExceededError/,
    );
  } finally {
    globalThis.localStorage = old;
  }
});
test("pending overlay retains unsent income/expense and deletions during server refresh", () => {
  const merged = store.mergePending(
    [{ id: "one" }, { id: "two" }],
    [
      { type: "DELETE_TX", id: "one", payload: null },
      { type: "POST_TX", id: "offline", payload: { id: "offline", amount: 5 } },
    ],
    "TX",
  );
  assert.deepEqual(
    merged.map((row) => row.id),
    ["two", "offline"],
  );
});
test("write-ahead queue handles concurrent additions, reconnect, revoked access and 401 without loss", async () => {
  const original = globalThis.fetch;
  try {
    store.enqueue("c", {
      url: "/api/families/f/transactions",
      familyId: "f",
      body: { id: "first", amount: 10 },
    });
    navigator.onLine = false;
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      return new Response("{}");
    };
    await store.flushWrites("c", "token");
    assert.equal(requests, 0);
    navigator.onLine = true;
    let release;
    globalThis.fetch = () =>
      new Promise((resolve) => {
        release = () => resolve(new Response("{}"));
      });
    const running = store.flushWrites("c", "token");
    store.enqueue("c", {
      url: "/api/families/f/transactions",
      familyId: "f",
      body: { id: "second", amount: 20 },
    });
    release();
    await running;
    assert.equal(store.writes("c").length, 1);
    assert.equal(store.writes("c")[0].body.id, "second");
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "removed member" }), {
        status: 404,
      });
    await store.flushWrites("c", "token");
    assert.equal(store.writes("c")[0].error, "removed member");
    assert.equal(store.writes("other").length, 0);
    store.enqueue("expired", {
      url: "/api/categories",
      body: { name: "housing" },
    });
    globalThis.fetch = async () => new Response("{}", { status: 401 });
    await store.flushWrites("expired", "token");
    assert.equal(store.writes("expired").length, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("family statement uses minor units, opening balance, exclusive end and escaped CSV", () => {
  const result = statements.familyStatement(
    [
      { id: "a", date: "2026-09-30", type: "income", amountMinor: 10000 },
      {
        id: "b",
        date: "2026-10-01",
        type: "expense",
        amountMinor: 2375,
        note: '=HYPERLINK("evil")',
      },
      { id: "c", date: "2026-10-02", type: "income", amountMinor: 5032 },
      { id: "d", date: "2026-11-01", type: "expense", amountMinor: 99999 },
    ],
    "2026-10-01",
    "2026-11-01",
  );
  assert.equal(result.opening, 10000);
  assert.equal(result.closing, 12657);
  assert.equal(result.lines[0].balance, 7625);
  assert.equal(result.lines.length, 2);
  assert.ok(statements.statementCSV(result, "SAR").includes("'=HYPERLINK"));
});
test('CSV keeps negative balances numeric and escapes formulas with leading whitespace',()=>{
 const report=statements.familyStatement([{id:'deficit',date:'2026-10-01',type:'expense',amountMinor:100,note:'  =1+1'}],'2026-10-01','2026-11-01');
 const csv=statements.statementCSV(report,'SAR');assert.ok(csv.includes('"-1.00"'));assert.ok(csv.includes("'  =1+1"));
});
test("offline worker serves the installed shell and previous lazy chunks but bypasses API/mutations", async () => {
  const handlers = new Map(),
    stores = new Map();
  let skipped = 0;
  const caches = {
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const rows = stores.get(name);
      return {
        addAll: async (files) => {
          for (const file of files)
            rows.set(file, new Response("offline:" + file));
        },
        match: async (key) => rows.get(key)?.clone(),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (key) => {
      for (const rows of stores.values())
        if (rows.has(key)) return rows.get(key).clone();
    },
  };
  const self = {
    location: { origin: "https://home.example" },
    clients: { claim: async () => {} },
    skipWaiting: () => {
      skipped++;
    },
    addEventListener: (name, handler) => handlers.set(name, handler),
  };
  runInNewContext(await readFile("dist/sw.js", "utf8"), {
    self,
    caches,
    URL,
    fetch: async () => {
      throw Error("offline");
    },
  });
  let installed;
  handlers.get("install")({
    waitUntil: (task) => {
      installed = task;
    },
  });
  await installed;
  const fetchEvent = async (path, method = "GET", mode = "cors") => {
    let response;
    handlers.get("fetch")({
      request: { url: "https://home.example" + path, method, mode },
      respondWith: (task) => {
        response = task;
      },
    });
    return response ? await response : undefined;
  };
  assert.equal(
    await (await fetchEvent("/", "GET", "navigate")).text(),
    "offline:/index.html",
  );
  const cachedFiles = [...stores.values()][0];
  const lazy = [...cachedFiles.keys()].find((file) =>
    file.includes("FamilyWorkspace"),
  );
  assert.ok(lazy);
  assert.equal(await (await fetchEvent(lazy)).text(), "offline:" + lazy);
  stores.set(
    "happy-shell-previous",
    new Map([["/assets/previous.js", new Response("previous chunk")]]),
  );
  assert.equal(
    await (await fetchEvent("/assets/previous.js")).text(),
    "previous chunk",
  );
  assert.equal(await fetchEvent("/api/transactions"), undefined);
  assert.equal(await fetchEvent("/assets/unsafe.js", "POST"), undefined);
  assert.equal(skipped, 0);
  handlers.get("message")({ data: { type: "APPLY_UPDATE" } });
  assert.equal(skipped, 1);
});
