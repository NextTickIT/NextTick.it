// Downloads the self-hosted webfonts in assets/fonts/ from Google Fonts.
//
// Why self-host: the pages used to load these through a <link> to
// fonts.googleapis.com, which put two extra third-party connections on the
// critical path and hid the woff2 URLs behind a stylesheet round-trip. Serving
// Google's own files from our origin removes both.
//
// Why VARIABLE: Google's css2 endpoint serves one variable woff2 per subset
// that covers the whole weight axis. A per-weight static set of the same
// coverage is ~340 KB against ~105 KB for the four variable files, and every
// declared weight is a separate request. Keep these variable.
//
// Only `latin` and `cyrillic` are taken — the site is en/uk/ru, and the other
// subsets Google emits (greek, vietnamese, *-ext) have no glyphs we render.
//
// Re-run to refresh or to widen a weight range (the range must stay a superset
// of every font-weight the templates use):
//   node tools/fetch-fonts.mjs
//
// templates/_partials/fonts.html declares the @font-face rules that point here
// and must list the same weight ranges.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./lib/format.mjs";

// A modern UA is required, else the endpoint serves legacy ttf instead of woff2.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

// stem -> the css2 `family=` spec. Ranges are the union of the weights used by
// any template (see templates/_partials/fonts.html).
const FAMILIES = {
  "inter": "Inter:wght@400..800",
  "jbmono": "JetBrains+Mono:wght@400..700",
};
const SUBSETS = ["latin", "cyrillic"];
const OUT_DIRS = [
  path.join(ROOT, "assets", "fonts"),
  path.join(ROOT, "docs", "assets", "fonts"),
];

for (const [stem, family] of Object.entries(FAMILIES)) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
      headers: { "User-Agent": UA },
    })
  ).text();

  // Google precedes every @font-face with a /* <subset> */ comment.
  for (const [, subset, body] of css.matchAll(/\/\*\s*(\S+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)) {
    if (!SUBSETS.includes(subset)) continue;
    const url = body.match(/url\((https:\/\/\S+?)\)/)[1];
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    const name = `${stem}-var-${subset}.woff2`;
    await Promise.all(OUT_DIRS.map((d) => writeFile(path.join(d, name), bytes)));
    console.log(`${name.padEnd(24)} ${(bytes.length / 1024).toFixed(1).padStart(6)} KB`);
  }
}
