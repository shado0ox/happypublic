const module = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = module.default || module;
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import assert from "node:assert/strict";
const cwd = process.cwd();
const dir = await mkdtemp(path.join(tmpdir(), "happy-family-ui-"));
let browser, server, base;
const errors = [];
try {
  server = spawn(process.execPath, ["dist/server.cjs"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "0",
      DATABASE_PATH: path.join(dir, "ui.db"),
    },
  });
  await new Promise((resolve, reject) => {
    let logs = "";
    const timer = setTimeout(() => reject(new Error(logs)), 10000);
    server.stdout.on("data", (c) => {
      logs += c;
      const m = logs.match(/Server listening at http:\/\/0\.0\.0\.0:(\d+)/);
      if (m) {
        base = `http://127.0.0.1:${m[1]}`;
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on("data", (c) => (logs += c));
    server.once("error", reject);
  });
  const register = async (name) => {
    const r = await fetch(base + "/api/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: name + "@ui.example",
        password: "Browser-test-password-42",
      }),
    });
    assert.equal(r.status, 200);
    return r.json();
  };
  const owner = await register("owner"),
    editor = await register("editor");
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    env: { ...process.env },
  });
  const open = async (session) => {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    await c.addInitScript(
      (profile) => {
        if (location.protocol !== "http:") return;
        localStorage.setItem("albait_user", JSON.stringify(profile));
        localStorage.setItem("albait_install_dismissed", "true");
      },
      { ...session.user, token: session.token },
    );
    await c.addInitScript(() => {
      window.__speechInstances = [];
      class MockSpeechRecognition {
        constructor() {
          window.__speechInstances.push(this);
        }
        start() {
          this.onstart?.();
        }
        stop() {
          this.stopped = true;
          this.onend?.();
        }
        abort() {
          this.aborted = true;
          this.onend?.();
        }
      }
      window.SpeechRecognition = MockSpeechRecognition;
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base);
    await p
      .getByRole("button", { name: "دفاتر العائلة", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "إعدادات", exact: true }).click();
    await p.locator(".compact-settings").waitFor();
    return p;
  };

  const personal = await fetch(base + "/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-uid": owner.user.uid,
      "x-auth-token": owner.token,
    },
    body: JSON.stringify({
      id: "preserve-on-failure",
      type: "income",
      amount: 1500,
      date: "2026-10-11",
      source: "راتب",
      note: "معاملة محفوظة للاختبار",
    }),
  });
  assert.equal(personal.status, 200);
  const p = await open(owner);
  const request = async (
    url,
    session = owner,
    body,
    method = body === undefined ? "GET" : "POST",
  ) => {
    const response = await fetch(base + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-uid": session.user.uid,
        "x-auth-token": session.token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await new Promise((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        });
    });
  });
  console.log("offline shell installed");
  const family = (
    await request("/api/families", owner, {
      name: "Offline household",
      currency: "SAR",
      cycleStart: 1,
    })
  ).data.id;
  const invitation = (
    await request(`/api/families/${family}/invitations`, owner, {
      email: editor.user.email,
      role: "editor",
    })
  ).data;
  assert.equal(
    (await request("/api/families/accept", editor, { token: invitation.token }))
      .status,
    200,
  );
  await request(`/api/families/${family}/transactions`, owner, {
    id: "opening",
    type: "income",
    amount: 1000,
    date: "2026-09-30",
    source: "opening",
    note: "Opening",
  });
  await request(`/api/families/${family}/transactions`, owner, {
    id: "posted",
    type: "expense",
    amount: 9.25,
    date: "2026-10-01",
    category: "food",
    note: "Posted record",
  });
  await p.getByRole("button", { name: "دفاتر العائلة", exact: true }).click();
  await p.getByLabel("اختر دفتر العائلة").selectOption(family);
  await p
    .getByRole("heading", { name: "Offline household", exact: true })
    .waitFor();
  await p.context().setOffline(true);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: "مصروف", exact: true }).click();
  await p.getByRole("textbox", { name: "المبلغ", exact: true }).fill("23.75");
  await p
    .getByPlaceholder("مثال: فاتورة المياه أو مشاوير الجمعية")
    .fill("Offline personal");
  await p.locator("summary").filter({ hasText: "إضافة تصنيف جديد" }).click();
  await p.getByLabel("اسم التصنيف الجديد").fill("اشتراكات خاصة");
  await p.getByRole("button", { name: "إضافة", exact: true }).click();
  await p.getByRole("button", { name: /حفظ.*المصروف/ }).click();
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByText("Offline personal", { exact: true }).waitFor();
  await p.getByRole("button", { name: "دفاتر العائلة", exact: true }).click();
  await p
    .getByRole("heading", { name: "Offline household", exact: true })
    .waitFor();
  await p.getByLabel("المبلغ", { exact: true }).first().fill("45.50");
  await p.getByRole("button", { name: /طعام وشراب/ }).click();
  await p.getByLabel("ملاحظة", { exact: true }).fill("Offline family");
  await p.getByRole("button", { name: "حفظ المعاملة", exact: true }).click();
  await p
    .locator(".family-record")
    .getByText("Offline family", { exact: true })
    .waitFor();
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: "دفاتر العائلة", exact: true }).click();
  await p
    .locator(".family-record")
    .getByText("Offline family", { exact: true })
    .waitFor();
  await p
    .locator("summary")
    .filter({ hasText: "كشف حساب دفتر العائلة" })
    .click();
  const downloadPromise = p.waitForEvent("download");
  await p.getByRole("button", { name: "تنزيل CSV", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk;
  assert.ok(csv.includes("1000.00"));
  assert.ok(csv.includes("945.25"));
  assert.ok(csv.includes("Offline family"));
  console.log("offline reload and both writes passed");
  await p.context().setOffline(false);
  const waitUntil = async (predicate) => {
    for (let i = 0; i < 100; i++) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error("sync did not complete");
  };
  await waitUntil(async () => {
    const personal = (await request("/api/transactions")).data;
    const shared = (await request(`/api/families/${family}`)).data;
    return (
      personal.some((row) => row.note === "Offline personal") &&
      shared.transactions.some((row) => row.note === "Offline family")
    );
  });
  assert.equal(
    (await request("/api/transactions")).data.filter(
      (row) => row.note === "Offline personal",
    ).length,
    1,
  );
  assert.equal(
    (await request(`/api/families/${family}`)).data.transactions.filter(
      (row) => row.note === "Offline family",
    ).length,
    1,
  );
  assert.ok((await request("/api/categories")).data.includes("اشتراكات خاصة"));
  console.log("reconnect synchronized once");
  await p.waitForTimeout(1500);
  let pulls = 0;
  p.on("request", (request) => {
    if (
      request.method() === "GET" &&
      /\/api\/(transactions|recurring-bills)/.test(request.url())
    )
      pulls++;
  });
  await p.waitForTimeout(17000);
  assert.equal(pulls, 0, "no legacy 15-second polling while SSE is healthy");
  assert.ok(
    await p.evaluate(async () => {
      for (const key of await caches.keys())
        for (const request of await (await caches.open(key)).keys())
          if (new URL(request.url).pathname.startsWith("/api/")) return false;
      return true;
    }),
  );

  const editorPage = await open(editor);
  await editorPage
    .getByRole("button", { name: "دفاتر العائلة", exact: true })
    .click();
  await editorPage.getByLabel("اختر دفتر العائلة").selectOption(family);
  await editorPage
    .getByRole("heading", { name: "Offline household", exact: true })
    .waitFor();
  await editorPage.context().setOffline(true);
  await editorPage.getByLabel("المبلغ", { exact: true }).first().fill("10.25");
  await editorPage.getByRole("button", { name: /طعام وشراب/ }).click();
  await editorPage.getByLabel("ملاحظة", { exact: true }).fill("Revoked draft");
  await editorPage
    .getByRole("button", { name: "حفظ المعاملة", exact: true })
    .click();
  assert.equal(
    (
      await request(
        `/api/families/${family}/members/${editor.user.uid}`,
        owner,
        undefined,
        "DELETE",
      )
    ).status,
    200,
  );
  await editorPage.context().setOffline(false);
  await waitUntil(async () =>
    editorPage.evaluate(
      (uid) =>
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`happy_${uid.length}_${uid}_write_`))
          .some((key) => JSON.parse(localStorage.getItem(key)).error),
      editor.user.uid,
    ),
  );
  await waitUntil(async () =>
    editorPage.evaluate(
      ({ uid, family }) =>
        !localStorage.getItem(`happy_${uid.length}_${uid}_family_${family}`),
      { uid: editor.user.uid, family },
    ),
  );
  assert.ok(
    !(await request(`/api/families/${family}`)).data.transactions.some(
      (row) => row.note === "Revoked draft",
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      checks: [
        "offline cold reload",
        "personal write and category survive reload",
        "shared draft survives reload",
        "statement opening/running/closing and CSV offline",
        "reconnect no duplicates",
        "revocation retains own draft and clears shared cache",
      ],
    }),
  );
} catch (error) {
  console.error(error);
  throw error;
} finally {
  await browser?.close();
  if (server?.exitCode === null) {
    const done = once(server, "exit");
    server.kill("SIGTERM");
    await Promise.race([
      done,
      new Promise((resolve) =>
        setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 2000),
      ),
    ]);
  }
  await rm(dir, { recursive: true, force: true });
}
