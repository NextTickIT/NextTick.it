# templates/ — page & partial sources

`tools/build.mjs` **auto-discovers** everything here. To add a page you author a
template + strings + a tiny config file; **never edit `tools/build.mjs`**.

## Add a localized content page

Drop three files (page name = the `<page>` part of the config filename):

- `templates/<page>.html` — the Eta template (owns 100% of that page's HTML).
- `templates/<page>.strings.json` — text keyed by locale.
- `templates/<page>.page.json` — the config:

```json
{
  "template": "<page>.html",
  "strings": "<page>.strings.json",
  "outputScheme": "dir",
  "locales": ["en", "ru", "uk"],
  "analytics": { "gtm": true, "ga4": true, "clarity": true, "pixel": true, "attribution": "website" }
}
```

- `outputScheme: "dir"`  → `pages/<page>/<loc>.html`
- `outputScheme: "root"` → `pages/<loc>.html` (home only)
- `locales` is optional (default `en`, `ru`, `uk`).
- `analytics.attribution` is a channel string (`"website"`, `"conf"`) or `false`.

`strings.json` shape — keyed by locale, then flat keys:

```json
{
  "en": { "headline": "Ships weekly", "render": { "nowLabel": "now" } },
  "ru": { "headline": "…", "render": { "nowLabel": "сейчас" } },
  "uk": { "headline": "…", "render": { "nowLabel": "зараз" } }
}
```

## Template context (Eta `useWith: true` — reference names directly)

- every key of `strings[loc]` → top level: `<%= headline %>`, `<%~ render.lede %>`
- `s` → the same map, namespaced: `<%= s.headline %>`
- `loc` → `"en" | "ru" | "uk"`  (e.g. `var PAGE_LOC = "<%= loc %>";`)
- `analytics` → the flags object: `<% if (analytics.gtm) { %>…<% } %>`
- `page` → the page name
- `include("_partials/head.html", { … })` → partial include (built-in)

**Escaping:** `<%= x %>` HTML-escapes; `<%~ x %>` is RAW. Captions that contain
markup (e.g. `<span class="em">…</span>`) MUST use `<%~ %>` or they ship as
`&lt;span&gt;` and break the byte-diff.

**Reserved top-level names** (do not use as `strings` keys): `s`, `loc`,
`analytics`, `page`, `include`, `it`.

## Stub / legacy batches (Phase 5)

`templates/<name>.stubs.json` renders one template to many analytics-free outputs:

```json
{
  "template": "stub.html",
  "outputs": [
    { "out": "index.html",    "data": { "target": "/<loc>.html" } },
    { "out": "en/index.html", "data": { "target": "/en.html" } }
  ]
}
```

`out` is a path under `pages/`. Each `data` object is available at top level
(and as `data`), with NO analytics injected.

## Guarantees

- Output is Prettier-formatted through the pinned formatter (`tools/lib/format.mjs`)
  — the same one `npm run canary` validates — so `pages/<page>/<loc>.html` is
  byte-stable and diffable against the frozen baseline (`tools/bytediff.mjs`).
- `build.mjs` writes ONLY `*.html`; it never touches `pages/` static
  (`CNAME`, `favicon.ico`, `site.webmanifest`, `assets/`, `roadmap-data.<loc>.js`).
