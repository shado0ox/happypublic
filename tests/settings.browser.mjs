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
  p.on("dialog", (d) => d.accept());
  assert.equal(await p.locator(".compact-settings details[open]").count(), 0);
  assert.equal(
    await p
      .getByRole("button", { name: "مسح المعاملات الشخصية", exact: true })
      .isVisible(),
    false,
  );
  await p.screenshot({
    path: path.join(dir, "settings-mobile.png"),
    fullPage: true,
  });
  const width = await p.evaluate(() => ({
    viewport: innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(width.page <= width.viewport, JSON.stringify(width));
  await p.getByLabel("العملة", { exact: true }).selectOption("SAR");
  await p.getByText("تم حفظ الإعدادات", { exact: true }).waitFor();
  assert.equal(
    await p.getByLabel("العملة", { exact: true }).inputValue(),
    "SAR",
  );
  await p.route("**/api/settings", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "forced error" }),
        })
      : route.continue(),
  );
  await p.getByLabel("العملة", { exact: true }).selectOption("$");
  await p
    .getByText("تعذر حفظ الإعدادات. تحقق من الاتصال وحاول مجددًا.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await p.getByLabel("العملة", { exact: true }).inputValue(),
    "SAR",
  );
  await p.unroute("**/api/settings");
  await p.locator("summary").filter({ hasText: "العرض والسلوك" }).click();
  const charts = p.getByRole("switch", {
    name: "الرسوم البيانية",
    exact: true,
  });
  assert.equal(await charts.getAttribute("aria-checked"), "true");
  await charts.click();
  await p.getByText("تم حفظ الإعدادات", { exact: true }).waitFor();
  assert.equal(await charts.getAttribute("aria-checked"), "false");
  await p.locator("summary").filter({ hasText: "البيانات والمزامنة" }).click();
  await p.route("**/api/settings", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"error":"forced error"}',
        })
      : route.continue(),
  );
  await p
    .getByRole("button", { name: "استعادة الإعدادات الافتراضية", exact: true })
    .click();
  await p
    .getByText("تعذر حفظ الإعدادات. تحقق من الاتصال وحاول مجددًا.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await p.getByLabel("العملة", { exact: true }).inputValue(),
    "SAR",
  );
  assert.equal(await charts.getAttribute("aria-checked"), "false");
  await p.unroute("**/api/settings");
  await p
    .getByRole("button", { name: "استعادة الإعدادات الافتراضية", exact: true })
    .click();
  await p
    .getByText("تمت استعادة الإعدادات الافتراضية", { exact: true })
    .waitFor();
  assert.equal(
    await p.getByLabel("العملة", { exact: true }).inputValue(),
    "ر.س",
  );
  await p.locator("summary").filter({ hasText: "الفواتير المتكررة" }).click();
  await p.getByRole("button", { name: "حفظ الفاتورة الثابتة" }).waitFor();
  await p.locator("summary").filter({ hasText: "الفواتير المتكررة" }).click();
  assert.equal(
    await p.getByRole("button", { name: "حفظ الفاتورة الثابتة" }).count(),
    0,
  );
  await p.locator("summary").filter({ hasText: "مسح المعاملات" }).click();
  await p.route("**/api/transactions/all", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"error":"forced error"}',
    }),
  );
  await p
    .getByRole("button", { name: "مسح المعاملات الشخصية", exact: true })
    .click();
  await p
    .getByText("تعذر حذف المعاملات. تحقق من الاتصال وحاول مجددًا.", {
      exact: true,
    })
    .waitFor();
  await p.getByRole("button", { name: "الرئيسية", exact: true }).click();
  await p.getByText("معاملة محفوظة للاختبار", { exact: true }).waitFor();
  await p.getByRole("button", { name: "إعدادات", exact: true }).click();
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.screenshot({
    path: path.join(dir, "settings-desktop.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      checks: [
        "compact sections closed initially",
        "390px no overflow",
        "currency saves",
        "failed save preserves prior value",
        "switch saves",
        "failed reset preserves settings",
        "reset succeeds",
        "bill disclosure opens and closes",
        "failed delete preserves visible transactions",
        "desktop layout",
        "no React errors",
      ],
    }),
  );
} finally {
  await browser?.close();
  if (server?.exitCode === null) {
    const done = once(server, "exit");
    server.kill("SIGTERM");
    await done;
  }
  await rm(dir, { recursive: true, force: true });
}
