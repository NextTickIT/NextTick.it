// Vendors the Partytown runtime into the published tree.
//
// Partytown runs the Google tags in a web worker so their parse/execute cost
// stops blocking the main thread. Only GTM and GA4 go through it: both send
// permissive CORS headers, which the worker needs because it fetches third-party
// scripts over XHR. Meta Pixel is deliberately NOT routed through Partytown —
// connect.facebook.net sends no Access-Control-Allow-Origin, so it would need a
// reverse proxy, and GitHub Pages cannot host one. Clarity stays on the main
// thread too: its session replay walks the live DOM continuously, which is the
// case Partytown's own trade-offs page warns against.
//
// The service worker is registered with `scope` equal to its own directory, so
// no Service-Worker-Allowed header is needed — which is what makes this work on
// GitHub Pages at all.
//
// Run after changing the pinned @qwik.dev/partytown version:
//   node tools/copy-partytown.mjs
//
// Emits (both committed):
//   docs/~partytown/*                      — served at /~partytown/
//   templates/_partials/analytics/partytown-snippet.html
//       the loader, inlined into <head> by partytown.html. It must execute
//       before any tagged script, and it is small, so it is inlined rather
//       than fetched.

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { ROOT } from "./lib/format.mjs";

const LIB = path.join(path.dirname(createRequire(import.meta.url).resolve("@qwik.dev/partytown/package.json")), "lib");
const OUT = path.join(ROOT, "docs", "~partytown");

// `debug/` is explicitly not for production, and partytown-media.js is only for
// media-element virtualization, which analytics tags never touch.
// partytown-sandbox-sw.html IS required: the loader points a hidden iframe at
// it, and requests that bypass the service worker would otherwise 404.
const FILES = [
  "partytown.js",
  "partytown-sw.js",
  "partytown-sandbox-sw.html",
  "partytown-atomics.js", // only loaded when crossOriginIsolated; harmless here
];

await mkdir(OUT, { recursive: true });
for (const f of FILES) {
  await copyFile(path.join(LIB, f), path.join(OUT, f));
  console.log(`docs/~partytown/${f}`);
}

const snippet = await readFile(path.join(LIB, "partytown.js"), "utf8");
const dest = path.join(ROOT, "templates", "_partials", "analytics", "partytown-snippet.html");
await writeFile(dest, snippet, "utf8");
console.log(`templates/_partials/analytics/partytown-snippet.html (${snippet.length} B) — ${snippet.split("\n")[0].trim()}`);
