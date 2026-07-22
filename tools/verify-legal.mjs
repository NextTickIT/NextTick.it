#!/usr/bin/env node
// verify-legal.mjs — integrity gate for the standalone legal pages.
// Run: node tools/verify-legal.mjs   (exits non-zero on any failure)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every legal page cross-links all sibling docs in its footer.
const LEGAL_SLUGS = ["offer", "privacy", "consent"];

// Authoritative structure, re-derived from the source .docx (offer/privacy) or the
// committed Markdown (consent — section-less, authored from published text) at
// build time.
const PAGES = [
  { loc: "uk", slug: "offer", sections: 10, clauses: 129, clarity: true },
  { loc: "ru", slug: "offer", sections: 10, clauses: 129, clarity: true },
  { loc: "uk", slug: "privacy", sections: 8, clauses: 20, clarity: false },
  { loc: "ru", slug: "privacy", sections: 8, clauses: 20, clarity: false },
  { loc: "uk", slug: "consent", sections: 0, clauses: 0, clarity: false },
  { loc: "ru", slug: "consent", sections: 0, clauses: 0, clarity: false },
  { loc: "en", slug: "offer", sections: 10, clauses: 129, clarity: true },
  { loc: "en", slug: "privacy", sections: 8, clauses: 20, clarity: false },
  { loc: "en", slug: "consent", sections: 0, clauses: 0, clarity: false },
];

const RU_ONLY = /[ёъыэЁЪЫЭ]/; // letters that must NOT appear on a uk page
const UA_ONLY = /[іїєґІЇЄҐ]/; // letters that must NOT appear on a ru page
const CYRILLIC = /[Ѐ-ӿ]/; // any Cyrillic — must NOT appear on an en page

let failures = 0;
const check = (cond, msg) => {
  if (!cond) {
    failures++;
    console.log(`  ✗ ${msg}`);
  }
};

const count = (h, re) => (h.match(re) || []).length;
const mainBody = (h) =>
  (h.match(/<main class="legal">([\s\S]*?)<\/main>/) || ["", ""])[1];

// legal.css must exist and scope its footer rules (no bare body/:root under .legal-footer).
check(existsSync(join(ROOT, "assets/legal.css")), "assets/legal.css exists");

for (const p of PAGES) {
  const rel = `${p.slug}/${p.loc}.html`;
  console.log(`\ndocs/${rel}`);
  const path = join(ROOT, "docs", rel);
  if (!existsSync(path)) {
    check(false, `${rel} exists`);
    continue;
  }
  const h = readFileSync(path, "utf8");
  const body = mainBody(h);
  // Whitespace-normalized copy so attribute-adjacency checks survive a formatter
  // (e.g. Prettier) wrapping a long tag's attributes across multiple lines.
  const hn = h.replace(/\s+/g, " ");

  // Structure / fidelity by count.
  check(
    count(h, /<h2>/g) === p.sections,
    `section <h2> count == ${p.sections} (got ${count(h, /<h2>/g)})`,
  );
  check(
    count(h, /class="clause"/g) === p.clauses,
    `N.M clause count == ${p.clauses} (got ${count(h, /class="clause"/g)})`,
  );
  check(count(h, /<h1>/g) === 1, "exactly one <h1>");

  // Language purity (alphabet scan on the document body). en must be fully
  // translated/transliterated — zero Cyrillic; uk/ru must not leak the other's
  // locale-only letters.
  if (p.loc === "en") {
    check(!CYRILLIC.test(body), "no Cyrillic leaks into en body");
  } else {
    const leakRe = p.loc === "uk" ? RU_ONLY : UA_ONLY;
    check(
      !leakRe.test(body),
      `no ${p.loc === "uk" ? "Russian" : "Ukrainian"}-only letters leak into ${p.loc} body`,
    );
  }

  // Head: canonical + hreflang (uk/ru/x-default, NO en) + legal.css + lang attr.
  check(hn.includes(`<html lang="${p.loc}">`), `<html lang="${p.loc}">`);
  check(
    hn.includes(
      `rel="canonical" href="https://nexttick.it/${p.slug}/${p.loc}.html"`,
    ),
    "self-canonical",
  );
  check(
    hn.includes(`hreflang="uk" href="https://nexttick.it/${p.slug}/uk.html"`),
    "hreflang uk",
  );
  check(
    hn.includes(`hreflang="ru" href="https://nexttick.it/${p.slug}/ru.html"`),
    "hreflang ru",
  );
  check(
    hn.includes(
      `hreflang="x-default" href="https://nexttick.it/${p.slug}/ru.html"`,
    ),
    "hreflang x-default -> ru",
  );
  check(
    hn.includes(`hreflang="en" href="https://nexttick.it/${p.slug}/en.html"`),
    "hreflang en",
  );
  check(
    hn.includes('rel="stylesheet" href="/assets/legal.css"'),
    "links /assets/legal.css",
  );

  // Analytics per policy: GA4 everywhere; Clarity on offer only.
  check(h.includes("G-MXX0XQWV3R"), "GA4 present");
  check(
    h.includes("x5houryvs2") === p.clarity,
    `Clarity ${p.clarity ? "present" : "absent"}`,
  );

  // Requisites block on offer pages.
  if (p.slug === "offer") {
    check(h.includes("UA813220010000026000340134954"), "IBAN present");
    check(h.includes("nexttickit@gmail.com"), "contact email present");
  }

  // Lang switch is UK/RU only; no dead /en/<slug>.html link.
  check(!hn.includes(`href="/en/${p.slug}.html"`), "no /en/ lang-switch link");
  check(
    hn.includes(`href="/${p.slug}/uk.html"`) &&
      hn.includes(`href="/${p.slug}/ru.html"`) &&
      hn.includes(`href="/${p.slug}/en.html"`),
    "UK+RU+EN switch links present",
  );

  // No on-load locale clobber: setItem("lang" appears exactly once (inside click handler).
  check(
    count(h, /setItem\("lang"/g) === 1,
    'localStorage.setItem("lang") occurs once (click-only, no on-load write)',
  );
  check(
    /addEventListener\("click"[\s\S]*setItem\("lang"/.test(h),
    "lang write is inside the click handler",
  );

  // Footer: home link + a cross-link to every sibling legal doc, each resolving
  // to a real file on disk.
  check(
    existsSync(join(ROOT, "docs", `${p.loc}.html`)),
    `footer home /${p.loc}.html exists`,
  );
  for (const s of LEGAL_SLUGS) {
    check(
      hn.includes(`href="/${s}/${p.loc}.html"`),
      `footer links /${s}/${p.loc}.html`,
    );
    check(
      existsSync(join(ROOT, "docs", s, `${p.loc}.html`)),
      `footer target /${s}/${p.loc}.html exists`,
    );
  }
}

console.log("");
if (failures) {
  console.log(`FAIL — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log("PASS — all legal-page integrity checks passed.");
