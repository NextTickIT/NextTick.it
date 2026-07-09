// CROSS-LOCALE STRUCTURAL-PARITY normalizer (plan Decision B) — the ONLY place
// an HTML parser is used, and NOT the same-locale oracle (that is bytediff.mjs).
//
// en/ru/uk of one generated page legitimately differ on translated text, on the
// render-script caption literals, on PAGE_LOC, and on the allowlisted URL/attr
// deltas. This module strips/placeholders exactly those so the RESIDUAL element
// structure can be compared byte-for-byte across locales.
//
// Two independent comparisons make up parity (both must hold):
//   1. normalizeStructure(html)  — element skeleton with all visible text
//      collapsed, <script>/<style> BODIES replaced by a fixed token, and the
//      allowlisted href/src/lang attribute VALUES canonicalized. Catches
//      structural drift (added/removed/moved elements, changed attributes).
//   2. maskRawtext(html, masks)  — the concatenated <script>/<style> bodies with
//      the caller-supplied per-locale strings (caption literals + PAGE_LOC value)
//      masked to a placeholder. Catches ANY analytics/attribution byte drift,
//      because those constants are NOT in the mask list. This is what a
//      re-serializing parser could otherwise hide — hence a dedicated rawtext
//      compare with a MANDATORY failing script-drift fixture below.
//
// Library API:
//   normalizeStructure(html) -> string
//   maskRawtext(html, masks[]) -> string
//   structuralParity(htmlA, htmlB, { maskA, maskB }) -> { equal, reasons[] }
//
// CLI: node tools/dom-normalize.mjs   (runs the 3 required unit fixtures)

import { parse, NodeType } from "node-html-parser";
import { canonUrl } from "./lib/allowlist.mjs";

// Distinct non-empty tokens so the PRESENCE of text/body is structurally
// visible: <p>x</p> and <p></p> must not collapse to the same skeleton (a
// missing translation cross-locale is a real diff). These ASCII sentinels are
// vanishingly unlikely to appear literally in the source HTML.
const TEXT = "{{§TEXT§}}"; // collapsed visible-text token
const RAWBODY = "{{§RAWBODY§}}"; // script/style body placeholder (skeleton)
const COMMENT = "{{§COMMENT§}}"; // comment placeholder (locale-neutral)
const MASK = "{{§MASK§}}"; // per-locale string mask (rawtext compare)

function parseDoc(html) {
  return parse(html, {
    comment: true,
    blockTextElements: { script: true, style: true, pre: true, textarea: true },
  });
}

// Attributes whose VALUES carry translated text (they legitimately differ per
// locale). For cross-locale parity their values are masked to a constant so the
// element STRUCTURE (name + presence + position) is still compared.
const TRANSLATABLE_ATTRS = new Set(["alt", "aria-label", "title", "content", "placeholder"]);

// Canonicalize a single attribute's value against the allowlist: html lang and
// any nav/roadmap href|src collapse to placeholders so cross-locale variants
// match; translated-text attributes are masked. Everything else is preserved
// verbatim (identical across locales).
function canonAttrValue(tag, name, value) {
  if (tag === "html" && name === "lang") return "§L§";
  if (TRANSLATABLE_ATTRS.has(name)) return "§T§";
  if (name === "class") {
    // The lang-switch marks the CURRENT locale's anchor with an extra `on`
    // token; that marker moves per locale, so drop it when `ls-opt` is present.
    const t = value.split(/\s+/).filter(Boolean);
    if (t.includes("ls-opt")) return t.filter((x) => x !== "on").join(" ");
    return value;
  }
  if (name === "href" || name === "src") {
    // Reuse the same-locale oracle's URL canonicalization so both oracles agree
    // on what a nav/roadmap delta is. Wrapping in href="…" lets canonUrl's
    // relative-href rule fire; its absolute-URL and roadmap rules match inside
    // the wrapper too. Unchanged values pass through untouched.
    return canonUrl(`href="${value}"`).slice('href="'.length, -1);
  }
  return value;
}

function serializeAttrs(node) {
  const tag = (node.rawTagName || "").toLowerCase();
  const attrs = node.attributes || {};
  const names = Object.keys(attrs).sort();
  let out = "";
  for (const name of names) {
    // aria-current marks the current locale's lang-switch anchor — it is a
    // per-locale state marker, not structure, so it is dropped for parity.
    if (name === "aria-current") continue;
    const v = canonAttrValue(tag, name, attrs[name]);
    out += ` ${name}="${v}"`;
  }
  return out;
}

function walk(node) {
  switch (node.nodeType) {
    case NodeType.TEXT_NODE: {
      // Collapse: whitespace-only text is structurally irrelevant (prettier
      // normalizes it); any real text becomes a single token so per-locale
      // wrapping/length can't create phantom structural diffs.
      return /\S/.test(node.rawText) ? TEXT : "";
    }
    case NodeType.COMMENT_NODE:
      return COMMENT;
    case NodeType.ELEMENT_NODE: {
      const tag = (node.rawTagName || "").toLowerCase();
      const attrs = serializeAttrs(node);
      if (tag === "script" || tag === "style") {
        // Body ignored here (checked by maskRawtext); keep tag + attrs so a
        // moved/duplicated/removed script is still structurally visible.
        return `<${tag}${attrs}>${RAWBODY}</${tag}>`;
      }
      const inner = node.childNodes.map(walk).join("");
      return `<${tag}${attrs}>${inner}</${tag}>`;
    }
    default:
      return "";
  }
}

export function normalizeStructure(html) {
  const root = parseDoc(html);
  return root.childNodes.map(walk).join("");
}

// Collect <script> and <style> bodies in document order, then mask each
// caller-supplied per-locale string. Analytics/attribution constants are NOT in
// `masks`, so any drift in them survives and is caught by the compare.
export function maskRawtext(html, masks = []) {
  const root = parseDoc(html);
  const parts = [];
  const collect = (node) => {
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      const tag = (node.rawTagName || "").toLowerCase();
      if (tag === "script" || tag === "style") {
        parts.push(`<${tag}>` + node.rawText + `</${tag}>`);
        return; // do not descend into rawtext element
      }
      node.childNodes.forEach(collect);
    }
  };
  root.childNodes.forEach(collect);
  let joined = parts.join("\n\n");
  // Neutralize the locale codes wherever they appear as DELIMITED literals in
  // <script> rawtext — both PAGE_LOC's value AND the shared LOCS array
  // (["uk","en","ru"]). Masking all three on every locale is symmetric, so the
  // LOCS array collapses identically ("§L§","§L§","§L§") and PAGE_LOC's per-locale
  // value collapses to the same token. Delimited-only so identifiers (textContent)
  // and substrings (the en_US pixel URL) are never touched.
  for (const code of ["en", "uk", "ru"]) {
    for (const q of ['"', "'", "`"]) {
      joined = joined.split(q + code + q).join(q + "§L§" + q);
    }
  }
  // Mask only DELIMITED string literals ("v", 'v', `v`) — a caption/PAGE_LOC
  // value is always a quoted literal, so this never corrupts identifiers (e.g.
  // "en" must not touch textContent, "now" must not touch nowLabel) and leaves
  // analytics ID literals (never in `masks`) intact so their drift is caught.
  // Longest first so a short mask can't chop a longer one mid-way.
  for (const m of [...masks].filter(Boolean).sort((a, b) => b.length - a.length)) {
    for (const q of ['"', "'", "`"]) {
      joined = joined.split(q + m + q).join(q + MASK + q);
    }
  }
  return joined;
}

export function structuralParity(htmlA, htmlB, { maskA = [], maskB = [] } = {}) {
  const reasons = [];
  if (normalizeStructure(htmlA) !== normalizeStructure(htmlB)) {
    reasons.push("element structure differs");
  }
  if (maskRawtext(htmlA, maskA) !== maskRawtext(htmlB, maskB)) {
    reasons.push("script/style rawtext differs (beyond masked per-locale strings)");
  }
  return { equal: reasons.length === 0, reasons };
}

// ------------------------------- fixtures ---------------------------------
// Required Phase-0 unit gate: (a) identical-mod-allowlist -> equal;
// (b) structural change -> not equal; (c) script-only-drift -> MUST be caught.
function runFixtures() {
  const enDoc = `<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://nexttick.it/en/all.html" />
    <link rel="alternate" hreflang="uk" href="https://nexttick.it/uk/all.html" />
    <script src="/assets/x.js"></script>
    <script>
      var PAGE_LOC = "en";
      nowLabel.textContent = "now";
      (function () { gtm("GTM-M74P6CSD"); })();
    </script>
  </head>
  <body>
    <h1>Content that ships regularly</h1>
    <a class="ls-opt" data-loc="uk" hreflang="uk" href="/uk/all.html">UK</a>
  </body>
</html>`;

  // (a) uk variant: NEW url scheme + translated text + translated caption +
  // PAGE_LOC="uk" — all allowlisted/masked. Structure identical.
  const ukDoc = `<!doctype html>
<html lang="uk">
  <head>
    <link rel="canonical" href="https://nexttick.it/all/uk.html" />
    <link rel="alternate" hreflang="uk" href="https://nexttick.it/all/uk.html" />
    <script src="/assets/x.js"></script>
    <script>
      var PAGE_LOC = "uk";
      nowLabel.textContent = "зараз";
      (function () { gtm("GTM-M74P6CSD"); })();
    </script>
  </head>
  <body>
    <h1>Контент, що виходить регулярно</h1>
    <a class="ls-opt" data-loc="uk" hreflang="uk" href="/all/uk.html">UK</a>
  </body>
</html>`;

  // (b) structural change: an extra <p> element.
  const ukStructural = ukDoc.replace("<body>", "<body>\n    <p>extra</p>");

  // (c) script-only drift: identical structure + captions, ONE analytics byte
  // changed (GTM-M74P6CSD -> GTM-M74P6CSE). Not in the mask set -> must be caught.
  const enScriptDrift = enDoc.replace("GTM-M74P6CSD", "GTM-M74P6CSE");

  const masksEn = ["en", "now", "Content that ships regularly"];
  const masksUk = ["uk", "зараз", "Контент, що виходить регулярно"];

  const results = [];

  const a = structuralParity(enDoc, ukDoc, { maskA: masksEn, maskB: masksUk });
  results.push(["(a) identical-mod-allowlist -> equal", a.equal === true, a]);

  const b = structuralParity(enDoc, ukStructural, { maskA: masksEn, maskB: masksUk });
  results.push(["(b) structural change -> NOT equal", b.equal === false, b]);

  const c = structuralParity(enDoc, enScriptDrift, {
    maskA: masksEn,
    maskB: masksEn,
  });
  // MUST FAIL parity (i.e. drift detected -> equal === false).
  results.push([
    "(c) script-only analytics-byte drift -> MUST be caught",
    c.equal === false && c.reasons.some((r) => r.includes("rawtext")),
    c,
  ]);

  let allPass = true;
  for (const [label, pass, detail] of results) {
    if (pass) {
      console.log(`fixture OK  ${label}`);
    } else {
      allPass = false;
      console.error(`fixture FAIL ${label} -> ${JSON.stringify(detail)}`);
    }
  }
  if (!allPass) {
    console.error("\ndom-normalize fixtures FAILED");
    process.exit(1);
  }
  console.log("\ndom-normalize PASS — all 3 cross-locale parity fixtures green.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFixtures();
}
