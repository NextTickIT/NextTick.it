const API = window.GuildAPI;
const R = window.ROADMAP;
const $ = (s) => document.querySelector(s);
/* ── i18n: Russian source text is the key; a missing key falls back to Russian and is listed in I18N_MISSING ── */
const LANG = window.LANG, I18N = window.I18N || {};
window.I18N_MISSING = new Set();
const t = (s, vars) => {
  let out = LANG === "ru" ? s : I18N[s] ?? (I18N_MISSING.add(s), s);
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => vars[k]) : out;
};
// forms are "one|few|many" in Russian/Ukrainian and "one|other" in English
const plural = (n, forms) => {
  const f = t(forms).split("|");
  if (LANG === "en") return n === 1 ? f[0] : f[1];
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? f[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? f[1] : f[2];
};
const fmt = (n) => n.toLocaleString({ ru: "ru-RU", uk: "uk-UA", en: "en-US" }[LANG]);
// static markup: an element with its own Russian text is one unit, keyed by its normalised innerHTML
const CYR = /[А-Яа-яЁё]/, norm = (s) => s.replace(/\s+/g, " ").trim();
function translateStatic(el) {
  if (el.hasAttribute?.("data-i18n-skip")) return;
  for (const a of ["placeholder", "aria-label", "title", "alt", "content"]) { const v = el.getAttribute?.(a); if (v && CYR.test(v)) el.setAttribute(a, t(norm(v))); }
  if ([...el.childNodes].some((n) => n.nodeType === 3 && CYR.test(n.textContent))) { el.innerHTML = t(norm(el.innerHTML)); return; }
  for (const c of el.children) if (!["SCRIPT", "STYLE", "svg"].includes(c.tagName)) translateStatic(c);
}
// pages pre-translated at build time carry data-lang; the ?lang= preview translates here
if (LANG !== "ru" && !document.documentElement.dataset.lang) { translateStatic(document.head); translateStatic(document.body); }
document.querySelector(`.lang-switch [data-loc="${LANG}"]`).setAttribute("aria-current", "true");
document.querySelectorAll("[data-stat]").forEach((el) => (el.textContent = fmt(API.stats[el.dataset.stat])));
const mobile = matchMedia("(max-width: 720px)");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICON = {
  video: '<svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor"><path d="M5 3.5v11l9-5.5z"/></svg>',
  thread: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h12v8H8l-3.5 3v-3H3z" stroke-linejoin="round"/></svg>',
  case: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="4.5"/><path d="m11.5 11.5 3.5 3.5" stroke-linecap="round"/></svg>',
  post: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 3.5h10v11H4zM7 7h4M7 10h4"/></svg>',
  call: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 5h9v8h-9zM11.5 8l4-2.5v7l-4-2.5"/></svg>',
  digest: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h12v8H8l-3.5 3v-3H3z" stroke-linejoin="round"/></svg>',
  audio: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7v4M6 4.5v9M9 2.5v13M12 5v8M15 7.5v3"/></svg>',
};

/* ── hint / limit ── */
function renderHint() {
  const n = API.remaining();
  $("#limit").innerHTML = "";
  $("#q").disabled = $("#send").disabled = n === 0;
  // until /session answers the counter stays hidden; the server enforces the limit anyway
  if (n == null) $("#hint").textContent = "";
  else if (n > 0) {
    const count = `<b>${n} ${plural(n, "вопрос|вопроса|вопросов")}</b>`;
    $("#hint").innerHTML = featured.length ? t("{count} на сегодня · {where} — без лимита", { count, where: mobile.matches ? t("готовые вопросы ниже") : t("вопросы вокруг") }) : t("{count} на сегодня", { count });
  } else {
    $("#hint").textContent = "";
    $("#limit").innerHTML = `<div class="limit"><p>${t("<strong>Свои вопросы на сегодня закончились.</strong><br>Готовые вопросы по-прежнему открываются. Участники гильдии спрашивают без ограничений.")}</p><a class="join" href="#join">${t("Вступить в гильдию")}</a></div>`;
  }
}

/* ── answer ── */
// a newer question replaces the one still streaming
let gen = 0;
const ERRORS = {
  busy: "Бот сейчас отвечает другим, попробуйте через минуту",
  budget_exhausted: "Сегодня бот больше не принимает новые вопросы",
  upstream_error: "Не получилось ответить, попробуйте ещё раз",
};
// cached: the ready-made question's id, or false for a free question
async function answer(q, iter, cached) {
  const my = ++gen;
  const el = $("#answer");
  el.hidden = false;
  el.style.animation = "none"; el.offsetHeight; el.style.animation = "";
  el.innerHTML = `<div class="a-head"><span class="q"></span><span>${t("по материалам гильдии")}</span></div><div class="a-body typing"><span class="wait">${t("ищу по видео, кейсам и чату…")}</span></div>`;
  el.querySelector(".q").textContent = q;
  const body = el.querySelector(".a-body");
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  let started = false;
  await API.run(iter, {
    stale: () => my !== gen,
    text: (c) => { if (!started) { body.textContent = ""; started = true; } body.append(c); },
    sources: (items) => {
      body.classList.remove("typing");
      if (!items.length) return;
      el.insertAdjacentHTML("beforeend", `<div class="src-h">${t("Где об этом в гильдии")} · ${items.length}</div>${LANG === "ru" ? "" : `<p class="src-lang">${t("Материалы гильдии доступны на русском языке")}</p>`}<ul class="srcs"></ul>`);
      const ul = el.querySelector(".srcs");
      items.forEach((s, i) => {
        const li = document.createElement("li"); li.className = "src"; li.dataset.track = s.track;
        li.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener" style="animation-delay:${i * 70}ms"><span class="ic">${ICON[s.kind]}</span><span><div class="t"></div><div class="m"></div></span><span class="go" aria-hidden="true">↗</span></a>`;
        li.querySelector(".t").textContent = s.title; li.querySelector(".m").textContent = s.meta;
        ul.append(li);
      });
    },
    done: (left) => {
      el.insertAdjacentHTML("beforeend", `<div class="a-foot"><span>${cached ? t("готовый ответ · лимит не тратится") : left != null && API.LIMIT != null ? t("осталось {left} из {limit} на сегодня", { left, limit: API.LIMIT }) : ""}</span><a class="join" href="#join">${t("Открыть всё в гильдии")}</a></div>`);
      renderHint();
    },
    limit: () => { el.hidden = true; renderHint(); },
    error: (code) => {
      body.classList.remove("typing");
      if (code === "invalid_request") { el.hidden = true; renderHint(); $("#hint").textContent = t("Вопрос — не длиннее 500 символов"); $("#q").focus(); return; }
      // a ready-made question taken off the list: its chip goes away
      if (code === "not_found") { el.hidden = true; featured = featured.filter((f) => f.id !== cached); document.querySelectorAll(`.chip[data-id="${CSS.escape(cached)}"]`).forEach((c) => c.remove()); renderHint(); return; }
      const msg = t(ERRORS[code] || ERRORS.upstream_error);
      if (started) body.append(document.createElement("br"), document.createElement("br"), msg); else body.textContent = msg;
      renderHint();
    },
  });
}

$("#ask").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (!q) return;
  answer(q, API.ask(q), false);
});

/* ── a ready-made question: typed into the prompt, then the cached answer ── */
async function fire(f) {
  const my = ++gen;
  document.querySelectorAll(".chip.fired").forEach((c) => c.classList.remove("fired"));
  document.querySelectorAll(`.picks .chip[data-id="${f.id}"]`).forEach((c) => c.classList.add("fired"));
  const input = $("#q");
  input.value = "";
  if (reduce) input.value = f.q;
  else for (const ch of f.q) { if (my !== gen) return; input.value += ch; await new Promise((r) => setTimeout(r, 14)); }
  if (my !== gen) return;
  answer(f.q, API.featuredAnswer(f.id), f.id);
}

let featured = [];
function makeChip(f, depth) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.dataset.track = f.track; b.dataset.id = f.id;
  if (depth != null) b.dataset.depth = depth;
  // far, faded sky chips are scenery (the sky is aria-hidden and unfocusable): their text is drawn by CSS
  // so it isn't measured as body text; near chips and the mobile rails keep real text
  if (depth != null && depth < 2) b.dataset.q = f.q; else b.textContent = f.q;
  b.addEventListener("click", () => {
    // from the hero, first bring the visitor to the prompt
    const r = $("#ask").getBoundingClientRect();
    if (b.closest(".sky") && (r.top > innerHeight || r.bottom < 0)) { $("#ask-sec").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); setTimeout(() => fire(f), reduce ? 0 : 500); }
    else fire(f);
  });
  return b;
}

/* ── ready-made questions under the prompt ── */
function buildPicks() {
  const picks = $("#picks");
  picks.innerHTML = "";
  if (!mobile.matches) return; // desktop: the questions live in the sky
  const half = Math.ceil(featured.length / 2);
  [featured.slice(0, half), featured.slice(half)].forEach((set, i) => {
    const rail = document.createElement("div"); rail.className = "rail";
    const row = document.createElement("div"); row.className = "row"; row.style.setProperty("--dur", 70 + i * 16 + "s");
    [...set, ...set].forEach((f, j) => { const c = makeChip(f); if (j >= set.length) { c.tabIndex = -1; c.setAttribute("aria-hidden", "true"); } row.append(c); });
    rail.append(row); picks.append(rail);
  });
}

/* ── sky: lanes across the whole viewport; chips under content dissolve ── */
const sky = $("#sky");
// what a question must never cover; checked every frame in viewport coordinates
const SHIELD = [".pains .kicker", ".pains h2", ".pains .sec-lede", ".pain", ".hero .eyebrow", ".hero h1", ".hero .lede", ".hero .actions", "#lang-note", "#video", ".ask-sec .kicker", ".ask-sec h2", ".ask-sec .sec-lede", ".ask-box", "#answer", ".top"];
let raf;
function buildSky() {
  cancelAnimationFrame(raf);
  sky.innerHTML = "";
  if (mobile.matches) return;
  const W = innerWidth, H = innerHeight;
  const LANE_H = 52, ys = [];
  for (let y = 78; y + 40 < H; y += LANE_H) ys.push(y);
  const lanes = ys.map((y, i) => ({ y, depth: [2, 0, 1, 1, 2, 0][i % 6], dir: i % 2 ? 1 : -1, items: [] }));
  // every question once: with ~30 of them the lanes stay full and nothing repeats on screen
  [...featured].sort(() => Math.random() - 0.5).forEach((f, i) => lanes[i % lanes.length].items.push(f));
  const bodies = [];
  const perLane = lanes.map((lane) => {
    const v = (0.12 + lane.depth * 0.1) * lane.dir;
    return lane.items.map((f) => {
      const c = makeChip(f, lane.depth);
      c.tabIndex = -1; // decorative; keyboard users type into the prompt
      sky.append(c);
      return { c, lane, v, hid: false };
    });
  });
  // measured once every chip is in the DOM: a single layout instead of one per chip
  for (const chips of perLane) {
    for (const b of chips) { b.w = b.c.offsetWidth; b.h = b.c.offsetHeight; }
    // spread the lane's chips evenly over its loop so a lane is never empty on screen
    const widths = chips.reduce((n, b) => n + b.w, 0);
    const loop = Math.max(W + 400, widths + chips.length * 160);
    const gap = (loop - widths) / chips.length;
    let x = Math.random() * loop;
    chips.forEach((b) => { b.x = x % loop; b.loop = loop; x += b.w + gap * (0.8 + Math.random() * 0.4); });
    bodies.push(...chips);
  }
  bodies.forEach((b) => {
    b.c.addEventListener("pointerenter", () => (b.lane.held = true));
    b.c.addEventListener("pointerleave", () => (b.lane.held = false));
  });
  let mx = 0, my = 0, lastY = scrollY, push = 0;
  window.onmousemove = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  const PAD = 14;
  const tick = () => {
    // scrolling pushes the lanes sideways, then the push decays
    push = push * 0.9 + (scrollY - lastY) * 0.35; lastY = scrollY;
    // the sticky layer can hang past the stage's end; nothing may show below it
    const stageBottom = $("#stage").getBoundingClientRect().bottom;
    const shields = SHIELD.flatMap((sel) => [...document.querySelectorAll(sel)]).filter((el) => el.offsetParent).map((el) => el.getBoundingClientRect());
    for (const b of bodies) {
      if (!reduce && !b.lane.held) b.x = (((b.x + b.v + push * b.lane.dir * (b.lane.depth + 1) / 3) % b.loop) + b.loop) % b.loop;
      const par = (b.lane.depth + 1) * 6;
      const x = b.x - 200 - mx * par, y = b.lane.y - my * par * 0.4;
      b.c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const hit = y + b.h > stageBottom - PAD || shields.some((r) => x < r.right + PAD && x + b.w > r.left - PAD && y < r.bottom + PAD && y + b.h > r.top - PAD);
      if (hit !== b.hid) { b.hid = hit; b.c.classList.toggle("hid", hit); }
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}
function build() { buildPicks(); buildSky(); renderHint(); }
// ready-made questions and the day's limit come from the guild API
API.ready.then(() => { featured = API.featured(); build(); mobile.addEventListener("change", build); });
let lastW = innerWidth;
addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(window._rs); window._rs = setTimeout(buildSky, 200); });

/* ── intro video: poster → youtube-nocookie on click (same embed as the live site) ── */
function playVideo() {
  const v = $("#video");
  if (v.querySelector("iframe")) return;
  v.innerHTML = `<iframe src="${v.dataset.embed}" title="${t("Обзор гильдии инженеров NextTick")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
}
$("#video").addEventListener("click", playVideo);
$("#video").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playVideo(); } });
$("#watch").addEventListener("click", () => { if (mobile.matches) $("#video").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); playVideo(); });

/* ── one month: the latest series per track, all its episodes ── */
$("#tracks").innerHTML = R.tracks.map((tr) => {
  const all = API.episodes.filter((e) => e.track === tr.id);
  const ser = R.series.filter((x) => x.track === tr.id).at(-1);
  return `<div class="track" data-track="${tr.id}"><h3>${tr.name}</h3><div class="k">${tr.kicker}</div><div class="series">${t("серия «{name}»", { name: ser.name })}</div><ol>${ser.episodes.map((e, i, arr) => `<li class="ep${i === arr.length - 1 ? " new" : ""}"><span class="ic">${ICON.video}</span><span class="t">${e.title}${i === arr.length - 1 ? `<span class="m">${t("новое")}</span>` : ""}</span></li>`).join("")}</ol><div class="more">${t("{n} видео в треке →", { n: all.length })}</div></div>`;
}).join("");

/* ── experts: video counts come from the tracks they lead (PLACEHOLDER mapping) ── */
const EXPERTS = [
  { name: "Илья Климов", photo: "/assets/author-ilya.webp", role: "Staff Frontend Engineer в GitLab", bio: "Google Developer Expert по веб-технологиям. Основатель JavaScript.ninja, спикер HolyJS, 15+ лет в индустрии.", tracks: ["agents", "comms"] },
  { name: "Тимур Шемсединов", photo: "/assets/author-timur.webp", role: "CTO в Metatech", bio: "30+ лет опыта. Главный архитектор Metarhia, преподаватель КПИ, автор 350+ открытых лекций по Node.js и программной инженерии.", tracks: ["arch"] },
];
const tname = Object.fromEntries(R.tracks.map((t) => [t.id, t.shortName]));
$("#experts-grid").innerHTML = EXPERTS.map((x) => {
  const n = API.episodes.filter((e) => x.tracks.includes(e.track)).length;
  return `<article class="ex"><div class="ex-top"><img src="${x.photo}" alt="${t(x.name)}" width="72" height="72" decoding="async"><div><div class="nm">${t(x.name)}</div><div class="role">${t(x.role)}</div></div></div><p>${t(x.bio)}</p><div class="tr">${x.tracks.map((id) => `<span data-track="${id}">${tname[id]}</span>`).join("")}</div><div class="stat"><div><b>${n}</b>${t("видео в гильдии")}</div><div><b>${x.tracks.length}</b>${plural(x.tracks.length, "трек|трека|треков")}</div></div></article>`;
}).join("") + `<article class="ex soon"><div class="ex-top"><span class="ph" aria-hidden="true">+</span><div><div class="nm">${t("Новые эксперты")}</div><div class="role">${t("скоро")}</div></div></div><p>${t("К Илье и Тимуру присоединятся новые эксперты. Расскажем о них, как только всё будет готово.")}</p></article>`;

/* header turns solid once the hero scrolls away */
const topbar = $(".top");
const onScroll = () => topbar.classList.toggle("scrolled", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true }); onScroll();
