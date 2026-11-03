#!/usr/bin/env python3
"""Build step for the guild prototype at docs/proto: rewrites the V hash table in index.html
(sha1[:10] of every script the page loads, used as ?v= cache busters) and prerenders the
uk/en pages into docs/proto/<lang>/index.html with the same translation rule the page
applies at runtime. Run after editing anything under docs/proto: `npm run build:proto`."""
import hashlib, json, re, subprocess, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'docs', 'proto')
PRE = os.path.join(ROOT, 'tools', 'lib', 'proto-i18n-prerender.mjs')
SCRIPTS = [f'roadmap-data.{l}.js' for l in ('ru', 'uk', 'en')] + ['i18n.uk.js', 'i18n.en.js', 'guild-api.js', 'app.js']
V = {f: hashlib.sha1(open(f'{P}/{f}', 'rb').read()).hexdigest()[:10] for f in SCRIPTS}
s = open(f'{P}/index.html').read()
s, n = re.subn(r'  const V = \{.*?\};\n', lambda m: f'  const V = {json.dumps(V)};\n', s)
assert n == 1
open(f'{P}/index.html', 'w').write(s)
for lang in ('uk', 'en'):
    out = f'{P}/{lang}/index.html'
    r = subprocess.run(['node', PRE, f'{P}/index.html', f'{P}/i18n.{lang}.js', out], capture_output=True, text=True, check=True)
    missing = json.loads(r.stdout)
    assert not missing, (lang, missing)
    page = open(out).read()
    assert page.count('<html lang="ru">') == 1
    open(out, 'w').write(page.replace('<html lang="ru">', f'<html lang="{lang}" data-lang="{lang}">'))
print(json.dumps(V))
