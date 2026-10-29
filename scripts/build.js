"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { minify } = require("terser");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const publicFiles = [
  "admin-unlock.html",
  "admin.html",
  "favicon.svg",
  "forgot-password.html",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-192.png",
  "icon-maskable-512.png",
  "index.html",
  "manifest.json",
  "memorykeepnote.html",
  "offline.html",
  "password-toggle.js",
  "pwa-register.js",
  "reset-password.html",
  "service-worker.js",
  "site-content.js",
  "sign-in.html",
  "sign-up.html",
  "shared-note.html"
];

async function minifyJavaScript(source, file) {
  const result = await minify(source, {
    compress: true,
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error(`Terser produced no output for ${file}`);
  return result.code.replace(/<\/script/gi, "<\\/script");
}

async function buildHtml(file) {
  const source = fs.readFileSync(path.join(output, file), "utf8");
  let scriptCount = 0;
  const html = await replaceAsync(
    source,
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    async (whole, attributes, body) => {
      if (/\bsrc\s*=/.test(attributes) ||
          /\btype\s*=\s*["'](?:application\/json|application\/ld\+json|importmap)["']/i.test(attributes) ||
          !body.trim()) return whole;
      scriptCount += 1;
      return `<script${attributes}>${await minifyJavaScript(body, file)}</script>`;
    }
  );
  fs.writeFileSync(path.join(output, file), html);
  return scriptCount;
}

async function replaceAsync(input, pattern, replacer) {
  const matches = [...input.matchAll(pattern)];
  if (!matches.length) return input;
  const replacements = await Promise.all(matches.map(match => replacer(...match)));
  let result = "";
  let offset = 0;
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    result += input.slice(offset, match.index) + replacements[index];
    offset = match.index + match[0].length;
  }
  return result + input.slice(offset);
}

async function main() {
  if (output === root || !output.startsWith(`${root}${path.sep}`)) {
    throw new Error("Refusing to build outside the project dist directory.");
  }
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const file of publicFiles) {
    fs.copyFileSync(path.join(root, file), path.join(output, file));
  }

  let inlineScripts = 0;
  for (const file of publicFiles.filter(name => name.endsWith(".html"))) {
    inlineScripts += await buildHtml(file);
  }

  for (const file of publicFiles.filter(name => name.endsWith(".js") && name !== "service-worker.js")) {
    const source = fs.readFileSync(path.join(output, file), "utf8");
    fs.writeFileSync(path.join(output, file), await minifyJavaScript(source, file));
  }

  const hash = crypto.createHash("sha256");
  for (const file of publicFiles.filter(name => name !== "service-worker.js").sort()) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(output, file)));
  }
  hash.update("service-worker.js");
  hash.update(fs.readFileSync(path.join(output, "service-worker.js")));
  const buildId = hash.digest("hex").slice(0, 12);
  const workerPath = path.join(output, "service-worker.js");
  const worker = fs.readFileSync(workerPath, "utf8")
    .replace("memory-keep-note-shell-v2", `memory-keep-note-shell-${buildId}`);
  fs.writeFileSync(workerPath, await minifyJavaScript(worker, "service-worker.js"));

  console.log(`Built ${publicFiles.length} public assets; minified ${inlineScripts} inline scripts and ${publicFiles.filter(name => name.endsWith(".js")).length} JavaScript files.`);
  console.log(`Service-worker cache version: ${buildId}`);
}

main().catch(error => {
  console.error("Production asset build failed:", error);
  process.exitCode = 1;
});
