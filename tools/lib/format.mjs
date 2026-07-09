// Shared Prettier formatter — the SINGLE source of formatting truth for the
// whole build. tools/build.mjs and tools/canary.mjs both import `formatHtml`
// so generated output can never diverge from what the canary validates.
// build-legal.py (Phase 6) formats through the same pinned prettier + the same
// .prettierrc so embedded JS/CSS can't reflow differently between build scripts.
//
// Prettier is PINNED EXACT (see package.json `prettier`). The pinned version was
// chosen by tools/canary.mjs: it must byte-reproduce the committed 268cb44 pages.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

// Repo root = two levels up from tools/lib/.
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

let cachedOptions = null;

// Load the committed .prettierrc once. This is the exact same config the canary
// validates against, so formatHtml() output is guaranteed reproducible.
export async function prettierOptions() {
  if (!cachedOptions) {
    const raw = await readFile(path.join(ROOT, ".prettierrc"), "utf8");
    cachedOptions = JSON.parse(raw);
  }
  return cachedOptions;
}

// Format an HTML source string. Returns the formatted string (prettier 3.x is
// async). Parser forced to "html" so this works on in-memory strings that have
// no filename.
export async function formatHtml(source) {
  const options = await prettierOptions();
  return prettier.format(source, { ...options, parser: "html" });
}
