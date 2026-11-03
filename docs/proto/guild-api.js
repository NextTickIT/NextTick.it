// Client for guildmaster's public landing API (https://web.nexttick.it/public/v1).
//   GET  /featured?locale=      → { items: [{ id, track, q }], updatedAt }
//   GET  /featured/:id?locale=  → { id, track, q, answer, sources }   (cached, does not spend the limit)
//   POST /session               → { limit, remaining, resetAt }        (sets the browser cookie)
//   POST /ask { q, locale }     → text/event-stream: text → sources → done, or error (spends 1)
// The answer arrives whole, so the typing effect is done here. Streams yield
// { type: "text", chunk } … { type: "sources", items } → { type: "done", remaining },
// or { type: "limit", remaining: 0 } / { type: "error", code }.
//
// Stats and episodes still come from the roadmap (roadmap-data.<lang>.js); the counts besides videos are placeholders.

(function () {
  const BASE = "https://web.nexttick.it/public/v1";
  const R = window.ROADMAP;
  const LOCALE = window.LANG;
  const t = (s) => (window.LANG !== "ru" && window.I18N?.[s]) || s;
  const TRACK = { agents: t("Агенты"), comms: t("Коммуникации"), arch: t("Архитектура") };
  const KIND = { video: t("видео"), post: t("пост"), call: t("запись встречи"), audio: t("аудио") };

  let featured = [];
  let quota = null; // { limit, remaining } once /session answered

  // /featured is served with "Access-Control-Allow-Origin: *", which a credentialed request may not use:
  // the GETs go without cookies (they need none); /session and /ask carry the cookie.
  const getJson = (path) => fetch(BASE + path, { credentials: "omit" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const post = (path, body) => fetch(BASE + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const ready = Promise.allSettled([
    getJson(`/featured?locale=${LOCALE}`).then((d) => { featured = d.items; }),
    post("/session", {}).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((d) => { quota = { limit: d.limit, remaining: d.remaining }; }),
  ]);

  const source = (s) => ({ ...s, meta: [KIND[s.kind], TRACK[s.track]].filter(Boolean).join(" · ") });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function* typing(text) {
    const words = text.split(/(\s+)/);
    for (let i = 0; i < words.length; i += 2) {
      yield { type: "text", chunk: words[i] + (words[i + 1] || "") };
      await sleep(14 + Math.random() * 30);
    }
  }

  async function* featuredAnswer(id) {
    let d;
    try {
      d = await getJson(`/featured/${encodeURIComponent(id)}?locale=${LOCALE}`);
    } catch (status) {
      yield { type: "error", code: status === 404 ? "not_found" : "upstream_error" };
      return;
    }
    yield* typing(d.answer);
    yield { type: "sources", items: d.sources.map(source) };
    yield { type: "done", remaining: quota?.remaining };
  }

  // Server-sent events by hand: events are separated by a blank line; ": ping" comments are skipped.
  async function* events(body) {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
        let cut;
        while ((cut = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          let name = "message", data = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) name = line.slice(6).trim();
            else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).replace(/^ /, "");
          }
          if (data) yield { name, data: JSON.parse(data) };
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  }

  async function* ask(q) {
    let res;
    try {
      res = await post("/ask", { q, locale: LOCALE });
    } catch {
      yield { type: "error", code: "upstream_error" };
      return;
    }
    if (!res.ok) {
      const code = (await res.json().catch(() => null))?.error?.code;
      if (res.status === 429) {
        quota = { limit: quota?.limit, remaining: 0 };
        yield { type: "limit", remaining: 0 };
      } else yield { type: "error", code: code || "upstream_error" };
      return;
    }
    let finished = false;
    try {
      for await (const ev of events(res.body)) {
        if (ev.name === "text") yield* typing(ev.data.chunk);
        else if (ev.name === "sources") yield { type: "sources", items: ev.data.items.map(source) };
        else if (ev.name === "done") {
          finished = true;
          quota = { limit: quota?.limit, remaining: ev.data.remaining };
          yield { type: "done", remaining: ev.data.remaining };
          return;
        } else if (ev.name === "error") {
          finished = true;
          yield { type: "error", code: ev.data.code };
          return;
        }
      }
    } catch {
      // connection dropped mid-stream: reported below like an upstream failure
    }
    if (!finished) yield { type: "error", code: "upstream_error" };
  }

  window.GuildAPI = {
    get LIMIT() { return quota?.limit; },
    TRACK,
    ready,
    // null until /session answered: the page hides the counter
    remaining: () => quota?.remaining ?? null,
    featured: () => featured,
    featuredAnswer,
    ask,
    extras: () => [],
    // Drain a stream into callbacks: { text, sources, done, limit, error }; stops once cb.stale() says so.
    run: async (iter, cb) => {
      for await (const ev of iter) {
        if (cb.stale?.()) return;
        cb[ev.type]?.(ev.chunk ?? ev.items ?? ev.code ?? ev.remaining);
      }
    },
    // Stats for the "how much is inside" strip. Episodes are real; the rest are placeholders.
    stats: { videos: R.episodes.length, cases: 38, threads: 1240, audio: 17 },
    episodes: R.episodes,
  };
})();
