// verify-structure.mjs — the new structural gate (plan §Phase 7). Three checks:
//
//   (a) CROSS-LOCALE PARITY — for each chrome page, every locale is structurally
//       identical: normalizeStructure() byte-equal (visible text / translated
//       attrs / caption literals / PAGE_LOC / URL-attrs masked). Uses
//       tools/dom-normalize.mjs. The byte-exact per-locale check (b) is the
//       script/analytics backstop: since every locale must equal its own
//       baseline (which share one analytics footprint), cross-locale script
//       drift or wrong-locale captions surface there. Legal pages are NOT parity-
//       checked — offer/privacy ru vs uk come from different halves of a
//       bilingual docx (independently authored), so their structure legitimately
//       differs; they are gated by verify-legal.
//   (b) SAME-LOCALE ACCEPTANCE — each generated chrome page byte-diffs against
//       git show 268cb44:<oldpath> with only allowlisted lines differing (the
//       modernized lang-switch <script> is excised as an expected delta). Uses
//       tools/bytediff.mjs. Legal pages are EXEMPT (their page-based URLs cross
//       printWidth 80 and Prettier rewraps, and build-legal.py deliberately
//       rewrites the lang-switch JS — they are gated by verify-legal instead).
//   (c) LIVE-PATH EXISTENCE — every current live entry URL maps to an existing
//       file under docs/, so nothing hard-404s after the old tree is deleted
//       (incl. the self-canonical /en/ /uk/ /ru/ and, per the 2026-07-07 user
//       decision, the root-default /ai-speedup-checklist/ + /…-guild-members/).
//
// Usage: node tools/verify-structure.mjs   (exit 0 = all green)

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeStructure } from "./dom-normalize.mjs";
import { byteDiffFiles, BASELINE_SHA } from "./bytediff.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TPL = path.join(ROOT, "templates");
const PAGES = path.join(ROOT, "docs");
const DEFAULT_LOCALES = ["en", "ru", "uk"];

const problems = [];
const fail = (check, msg) => problems.push(`[${check}] ${msg}`);

// ── page discovery ─────────────────────────────────────────────────────────
// Chrome content pages come from templates/<page>.page.json (same auto-discovery
// as build.mjs). The frozen-baseline path is page-specific: home and `all` are
// files (<loc>/index.html, <loc>/all.html); checklist/guild were dir-style
// (<loc>/<page>/index.html).
function baselineOldPath(page, loc) {
  if (page === "index") return `${loc}/index.html`;
  if (page === "all") return `${loc}/all.html`;
  return `${loc}/${page}/index.html`;
}
function generatedPath(page, scheme, loc) {
  return scheme === "root" ? path.join(PAGES, `${loc}.html`) : path.join(PAGES, page, `${loc}.html`);
}

function discoverChrome() {
  return readdirSync(TPL)
    .filter((f) => f.endsWith(".page.json"))
    .sort()
    .map((f) => {
      const page = f.slice(0, -".page.json".length);
      const cfg = JSON.parse(readFileSync(path.join(TPL, f), "utf8"));
      const locales = cfg.locales || DEFAULT_LOCALES;
      const strings = JSON.parse(readFileSync(path.join(TPL, cfg.strings), "utf8"));
      return { page, scheme: cfg.outputScheme, locales, strings };
    });
}

// ── (a) cross-locale parity — element skeleton only (robust) ────────────────
function checkParity(page, locales, htmlByLoc) {
  const [base, ...rest] = locales;
  const baseStruct = normalizeStructure(htmlByLoc[base]);
  for (const loc of rest) {
    if (normalizeStructure(htmlByLoc[loc]) !== baseStruct) {
      fail("a/parity", `${page}: element structure ${loc} != ${base}`);
    }
  }
}

// ── run chrome pages: (a) parity + (b) same-locale bytediff ─────────────────
for (const { page, scheme, locales } of discoverChrome()) {
  const gen = {};
  let ok = true;
  for (const loc of locales) {
    const p = generatedPath(page, scheme, loc);
    if (!existsSync(p)) {
      fail("b/accept", `${page}: missing generated ${path.relative(ROOT, p)}`);
      ok = false;
      continue;
    }
    gen[loc] = readFileSync(p, "utf8");
    // `swe` and `all` are from-scratch redesigns with no frozen 268cb44 baseline
    // (the old `all` was the simpler green landing; it is now the guildia-v2
    // redesign) — exempt them from same-locale byte acceptance (cross-locale
    // parity + live-path still apply).
    // `index` carries a post-migration content edit (offer/privacy links added to
    // the colophon footer), so it legitimately diverges from the 268cb44 snapshot
    // and is likewise exempt from same-locale byte acceptance; cross-locale parity,
    // i18n residue, and live-path existence still guard it.
    // `future-proof` is a brand-new page (the guildia landing v3) with no 268cb44
    // baseline at all, so it is exempt from same-locale byte acceptance too; cross-
    // locale parity, i18n residue, and live-path existence still guard it.
    // `middle` is a brand-new page (the "landing final" middle-funnel design) with
    // no 268cb44 baseline either, so it is likewise exempt from same-locale byte
    // acceptance; cross-locale parity, i18n residue, and live-path still guard it.
    // `career-resilience` is a brand-new page (the terminal-styled career landing)
    // with no 268cb44 baseline, so it is exempt from same-locale byte acceptance
    // too; cross-locale parity, i18n residue, and live-path still guard it.
    if (
      page !== "swe" &&
      page !== "all" &&
      page !== "index" &&
      page !== "future-proof" &&
      page !== "middle" &&
      page !== "career-resilience"
    ) {
      const res = byteDiffFiles(p, BASELINE_SHA, baselineOldPath(page, loc));
      if (!res.ok) {
        fail(
          "b/accept",
          `${page}/${loc}: ${res.unexpected.length} unexpected line(s) vs ${BASELINE_SHA}:${baselineOldPath(page, loc)} (first: line ${res.unexpected[0]?.line})`,
        );
      }
    }
  }
  if (ok) checkParity(page, locales, gen);
}

// ── (c) live-path existence ─────────────────────────────────────────────────
// Every URL live today must resolve to a file under docs/ (no hard 404 after
// the old lang tree is deleted).
const required = [
  // new canonical content pages
  "en.html", "ru.html", "uk.html", // home
  "swe/en.html", "swe/ru.html", "swe/uk.html",
  "ai-speedup-checklist/en.html", "ai-speedup-checklist/ru.html", "ai-speedup-checklist/uk.html",
  "ai-speedup-checklist-for-guild-members/en.html", "ai-speedup-checklist-for-guild-members/ru.html", "ai-speedup-checklist-for-guild-members/uk.html",
  "offer/ru.html", "offer/uk.html", "privacy/ru.html", "privacy/uk.html",
  "consent/ru.html", "consent/uk.html",
  "offer/en.html", "privacy/en.html", "consent/en.html",
  // root sniff stubs
  "index.html", "swe.html", "ai-speedup-checklist.html",
  "ai-speedup-checklist-for-guild-members.html", "offer.html", "privacy.html",
  "consent.html",
  // home locale-root legacy stubs (self-canonical /en/ /uk/ /ru/ must not 404)
  "en/index.html", "ru/index.html", "uk/index.html",
  // root-default dir stubs (USER-APPROVED 2026-07-07)
  "ai-speedup-checklist/index.html", "ai-speedup-checklist-for-guild-members/index.html",
  // first-level legacy redirects
  "en/swe.html", "ru/swe.html", "uk/swe.html",
  "en/ai-speedup-checklist/index.html", "ru/ai-speedup-checklist/index.html", "uk/ai-speedup-checklist/index.html",
  "en/ai-speedup-checklist-for-guild-members/index.html", "ru/ai-speedup-checklist-for-guild-members/index.html", "uk/ai-speedup-checklist-for-guild-members/index.html",
  "ru/offer/index.html", "uk/offer/index.html", "ru/privacy/index.html", "uk/privacy/index.html",
];
for (const rel of required) {
  if (!existsSync(path.join(PAGES, rel))) fail("c/live-path", `missing live-path target docs/${rel}`);
}

// ── report ──────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`verify-structure FAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("verify-structure PASS — cross-locale parity, same-locale acceptance, and live-path existence all green.");
