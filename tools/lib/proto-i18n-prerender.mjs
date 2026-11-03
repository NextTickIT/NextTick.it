// Pre-translate the prototype page: same unit rule as translateStatic() in app.js, run at build time.
// usage: node proto-i18n-prerender.mjs <page.html> <i18n.<lang>.js> <out.html>  → prints missing keys
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parse } = require("node-html-parser");
const [page, dictFile, out] = process.argv.slice(2);
const sandbox = { window: {} };
new Function("window", readFileSync(dictFile, "utf8"))(sandbox.window);
const I18N = sandbox.window.I18N;
const CYR = /[А-Яа-яЁё]/, norm = (s) => s.replace(/\s+/g, " ").trim();
const missing = [];
const t = (s) => (s in I18N ? I18N[s] : (missing.push(s), s));
const root = parse(readFileSync(page, "utf8"), { comment: true, blockTextElements: { script: true, style: true } });
function walk(el) {
  if (el.nodeType !== 1) return;
  if (el.hasAttribute?.("data-i18n-skip")) return;
  for (const a of ["placeholder", "aria-label", "title", "alt", "content"]) { const v = el.getAttribute?.(a); if (v && CYR.test(v)) el.setAttribute(a, t(norm(v))); }
  if (el.childNodes.some((n) => n.nodeType === 3 && CYR.test(n.rawText))) { el.set_content(t(norm(el.innerHTML))); return; }
  for (const c of el.childNodes) if (c.nodeType === 1 && !["SCRIPT", "STYLE", "SVG"].includes(c.tagName)) walk(c);
}
walk(root.querySelector("head")); walk(root.querySelector("body"));
writeFileSync(out, root.toString());
console.log(JSON.stringify(missing));
