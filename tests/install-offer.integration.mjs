import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(path.join(tmpdir(), "happy-install-"));
const outfile = path.join(dir, "install.mjs");
await build({
  entryPoints: ["src/utils/installOffer.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
});
const { installPlatform, storeLink } = await import(
  pathToFileURL(outfile).href
);
test.after(() => rm(dir, { recursive: true, force: true }));
test("phone and desktop platform detection includes iPad desktop-mode UA", () => {
  assert.equal(installPlatform("iPhone", "iPhone", 5), "ios");
  assert.equal(installPlatform("Macintosh", "MacIntel", 5), "ios");
  assert.equal(installPlatform("Android", "Linux", 5), "android");
  assert.equal(installPlatform("Macintosh", "MacIntel", 0), "desktop");
});
test("store links are optional and limited to actual listing URLs for the detected OS", () => {
  assert.equal(storeLink("ios"), null);
  assert.equal(storeLink("desktop", "https://apps.apple.com/app/id123"), null);
  assert.equal(
    storeLink("ios", "https://apps.apple.com/app/id123"),
    "https://apps.apple.com/app/id123",
  );
  assert.equal(
    storeLink(
      "android",
      undefined,
      "https://play.google.com/store/apps/details?id=example.app",
    ),
    "https://play.google.com/store/apps/details?id=example.app",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://evil.example/app/id123",
    "https://apps.apple.com.evil.example/app/id123",
    "https://user:password@apps.apple.com/app/id123",
  ])
    assert.equal(storeLink("ios", url), null);
});
