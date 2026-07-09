// verify-translated.mjs — confirms every TRANSLATABLE roadmap-data field in
// uk/ and en/ is non-empty and DIFFERS from the ru source (catches fields an
// agent forgot to translate). Dev tool only. Usage: node tools/verify-translated.mjs
import fs from "node:fs";

function load(loc) {
  const win = {};
  new Function("window", fs.readFileSync(`docs/roadmap-data.${loc}.js`, "utf8"))(
    win,
  );
  return win.ROADMAP;
}

// Collect translatable strings in a STABLE order (same structure across locales).
function texts(R) {
  const out = [];
  const push = (k, v) => out.push([k, v]);
  push("concept.title", R.concept.title);
  push("concept.kicker", R.concept.kicker);
  push("concept.tagline", R.concept.tagline);
  R.concept.pitch.forEach((p, i) => push(`concept.pitch[${i}]`, p));
  R.horizons.forEach((h) => {
    push(`hz.${h.id}.label`, h.label);
    push(`hz.${h.id}.range`, h.range);
    push(`hz.${h.id}.hint`, h.hint);
  });
  R.tracks.forEach((t) => {
    push(`tr.${t.id}.name`, t.name);
    push(`tr.${t.id}.shortName`, t.shortName);
    push(`tr.${t.id}.kicker`, t.kicker);
    push(`tr.${t.id}.summary`, t.summary);
    ["h1", "h2", "h3"].forEach((h) =>
      push(`tr.${t.id}.ben.${h}`, t.benefits[h]),
    );
  });
  R.series.forEach((s, i) => {
    push(`ser[${i}].name`, s.name);
    push(`ser[${i}].summary`, s.summary);
  });
  R.episodes.forEach((e) => {
    push(`ep.${e.id}.series`, e.series);
    push(`ep.${e.id}.title`, e.title);
    push(`ep.${e.id}.blurb`, e.blurb);
    e.points.forEach((p, i) => push(`ep.${e.id}.pt[${i}]`, p));
  });
  R.months.forEach((m) => {
    push(`mo.${m.num}.label`, m.label);
    push(`mo.${m.num}.theme`, m.theme);
  });
  return out;
}

// uk fields where the correct Ukrainian is identical to Russian (shared cognates /
// embedded English terms). Manually reviewed — these are correct as-is, not lazy copies.
const UK_COGNATES = new Set([
  "ep.a10.pt[0]", // "Структура context-library" — Структура is identical in uk
  "ep.a14.pt[0]", // "Шаблон reflection-промпта" — Шаблон is identical in uk
  "ep.c16.pt[0]", // "Шаблон follow-up"
  "ep.r8.pt[0]", // "Чек-лист «готово для агента»"
  "ep.r20.pt[1]", // "Агент-наставник на onboarding" — наставник identical in uk
]);

const ru = texts(load("ru"));
let ok = true;
for (const loc of ["uk", "en"]) {
  const t = texts(load(loc));
  if (t.length !== ru.length) {
    ok = false;
    console.log(`  FAIL ${loc}: field count ${t.length} != ru ${ru.length}`);
    continue;
  }
  let untranslated = 0,
    empty = 0;
  for (let i = 0; i < ru.length; i++) {
    const [k, v] = t[i];
    const ruVal = String(ru[i][1]);
    const ruHasCyr = /[Ѐ-ӿ]/.test(ruVal); // only fields with Cyrillic in the RU source need translating
    if (!v || !String(v).trim()) {
      empty++;
      if (empty <= 5) console.log(`    ${loc} EMPTY: ${k}`);
    } else if (
      ruHasCyr &&
      String(v) === ruVal &&
      !(loc === "uk" && UK_COGNATES.has(k))
    ) {
      untranslated++;
      if (untranslated <= 20)
        console.log(
          `    ${loc} UNTRANSLATED (==ru): ${k} :: ${ruVal.slice(0, 50)}`,
        );
    }
  }
  if (untranslated || empty) {
    ok = false;
    console.log(
      `  FAIL ${loc}: ${untranslated} untranslated, ${empty} empty (of ${ru.length})`,
    );
  } else
    console.log(
      `  PASS ${loc}: all ${ru.length} translatable fields non-empty and differ from ru`,
    );
}
console.log(ok ? "TRANSLATED OK" : "TRANSLATED FAILED");
process.exit(ok ? 0 : 1);
