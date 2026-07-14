#!/usr/bin/env node
// verify-attribution.mjs — static checks for the Meta Pixel + bot-link
// attribution footprint on the BUILT docs/ tree (page-based layout).
//
// Asserts, without a browser:
//   1. Meta Pixel (fbq init + PageView) + <noscript> present on all 16 content pages.
//   2. Every analytics-free stub (24: sniff + root-default + legacy redirects) has
//      NO pixel/GTM/GA4/Clarity/attribution.
//   3. nt-attribution.js is included on the bot-link pages AND absent on the
//      non-attribution content pages (guild, offer, privacy).
//   4. Every bot link keeps the exact start= code.
//   5. Each bot link carries the correct per-page source_channel (website vs conf).
//   6. No residual `set("source_channel", utm` swap anywhere.
//   7. GA4/GTM/Clarity footprint counts match the baseline where they exist.
//   8. Structural parity across the all/ trio (uk == en == ru); lang-switch
//      anchors point to the page-based /all/<loc>.html, never the old scheme.
//
// Paths are relative to docs/. `--page <dir>` restricts the per-page checks
// (1,3,4,5,6,7,8) to one page group (e.g. `--page docs/all`, `--page docs`
// for home); with no arg every check runs (the npm-test gate).
//
// Entity-decodes &amp; -> & so encoded links are handled like raw ones.
// Exit code 0 = all pass, 1 = any failure.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = join(ROOT, "docs");
const PIXEL_ID = "1022924580268547";
const START = "69ce57941f15eb55e90ea47a";
const ASSET = "/assets/nt-attribution.js";

// Page groups. `dir` is the pages/-relative directory ("" = home at root);
// `channel` is the expected bot-link source_channel, or null for pages with no
// bot links / no attribution include (guild, offer, privacy — baseline reality).
const PAGE_DEFS = [
  { dir: "", files: ["en.html", "ru.html", "uk.html"], channel: "website" },
  { dir: "swe", files: ["swe/en.html", "swe/ru.html", "swe/uk.html"], channel: "website" },
  { dir: "all", files: ["all/en.html", "all/ru.html", "all/uk.html"], channel: "website:all", start: "6a4f770343a30de13e0cbfbc" },
  {
    dir: "future-proof",
    files: ["future-proof/en.html", "future-proof/ru.html", "future-proof/uk.html"],
    channel: "website:future-proof",
    start: "6a4f770343a30de13e0cbfbc",
  },
  {
    dir: "middle",
    files: ["middle/en.html", "middle/ru.html", "middle/uk.html"],
    channel: "website:middle",
    start: "6a4f770343a30de13e0cbfbc",
  },
  {
    dir: "ai-speedup-checklist",
    files: ["ai-speedup-checklist/en.html", "ai-speedup-checklist/ru.html", "ai-speedup-checklist/uk.html"],
    channel: "conf",
  },
  {
    dir: "ai-speedup-checklist-for-guild-members",
    files: [
      "ai-speedup-checklist-for-guild-members/en.html",
      "ai-speedup-checklist-for-guild-members/ru.html",
      "ai-speedup-checklist-for-guild-members/uk.html",
    ],
    channel: null,
  },
  { dir: "offer", files: ["offer/ru.html", "offer/uk.html"], channel: null },
  { dir: "privacy", files: ["privacy/ru.html", "privacy/uk.html"], channel: null },
];

// [7] footprint spot-counts (baseline-faithful; retargeted from the lang tree).
// NOTE: home + guild DO carry Clarity in the baseline — these assertions never
// claim Clarity-absent there; the byte-diff + verify-structure guarantee the
// full footprint, this is a targeted GA4/GTM/Clarity presence spot-check.
const FOOTPRINT = {
  "en.html": { "G-1TYEB7YFP5": 2, "GTM-M74P6CSD": 2, x5houryvs2: 1 },
  "ai-speedup-checklist/en.html": { "G-1TYEB7YFP5": 0, "GTM-M74P6CSD": 0 },
  "ai-speedup-checklist-for-guild-members/en.html": { x5houryvs2: 1, "GTM-M74P6CSD": 0 },
  "offer/ru.html": { "G-MXX0XQWV3R": 2, x5houryvs2: 1 },
  "privacy/ru.html": { "G-MXX0XQWV3R": 2 },
  "swe/uk.html": { "GTM-M74P6CSD": 2, "G-1TYEB7YFP5": 2, x5houryvs2: 1 },
  "swe/en.html": { "GTM-M74P6CSD": 2, "G-1TYEB7YFP5": 2, x5houryvs2: 1 },
  "swe/ru.html": { "GTM-M74P6CSD": 2, "G-1TYEB7YFP5": 2, x5houryvs2: 1 },
};

const BOT_HREF_RE = /href="([^"]*tg\.pulse\.is\/next_tick_bot[^"]*)"/g;

// ---- CLI: optional --page <dir> filter -----------------------------------
const argv = process.argv.slice(2);
let pageArg = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--page") pageArg = argv[++i];
  else if (argv[i].startsWith("--page=")) pageArg = argv[i].slice("--page=".length);
}
// normalize "docs/all" | "docs" | "all" | "" -> dir
const normDir = (a) => a.replace(/^\.?\/?docs\/?/, "").replace(/\/+$/, "");
const selected = pageArg == null ? PAGE_DEFS : PAGE_DEFS.filter((d) => d.dir === normDir(pageArg));
if (pageArg != null && selected.length === 0) {
  console.error(`--page "${pageArg}" matched no page group`);
  process.exit(2);
}
const scoped = pageArg != null;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log("  ✗ " + msg);
};
const pass = (msg) => console.log("  ✓ " + msg);

const read = (rel) => readFileSync(join(PAGES, rel), "utf8");
const decode = (s) => s.replace(/&amp;/g, "&");

const contentFiles = selected.flatMap((d) => d.files);
const botFiles = Object.fromEntries(
  selected.filter((d) => d.channel).flatMap((d) => d.files.map((f) => [f, d.channel])),
);
// per-page SendPulse start code (defaults to the site-wide START; `all` uses its own)
const botStart = Object.fromEntries(
  selected.filter((d) => d.channel).flatMap((d) => d.files.map((f) => [f, d.start || START])),
);
const noAttrFiles = selected.filter((d) => d.channel == null).flatMap((d) => d.files);

console.log(`\n[1] Meta Pixel present on ${contentFiles.length} content page(s)`);
for (const p of contentFiles) {
  const html = read(p);
  const okScript =
    html.includes("fbevents.js") &&
    /fbq\(\s*['"]init['"]\s*,\s*['"]1022924580268547['"]/.test(html) &&
    /fbq\(\s*['"]track['"]\s*,\s*['"]PageView['"]/.test(html);
  const okNoscript = decode(html).includes(
    `facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`,
  );
  if (okScript && okNoscript) pass(`${p} — pixel + noscript`);
  else
    fail(
      `${p} — ${okScript ? "" : "missing fbq init/PageView "}${okNoscript ? "" : "missing noscript img"}`,
    );
}

if (!scoped) {
  const stubs = ["templates/sniff.stubs.json", "templates/legacy.stubs.json"].flatMap(
    (cfg) => JSON.parse(readFileSync(join(ROOT, cfg), "utf8")).outputs.map((o) => o.out),
  );
  console.log(`\n[2] The ${stubs.length} analytics-free stubs have NO pixel/GTM/GA4/Clarity/attribution`);
  const STUB_FORBIDDEN = [
    PIXEL_ID, "fbevents.js", "GTM-M74P6CSD", "G-1TYEB7YFP5", "G-MXX0XQWV3R",
    "x5houryvs2", "nt-attribution.js",
  ];
  for (const p of stubs) {
    const html = read(p);
    const hit = STUB_FORBIDDEN.filter((n) => html.includes(n));
    if (!hit.length) pass(`${p} — clean stub`);
    else fail(`${p} — stub must not contain: ${hit.join(", ")}`);
  }
}

console.log("\n[3] nt-attribution.js present on bot-link pages, absent on non-attribution pages");
for (const p of Object.keys(botFiles)) {
  const html = read(p);
  if (html.includes(ASSET)) pass(`${p} — attribution script included`);
  else fail(`${p} — missing ${ASSET} include`);
}
for (const p of noAttrFiles) {
  const html = read(p);
  const bots = [...html.matchAll(BOT_HREF_RE)].length;
  if (!html.includes(ASSET) && bots === 0) pass(`${p} — no attribution/bot links (as expected)`);
  else fail(`${p} — expected no attribution/bot links, got attribution=${html.includes(ASSET)} bots=${bots}`);
}

console.log("\n[4/5] Bot links: start code + per-page source_channel");
for (const [p, expectSc] of Object.entries(botFiles)) {
  const html = read(p);
  const links = [...html.matchAll(BOT_HREF_RE)].map((m) => decode(m[1]));
  if (!links.length) {
    fail(`${p} — no bot links found`);
    continue;
  }
  let ok = true;
  const expectStart = botStart[p] || START;
  for (const href of links) {
    const u = new URL(href);
    if (u.searchParams.get("start") !== expectStart) {
      ok = false;
      fail(`${p} — a bot link lost start=${expectStart}: ${href}`);
    }
    if (u.searchParams.get("source_channel") !== expectSc) {
      ok = false;
      fail(
        `${p} — expected source_channel=${expectSc}, got ${u.searchParams.get("source_channel")}: ${href}`,
      );
    }
  }
  if (ok) pass(`${p} — ${links.length} bot link(s): start ok, source_channel=${expectSc}`);
}

console.log("\n[6] No residual source_channel=utm swap");
{
  let found = 0;
  for (const p of contentFiles) {
    const html = read(p);
    if (/\.set\(\s*["']source_channel["']\s*,\s*utm/.test(html)) {
      fail(`${p} — old swap still present`);
      found++;
    }
  }
  if (!found) pass('no `set("source_channel", utm` anywhere');
}

console.log("\n[7] GA4/GTM/Clarity footprint counts (baseline-faithful spot checks)");
{
  const inScope = new Set(contentFiles);
  for (const [p, counts] of Object.entries(FOOTPRINT)) {
    if (!inScope.has(p)) continue;
    const html = read(p);
    for (const [needle, n] of Object.entries(counts)) {
      const got = html.split(needle).length - 1;
      if (got === n) pass(`${p} — ${needle} x${got}`);
      else fail(`${p} — ${needle} expected x${n}, got x${got}`);
    }
  }
}

if (selected.some((d) => d.dir === "all")) {
  console.log("\n[8] Structural parity across all/ trio (uk == en == ru)");
  const count = (html, needle) => html.split(needle).length - 1;
  const shape = (html) => ({
    section: count(html, "<section"),
    h2: count(html, "<h2"),
    faq: count(html, 'class="faq-item"'),
    bot: [...html.matchAll(BOT_HREF_RE)].length,
  });
  const base = shape(read("all/ru.html")); // ru = source of truth
  for (const p of ["all/uk.html", "all/en.html"]) {
    const s = shape(read(p));
    const diffs = ["section", "h2", "faq", "bot"].filter((k) => base[k] !== s[k]);
    if (!diffs.length) pass(`${p} — structural parity with all/ru.html`);
    else for (const k of diffs) fail(`${p} — ${k}=${s[k]} != ru ${base[k]}`);
  }
}

// [9] lang-switch anchors migrated to the page-based scheme on EVERY chrome page
// (home /<loc>.html, sub-pages /<page>/<loc>.html). A bare /<loc>/ dir-style href
// is the old-scheme anti-pattern. The byte-diff cannot catch this — the allowlist
// canonicalizes both schemes to one token — so it is asserted explicitly here,
// across all chrome pages (not just all/). Anchor hrefs are independent of #18's
// lang-switch <script> modernization.
{
  const CHROME = new Set([
    "", "swe", "all", "future-proof", "middle", "ai-speedup-checklist", "ai-speedup-checklist-for-guild-members",
  ]);
  const chromeDefs = selected.filter((d) => CHROME.has(d.dir));
  if (chromeDefs.length) {
    console.log("\n[9] Lang-switch anchors page-based (no bare /<loc>/ dir-style) across chrome pages");
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const badRe = /class="ls-opt[^"]*"[^>]*href="\/(?:uk|en|ru)\//g;
    for (const d of chromeDefs) {
      const prefix = d.dir ? d.dir + "/" : "";
      const goodRe = new RegExp(
        `class="ls-opt[^"]*"[^>]*href="/${escRe(prefix)}(?:uk|en|ru)\\.html"`,
        "g",
      );
      for (const f of d.files) {
        const html = read(f);
        const good = (html.match(goodRe) || []).length;
        const bad = (html.match(badRe) || []).length;
        if (good === 3 && bad === 0) pass(`${f} — 3 ls-opt -> /${prefix}<loc>.html, 0 old dir-style`);
        else
          fail(
            `${f} — ls-opt good(/${prefix}<loc>.html)=${good} (want 3), bad(bare /<loc>/ dir-style)=${bad} (want 0)`,
          );
      }
    }
  }
}

console.log(
  failures === 0
    ? "\n✅ verify-attribution: ALL CHECKS PASSED\n"
    : `\n❌ verify-attribution: ${failures} FAILURE(S)\n`,
);
process.exit(failures === 0 ? 0 : 1);
