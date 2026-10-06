#!/usr/bin/env python3
"""Build the standalone bilingual legal pages (offer + privacy) from the
source .docx files via a docx -> Markdown -> HTML pipeline:

  1. docx -> structured Markdown (tools/legal-md/{slug}.{loc}.md), splitting each
     bilingual docx at its RU title and preserving headings, numbered clauses,
     bullet lists (Word numPr + inline ';'-lists), and the requisites block.
  2. Markdown -> HTML, mapped 1:1 to the page structure.

The Markdown files are reviewable/editable intermediates and are structured
identically across offer/privacy and uk/ru.

Fidelity: verbatim text, no reordering/omission. Numbering preserved.
Re-run anytime: python3 tools/build-legal.py
"""
import html
import os
import re
import subprocess
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD_DIR = os.path.join(ROOT, "tools", "legal-md")

DOCS = {
    "offer": {
        "file": "Оферта_на_оказание_платных_услуг_по_подписке.docx",
        # RU half begins at the RU title paragraph (NOT the section-1 heading).
        "ru_split": re.compile(r"^Оферта на оказание платных услуг по подписке"),
    },
    "privacy": {
        "file": "Политика конфиденциальности.docx",
        "ru_split": re.compile(r"^Политика конфиденциальности"),
    },
}

# Per (slug, loc) presentation strings.
STR = {
    ("offer", "uk"): dict(
        title="Публічна оферта — NextTick",
        desc="Публічна оферта на надання платних послуг за підпискою сервісу NextTick.",
        path="— публічна оферта",
    ),
    ("offer", "ru"): dict(
        title="Публичная оферта — NextTick",
        desc="Публичная оферта на оказание платных услуг по подписке сервиса NextTick.",
        path="— публичная оферта",
    ),
    ("privacy", "uk"): dict(
        title="Політика конфіденційності — NextTick",
        desc="Політика конфіденційності NextTick — обробка та захист персональних даних.",
        path="— політика конфіденційності",
    ),
    ("privacy", "ru"): dict(
        title="Политика конфиденциальности — NextTick",
        desc="Политика конфиденциальности NextTick — обработка и защита персональных данных.",
        path="— политика конфиденциальности",
    ),
    ("consent", "uk"): dict(
        title="Згода на обробку персональних даних — NextTick",
        desc="Згода на обробку персональних даних користувачів Telegram-бота NextTick.",
        path="— згода на обробку даних",
    ),
    ("consent", "ru"): dict(
        title="Согласие на обработку персональных данных — NextTick",
        desc="Согласие на обработку персональных данных пользователей Telegram-бота NextTick.",
        path="— согласие на обработку данных",
    ),
    ("offer", "en"): dict(
        title="Public Offer — NextTick",
        desc="Public offer for the provision of paid subscription services by NextTick.",
        path="— public offer",
    ),
    ("privacy", "en"): dict(
        title="Privacy Policy — NextTick",
        desc="NextTick Privacy Policy — the processing and protection of personal data.",
        path="— privacy policy",
    ),
    ("consent", "en"): dict(
        title="Personal Data Processing Consent — NextTick",
        desc="Consent to the processing of personal data of NextTick Telegram bot users.",
        path="— data processing consent",
    ),
}

FOOTER_LABELS = {
    "uk": dict(home="← nexttick", offer="Публічна оферта",
               privacy="Політика конфіденційності",
               consent="Згода на обробку даних",
               prev="Попередня редакція",
               copy="© 2026 NextTick · ТОВ «МЕТАТЕСН»"),
    "ru": dict(home="← nexttick", offer="Публичная оферта",
               privacy="Политика конфиденциальности",
               consent="Согласие на обработку данных",
               prev="Предыдущая редакция",
               copy="© 2026 NextTick · ООО «МЕТАТЕСН»"),
    "en": dict(home="← nexttick", offer="Public Offer",
               privacy="Privacy Policy",
               consent="Data Processing Consent",
               prev="Previous revision",
               copy="© 2026 NextTick · METATECH LLC"),
}

# The copyright line belongs to the REVISION, not to the site: an archived page
# must keep stamping the entity that actually issued it (B6/B7).
FOOTER_COPY_ARCHIVE = {
    "uk": "© 2026 NextTick · ФОП Карпов Антон",
    "ru": "© 2026 NextTick · ФЛП Карпов Антон",
    "en": "© 2026 NextTick · Sole Proprietor Anton Karpov",
}

# Superseded-revision banner. {date} is localized via MONTHS below.
ARCHIVE_NOTE = {
    "uk": 'Архівна редакція. Втратила чинність {date}. '
          'Чинна редакція: <a href="/{slug}/uk.html">nexttick.it/{slug}/uk.html</a>',
    "ru": 'Архивная редакция. Утратила силу {date}. '
          'Действующая редакция: <a href="/{slug}/ru.html">nexttick.it/{slug}/ru.html</a>',
    "en": 'Archived revision, superseded on {date}. '
          'Current revision: <a href="/{slug}/en.html">nexttick.it/{slug}/en.html</a>',
}
MONTHS = {
    "uk": ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня",
           "серпня", "вересня", "жовтня", "листопада", "грудня"],
    "ru": ["января", "февраля", "марта", "апреля", "мая", "июня", "июля",
           "августа", "сентября", "октября", "ноября", "декабря"],
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
}
ARCHIVE_SUFFIX = {"uk": " року", "ru": " года", "en": ""}


def archive_note(slug, loc, date):
    """Localized 'this revision is superseded' banner for a dated archive page."""
    y, m, d = (int(x) for x in date.split("-"))
    human = f"{d} {MONTHS[loc][m - 1]} {y}{ARCHIVE_SUFFIX[loc]}"
    return ARCHIVE_NOTE[loc].format(date=human, slug=slug)


APPROVAL_RE = re.compile(r"ЗАТВЕРДЖ|УТВЕРЖД|Дата затвердж|Дата утвержд|^\d{1,2}\s+\S+\s+20\d\d")
# Line breaks for the opening legal-entity block. The RU docx carries explicit
# <w:br> breaks; the UK docx crams the same info into break-less paragraphs, so we
# re-insert breaks before the same logical segments. Idempotent (collapses any
# whitespace/newline before a marker to a single newline), so RU stays unchanged.
META_BREAKS = re.compile(
    r"[ \t\n]*(ФОП |ФЛП |РНОКПП|Дата затвердж|Дата утвержд|Публічна оферта|Публичная оферта|м\.\s*Київ|г\.\s*Киев)"
)
# DOTALL so a clause/section body may span an in-paragraph <w:br/> (rendered as \n).
SECTION_RE = re.compile(r"^(\d+)\.\s+(\S.*)$", re.S)
CLAUSE_RE = re.compile(r"^(\d+\.\d+(?:\.\d+)*\.?)\s*(.*)$", re.S)
REQUISITES_RE = re.compile(r"РЕКВІЗИТ|РЕКВИЗИТ")
# Inline list: a "lead-in:" followed by a body with >=2 "; " separators. Used to
# turn semicolon-run lists (common in the UK offer) into bullets, matching the RU
# side (which uses Word numPr lists). Conservative — verified to hit only real lists.
INLINE_LIST_RE = re.compile(r"^(.*?:)\s+(\S.*;\s+\S.*;\s+\S.*)$", re.S)


def paragraphs(docx_path):
    """Return records {text, list (bool: Word numPr item), ilvl (int)}."""
    doc = zipfile.ZipFile(docx_path).read("word/document.xml").decode("utf-8")
    out = []
    for p in re.findall(r"<w:p\b.*?</w:p>", doc, re.S):
        buf = []
        # Walk runs in order; preserve in-paragraph line breaks (<w:br/>) and tabs.
        for m in re.finditer(
            r"<w:t[^>]*>(.*?)</w:t>|(<w:br\b[^>]*>)|(<w:tab\b[^>]*>)", p, re.S
        ):
            if m.group(1) is not None:
                buf.append(html.unescape(m.group(1)))
            elif m.group(2):
                buf.append("\n")
            elif m.group(3):
                buf.append(" ")
        text = "".join(buf).strip()
        if not text:
            continue
        is_list = "<w:numPr" in p
        ilvl = 0
        if is_list:
            m = re.search(r'<w:ilvl w:val="(\d+)"', p)
            ilvl = int(m.group(1)) if m else 0
        out.append({"text": text, "list": is_list, "ilvl": ilvl})
    return out


# --- Inline markdown (B1). Applied to ALREADY-ESCAPED text, so the escaping done
# by esc() is preserved and only our own tags are introduced.
# Scope is deliberately just **bold**: the Ред.№2 sources use it for the ~24 defined
# terms. URLs are left as plain text, exactly as every published revision renders
# them — auto-linking them would silently restyle the archived revisions too.
INLINE_BOLD = re.compile(r"\*\*(.+?)\*\*", re.S)
# A whole-line italic paragraph -> the dimmed .legal-meta approval block (B3).
# Both delimiters: the Ред.№2 sources use _underscores_, and *asterisks* are the
# other common authoring style, so neither can leak into the page as literal text.
ITALIC_META = re.compile(r"^(?:\*(?!\*)(.+?)\*|_(?!_)(.+?)_)$", re.S)


def inline(t):
    """Inline markdown on escaped text: **bold** -> <strong>."""
    return INLINE_BOLD.sub(r"<strong>\1</strong>", t)


def esc(t):
    return html.escape(t, quote=False)


def split_halves(recs, ru_split):
    idx = next(i for i, r in enumerate(recs) if ru_split.search(r["text"]))
    return recs[:idx], recs[idx:]


def split_inline_list(text):
    """If text is 'lead-in: a; b; c[.]' with >=2 '; ' separators, return
    (lead, [items]); otherwise (None, None). Conservative — clear lists only."""
    m = INLINE_LIST_RE.match(text)
    if not m or m.group(2).count("; ") < 2:
        return None, None
    items = [x.strip() for x in re.split(r";\s+", m.group(2)) if x.strip()]
    if len(items) < 3:
        return None, None
    return m.group(1).strip(), items


# ── docx records → Markdown ───────────────────────────────────────────
def records_to_md(recs):
    """One language half of records -> structured Markdown string."""
    out = []

    def push(s=""):
        out.append(s)

    def blank():
        if out and out[-1] != "":
            out.append("")

    def emit_text(text):
        # Literal bullet-char list ("● a; ● b; ..." packed into one paragraph).
        if re.search(r"[●•▪–—]\s", text) and (
            text.count("●") >= 2 or text.count("•") >= 2 or text.count("▪") >= 2
        ):
            items = [x.strip() for x in re.split(r"[●•▪]\s*", text) if x.strip()]
            if len(items) >= 2:
                for it in items:
                    push(f"- {it}")
                return
        # Inline ';'-list ("lead-in: a; b; c").
        lead, items = split_inline_list(text)
        if lead is not None:
            for ln in lead.split("\n"):
                push(ln.rstrip())
            push("")
            for it in items:
                push(f"- {it}")
        else:
            for ln in text.split("\n"):
                push(ln.rstrip())

    push(f"# {recs[0]['text'].strip()}")
    push("")
    rest = recs[1:]

    # Preamble: approval/date -> meta blockquote; other -> lead paragraphs.
    i = 0
    pre = []
    while i < len(rest):
        t = rest[i]["text"]
        if SECTION_RE.match(t) and not CLAUSE_RE.match(t):
            break
        pre.append(rest[i])
        i += 1
    meta_raw = [r["text"] for r in pre if APPROVAL_RE.search(r["text"])]
    leads = [r for r in pre if not APPROVAL_RE.search(r["text"])]
    if meta_raw:
        combined = META_BREAKS.sub(r"\n\1", "\n".join(meta_raw))
        for ln in combined.split("\n"):
            if ln.strip():
                push(f"> {ln.strip()}")
        push("")
    for r in leads:
        emit_text(r["text"])
        push("")

    # Body.
    in_req = False
    req = []
    while i < len(rest):
        r = rest[i]
        t = r["text"]
        if SECTION_RE.match(t) and not CLAUSE_RE.match(t):
            blank()
            m = SECTION_RE.match(t)
            push(f"## {m.group(1)}. {m.group(2).replace(chr(10), ' ').strip()}")
            push("")
            in_req = bool(REQUISITES_RE.search(m.group(2)))
        elif in_req:
            req.append(t)
        elif CLAUSE_RE.match(t):
            blank()
            emit_text(t)
            push("")
        elif r["list"]:
            if out and out[-1] != "" and not out[-1].lstrip().startswith("- "):
                push("")
            push(f"{'  ' * r['ilvl']}- {t.replace(chr(10), ' ').strip()}")
        else:
            blank()
            emit_text(t)
            push("")
        i += 1
    if req:
        blank()
        push("```requisites")
        for line in req:
            for ln in line.split("\n"):
                push(ln)
        push("```")
        push("")
    return "\n".join(out).rstrip() + "\n"


# ── Markdown → HTML (1:1 structural mapping) ──────────────────────────
SEP_CELL = re.compile(r"^:?-{2,}:?$")


def _cells(row):
    r = row.strip()
    if r.startswith("|"):
        r = r[1:]
    if r.endswith("|"):
        r = r[:-1]
    return [c.strip() for c in r.split("|")]


def _table_html(rows):
    """GitHub-style pipe table -> <table class="legal-table">.

    The Ред.№2 privacy policy states its processing purposes and retention periods
    as two tables; without this they reached the page as literal pipe characters.
    """
    grid = [_cells(r) for r in rows]
    head = None
    if len(grid) >= 2 and grid[1] and all(SEP_CELL.match(c) for c in grid[1] if c):
        head, grid = grid[0], grid[2:]
    parts = ['<table class="legal-table">']
    if head:
        parts.append(
            "<thead><tr>"
            + "".join(f"<th>{inline(esc(c))}</th>" for c in head)
            + "</tr></thead>"
        )
    parts.append("<tbody>")
    for row in grid:
        parts.append(
            "<tr>" + "".join(f"<td>{inline(esc(c))}</td>" for c in row) + "</tr>"
        )
    parts.append("</tbody></table>")
    return "".join(parts)


def _list_html(items):
    """items: [(level, text)]. Build a (possibly nested) <ul> from level 0."""
    parts = ["<ul>"]
    prev = 0
    for idx, (lv, text) in enumerate(items):
        if idx == 0:
            parts.append(f"<li>{inline(esc(text))}")
        elif lv > prev:
            parts.append("<ul>" * (lv - prev) + f"<li>{inline(esc(text))}")
        elif lv < prev:
            parts.append("</li>" + "</ul></li>" * (prev - lv) + f"<li>{inline(esc(text))}")
        else:
            parts.append(f"</li><li>{inline(esc(text))}")
        prev = lv
    parts.append("</li>" + "</ul>" * (prev + 1))
    return "".join(parts)


def md_to_html(md, lead_preamble=None):
    """Parse our Markdown dialect -> (h1, body_html).

    lead_preamble: style paragraphs before the first "## " section as .lead
    (dimmed). Auto-detected when None (B4): a document that HAS "## " sections
    gets the dimmed preamble above section 1; a section-less document would
    otherwise render entirely dimmed, so it does not. This replaces the old
    hardcoded SECTIONLESS slug list, which broke as soon as a previously
    section-less doc (consent) gained numbered sections in a new revision."""
    if lead_preamble is None:
        lead_preamble = any(l.startswith("## ") for l in md.split("\n"))
    lines = md.split("\n")
    n = len(lines)
    i = 0
    h1 = ""
    blocks = []
    seen_section = False

    def special(ln):
        return (
            ln.startswith("# ")
            or ln.startswith("## ")
            or ln.startswith("> ")
            or ln.startswith("```")
            or ln.lstrip().startswith("- ")
            or ln.lstrip().startswith("|")
        )

    while i < n:
        ln = lines[i]
        if ln.strip() == "":
            i += 1
        elif ln.startswith("# "):
            # B2: only the FIRST "# " becomes the page <h1>. A later one (e.g. the
            # offer's "ДОДАТОК 1 ДО ОФЕРТИ") is a major in-body division: emit it as
            # a titled h2 instead of silently overwriting the document title.
            t = esc(ln[2:].strip())
            if not h1:
                h1 = t
            else:
                blocks.append(f'<h2 class="appendix-title">{t}</h2>')
            i += 1
        elif ln.startswith("## "):
            seen_section = True
            m = re.match(r"##\s+(\d+)\.\s+(.*)", ln)
            if m:
                blocks.append(
                    f'<h2><span class="h2-num">{esc(m.group(1))}.</span> {esc(m.group(2).strip())}</h2>'
                )
            else:
                blocks.append(f"<h2>{esc(ln[3:].strip())}</h2>")
            i += 1
        elif ln.startswith("> "):
            meta = []
            while i < n and lines[i].startswith("> "):
                meta.append(esc(lines[i][2:].strip()))
                i += 1
            blocks.append('<p class="legal-meta">' + "<br />".join(meta) + "</p>")
        elif ln.startswith("```"):
            info = ln[3:].strip()
            i += 1
            buf = []
            while i < n and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1  # closing fence
            joined = "\n".join(esc(x) for x in buf)
            blocks.append(
                f'<div class="requisites">{joined}</div>'
                if info == "requisites"
                else f"<pre>{joined}</pre>"
            )
        elif ln.lstrip().startswith("|"):
            rows = []
            while i < n and lines[i].lstrip().startswith("|"):
                rows.append(lines[i])
                i += 1
            blocks.append(_table_html(rows))
        elif ln.lstrip().startswith("- "):
            items = []
            while i < n and lines[i].lstrip().startswith("- "):
                indent = len(lines[i]) - len(lines[i].lstrip())
                items.append((indent // 2, lines[i].lstrip()[2:].strip()))
                i += 1
            blocks.append(_list_html(items))
        else:
            buf = []
            # strip (not just rstrip): a clause paragraph that follows a bullet
            # list gets a 2-space indent from Prettier (it reads as a list-item
            # continuation), which would otherwise hide the "N.M." number from
            # CLAUSE_RE and drop the clause styling. Prose carries no meaningful
            # leading whitespace, so stripping is safe.
            while i < n and lines[i].strip() != "" and not special(lines[i]):
                buf.append(lines[i].strip())
                i += 1
            mi = ITALIC_META.match(buf[0]) if len(buf) == 1 else None
            if mi:
                # B3: the new revisions carry their approval block as one *italic*
                # line instead of the old "> " blockquote. Same .legal-meta styling.
                inner = mi.group(1) if mi.group(1) is not None else mi.group(2)
                blocks.append(
                    '<p class="legal-meta">' + inline(esc(inner.strip())) + "</p>"
                )
                continue
            mcl = CLAUSE_RE.match(buf[0])
            if mcl:
                num = mcl.group(1)
                body_lines = [buf[0][len(num):].lstrip()] + buf[1:]
                body = inline("<br />".join(esc(x) for x in body_lines if x != ""))
                blocks.append(
                    f'<p class="clause"><span class="cl-num">{esc(num)}</span> {body}</p>'
                )
            else:
                cls = ' class="lead"' if (lead_preamble and not seen_section) else ""
                blocks.append(
                    f"<p{cls}>" + inline("<br />".join(esc(x) for x in buf)) + "</p>"
                )
    return h1, "\n".join(blocks)


CLARITY = """    <script type="text/javascript">
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, "clarity", "script", "x5houryvs2");
    </script>
"""

PAGE = """<!doctype html>
<html lang="%%LANG%%">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>%%TITLE%%</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48x48.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="description" content="%%DESC%%" />
    <link rel="canonical" href="https://nexttick.it/%%SLUG%%/%%LOC%%.html" />%%ROBOTS%%
    <link rel="alternate" hreflang="uk" href="https://nexttick.it/%%SLUG%%/uk.html" />
    <link rel="alternate" hreflang="ru" href="https://nexttick.it/%%SLUG%%/ru.html" />
    <link rel="alternate" hreflang="en" href="https://nexttick.it/%%SLUG%%/en.html" />
    <link rel="alternate" hreflang="x-default" href="https://nexttick.it/%%SLUG%%/ru.html" />
    <meta name="theme-color" content="#0b0d0f" />
%%CLARITY%%    <script>
      /* Apply saved/system theme before paint to avoid a flash of the wrong theme. */
      (function () {
        try {
          var saved = localStorage.getItem("theme");
          var theme = saved || (window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
          document.documentElement.setAttribute("data-theme", theme);
        } catch (e) {}
      })();
    </script>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MXX0XQWV3R"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag("js", new Date());
      gtag("config", "G-MXX0XQWV3R");
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/assets/legal.css" />
    <!-- Meta Pixel Code -->
    <script>
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(
        window,
        document,
        "script",
        "https://connect.facebook.net/en_US/fbevents.js",
      );
      fbq("init", "1543537094181571");
      fbq("track", "PageView");
    </script>
    <noscript
      ><img
        height="1"
        width="1"
        style="display: none"
        src="https://www.facebook.com/tr?id=1543537094181571&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->
  </head>
  <body>
    <div class="page">
      <div class="win">
        <div class="win-bar">
          <div class="dots">
            <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
          </div>
          <button class="theme-toggle" id="theme-toggle" type="button"
            aria-label="%%THEME_LABEL%%" title="%%THEME_LABEL%%">
            <svg class="tt-icon tt-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"></path>
            </svg>
            <svg class="tt-icon tt-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
            </svg>
          </button>
          <nav class="lang-switch" aria-label="%%LANG_LABEL%%">
            <a class="ls-opt %%ON_UK%%" data-loc="uk" hreflang="uk" href="/%%SLUG%%/uk.html"%%CUR_UK%%>UK</a>
            <a class="ls-opt %%ON_RU%%" data-loc="ru" hreflang="ru" href="/%%SLUG%%/ru.html"%%CUR_RU%%>RU</a>
            <a class="ls-opt %%ON_EN%%" data-loc="en" hreflang="en" href="/%%SLUG%%/en.html"%%CUR_EN%%>EN</a>
          </nav>
          <span class="title">nexttick</span>
          <span class="path">%%PATH%%</span>
        </div>
        <main class="legal">
          <h1>%%H1%%</h1>%%ARCHIVE_NOTE%%
          %%BODY%%
        </main>
        <footer class="legal-footer">
          <a href="/%%LOC%%.html">%%F_HOME%%</a>
          <a href="/offer/%%LOC%%.html">%%F_OFFER%%</a>
          <a href="/privacy/%%LOC%%.html">%%F_PRIVACY%%</a>
          <a href="/consent/%%LOC%%.html">%%F_CONSENT%%</a>%%PREV_REV%%
          <span class="lf-copy">%%F_COPY%%</span>
        </footer>
      </div>
    </div>
    <script>
      // Theme toggle — flip data-theme on <html>, persist choice, sync browser chrome.
      (function () {
        var btn = document.getElementById("theme-toggle");
        if (!btn) return;
        var meta = document.querySelector('meta[name="theme-color"]');
        btn.addEventListener("click", function () {
          var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
          var next = cur === "light" ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", next);
          try { localStorage.setItem("theme", next); } catch (e) {}
          if (meta) meta.setAttribute("content", next === "light" ? "#ffffff" : "#0b0d0f");
        });
      })();
      // Language switcher — persist ONLY on explicit click (no on-load write, so a
      // legal-page view never clobbers the visitor's saved landing-page locale).
      (function () {
        var LOCS = ["uk", "ru", "en"];
        document.querySelectorAll(".lang-switch .ls-opt").forEach(function (a) {
          a.addEventListener("click", function (e) {
            e.preventDefault();
            var loc = a.getAttribute("data-loc");
            if (LOCS.indexOf(loc) < 0) return;
            try { localStorage.setItem("lang", loc); } catch (e) {}
            // Page lives at /{slug}/{loc}.html; keep the slug, swap the locale file.
            var slug = location.pathname.split("/")[1] || "";
            location.href = "/" + slug + "/" + loc + ".html" + location.search + location.hash;
          });
        });
      })();
    </script>
  </body>
</html>
"""

THEME_LABELS = {"uk": "Світла / темна тема", "ru": "Светлая / тёмная тема", "en": "Light / dark theme"}
LANG_LABELS = {"uk": "Мова", "ru": "Язык", "en": "Language"}


# Markdown-native pages: (slug, loc) built directly from the committed
# tools/legal-md/<slug>.<loc>.md — no source .docx. Used for:
#   • consent (all locales — authored from published telegra.ph text, not a Word doc)
#   • the English offer/privacy (translated from the ru/uk Markdown; the docx only
#     ever carried the uk/ru halves, so en has no docx source).
# Section-less docs (SECTIONLESS) render as plain paragraphs (lead_preamble=False);
# the section-structured offer/privacy keep the dimmed .lead preamble above section 1.
MD_PAGES = [
    ("consent", "uk"),
    ("consent", "ru"),
    ("consent", "en"),
    ("offer", "uk"),
    ("offer", "ru"),
    ("offer", "en"),
    ("privacy", "uk"),
    ("privacy", "ru"),
    ("privacy", "en"),
]


def assemble_page(slug, loc, md, lead_preamble=None, archive_date=None,
                  prev_revision=None):
    """Stage 2: Markdown -> HTML body -> full page.

    archive_date set (YYYY-MM-DD) emits the dated, superseded revision at
    docs/<slug>/<loc>-<date>.html: noindex (canonical already points at the live
    page, so the archive never competes with it in search), a localized
    superseded banner under the <h1>, and the issuing entity's own copyright.
    prev_revision (YYYY-MM-DD) adds a footer link to the superseded revision. The
    offer keeps a User on the revision in force when they paid until their
    Subscription Period ends (cl. 7.2), so the previous text has to stay reachable
    FROM the current one, not merely exist at a URL.
    Returns (html_rel, md_rel) for post-formatting."""
    h1, body = md_to_html(md, lead_preamble=lead_preamble)
    s = STR[(slug, loc)]
    fl = FOOTER_LABELS[loc]
    if archive_date:
        fl = dict(fl, copy=FOOTER_COPY_ARCHIVE[loc])
    page = (
        PAGE
        .replace("%%LANG%%", loc)
        .replace("%%LOC%%", loc)
        .replace("%%SLUG%%", slug)
        .replace("%%TITLE%%", esc(s["title"]))
        .replace("%%DESC%%", esc(s["desc"]))
        .replace("%%PATH%%", esc(s["path"]))
        .replace("%%H1%%", h1)
        .replace("%%BODY%%", body)
        .replace("%%THEME_LABEL%%", THEME_LABELS[loc])
        .replace("%%LANG_LABEL%%", LANG_LABELS[loc])
        .replace("%%ON_UK%%", "on" if loc == "uk" else "")
        .replace("%%ON_RU%%", "on" if loc == "ru" else "")
        .replace("%%ON_EN%%", "on" if loc == "en" else "")
        .replace("%%CUR_UK%%", ' aria-current="true"' if loc == "uk" else "")
        .replace("%%CUR_RU%%", ' aria-current="true"' if loc == "ru" else "")
        .replace("%%CUR_EN%%", ' aria-current="true"' if loc == "en" else "")
        .replace("%%CLARITY%%", CLARITY if slug == "offer" else "")
        .replace("%%F_HOME%%", esc(fl["home"]))
        .replace("%%F_OFFER%%", esc(fl["offer"]))
        .replace("%%F_PRIVACY%%", esc(fl["privacy"]))
        .replace("%%F_CONSENT%%", esc(fl["consent"]))
        .replace("%%F_COPY%%", esc(fl["copy"]))
        .replace(
            "%%PREV_REV%%",
            f'\n          <a href="/{slug}/{loc}-{prev_revision}.html">'
            f"{esc(fl['prev'])}</a>"
            if prev_revision
            else "",
        )
        .replace(
            "%%ROBOTS%%",
            '\n    <meta name="robots" content="noindex,follow" />'
            if archive_date
            else "",
        )
        .replace(
            "%%ARCHIVE_NOTE%%",
            '\n          <p class="legal-meta legal-archived">'
            + archive_note(slug, loc, archive_date)
            + "</p>"
            if archive_date
            else "",
        )
    )
    out_dir = os.path.join(ROOT, "docs", slug)
    os.makedirs(out_dir, exist_ok=True)
    stem = f"{loc}-{archive_date}" if archive_date else loc
    with open(os.path.join(out_dir, f"{stem}.html"), "w", encoding="utf-8") as f:
        f.write(page)
    md_rel = (
        f"tools/legal-md/archive/{slug}.{loc}-{archive_date}.md"
        if archive_date
        else f"tools/legal-md/{slug}.{loc}.md"
    )
    return (f"docs/{slug}/{stem}.html", md_rel)


ARCHIVE_DIR = os.path.join(MD_DIR, "archive")
# tools/legal-md/archive/<slug>.<loc>-<YYYY-MM-DD>.md — superseded revisions, kept
# buildable (not frozen HTML) so a dated page can always be regenerated from its
# own source. Published noindex with a banner pointing at the live revision.
ARCHIVE_RE = re.compile(r"^(offer|privacy|consent)\.(uk|ru|en)-(\d{4}-\d{2}-\d{2})\.md$")


def latest_archived():
    """{(slug, loc): newest archived date} — the revision a live page links back to."""
    out = {}
    if not os.path.isdir(ARCHIVE_DIR):
        return out
    for name in os.listdir(ARCHIVE_DIR):
        m = ARCHIVE_RE.match(name)
        if m:
            slug, loc, date = m.groups()
            key = (slug, loc)
            if date > out.get(key, ""):
                out[key] = date
    return out


def build(from_docx=False):
    written = []
    os.makedirs(MD_DIR, exist_ok=True)
    # docx-sourced docs (offer/privacy): docx -> Markdown intermediate -> HTML.
    # B8: gated behind --from-docx. This stage OVERWRITES the committed Markdown,
    # which is now the source of truth; an un-gated run would silently destroy
    # hand-authored revisions the moment a stale .docx reappeared in the repo root.
    for slug, cfg in (DOCS.items() if from_docx else []):
        docx_path = os.path.join(ROOT, cfg["file"])
        if not os.path.exists(docx_path):
            # Source .docx absent. offer/privacy are still rebuilt below, md-native,
            # from the committed tools/legal-md/<slug>.<loc>.md (see MD_PAGES) — the
            # Markdown is the source of truth now. The .docx step only regenerates
            # that Markdown; drop the .docx back next to this repo to refresh it.
            print(f"skip {slug} docx: {cfg['file']} not found — building md-native from committed .md")
            continue
        recs = paragraphs(docx_path)
        uk_half, ru_half = split_halves(recs, cfg["ru_split"])
        halves = {"uk": uk_half, "ru": ru_half}
        for loc, half in halves.items():
            # Stage 1: docx records -> Markdown intermediate (written to disk).
            md = records_to_md(half)
            with open(os.path.join(MD_DIR, f"{slug}.{loc}.md"), "w", encoding="utf-8") as f:
                f.write(md)
            written.append(assemble_page(slug, loc, md, lead_preamble=True))
    # md-native pages: committed Markdown -> HTML (no docx stage). The .lead
    # preamble decision is auto-detected per document (see md_to_html).
    prev = latest_archived()
    for slug, loc in MD_PAGES:
        md_path = os.path.join(MD_DIR, f"{slug}.{loc}.md")
        if not os.path.exists(md_path):
            print(f"skip {slug}/{loc}: {md_path} not found")
            continue
        with open(md_path, encoding="utf-8") as f:
            md = f.read()
        written.append(
            assemble_page(slug, loc, md, prev_revision=prev.get((slug, loc)))
        )
    # Superseded revisions: docs/<slug>/<loc>-<date>.html from the archive sources.
    if os.path.isdir(ARCHIVE_DIR):
        for name in sorted(os.listdir(ARCHIVE_DIR)):
            m = ARCHIVE_RE.match(name)
            if not m:
                continue
            slug, loc, date = m.groups()
            with open(os.path.join(ARCHIVE_DIR, name), encoding="utf-8") as f:
                md = f.read()
            written.append(assemble_page(slug, loc, md, archive_date=date))
    paths = [os.path.join(ROOT, rel) for pair in written for rel in pair]
    if paths:
        format_outputs(paths)
    return written


def format_outputs(paths):
    """Format generated HTML/Markdown with the PINNED local Prettier + committed
    .prettierrc (Phase 0). This is the SAME formatter tools/build.mjs uses, so
    embedded JS/CSS can't reflow divergently between the two build scripts and
    blow the byte-diff. Fails loudly if the pinned Prettier is missing (deps must
    be installed first: `npm install`)."""
    prettier_bin = os.path.join(ROOT, "node_modules", ".bin", "prettier")
    if not os.path.exists(prettier_bin):
        raise SystemExit(
            "pinned Prettier not found at node_modules/.bin/prettier — run `npm install` first"
        )
    # cwd=ROOT so Prettier auto-loads the committed .prettierrc (printWidth 80).
    subprocess.run([prettier_bin, "--write", *paths], cwd=ROOT, check=True)


if __name__ == "__main__":
    import sys as _sys

    for html_path, md_path in build(from_docx="--from-docx" in _sys.argv):
        print(f"wrote {md_path} -> {html_path}")
