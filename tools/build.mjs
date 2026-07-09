// Static site builder — Node + Eta + pinned Prettier -> committed docs/ tree.
//
// ────────────────────────────────────────────────────────────────────────────
// HARD DESIGN CONSTRAINT: page/stub workers MUST NOT edit this file.
// New pages are added by dropping a per-page config next to the template; this
// builder AUTO-DISCOVERS them. There is no page registry in here on purpose.
// ────────────────────────────────────────────────────────────────────────────
//
// Discovery (everything under templates/):
//
//   1. Localized content pages — one file `templates/<page>.page.json`:
//        {
//          "template": "all.html",          // Eta view, relative to templates/
//          "strings":  "all.strings.json",  // relative to templates/
//          "outputScheme": "dir",           // "dir" | "root"  (see below)
//          "locales": ["en","ru","uk"],     // optional; default en/ru/uk
//          "analytics": { "gtm": true, "ga4": true, "clarity": true,
//                         "pixel": true, "attribution": "website" }
//        }
//      • page name = filename minus ".page.json".
//      • strings JSON is keyed by locale: { "en": {…}, "ru": {…}, "uk": {…} }.
//      • outputScheme "dir"  -> pages/<page>/<loc>.html
//        outputScheme "root" -> pages/<loc>.html            (home)
//
//   2. Stub / legacy batches — one file `templates/<name>.stubs.json`
//      (authored in Phase 5; analytics-free sniff stubs + legacy redirects):
//        {
//          "template": "stub.html",         // Eta view, relative to templates/
//          "outputs": [
//            { "out": "index.html",     "data": { … } },   // path is under pages/
//            { "out": "en/index.html",  "data": { … } }
//          ]
//        }
//
// Template render context (Eta `useWith:true`, so reference names directly):
//   • every key of strings[loc]  -> spread at top level  (e.g. <%= headline %>,
//                                    <%~ render.lede %>)
//   • s        -> strings[loc]     (namespaced alias for the same map)
//   • loc      -> "en" | "ru" | "uk"
//   • analytics-> the page's analytics flags object
//   • page     -> the page name
//   • include(name, data) -> Eta partial include (built-in)
//   Reserved top-level names (do NOT use as strings keys): s, loc, analytics,
//   page, include, it. Stub templates receive their `data` object the same way
//   (spread + `data` alias), with NO analytics.
//
// Output rules:
//   • writes ONLY *.html — pages/ static (CNAME, favicon.ico, site.webmanifest,
//     assets/, roadmap-data.<loc>.js) is NEVER touched or wiped.
//   • every file is Prettier-formatted through tools/lib/format.mjs (same pinned
//     prettier + .prettierrc the canary validates), so output is byte-stable.
//
// Usage: node tools/build.mjs   (or: npm run build)

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { Eta } from "eta";
import { formatHtml, ROOT } from "./lib/format.mjs";

const TEMPLATES_DIR = path.join(ROOT, "templates");
const PAGES_DIR = path.join(ROOT, "docs");
const DEFAULT_LOCALES = ["en", "ru", "uk"];
const RESERVED = new Set(["s", "loc", "analytics", "page", "include", "it"]);

// Leave autoTrim at Eta's default ([false,"nl"]): it trims one newline after a
// closing tag, which keeps conditional analytics includes free of stray blank
// lines (verified). Prettier then normalizes remaining whitespace.
const eta = new Eta({
  views: TEMPLATES_DIR,
  autoEscape: true,
  useWith: true,
  cache: false,
});

async function listConfigs(suffix) {
  let entries;
  try {
    entries = await readdir(TEMPLATES_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return []; // templates/ not created yet (pre-Phase-1)
    throw err;
  }
  return entries.filter((f) => f.endsWith(suffix)).sort();
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(TEMPLATES_DIR, rel), "utf8"));
}

function outputPath(page, scheme, loc) {
  if (scheme === "root") return path.join(PAGES_DIR, `${loc}.html`);
  if (scheme === "dir") return path.join(PAGES_DIR, page, `${loc}.html`);
  throw new Error(`page "${page}": unknown outputScheme "${scheme}" (use "dir" | "root")`);
}

function assertNoReserved(page, loc, strings) {
  for (const key of Object.keys(strings)) {
    if (RESERVED.has(key)) {
      throw new Error(
        `page "${page}" locale "${loc}": strings key "${key}" is reserved ` +
          `(${[...RESERVED].join(", ")}). Rename it in the .strings.json.`,
      );
    }
  }
}

async function renderAndWrite(templateName, data, outFile) {
  // Sync render: templates use only Eta's sync include(); async formatting
  // happens after, in formatHtml().
  const rendered = eta.render(templateName, data);
  if (rendered == null) {
    throw new Error(`template "${templateName}" rendered nothing (missing view?)`);
  }
  const formatted = await formatHtml(rendered);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, formatted, "utf8");
  return outFile;
}

async function buildContentPages() {
  const configs = await listConfigs(".page.json");
  const written = [];
  for (const cfg of configs) {
    const page = cfg.slice(0, -".page.json".length);
    const { template, strings, outputScheme, analytics = {}, locales = DEFAULT_LOCALES } =
      await readJson(cfg);
    if (!template || !strings || !outputScheme) {
      throw new Error(`${cfg}: requires "template", "strings", "outputScheme"`);
    }
    const stringsByLocale = await readJson(strings);
    for (const loc of locales) {
      const locStrings = stringsByLocale[loc];
      if (!locStrings) {
        throw new Error(`${strings}: missing locale "${loc}" for page "${page}"`);
      }
      assertNoReserved(page, loc, locStrings);
      const data = { ...locStrings, s: locStrings, loc, analytics, page };
      const out = await renderAndWrite(template, data, outputPath(page, outputScheme, loc));
      written.push(out);
    }
  }
  return written;
}

async function buildStubBatches() {
  const configs = await listConfigs(".stubs.json");
  const written = [];
  for (const cfg of configs) {
    const { template, outputs } = await readJson(cfg);
    if (!template || !Array.isArray(outputs)) {
      throw new Error(`${cfg}: requires "template" and an "outputs" array`);
    }
    for (const { out, data = {} } of outputs) {
      if (!out) throw new Error(`${cfg}: every output needs an "out" path`);
      const ctx = { ...data, data };
      const outFile = await renderAndWrite(template, ctx, path.join(PAGES_DIR, out));
      written.push(outFile);
    }
  }
  return written;
}

async function main() {
  const pages = await buildContentPages();
  const stubs = await buildStubBatches();
  const all = [...pages, ...stubs];
  for (const f of all) console.log(`built ${path.relative(ROOT, f)}`);
  if (all.length === 0) {
    console.log("build: no templates/*.page.json or *.stubs.json found yet (nothing to build).");
  } else {
    console.log(`\nbuild OK — ${pages.length} page file(s), ${stubs.length} stub file(s).`);
  }
}

main().catch((err) => {
  console.error("build FAILED:", err.message);
  process.exit(1);
});
