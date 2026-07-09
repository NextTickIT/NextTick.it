#!/usr/bin/env node
// serve-ngrok.mjs — serve the built docs/ tree over a local static server and
// expose it through an ngrok tunnel, so the localized /all/ landing (and the
// rest of the site) can be previewed on a public HTTPS URL.
//
// Reuses the ngrok setup from ../tg-app: the @ngrok/ngrok binding and the
// NGROK_AUTHTOKEN in that repo's root .env (optionally NGROK_DOMAIN for a
// reserved domain). No token is stored in this repo.
//
// Usage: node tools/serve-ngrok.mjs            (serves docs/ on :8788)
//        PORT=9000 node tools/serve-ngrok.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WEBROOT = path.join(ROOT, "docs");
const TG_APP = path.resolve(ROOT, "..", "tg-app");
const PORT = Number.parseInt(process.env.PORT ?? "8788", 10);

// ── resolve NGROK_AUTHTOKEN (env, then ../tg-app/.env) ──────────────────────
function loadToken() {
  if (process.env.NGROK_AUTHTOKEN) return process.env.NGROK_AUTHTOKEN;
  const envPath = path.join(TG_APP, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*NGROK_AUTHTOKEN\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function resolveFile(urlPath) {
  // decode + strip query, block traversal
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const abs = path.join(WEBROOT, path.normalize(p));
  if (!abs.startsWith(WEBROOT)) return null; // traversal guard
  try {
    const s = await stat(abs);
    if (s.isDirectory()) {
      const idx = path.join(abs, "index.html");
      if (existsSync(idx)) return idx;
      return null;
    }
    return abs;
  } catch {
    // pretty URL fallback: /all/en -> /all/en.html
    if (!path.extname(abs) && existsSync(abs + ".html")) return abs + ".html";
    return null;
  }
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("500");
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`[serve] docs/ -> http://localhost:${PORT}`);

const token = loadToken();
if (!token) {
  console.error("[serve-ngrok] NGROK_AUTHTOKEN missing (env or ../tg-app/.env). Serving locally only.");
} else {
  const require = createRequire(path.join(TG_APP, "apps", "frontend", "package.json"));
  const ngrok = require("@ngrok/ngrok");
  const listener = await ngrok.forward({
    addr: PORT,
    authtoken: token,
    domain: process.env.NGROK_DOMAIN || undefined,
  });
  const url = listener.url();
  const host = new URL(url).host;
  const line = (s) => console.log("│ " + s.padEnd(58) + "│");
  console.log("╭──────────────────────────────────────────────────────────╮");
  line(`ngrok:  ${url}`);
  line(`host:   ${host}`);
  line("");
  line("Localized landing (overwritten `all`):");
  line(`  ${url}/all.html      (auto lang redirect)`);
  line(`  ${url}/all/uk.html   ${url}/all/en.html`);
  line(`  ${url}/all/ru.html`);
  console.log("╰──────────────────────────────────────────────────────────╯");

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
      try {
        await listener.close();
      } catch {}
      server.close();
      process.exit(0);
    });
  }
}

// keep the event loop alive
setInterval(() => {}, 1 << 30);
