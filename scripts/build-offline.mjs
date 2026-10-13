import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const assets = readdirSync("dist/assets").map((name) => "/assets/" + name);
const files = [
  "/index.html",
  ...assets,
  "/favicon.png",
  "/apple-touch-icon.png",
];
const version = createHash("sha256")
  .update(files.map((file) => readFileSync("dist" + file)).join(""))
  .digest("hex")
  .slice(0, 16);
const source = readFileSync("scripts/offline-worker.js", "utf8")
  .replace("__CACHE__", JSON.stringify("happy-shell-" + version))
  .replace("__FILES__", JSON.stringify(files));
writeFileSync("dist/sw.js", source);
