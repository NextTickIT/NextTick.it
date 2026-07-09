// PRIMARY same-locale acceptance oracle (plan Decision B).
//
// Diffs a generated pages/<page>/<loc>.html against its frozen baseline
// (git show 268cb44:<oldpath>) — both are Prettier-clean under the pinned
// formatter (guaranteed by tools/canary.mjs) — and asserts that the ONLY
// differing lines are the enumerated allowlist deltas (canonical/hreflang/
// ls-opt hrefs, roadmap src, html lang; see tools/lib/allowlist.mjs).
//
// No HTML parse: this is a byte/line diff so <script>/<style> rawtext — where
// 100% of the analytics/attribution bytes live — cannot be normalized away.
// A parser is reserved for CROSS-locale parity (tools/dom-normalize.mjs).
//
// Library API:
//   byteDiff(generatedText, baselineText) -> { ok, differing, unexpected[] }
//   byteDiffFiles(generatedPath, sha, oldpath) -> same, reading from disk + git
//
// CLI:
//   node tools/bytediff.mjs pages/all/en.html en/all.html        (baseline SHA = 268cb44)
//   node tools/bytediff.mjs --selftest                            (unit fixtures)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { canonAllowlist, normalizeForByteDiff } from "./lib/allowlist.mjs";

export const BASELINE_SHA = "268cb44";

// Compare two same-locale HTML strings. Both are first block-normalized
// (multi-line <link>/<meta> collapsed; the modernized lang-switch <script>
// excised — see tools/lib/allowlist.mjs). Then every line where the raw bytes
// still differ must be equal AFTER allowlist canonicalization; anything else is
// "unexpected" and fails the oracle.
export function byteDiff(generatedText, baselineText) {
  const gen = normalizeForByteDiff(generatedText).split("\n");
  const base = normalizeForByteDiff(baselineText).split("\n");
  const unexpected = [];
  let differing = 0;

  const n = Math.max(gen.length, base.length);
  for (let i = 0; i < n; i++) {
    const g = gen[i];
    const b = base[i];
    if (g === b) continue;
    differing++;
    // A missing line on either side (line-count drift) is always unexpected.
    if (g === undefined || b === undefined || canonAllowlist(g) !== canonAllowlist(b)) {
      unexpected.push({
        line: i + 1,
        baseline: b,
        generated: g,
      });
    }
  }

  return { ok: unexpected.length === 0, differing, unexpected };
}

export function gitShow(sha, oldpath) {
  return execFileSync("git", ["show", `${sha}:${oldpath}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function byteDiffFiles(generatedPath, sha, oldpath) {
  const generated = readFileSync(generatedPath, "utf8");
  const baseline = gitShow(sha, oldpath);
  return byteDiff(generated, baseline);
}

// ------------------------------ self-test ---------------------------------
// Confirms the oracle (a) passes when only allowlisted URLs/lang differ and
// (b) fails on a single analytics-byte drift inside a <script> line.
function selftest() {
  const baseline = [
    '<html lang="en">',
    '    <link rel="canonical" href="https://nexttick.it/en/all.html" />',
    '      href="https://nexttick.it/uk/all.html"',
    '          <a class="ls-opt" data-loc="ru" hreflang="ru" href="/ru/all.html"',
    '    <script src="roadmap-data.js"></script>',
    '      })(window, document, "script", "dataLayer", "GTM-M74P6CSD");',
  ].join("\n");

  // Same locale (en), NEW url scheme + roadmap rename == allowlisted only.
  const goodGen = [
    '<html lang="en">',
    '    <link rel="canonical" href="https://nexttick.it/all/en.html" />',
    '      href="https://nexttick.it/all/uk.html"',
    '          <a class="ls-opt" data-loc="ru" hreflang="ru" href="/all/ru.html"',
    '    <script src="roadmap-data.en.js"></script>',
    '      })(window, document, "script", "dataLayer", "GTM-M74P6CSD");',
  ].join("\n");

  // One analytics byte changed inside a <script> line -> MUST be unexpected.
  const badGen = goodGen.replace("GTM-M74P6CSD", "GTM-M74P6CSE");

  const good = byteDiff(goodGen, baseline);
  const bad = byteDiff(badGen, baseline);

  let ok = true;
  // 4 lines differ (canonical, hreflang href, ls-opt href, roadmap src); the
  // html lang line is identical same-locale, so it is NOT a differing line.
  if (!good.ok || good.differing !== 4) {
    ok = false;
    console.error("selftest FAIL [allowlist-only]:", JSON.stringify(good));
  } else {
    console.log(`selftest OK  allowlist-only diff accepted (${good.differing} allowed lines)`);
  }
  if (bad.ok || !bad.unexpected.some((u) => u.line === 6)) {
    ok = false;
    console.error("selftest FAIL [script-drift not caught]:", JSON.stringify(bad));
  } else {
    console.log("selftest OK  single analytics-byte drift caught as unexpected");
  }
  process.exit(ok ? 0 : 1);
}

// --------------------------------- CLI ------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === "--selftest" || args.length === 0) {
    selftest();
  } else {
    const [generatedPath, oldpath, sha = BASELINE_SHA] = args;
    const res = byteDiffFiles(generatedPath, sha, oldpath);
    if (res.ok) {
      console.log(
        `bytediff OK  ${generatedPath} vs ${sha}:${oldpath} — ${res.differing} allowlisted line(s), 0 unexpected`,
      );
      process.exit(0);
    }
    console.error(
      `bytediff FAIL ${generatedPath} vs ${sha}:${oldpath} — ${res.unexpected.length} unexpected line(s):`,
    );
    for (const u of res.unexpected.slice(0, 40)) {
      console.error(`  line ${u.line}:`);
      console.error(`    baseline:  ${JSON.stringify(u.baseline)}`);
      console.error(`    generated: ${JSON.stringify(u.generated)}`);
    }
    process.exit(1);
  }
}
