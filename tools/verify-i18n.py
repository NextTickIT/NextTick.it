#!/usr/bin/env python3
"""i18n verification gate for the BUILT pages/ tree (page-based layout).
Dev tool only, not a build step. Runs: JS syntax check, residue gates,
hreflang/canonical reciprocity, plus the node parity/translated checks.
Usage: python3 tools/verify-i18n.py"""
import re, os, json, subprocess, tempfile, sys

DOMAIN = "https://nexttick.it"
LOCALES = ["ru", "uk", "en"]
# chrome surface -> URL prefix. Home is at the root ("" -> /<loc>.html); the
# others are page-based (/<page>/<loc>.html). Legal (offer/privacy) is covered
# by verify-legal.mjs, not here.
SURFACES = {
    "home": "",
    "swe": "swe/",
    "all": "all/",
    "future-proof": "future-proof/",
    "middle": "middle/",
    "career-resilience": "career-resilience/",
    "ai-speedup-checklist": "ai-speedup-checklist/",
    "ai-speedup-checklist-for-guild-members": "ai-speedup-checklist-for-guild-members/",
}


def surface_file(prefix, loc):
    return f"docs/{prefix}{loc}.html"


def load_stubs():
    outs = []
    for cfg in ("templates/sniff.stubs.json", "templates/legacy.stubs.json"):
        with open(cfg, encoding="utf-8") as fh:
            outs += [o["out"] for o in json.load(fh)["outputs"]]
    return [f"docs/{o}" for o in outs]


fail = []


def check_js(path):
    s = open(path, encoding="utf-8").read()
    for body in re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S):
        if not body.strip():
            continue
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as t:
            t.write(body)
            p = t.name
        r = subprocess.run(["node", "--check", p], capture_output=True, text=True)
        os.unlink(p)
        if r.returncode != 0:
            return r.stderr.splitlines()[0] if r.stderr else "syntax error"
    return None


print("== 1) JS syntax (node --check) ==")
for loc in LOCALES:
    for name, prefix in SURFACES.items():
        f = surface_file(prefix, loc)
        e = check_js(f)
        print(f"  {'OK ' if not e else 'FAIL'} {f}{'' if not e else ' :: ' + e}")
        if e:
            fail.append(f"JS {f}: {e}")
for st in load_stubs():
    e = check_js(st)
    print(f"  {'OK ' if not e else 'FAIL'} (stub) {st}")
    if e:
        fail.append(f"JS stub {st}: {e}")

print("== 2) Residue gates ==")
CYR = re.compile(r'[Ѐ-ӿ]')
RU_ONLY = re.compile(r'[ёъыэЁЪЫЭ]')
# en: zero Cyrillic anywhere on the surfaces + shared roadmap data
for prefix in SURFACES.values():
    f = surface_file(prefix, "en")
    s = open(f, encoding="utf-8").read()
    hits = CYR.findall(s)
    print(f"  {'OK ' if not hits else 'FAIL'} {f}: {len(hits)} Cyrillic chars")
    if hits:
        fail.append(f"en residue {f}: {len(hits)} Cyrillic ({''.join(sorted(set(hits))[:20])})")
f = "docs/roadmap-data.en.js"
s = open(f, encoding="utf-8").read()
hits = CYR.findall(s)
print(f"  {'OK ' if not hits else 'FAIL'} {f}: {len(hits)} Cyrillic")
if hits:
    fail.append(f"en residue {f}: {len(hits)} Cyrillic")
# uk: zero Russian-only letters
for prefix in SURFACES.values():
    f = surface_file(prefix, "uk")
    s = open(f, encoding="utf-8").read()
    hits = RU_ONLY.findall(s)
    print(f"  {'OK ' if not hits else 'FAIL'} {f}: {len(hits)} Russian-only letters")
    if hits:
        fail.append(f"uk residue {f}: {len(hits)} Russian-only ({''.join(sorted(set(hits)))})")
f = "docs/roadmap-data.uk.js"
s = open(f, encoding="utf-8").read()
hits = RU_ONLY.findall(s)
print(f"  {'OK ' if not hits else 'FAIL'} {f}: {len(hits)} Russian-only letters")
if hits:
    fail.append(f"uk residue {f}: {len(hits)} Russian-only")

_WS = re.compile(r'\s+')
def _collapse(x): return _WS.sub(' ', x)

print("== 3) hreflang reciprocity + canonical ==")
for loc in LOCALES:
    for name, prefix in SURFACES.items():
        f = surface_file(prefix, loc)
        s = _collapse(open(f, encoding="utf-8").read())
        need = [f'rel="canonical" href="{DOMAIN}/{prefix}{loc}.html"'] + [
            f'hreflang="{l}" href="{DOMAIN}/{prefix}{l}.html"' for l in ["uk", "en", "ru"]
        ] + [f'hreflang="x-default" href="{DOMAIN}/{prefix}uk.html"']
        missing = [n for n in need if _collapse(n) not in s]
        print(f"  {'OK ' if not missing else 'FAIL'} {f}")
        if missing:
            fail.append(f"hreflang/canonical {f}: missing {missing}")

print("== 4) node parity + translated checks ==")
for script in ["tools/verify-parity.mjs", "tools/verify-translated.mjs"]:
    r = subprocess.run(["node", script], capture_output=True, text=True)
    print(r.stdout.rstrip())
    if r.returncode != 0:
        fail.append(f"{script} failed")
        print(r.stderr.rstrip())

print("\n" + ("ALL GATES PASS ✅" if not fail else f"GATES FAILED ❌ ({len(fail)}):"))
for x in fail:
    print("  -", x)
sys.exit(0 if not fail else 1)
