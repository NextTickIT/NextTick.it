// verify-parity.mjs — confirms the NON-TEXT fields of roadmap-data.js are
// byte-identical across locales (ru/uk/en). Dev tool only; NOT a build step.
// Usage: node tools/verify-parity.mjs
import fs from "node:fs";

const LOCALES = ["ru", "uk", "en"];

function loadRoadmap(loc) {
  const code = fs.readFileSync(`docs/roadmap-data.${loc}.js`, "utf8");
  const win = {};
  // The file is an IIFE that assigns window.ROADMAP. Provide a fake window.
  new Function("window", code)(win);
  return win.ROADMAP;
}

// Project ONLY the non-text fields that must match across locales.
function projection(R) {
  return {
    horizons: R.horizons.map((h) => ({ id: h.id, code: h.code })),
    tracks: R.tracks.map((t) => ({ id: t.id, code: t.code })),
    series: R.series.map((s) => ({ track: s.track, month: s.month })),
    episodes: R.episodes.map((e) => ({
      id: e.id,
      track: e.track,
      month: e.month,
      monthNum: e.monthNum,
      num: e.num,
    })),
    months: R.months.map((m) => ({ num: m.num })),
    seasonStart: R.seasonStart,
    nowMonth: R.nowMonth,
    trackStartWeek: R.trackStartWeek,
  };
}

const base = JSON.stringify(projection(loadRoadmap("ru")));
let ok = true;
for (const loc of LOCALES.filter((l) => l !== "ru")) {
  const proj = JSON.stringify(projection(loadRoadmap(loc)));
  if (proj === base) {
    console.log(`  PASS ${loc}: non-text roadmap fields identical to ru`);
  } else {
    ok = false;
    console.log(`  FAIL ${loc}: non-text roadmap fields DIFFER from ru`);
    // show first divergence for debugging
    const a = JSON.parse(base),
      b = JSON.parse(proj);
    for (const k of Object.keys(a)) {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
        console.log(`    -> section "${k}" differs`);
      }
    }
  }
}
console.log(ok ? "PARITY OK" : "PARITY FAILED");
process.exit(ok ? 0 : 1);
