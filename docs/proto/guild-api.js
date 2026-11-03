// Fake guildmaster API for the landing prototypes.
// Mirrors the proposed contract:
//   GET  /public/featured?locale=ru  → [{ id, q, track }]
//   GET  /public/featured/:id        → stream (cached on guildmaster, does not spend the limit)
//   POST /public/ask { q, locale }   → stream (spends 1 from the per-browser limit)
// Stream events: { type: "text", chunk } … { type: "sources", items } → { type: "done", remaining }
//
// PLACEHOLDERS: answers, cases, threads and audio streams are hand-written stubs.
// Episode titles come from the real roadmap (roadmap-data.ru.js).

(function () {
  const R = window.ROADMAP;
  const EP = Object.fromEntries(R.episodes.map((e) => [e.id, e]));
  const t = (s) => (window.LANG !== "ru" && window.I18N?.[s]) || s;
  const TRACK = { agents: t("Агенты"), comms: t("Коммуникации"), arch: t("Архитектура") };
  const SITE = "https://nexttick.it/guild/"; // placeholder: the public pages with locked content

  const v = (id) => {
    const e = EP[id];
    return {
      kind: "video",
      track: e.track,
      title: e.title,
      meta: TRACK[e.track],
      url: SITE + "video/" + id,
      ref: id,
    };
  };
  const thread = (title, n, track) => ({ kind: "thread", track, title, meta: `ветка в чате · ${n} сообщений`, url: SITE + "digest" });
  const kase = (title, track) => ({ kind: "case", track, title, meta: "разбор кейса · видеоответ", url: SITE + "cases" });
  const audio = (title, min, track) => ({ kind: "audio", track, title, meta: `аудиострим · ${min} мин`, url: SITE + "audio" });

  const FEATURED = window.FEATURED_REAL || [
    {
      id: "review-ai-code", track: "agents",
      q: "Как ревьюить код, который написал агент?",
      a: "Начинать не с логики, а с того, что должно быть на месте до чтения: типы, тесты, инварианты, адекватные имена. Если этого нет — код возвращается без построчного ревью. Дальше ищите «правдоподобную чушь»: уверенно написанные вызовы несуществующих API, обработку ошибок, которая ничего не обрабатывает, тесты, проверяющие моки. И главное — не вычитывайте всё подряд: иерархия важности та же, что для человеческого кода, просто границы модулей проверяются строже.",
      s: [v("a3"), v("r15"), v("r13"), thread("Claude Opus 4.8 на боевом Go-репо: цена и качество одного эндпоинта", 214, "agents")],
    },
    {
      id: "parallel-agents", track: "agents",
      q: "Когда запускать несколько агентов параллельно?",
      a: "Когда задачи действительно независимы по файлам и по решениям. Параллельность экономит время только при изоляции — отдельные worktree, понятная стратегия слияния и тесты, которые ловят конфликт раньше вас. Если агентам нужно договариваться между собой, вы получите не скорость, а хаос, и разбирать его будете сами. Хороший тест: можете ли вы описать результат каждой ветки одной фразой до старта.",
      s: [v("a6"), v("a15"), thread("omc: когда ralph, а когда team", 96, "agents")],
    },
    {
      id: "say-no", track: "comms",
      q: "Как сказать «нет» менеджеру и не испортить отношения?",
      a: "«Нет» сеньйора — это не отказ, а предложение другой цены. Вместо «не успеем» — «успеем, если уберём X, или успеем X, но позже на две недели». Так вы оставляете решение за менеджером, но даёте ему настоящие варианты. Если несогласие остаётся — фиксируйте его явно и коммитьтесь на решение: disagree and commit работает, только когда «disagree» было сказано вслух.",
      s: [v("c6"), v("c4"), v("c5"), kase("Отказать продакту в фиче за неделю до релиза", "comms")],
    },
    {
      id: "sell-refactoring", track: "arch",
      q: "Как продать рефакторинг бизнесу?",
      a: "Не продавать «рефакторинг». Бизнес покупает скорость, риск и деньги — переводите долг на этот язык: сколько дней теряем на каждой фиче в этом модуле, какой инцидент он уже стоил. И не весь долг стоит возвращать: начните с того, что лежит на пути ближайших задач. Большой рефакторинг почти всегда проваливается — strangler fig позволяет менять систему, не останавливая поставку.",
      s: [v("r10"), v("r9"), v("r11"), audio("Почему «перепишем с нуля» снова в моде", 41, "arch")],
    },
    {
      id: "need-rag", track: "agents",
      q: "Нужен ли нам RAG?",
      a: "Чаще всего — нет, по крайней мере не первым шагом. Если база знаний помещается в контекст или хорошо ищется обычным поиском, RAG добавит сложность без выигрыша. Он оправдан, когда данных много, они меняются и нужна ссылка на источник. До него стоит навести порядок в самом контексте: индекс знаний проекта и правила, что попадает в окно, дают больше, чем векторная база.",
      s: [v("a9"), v("a10"), v("a12")],
    },
    {
      id: "design-doc", track: "comms",
      q: "Как написать design doc, который прочитают?",
      a: "Первым абзацем — решение, которое вы просите принять, и почему сейчас. Дальше контекст и constraints, затем варианты с честными trade-offs, и только потом детали. Не документируйте то, что очевидно из кода. Документ, который двигает решение, короткий и заканчивается вопросом к конкретным людям с дедлайном.",
      s: [v("c10"), v("c9"), v("r18"), v("r1")],
    },
    {
      id: "camera", track: "comms",
      q: "Тимлид требует включать камеру на созвонах. Что делать?",
      a: "Разделить позицию и интерес. Тимлиду обычно нужна не камера, а уверенность, что люди вовлечены. Поговорите об этом напрямую: что он пытается решить и как ещё это можно показать — активностью в обсуждении, письменными итогами, камерой только на части встреч. Готовьтесь к разговору заранее и не превращайте его в спор о правилах.",
      s: [thread("Камера на созвонах: требование тимлида vs личный дискомфорт", 187, "comms"), v("c17"), v("c18")],
    },
    {
      id: "estimates-ai", track: "arch",
      q: "Как оценивать задачи, если половину пишет AI?",
      a: "Оценивать не написание кода, а проверку и интеграцию — именно там теперь время. Разбивайте задачу так, чтобы у каждого куска был проверяемый критерий приёмки: это одновременно делает оценку точнее и делегирование агенту безопаснее. И разделяйте оценку и обязательство: оценка — это вероятность, обязательство — это обещание.",
      s: [v("c5"), v("r8"), v("r7"), v("r5")],
    },
    {
      id: "vibecoder", track: "agents",
      q: "Чем инженер отличается от вайбкодера?",
      a: "Инженер понимает, какую проблему решает и какие constraints у системы, — поэтому может остановить агента, когда тот уходит не туда. Вайбкодер собирает решение из того, что сгенерировалось, и проверяет его тем, что «вроде работает». Инструменты у них одинаковые. Разница — в способности сказать, почему решение правильное.",
      s: [thread("Инженер vs вайбкодер: кто решает проблему, а кто компонует из подручного", 312, "agents"), v("a4"), v("r4")],
    },
    {
      id: "ai-learning", track: "arch",
      q: "Где AI помогает учиться, а где мешает?",
      a: "Помогает, когда вы уже знаете, что спросить, и используете ответ как отправную точку: разобрать незнакомый код, получить контрпример, проверить понимание. Мешает, когда заменяет попытку: если агент решил за вас, вы ничего не выучили. Хороший приём — сначала своя версия, потом сравнение с агентом.",
      s: [thread("ИИ как инструмент обучения: где работает, где ломается", 148, "agents"), v("r20"), v("r19")],
    },
    {
      id: "agent-drift", track: "agents",
      q: "Агент переписывает то, что я не просил. Как остановить?",
      a: "Это drift, и лучшее лекарство — контрольные точки: после каждого шага агент показывает diff, а вы решаете, идти ли дальше. Если за три итерации не сошлось — откат дешевле, чем продолжение. Вторая половина решения — тесты как контракт: что покрыто, то агент не сломает незаметно.",
      s: [v("a4"), v("a7"), v("a8")],
    },
    {
      id: "influence", track: "comms",
      q: "Как влиять на решения, если я не тимлид?",
      a: "Влияние сеньйора строится не на должности, а на том, что с ним удобно принимать решения. Переводите технические аргументы на язык стейкхолдеров, давайте обратную связь так, чтобы её было легко принять, и делайте свою работу видимой. Через полгода вас начнут звать туда, где решают, — и это не случайность.",
      s: [v("c1"), v("c2"), v("c7"), audio("Сеньйор без подчинённых: откуда берётся вес", 33, "comms")],
    },
    {
      id: "adr", track: "arch",
      q: "Стоит ли вести ADR в маленькой команде?",
      a: "Да, и в маленькой — особенно: там решения чаще живут только в голове одного человека. ADR — это не бюрократия, а одна страница: контекст, решение, последствия. Пишется за 15 минут, экономит часы споров через полгода и даёт агенту контекст, без которого он предлагает правдоподобную чушь.",
      s: [v("r1"), v("r2"), v("r17")],
    },
    {
      id: "meetings", track: "comms",
      q: "Как перестать тратить день на созвоны?",
      a: "Половину митингов можно заменить документом: если нужен обмен информацией, а не решение — пишите. Для оставшихся — 10 минут подготовки: какое решение хотим получить и кто его принимает. И follow-up в тот же день, иначе через неделю никто не помнит, о чём договорились.",
      s: [v("c13"), v("c14"), v("c16"), v("c11")],
    },
    {
      id: "context-window", track: "agents",
      q: "Что делать, когда агент «забывает» начало задачи?",
      a: "Относитесь к контекстному окну как к ресурсу. Длинная сессия накапливает шум — иногда правильнее начать заново с короткой сводкой, чем тащить всё. Вынесите стабильные знания о проекте в контекстные документы и решайте явно, что сжимать, а что держать дословно.",
      s: [v("a12"), v("a11"), v("a2")],
    },
    {
      id: "decompose", track: "arch",
      q: "Как разбить большую задачу, чтобы её не завалить?",
      a: "Вертикально: каждый кусок — тонкий срез через все слои, который можно показать и проверить. Горизонтальная нарезка «сначала база, потом API, потом UI» откладывает обратную связь до самого конца. У каждого среза должен быть критерий приёмки — тогда его можно отдать и человеку, и агенту.",
      s: [v("r5"), v("r6"), v("r7"), kase("Миграция биллинга за квартал: как нарезали", "arch")],
    },
  ];

  // ── Per-browser limit (on guildmaster in the real thing; localStorage here) ──
  const LIMIT = 3;
  const KEY = "nt-proto-asks";
  const today = () => new Date().toISOString().slice(0, 10);
  function used() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return s.day === today() ? s.n : 0;
    } catch { return 0; }
  }
  function spend() {
    try { localStorage.setItem(KEY, JSON.stringify({ day: today(), n: used() + 1 })); } catch {}
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function* stream(text, sources) {
    await sleep(450); // "thinking"
    const words = text.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 2) {
      yield { type: "text", chunk: words[i] + (words[i + 1] || "") };
      await sleep(14 + Math.random() * 30);
    }
    await sleep(200);
    yield { type: "sources", items: sources };
    yield { type: "done", remaining: LIMIT - used() };
  }

  // Free text: no real model here — match roadmap episodes by keywords.
  function search(q) {
    const words = q.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 3);
    const stem = (w) => w.slice(0, Math.max(4, w.length - 2));
    const scored = R.episodes.map((e) => {
      const hay = (e.title + " " + e.blurb + " " + e.points.join(" ") + " " + e.series).toLowerCase();
      return { e, score: words.reduce((n, w) => n + (hay.includes(stem(w)) ? 1 : 0), 0) };
    });
    return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map((x) => v(x.e.id));
  }

  window.GuildAPI = {
    LIMIT,
    TRACK,
    remaining: () => LIMIT - used(),
    resetLimit: () => { try { localStorage.removeItem(KEY); } catch {} },
    featured: () => FEATURED.map(({ id, q, track, s }) => ({ id, q, track, n: s.length })),
    // Cached on guildmaster: free, instant-ish, does not spend the limit.
    featuredAnswer: (id) => {
      const f = FEATURED.find((x) => x.id === id);
      return stream(f.a, f.s);
    },
    ask: (q) => {
      if (used() >= LIMIT) {
        return (async function* () { yield { type: "limit", remaining: 0 }; })();
      }
      spend();
      const hit = FEATURED.find((f) => f.q.toLowerCase() === q.trim().toLowerCase());
      if (hit) return stream(hit.a, hit.s);
      const s = search(q);
      const text = s.length
        ? t("В прототипе нет модели, поэтому здесь заглушка: в живой версии здесь будет ответ по материалам гильдии. Ниже — видео, которые нашлись по словам из вопроса.")
        : t("В прототипе нет модели, и по словам из вопроса ничего не нашлось. В живой версии бот ответит по видео, встречам и обсуждениям в чате.");
      return stream(text, s);
    },
    // Every non-video source mentioned by featured answers (threads, cases, audio) — for archive views.
    extras: () => {
      const seen = new Map();
      FEATURED.flatMap((f) => f.s).filter((s) => s.kind !== "video").forEach((s) => seen.set(s.title, s));
      return [...seen.values()];
    },
    // Drain a stream into callbacks: { text, sources, done, limit }; stops once cb.stale() says so.
    run: async (iter, cb) => {
      for await (const ev of iter) {
        if (cb.stale?.()) return;
        cb[ev.type === "text" ? "text" : ev.type]?.(ev.chunk ?? ev.items ?? ev.remaining);
      }
    },
    // Stats for the "how much is inside" strip. Episodes are real; the rest are placeholders.
    stats: { videos: R.episodes.length, cases: 38, threads: 1240, audio: 17 },
    episodes: R.episodes,
  };
})();
