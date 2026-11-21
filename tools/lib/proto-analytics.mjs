// Render the analytics blocks for the prototype page (docs/proto) with the same Eta setup and partials as
// tools/build.mjs, and the home page's analytics flags (templates/index.page.json), so the prototype carries
// exactly the tags, consent loader and bot-link attribution nexttick.it does. Called by tools/build-proto.py.
// usage: node proto-analytics.mjs → prints {"head": "...", "body": "..."}
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEMPLATES = join(ROOT, "templates");
const eta = new Eta({ views: TEMPLATES, autoEscape: true, useWith: true, cache: false });
const { analytics } = JSON.parse(readFileSync(join(TEMPLATES, "index.page.json"), "utf8"));

// the same conditions and order as the <head> and the end of <body> in templates/index.html
const HEAD = `<% if (analytics.gtm || analytics.ga4) { %><%~ include("_partials/analytics/partytown.html") %><% } %>
<% if (analytics.gtm) { %><%~ include("_partials/analytics/gtm.html") %><% } %>
<% if (analytics.clarity) { %><%~ include("_partials/analytics/clarity.html") %><% } %>
<% if (analytics.ga4) { %><%~ include("_partials/analytics/ga4.html") %><% } %>
<% if (analytics.pixel) { %><%~ include("_partials/analytics/pixel.html") %><% } %>
<%~ include("_partials/analytics/consent.html", { analytics }) %>`;
const BODY = `<% if (analytics.attribution) { %><%~ include("_partials/analytics/attribution.html") %><% } %>`;

const render = (t) => eta.renderString(t, { analytics }).replace(/\n{2,}/g, "\n").trim();
console.log(JSON.stringify({ head: render(HEAD), body: render(BODY) }));
