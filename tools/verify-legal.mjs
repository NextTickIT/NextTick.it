#!/usr/bin/env node
// verify-legal.mjs — integrity gate for the standalone legal pages.
// Run: node tools/verify-legal.mjs   (exits non-zero on any failure)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every legal page cross-links all sibling docs in its footer.
const LEGAL_SLUGS = ["offer", "privacy", "consent"];
const LOCS = ["uk", "ru", "en"];

// Authoritative structure of the LIVE revision (Ред. №2, ТОВ «МЕТАТЕСН»),
// re-derived from the committed Markdown at build time. `appendix` counts the
// in-body <h2 class="appendix-title"> emitted for a second "# " heading.
const LIVE_SHAPE = {
  offer: { sections: 30, appendix: 1, clauses: 290, clarity: true },
  privacy: { sections: 13, appendix: 0, clauses: 53, clarity: false },
  consent: { sections: 6, appendix: 0, clauses: 19, clarity: false },
};

// Superseded revisions published at docs/<slug>/<loc>-<date>.html. Their shape is
// the shape of the revision they froze — it must never drift.
const ARCHIVES = [
  {
    date: "2026-10-06",
    shape: {
      offer: { sections: 10, appendix: 0, clauses: 129, clarity: true },
      privacy: { sections: 8, appendix: 0, clauses: 20, clarity: false },
      consent: { sections: 0, appendix: 0, clauses: 0, clarity: false },
    },
  },
];

// The live revision is issued by ТОВ «МЕТАТЕСН»; the previous one by ФОП Карпов.
// Both directions are asserted: a stale page that still names the old entity is a
// legal defect, not a cosmetic one.
const NEW_ENTITY = ["44819869", "info@nexttick.it"];
const OLD_ENTITY = [
  "Карпов",
  "Karpov",
  "3075926357",
  "nexttickit@gmail.com",
  "UA813220010000026000340134954",
];

const RU_ONLY = /[ёъыэЁЪЫЭ]/; // letters that must NOT appear on a uk page
const UA_ONLY = /[іїєґІЇЄҐ]/; // letters that must NOT appear on a ru page
const CYRILLIC = /[Ѐ-ӿ]/; // any Cyrillic — must NOT appear on an en page
const APPENDIX_TITLE = /ДОДАТОК|ПРИЛОЖЕНИЕ|ANNEX/i;

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
const h1Text = (h) => (h.match(/<h1>([\s\S]*?)<\/h1>/) || ["", ""])[1];

// legal.css must exist and scope its footer rules (no bare body/:root under .legal-footer).
check(existsSync(join(ROOT, "assets/legal.css")), "assets/legal.css exists");

// The newest archived revision each live page must link back to: the offer keeps a
// User on the revision in force when they paid (cl. 7.2), so it has to stay reachable.
const newestArchive = ARCHIVES.map((a) => a.date).sort().at(-1);

/** Checks shared by live and archived pages. */
function checkCommon(h, { slug, loc, shape }) {
  const body = mainBody(h);
  const hn = h.replace(/\s+/g, " ");

  check(
    count(h, /<h2>/g) === shape.sections,
    `section <h2> count == ${shape.sections} (got ${count(h, /<h2>/g)})`,
  );
  check(
    count(h, /<h2 class="appendix-title">/g) === shape.appendix,
    `appendix <h2> count == ${shape.appendix} (got ${count(h, /<h2 class="appendix-title">/g)})`,
  );
  check(
    count(h, /class="clause"/g) === shape.clauses,
    `N.M clause count == ${shape.clauses} (got ${count(h, /class="clause"/g)})`,
  );
  check(count(h, /<h1>/g) === 1, "exactly one <h1>");
  // Regression guard: every "# " line used to overwrite h1, so a document with an
  // appendix silently published the appendix title as the page title while still
  // passing the "exactly one <h1>" check above.
  check(
    !APPENDIX_TITLE.test(h1Text(h)),
    `<h1> is the document title, not the appendix ("${h1Text(h).slice(0, 48)}")`,
  );
  // No unrendered Markdown may reach the page.
  check(!/\*\*/.test(body), "no literal ** bold markers in body");
  check(
    !/>\s*[_*](?:ЗАТВЕРДЖЕНО|УТВЕРЖДЕНО|APPROVED)/.test(body),
    "approval block is rendered, not literal italic markup",
  );
  check(
    count(h, /class="legal-meta"/g) >= 1,
    "approval/meta block present (.legal-meta)",
  );

  // Language purity (alphabet scan on the document body).
  if (loc === "en") {
    check(!CYRILLIC.test(body), "no Cyrillic leaks into en body");
  } else {
    const leakRe = loc === "uk" ? RU_ONLY : UA_ONLY;
    check(
      !leakRe.test(body),
      `no ${loc === "uk" ? "Russian" : "Ukrainian"}-only letters leak into ${loc} body`,
    );
  }

  // Head: canonical always points at the LIVE page + hreflang + legal.css + lang attr.
  check(hn.includes(`<html lang="${loc}">`), `<html lang="${loc}">`);
  check(
    hn.includes(`rel="canonical" href="https://nexttick.it/${slug}/${loc}.html"`),
    "canonical -> live page",
  );
  for (const l of LOCS) {
    check(
      hn.includes(`hreflang="${l}" href="https://nexttick.it/${slug}/${l}.html"`),
      `hreflang ${l}`,
    );
  }
  check(
    hn.includes(`hreflang="x-default" href="https://nexttick.it/${slug}/ru.html"`),
    "hreflang x-default -> ru",
  );
  check(
    hn.includes('rel="stylesheet" href="/assets/legal.css"'),
    "links /assets/legal.css",
  );

  // Analytics per policy: GA4 everywhere; Clarity on offer only.
  check(h.includes("G-MXX0XQWV3R"), "GA4 present");
  check(
    h.includes("x5houryvs2") === shape.clarity,
    `Clarity ${shape.clarity ? "present" : "absent"}`,
  );

  // Lang switch is uk/ru/en; no dead /en/<slug>.html link.
  check(!hn.includes(`href="/en/${slug}.html"`), "no /en/ lang-switch link");
  for (const l of LOCS) {
    check(hn.includes(`href="/${slug}/${l}.html"`), `switch link /${slug}/${l}.html`);
  }

  // No on-load locale clobber: setItem("lang" appears exactly once (click handler).
  check(
    count(h, /setItem\("lang"/g) === 1,
    'localStorage.setItem("lang") occurs once (click-only, no on-load write)',
  );
  check(
    /addEventListener\("click"[\s\S]*setItem\("lang"/.test(h),
    "lang write is inside the click handler",
  );

  // Footer: home link + a cross-link to every sibling legal doc, each a real file.
  check(
    existsSync(join(ROOT, "docs", `${loc}.html`)),
    `footer home /${loc}.html exists`,
  );
  for (const s of LEGAL_SLUGS) {
    check(hn.includes(`href="/${s}/${loc}.html"`), `footer links /${s}/${loc}.html`);
    check(
      existsSync(join(ROOT, "docs", s, `${loc}.html`)),
      `footer target /${s}/${loc}.html exists`,
    );
  }
}

// ---------------------------------------------------------------- live revision
for (const slug of LEGAL_SLUGS) {
  for (const loc of LOCS) {
    const rel = `${slug}/${loc}.html`;
    console.log(`\ndocs/${rel}`);
    const path = join(ROOT, "docs", rel);
    if (!existsSync(path)) {
      check(false, `${rel} exists`);
      continue;
    }
    const h = readFileSync(path, "utf8");
    const hn = h.replace(/\s+/g, " ");
    checkCommon(h, { slug, loc, shape: LIVE_SHAPE[slug] });

    check(!hn.includes('name="robots"'), "live page is indexable (no robots meta)");
    for (const m of NEW_ENTITY) {
      check(h.includes(m), `issuing entity marker present: ${m}`);
    }
    for (const m of OLD_ENTITY) {
      check(!h.includes(m), `superseded entity absent from live page: ${m}`);
    }
    // The superseded revision must be reachable FROM the current one.
    check(
      hn.includes(`href="/${slug}/${loc}-${newestArchive}.html"`),
      `links previous revision /${slug}/${loc}-${newestArchive}.html`,
    );
    check(
      existsSync(join(ROOT, "docs", slug, `${loc}-${newestArchive}.html`)),
      `previous-revision target exists`,
    );
  }
}

// ------------------------------------------------------------ archived revisions
for (const { date, shape } of ARCHIVES) {
  for (const slug of LEGAL_SLUGS) {
    for (const loc of LOCS) {
      const rel = `${slug}/${loc}-${date}.html`;
      console.log(`\ndocs/${rel}  (archived)`);
      const path = join(ROOT, "docs", rel);
      if (!existsSync(path)) {
        check(false, `${rel} exists`);
        continue;
      }
      const h = readFileSync(path, "utf8");
      const hn = h.replace(/\s+/g, " ");
      checkCommon(h, { slug, loc, shape: shape[slug] });

      // An archive must not compete with the live page in search, and must say so.
      check(
        hn.includes('<meta name="robots" content="noindex,follow" />'),
        "noindex,follow",
      );
      check(
        count(h, /class="legal-meta legal-archived"/g) === 1,
        "superseded banner present",
      );
      check(
        hn.includes(`href="/${slug}/${loc}.html"`),
        "banner/footer points at the live revision",
      );
      check(
        !hn.includes(`href="/${slug}/${loc}-${date}.html"`),
        "archive does not link itself as a previous revision",
      );
      // The 2026-10-06 archive froze the ФОП Карпов revision; it must still say so.
      check(
        h.includes("Карпов") || h.includes("Karpov"),
        "archived revision still names its issuing entity",
      );
    }
  }
}

console.log("");
if (failures) {
  console.log(`FAIL — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log("PASS — all legal-page integrity checks passed.");
