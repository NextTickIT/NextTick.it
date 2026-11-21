const API = window.GuildAPI;
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
// the static markup of uk/en is translated at build time (tools/lib/landing-i18n-prerender.mjs); t() covers what
// this script renders. The page's language is remembered, as the other pages do (_partials/lang-switch.html), for
// the bare domain and the /privacy.html-style stubs
try { localStorage.setItem("lang", LANG); } catch {}
document.querySelector(`.lang-switch [data-loc="${LANG}"]`).setAttribute("aria-current", "true");
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
      // born hidden: the first tick shows only the chips clear of content, so none flashes over the text
      c.classList.add("hid");
      sky.append(c);
      return { c, lane, v, hid: true };
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

/* ── one month: per track the latest videos and the count, from /overview ── */
const TRACKS = [
  { id: "comms", name: "Коммуникации", short: "Коммуникации", kicker: "Влияние без власти" },
  { id: "arch", name: "Архитектура", short: "Архитектура", kicker: "Constraints, а не паттерны" },
  { id: "agents", name: "Агентская разработка", short: "Агенты", kicker: "AI как инструмент, а не как магия" },
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// without the overview a track shows only its name and kicker
function renderTracks(overview) {
  $("#tracks").innerHTML = TRACKS.map((tr) => {
    const d = overview?.tracks.find((x) => x.track === tr.id);
    // video titles are Russian on every page
    const list = d?.latest.length ? `<div class="series">${t("Последние выпуски")}</div><ol>${d.latest.map((e, i) => `<li class="ep${i === 0 ? " new" : ""}"><a href="${esc(e.url)}" target="_blank" rel="noopener"><span class="ic">${ICON[e.kind] || ICON.video}</span><span class="t"><span lang="ru">${esc(e.title)}</span>${i === 0 ? `<span class="m">${t("новое")}</span>` : ""}</span></a></li>`).join("")}</ol>` : "";
    const more = d ? `<div class="more">${t("{n} видео в треке →", { n: fmt(d.counts.video) })}</div>` : "";
    return `<div class="track" data-track="${tr.id}"><h3>${t(tr.name)}</h3><div class="k">${t(tr.kicker)}</div>${list}${more}</div>`;
  }).join("");
}

/* ── experts: static cards; "N videos" is the expert's count in /overview, matched by user id ── */
const EXPERTS = [
  { id: "3c424ec0-b049-4d12-ab44-15fceddc5dfd", name: "Илья Климов", photo: "/assets/author-ilya.webp", role: "Staff Frontend Engineer в GitLab", bio: "Google Developer Expert по веб-технологиям. Основатель JavaScript.ninja, спикер HolyJS, 15+ лет в индустрии.", tracks: ["agents", "comms"] },
  { id: "8582f023-9bf1-46c0-bf41-9662fdb2e032", name: "Тимур Шемсединов", photo: "/assets/author-timur.webp", role: "CTO в Metatech", bio: "30+ лет опыта. Главный архитектор Metarhia, преподаватель КПИ, автор 350+ открытых лекций по Node.js и программной инженерии.", tracks: ["arch"] },
];
const tname = Object.fromEntries(TRACKS.map((tr) => [tr.id, t(tr.short)]));
// an expert missing from the overview (or no overview at all) shows no video count
function renderExperts(overview) {
  $("#experts-grid").innerHTML = EXPERTS.map((x) => {
    const n = overview?.experts.find((e) => e.id === x.id)?.videos;
    const videos = n != null ? `<div><b>${fmt(n)}</b>${t("видео в гильдии")}</div>` : "";
    return `<article class="ex"><div class="ex-top"><img src="${x.photo}" alt="${t(x.name)}" width="72" height="72" decoding="async"><div><div class="nm">${t(x.name)}</div><div class="role">${t(x.role)}</div></div></div><p>${t(x.bio)}</p><div class="tr">${x.tracks.map((id) => `<span data-track="${id}">${tname[id]}</span>`).join("")}</div><div class="stat">${videos}<div><b>${x.tracks.length}</b>${plural(x.tracks.length, "трек|трека|треков")}</div></div></article>`;
  }).join("") + `<article class="ex soon"><div class="ex-top"><span class="ph" aria-hidden="true">+</span><div><div class="nm">${t("Новые эксперты")}</div><div class="role">${t("скоро")}</div></div></div><p>${t("К Илье и Тимуру присоединятся новые эксперты. Расскажем о них, как только всё будет готово.")}</p></article>`;
}
renderTracks(null); renderExperts(null);
API.overview.then((o) => { renderTracks(o); renderExperts(o); }, () => {});

/* header turns solid once the hero scrolls away */
const topbar = $(".top");
const onScroll = () => topbar.classList.toggle("scrolled", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

/* ── member reviews from /reviews replace the static paraphrases with a chat feed: the reviews shown in the
      admin, in random order, one more arriving at the bottom every few seconds while the oldest fades out at
      the top, so the block keeps one height however many there are; on failure or no items the static block stays ── */
const FROM = { ru: "Переведено с русского", uk: "Переведено с украинского", en: "Переведено с английского" };
const AVATAR_TONES = ["--green", "--amber", "--cyan", "--magenta", "--red"];
const PERSON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="5.5" r="3"/><path d="M2.5 14c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5z"/></svg>';
const PAUSE_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2.5" width="2.6" height="9" rx="1"/><rect x="8.4" y="2.5" width="2.6" height="9" rx="1"/></svg>';
const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L4.9 2.1a.6.6 0 0 0-.9.5z"/></svg>';
// a review stays the newest for long enough to read it: 4 s plus 20 ms a character, at most 10 s
const readTime = (r) => Math.min(4000 + r.text.length * 20, 10000);
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function reviewBubble(r) {
  const li = document.createElement("li"), av = document.createElement("span"), box = document.createElement("div");
  li.dataset.id = r.id;
  av.className = "av"; av.setAttribute("aria-hidden", "true");
  if (r.author) {
    av.textContent = r.author.replace(/\.$/, "");
    li.style.setProperty("--ac", `var(${AVATAR_TONES[r.author.codePointAt(0) % AVATAR_TONES.length]})`);
  } else av.innerHTML = PERSON;
  box.className = "rv";
  box.append(r.text);
  if (FROM[r.translatedFrom]) {
    const tip = t(FROM[r.translatedFrom]);
    const mark = document.createElement("span");
    mark.className = "rv-tr"; mark.tabIndex = 0; mark.dataset.tip = tip;
    const star = document.createElement("span"), sr = document.createElement("span");
    star.setAttribute("aria-hidden", "true"); star.textContent = "*";
    sr.className = "sr-only"; sr.textContent = tip;
    mark.append(star, sr);
    box.append(mark);
  }
  if (r.author) { // the avatar shows the initial; screen readers get it as a signature
    const by = document.createElement("span");
    by.className = "sr-only"; by.textContent = ` — ${r.author}`;
    box.append(by);
  }
  li.append(av, box);
  return li;
}
function renderReviews(items) {
  const block = $("#signals"), list = $("#signals .signals"), lede = $("#signals .after-head p");
  if (!list || !items?.length) return;
  const feed = document.createElement("div"), win = document.createElement("div");
  feed.className = "rv-feed"; win.className = "rv-win";
  list.replaceWith(feed); feed.append(win); win.append(list);
  list.replaceChildren(); list.classList.add("chat"); block.classList.add("feed");
  if (lede) lede.textContent = t("Так об этом пишут участники гильдии:");

  // the next review is one not on screen; each pass over the pool is a new random order
  let queue = shuffle(items);
  const byId = new Map(items.map((r) => [r.id, r]));
  const next = () => {
    const seen = new Set([...list.children].map((li) => li.dataset.id));
    if (!queue.length) queue = shuffle(items.filter((r) => !seen.has(r.id)));
    while (queue.length && seen.has(queue[0].id)) queue.shift();
    return queue.shift();
  };
  // the top 52px of the window are fully faded (index.html .rv-win): a bubble is gone once it is above that line
  const FADED = 52;
  // fill the window up to one bubble cut off by the fade at the top, so it reads as a longer chat
  for (let r; list.offsetHeight <= win.clientHeight - FADED && (r = next()); ) list.append(reviewBubble(r));
  // drop the bubbles that have faded out at the top, unless keyboard focus is in one
  const prune = () => {
    const top = win.getBoundingClientRect().top + FADED;
    for (let old; (old = list.firstElementChild) && old !== list.lastElementChild && !old.contains(document.activeElement)
      && old.getBoundingClientRect().bottom < top; ) old.remove();
  };
  prune();
  [...list.children].forEach((li, i) => li.style.setProperty("--i", i));
  const reveal = () => list.classList.add("in");
  const short = list.offsetHeight <= win.clientHeight - FADED; // too few to fill it: a still list of its own height
  if (short) feed.classList.add("short");

  /* the feed moves only while nothing holds it: out of view, tab hidden, mouse over it, focus in it, paused */
  const holds = new Set(["view"]);
  if (document.hidden) holds.add("hidden");
  if (reduce) holds.add("user");
  let timer = 0, due = 0, left = 5000;
  const run = (ms) => { due = Date.now() + ms; timer = setTimeout(step, ms); };
  const hold = (why, on) => {
    const moving = !holds.size;
    holds[on ? "add" : "delete"](why);
    if (short) return;
    if (moving && holds.size) { clearTimeout(timer); left = Math.max(due - Date.now(), 1500); }
    else if (!moving && !holds.size) run(left);
  };
  function step() {
    // every other review is on screen (a small pool, or a wider window than at the start): the oldest comes round again
    const r = next() ?? byId.get(list.firstElementChild.dataset.id);
    const li = reviewBubble(r);
    li.style.setProperty("--i", 2); // it pops in once the room for it has opened
    list.append(li);
    // the list grew by one bubble at the bottom: put it back where it was, then let it slide up
    list.style.transition = "none";
    list.style.transform = `translateY(${li.offsetHeight + (parseFloat(getComputedStyle(list).rowGap) || 0)}px)`;
    list.getBoundingClientRect();
    list.style.transition = list.style.transform = "";
    setTimeout(prune, 1000);
    run(readTime(r));
  }

  if (reduce) reveal();
  if (!("IntersectionObserver" in window)) { reveal(); hold("view", false); }
  else new IntersectionObserver((entries) => {
    const e = entries.at(-1); // a fast scroll can bring an enter and a leave in one call
    if (e.isIntersecting) reveal();
    hold("view", !e.isIntersecting);
  }, { rootMargin: "0px 0px -12% 0px" }).observe(win);
  if (short) return;
  document.addEventListener("visibilitychange", () => hold("hidden", document.hidden));
  feed.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hold("hover", true); });
  feed.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hold("hover", false); });
  win.addEventListener("focusin", () => hold("focus", true));
  // a translation note opens away from the window edges it would be cut by, and below the star while that is under the fade
  const placeNote = (e) => {
    const mark = e.target.closest?.(".rv-tr");
    if (!mark) return;
    const w = win.getBoundingClientRect(), m = mark.getBoundingClientRect();
    mark.dataset.x = m.left - w.left > w.width / 2 ? "l" : "r";
    mark.dataset.y = m.top - w.top < 160 ? "b" : "t";
  };
  win.addEventListener("pointerover", placeNote);
  win.addEventListener("focusin", placeNote);
  win.addEventListener("focusout", (e) => hold("focus", win.contains(e.relatedTarget)));
  const pause = document.createElement("button");
  pause.type = "button"; pause.className = "rv-pause"; pause.setAttribute("aria-label", t("Пауза"));
  const showPause = () => {
    const paused = holds.has("user");
    pause.setAttribute("aria-pressed", String(paused));
    pause.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
  };
  pause.addEventListener("click", () => { hold("user", !holds.has("user")); showPause(); });
  showPause();
  feed.prepend(pause); // before the bubbles in tab order
}
API.reviews.then(renderReviews, () => {});

/* ── the GTM events the nexttick.it pages send (_partials/lang-switch.html, and join_cta_click as the old home page
      did — its bottom CTA was "subscribe", which the #join section's bot link replaces): a click on the bot link is
      the join conversion. Partytown's head snippet owns dataLayer.push (it queues calls for its
      worker) and may delete dataLayer when it falls back, so the array is looked up, or made, at click time ── */
const track = (ev) => (window.dataLayer = window.dataLayer || []).push(ev);
document.addEventListener("click", (e) => {
  const bot = e.target.closest?.('a[href*="tg.pulse.is/next_tick_bot"]');
  const CTA_LOCATION = { join: "subscribe" };
  const section = bot?.closest("section[id]")?.id;
  if (bot) track({ event: "join_cta_click", cta_location: CTA_LOCATION[section] || section || "page",
    cta_text: bot.textContent.trim().replace(/\s+/g, " "), link_url: bot.href });
  // the language switch, as _partials/lang-switch.html does it: the choice is remembered and the query (utm_*)
  // and hash go along
  const sw = e.target.closest?.(".lang-switch a[data-loc]");
  if (sw && !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
    const loc = sw.dataset.loc;
    try { localStorage.setItem("lang", loc); } catch {}
    if (loc === LANG) return;
    e.preventDefault();
    track({ event: "lang_switch", from: LANG, to: loc });
    location.href = "/" + loc + ".html" + location.search + location.hash;
  }
});
