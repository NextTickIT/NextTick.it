// Prettier reproducibility STOP-GATE (Phase 0).
//
// Reads representative committed pages at the frozen baseline SHA (268cb44),
// re-formats them with the LOCAL pinned Prettier + committed .prettierrc, and
// asserts the result is BYTE-IDENTICAL to the committed bytes.
//
// Why this exists: the entire same-locale acceptance oracle (tools/bytediff.mjs)
// assumes the committed pages are already Prettier-clean under our pinned
// formatter. If a different Prettier version reflows the output, every page diff
// goes red. This gate proves the pin is correct BEFORE any page migration.
//
// If this FAILS: do NOT proceed. Re-pin `prettier` in package.json to the exact
// version that byte-reproduces the committed pages, then re-run `npm run canary`.
//
// Usage: node tools/canary.mjs   (exit 0 = pass, exit 1 = mismatch/STOP)

import { execFileSync } from "node:child_process";
import { formatHtml } from "./lib/format.mjs";

const SHA = "268cb44";

// Representative set: the plain chrome page (en/all.html — the required canary
// target) plus the two most format-sensitive surfaces (index carries the large
// inline render <script>; a uk page exercises non-ASCII text). All must
// byte-reproduce.
const TARGETS = ["en/all.html", "en/index.html", "uk/all.html"];

function gitShowBytes(oldpath) {
  // Buffer (no encoding) so the compare is truly byte-exact.
  return execFileSync("git", ["show", `${SHA}:${oldpath}`], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function firstDiff(a, b) {
  const al = a.split("\n");
  const bl = b.split("\n");
  const n = Math.max(al.length, bl.length);
  for (let i = 0; i < n; i++) {
    if (al[i] !== bl[i]) {
      return `line ${i + 1}:\n  committed: ${JSON.stringify(al[i])}\n  formatted: ${JSON.stringify(bl[i])}`;
    }
  }
  return `line counts differ: committed=${al.length} formatted=${bl.length}`;
}

let failed = false;
for (const oldpath of TARGETS) {
  const committed = gitShowBytes(oldpath);
  const formatted = Buffer.from(await formatHtml(committed.toString("utf8")), "utf8");
  if (Buffer.compare(committed, formatted) === 0) {
    console.log(`canary OK  byte-identical: ${SHA}:${oldpath}`);
  } else {
    failed = true;
    console.error(`canary FAIL not byte-identical: ${SHA}:${oldpath}`);
    console.error(firstDiff(committed.toString("utf8"), formatted.toString("utf8")));
  }
}

if (failed) {
  console.error(
    "\nSTOP: pinned Prettier does not reproduce committed bytes. " +
      "Re-pin `prettier` in package.json and re-run `npm run canary`.",
  );
  process.exit(1);
}
console.log(`\ncanary PASS — pinned Prettier reproduces ${SHA} byte-for-byte.`);
