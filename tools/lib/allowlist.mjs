// The enumerated same-locale delta allowlist (plan §0), implemented as URL/attr
// canonicalization. Both oracles import this so they agree on exactly what is
// "allowed to differ":
//   1. <html lang="…">
//   2. rel="canonical" href
//   3. hreflang alternate hrefs
//   4. in-page lang-switch anchors (class="ls-opt" … href)
//   5. the one relative roadmap script src (home only)
//
// The restructure rewrites URLs between two schemes for the SAME locale:
//   OLD (lang-first):  /<loc>/            /<loc>/all.html   /<loc>/<slug>/
//                      https://nexttick.it/<loc>/…
//   NEW (page-first):  /<loc>.html        /all/<loc>.html   /<slug>/<loc>.html
//                      https://nexttick.it/<page>/<loc>.html   https://nexttick.it/<loc>.html
//   roadmap:           roadmap-data.js  ->  roadmap-data.<loc>.js
//
// canonUrl() collapses BOTH schemes to identical placeholder tokens. Applied to
// a same-locale pair, the only permitted differences vanish and everything else
// (any real content/analytics/structure change) survives to fail loud.

const LOC = "(?:en|ru|uk)";

// Apply NEW-scheme rewrites BEFORE OLD-scheme so a new URL like
// https://nexttick.it/en.html is never partially eaten by the OLD pattern.
export function canonUrl(text) {
  return (
    text
      // --- roadmap script src (home only): roadmap-data(.<loc>).js -> token ---
      .replace(new RegExp(`roadmap-data(?:\\.${LOC})?\\.js`, "g"), "roadmap-data§R§.js")

      // --- NEW absolute: https://nexttick.it/[<page>/]<loc>.html ---
      .replace(
        new RegExp(`https://nexttick\\.it/(?:[a-z0-9-]+/)?${LOC}\\.html`, "g"),
        "https://nexttick.it/§U§",
      )
      // --- OLD absolute: https://nexttick.it/<loc>[/…] ---
      .replace(
        new RegExp(`https://nexttick\\.it/${LOC}(?:/[^"'\\s]*)?`, "g"),
        "https://nexttick.it/§U§",
      )

      // --- NEW relative href: /[<page>/]<loc>.html ---
      .replace(new RegExp(`href="/(?:[a-z0-9-]+/)?${LOC}\\.html"`, "g"), 'href="/§U§"')
      // --- OLD relative href: /<loc>[/…] ---
      .replace(new RegExp(`href="/${LOC}(?:/[^"]*)?"`, "g"), 'href="/§U§"')
  );
}

// html lang="<loc>" -> placeholder. \b before `lang` prevents matching the
// `lang` inside hreflang="…".
export function canonLang(text) {
  return text.replace(new RegExp(`\\blang="${LOC}"`, "g"), 'lang="§L§"');
}

// Full same-locale canonicalization: neutralize every allowlisted delta.
export function canonAllowlist(text) {
  return canonLang(canonUrl(text));
}

// ─── Block-level normalizers (applied to whole documents before line diff) ───

// An allowlisted URL change can push a <link>/<meta> past printWidth 80 (e.g.
// the x-default hreflang /uk/ -> /uk.html), so Prettier wraps that ONE tag
// across several lines on the generated side only. Collapse each <link>/<meta>
// tag's internal whitespace to a single line — they are void head elements,
// never multi-line inside <script>/<style>, so this is safe and symmetric.
export function collapseVoidTags(text) {
  return text.replace(/<(?:link|meta)\b[^>]*>/gi, (m) => m.replace(/\s+/g, " "));
}

// The client lang-switch <script> block is DELIBERATELY modernized to the
// page-based URL scheme (Phase 4.5) — its bytes legitimately differ from the
// frozen baseline's old lang-based logic, and the two versions even have
// different line counts. Excise the IIFE (anchored on the unique
// `var LOCS = ["uk", "en", "ru"];` .. its `})();`) to a single placeholder on
// BOTH sides so it is an EXPECTED delta and can't desync the line diff. The
// switch JS is validated separately by a functional check, not byte-for-byte.
export function exciseLangSwitch(text) {
  return text.replace(
    /var LOCS = \["uk", "en", "ru"\];[\s\S]*?\n\s*\}\)\(\);/,
    "/*§LANGSWITCH§*/",
  );
}

// Everything the same-locale byte-diff normalizes before comparing lines.
export function normalizeForByteDiff(text) {
  return collapseVoidTags(exciseLangSwitch(text));
}
