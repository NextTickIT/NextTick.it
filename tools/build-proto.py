#!/usr/bin/env python3
"""Build step for the guild prototype at docs/proto: rewrites the V hash table in index.html
(sha1[:10] of every script the page loads, used as ?v= cache busters), copies in the analytics
blocks nexttick.it renders (tools/lib/proto-analytics.mjs) and prerenders the uk/en pages into
docs/proto/<lang>/index.html with the same translation rule the page applies at runtime.
Run after editing anything under docs/proto or templates/_partials/analytics: `npm run build:proto`.
`--check` writes nothing and fails when any of those files is not what a build would make (npm test)."""
import hashlib, json, re, subprocess, sys, os, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'docs', 'proto')
PRE = os.path.join(ROOT, 'tools', 'lib', 'proto-i18n-prerender.mjs')
ANALYTICS = os.path.join(ROOT, 'tools', 'lib', 'proto-analytics.mjs')
SCRIPTS = ['i18n.uk.js', 'i18n.en.js', 'guild-api.js', 'app.js']
CHECK = '--check' in sys.argv[1:]

V = {f: hashlib.sha1(open(f'{P}/{f}', 'rb').read()).hexdigest()[:10] for f in SCRIPTS}
s = open(f'{P}/index.html').read()
s, n = re.subn(r'  const V = \{.*?\};\n', lambda m: f'  const V = {json.dumps(V)};\n', s)
assert n == 1

# the analytics tags, consent loader and bot-link attribution: the ones every nexttick.it page renders
blocks = json.loads(subprocess.run(['node', ANALYTICS], capture_output=True, text=True, check=True).stdout)
def fill(s, tag, body):
    s, n = re.subn(rf'(<!-- {tag}:[^\n]*-->\n).*?(<!-- /{tag} -->)', lambda m: m.group(1) + body + '\n' + m.group(2), s, flags=re.S)
    assert n == 1, tag
    return s
s = fill(s, 'analytics', blocks['head'])
s = fill(s, 'attribution', blocks['body'])

# what differs per language beyond the text: the link preview's own address, locale and picture, the legal
# pages in that language, and the Latin "Cookie" link, which the English pages and the consent banner call "Cookies"
def localise(page, lang):
    subs = [('<meta property="og:url" content="https://nexttick.it/proto/">', f'<meta property="og:url" content="https://nexttick.it/proto/{lang}/">'),
            ('<meta property="og:locale" content="ru_RU">', f'<meta property="og:locale" content="{ {"uk": "uk_UA", "en": "en_US"}[lang] }">'),
            ('content="https://nexttick.it/proto/og-ru.jpg"', f'content="https://nexttick.it/proto/og-{lang}.jpg"')]
    subs += [(f'href="/{doc}/ru.html"', f'href="/{doc}/{lang}.html"') for doc in ('offer', 'privacy', 'consent')]
    if lang == 'en': subs.append(('data-nt-consent-open>Cookie</a>', 'data-nt-consent-open>Cookies</a>'))
    for a, b in subs:
        assert page.count(a) == 1, (lang, a)
        page = page.replace(a, b)
    return page

outputs = {f'{P}/index.html': s}
with tempfile.TemporaryDirectory() as tmp:
    src = os.path.join(tmp, 'index.html')
    open(src, 'w').write(s)
    for lang in ('uk', 'en'):
        out = os.path.join(tmp, f'{lang}.html')
        r = subprocess.run(['node', PRE, src, f'{P}/i18n.{lang}.js', out], capture_output=True, text=True, check=True)
        missing = json.loads(r.stdout)
        assert not missing, (lang, missing)
        page = open(out).read()
        assert page.count('<html lang="ru">') == 1
        outputs[f'{P}/{lang}/index.html'] = localise(page.replace('<html lang="ru">', f'<html lang="{lang}" data-lang="{lang}">'), lang)

if CHECK:
    stale = [os.path.relpath(f, ROOT) for f, text in outputs.items() if open(f).read() != text]
    if stale:
        print('docs/proto is out of date — run `npm run build:proto`: ' + ', '.join(stale))
        sys.exit(1)
    print('PROTO BUILD UP TO DATE')
else:
    for f, text in outputs.items(): open(f, 'w').write(text)
    print(json.dumps(V))
