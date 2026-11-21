#!/usr/bin/env python3
"""Build step for the nexttick.it landing: templates/landing.html (hand-written, Russian source text) becomes
docs/ru.html, docs/uk.html, docs/en.html and docs/index.html. It writes the V hash table (sha1[:10] of every
script the page loads from docs/landing/, used as ?v= cache busters), renders the analytics blocks the other
nexttick.it pages carry (tools/lib/landing-analytics.mjs) and prerenders uk/en with the same translation rule
the page applies at runtime (tools/lib/landing-i18n-prerender.mjs).
Run after editing templates/landing.html, anything in docs/landing/ or templates/_partials/analytics:
`npm run build:landing`. `--check` writes nothing and fails when any output is not what a build would make
(part of npm test)."""
import hashlib, json, re, subprocess, sys, os, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'templates', 'landing.html')
ASSETS = os.path.join(ROOT, 'docs', 'landing')
DOCS = os.path.join(ROOT, 'docs')
PRE = os.path.join(ROOT, 'tools', 'lib', 'landing-i18n-prerender.mjs')
ANALYTICS = os.path.join(ROOT, 'tools', 'lib', 'landing-analytics.mjs')
SCRIPTS = ['i18n.uk.js', 'i18n.en.js', 'guild-api.js', 'app.js']
CHECK = '--check' in sys.argv[1:]

V = {f: hashlib.sha1(open(f'{ASSETS}/{f}', 'rb').read()).hexdigest()[:10] for f in SCRIPTS}
s = open(SRC, encoding='utf-8').read()
s, n = re.subn(r'  const V = \{.*?\};\n', lambda m: f'  const V = {json.dumps(V)};\n', s)
assert n == 1

# the analytics tags, consent loader and bot-link attribution: the ones every nexttick.it page renders
blocks = json.loads(subprocess.run(['node', ANALYTICS], capture_output=True, text=True, encoding='utf-8', check=True).stdout)
def fill(s, tag, body):
    s, n = re.subn(rf'(<!-- {tag}:[^\n]*-->\n).*?(<!-- /{tag} -->)', lambda m: m.group(1) + body + '\n' + m.group(2), s, flags=re.S)
    assert n == 1, tag
    return s
s = fill(s, 'analytics', blocks['head'])
s = fill(s, 'attribution', blocks['body'])

# what differs per language beyond the text: the page's own address (canonical, link preview), the preview's
# locale and picture, the legal pages in that language, and the Latin "Cookie" link, which the English pages
# and the consent banner call "Cookies"
def localise(page, lang):
    subs = [('<link rel="canonical" href="https://nexttick.it/ru.html">', f'<link rel="canonical" href="https://nexttick.it/{lang}.html">'),
            ('<meta property="og:url" content="https://nexttick.it/ru.html">', f'<meta property="og:url" content="https://nexttick.it/{lang}.html">'),
            ('<meta property="og:locale" content="ru_RU">', f'<meta property="og:locale" content="{ {"uk": "uk_UA", "en": "en_US"}[lang] }">'),
            ('content="https://nexttick.it/landing/og-ru.jpg"', f'content="https://nexttick.it/landing/og-{lang}.jpg"')]
    subs += [(f'href="/{doc}/ru.html"', f'href="/{doc}/{lang}.html"') for doc in ('offer', 'privacy', 'consent')]
    if lang == 'en': subs.append(('data-nt-consent-open>Cookie</a>', 'data-nt-consent-open>Cookies</a>'))
    for a, b in subs:
        assert page.count(a) == 1, (lang, a)
        page = page.replace(a, b)
    return page

# The bare domain serves index.html when Cloudflare's locale rewrite of "/" does not apply: it is the ru page,
# and its first script sends a visitor with a saved or browser language other than ru to that page before
# anything else loads. The canonical stays /ru.html, so the two are not rival URLs in search.
ROOT_REDIRECT = '''<script>
  (function () {
    var LOCS = ["uk", "ru", "en"], here = "ru", loc;
    try { loc = localStorage.getItem("lang"); } catch (e) {}
    if (LOCS.indexOf(loc) < 0) {
      loc = here;
      var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
      for (var i = 0; i < langs.length; i++) {
        var t = (langs[i] || "").toLowerCase();
        if (t.indexOf("uk") === 0) { loc = "uk"; break; }
        if (t.indexOf("ru") === 0) { loc = "ru"; break; }
        if (t.indexOf("en") === 0) { loc = "en"; break; }
      }
    }
    if (loc !== here) location.replace("/" + loc + ".html" + location.search + location.hash);
  })();
</script>
'''
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
assert s.count(VIEWPORT) == 1
outputs = {f'{DOCS}/ru.html': s, f'{DOCS}/index.html': s.replace(VIEWPORT, VIEWPORT + ROOT_REDIRECT)}
with tempfile.TemporaryDirectory() as tmp:
    src = os.path.join(tmp, 'landing.html')
    open(src, 'w', encoding='utf-8').write(s)
    for lang in ('uk', 'en'):
        out = os.path.join(tmp, f'{lang}.html')
        r = subprocess.run(['node', PRE, src, f'{ASSETS}/i18n.{lang}.js', out], capture_output=True, text=True, encoding='utf-8', check=True)
        missing = json.loads(r.stdout)
        assert not missing, (lang, missing)
        page = open(out, encoding='utf-8').read()
        assert page.count('<html lang="ru">') == 1
        outputs[f'{DOCS}/{lang}.html'] = localise(page.replace('<html lang="ru">', f'<html lang="{lang}" data-lang="{lang}">'), lang)

if CHECK:
    stale = [os.path.relpath(f, ROOT) for f, text in outputs.items() if not os.path.exists(f) or open(f, encoding='utf-8').read() != text]
    if stale:
        print('the landing pages are out of date — run `npm run build:landing`: ' + ', '.join(stale))
        sys.exit(1)
    print('LANDING BUILD UP TO DATE')
else:
    for f, text in outputs.items(): open(f, 'w', encoding='utf-8').write(text)
    print(json.dumps(V))
