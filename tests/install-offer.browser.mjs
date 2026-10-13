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
  const platformPage = async (userAgent, standalone = false) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent,
    });
    if (standalone)
      await context.addInitScript(() =>
        Object.defineProperty(navigator, "standalone", { value: true }),
      );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    return page;
  };
  const iphone = await platformPage(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  );
  await iphone.getByRole("button", { name: "Get", exact: true }).click();
  const modal = iphone.getByRole("dialog", { name: "أضف Happy Home" });
  await modal.waitFor();
  assert.equal(
    await iphone
      .getByRole("button", { name: "iPhone / iPad", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(await iphone.locator(".install-mini").count(), 3);
  assert.ok(await iphone.getByText("اضغط مشاركة", { exact: true }).isVisible());
  assert.ok(
    await iphone.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await iphone.screenshot({
    path: "/tmp/happy-install-ios.png",
    fullPage: true,
    timeout: 10000,
  });
  await iphone.keyboard.press("Escape");
  assert.equal(await iphone.locator("dialog[open]").count(), 0);
  assert.equal(
    await iphone
      .getByRole("button", { name: "Get", exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await iphone.getByRole("button", { name: "إخفاء اقتراح التطبيق" }).click();
  await iphone.reload();
  assert.equal(
    await iphone.getByRole("button", { name: "Get", exact: true }).count(),
    0,
  );
  const android = await platformPage(
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
  );
  await android.getByRole("button", { name: "Get", exact: true }).click();
  assert.equal(
    await android
      .getByRole("button", { name: "Android", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await android.evaluate(() => {
    window.__installed = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.__installed++;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });
  await android
    .getByRole("button", { name: "تثبيت الآن", exact: true })
    .click();
  assert.equal(await android.evaluate(() => window.__installed), 1);
  assert.equal(await android.locator(".install-offer").count(), 0);
  const standalone = await platformPage("Mozilla/5.0 (iPhone)", true);
  assert.equal(
    await standalone.getByRole("button", { name: "Get", exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      checks: [
        "first browser visit before login",
        "iOS guide and three mini illustrations",
        "Android guide and native install prompt",
        "Escape and focus restore",
        "dismissal survives reload",
        "standalone hidden",
        "390px no overflow",
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
