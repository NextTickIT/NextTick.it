// Render the analytics blocks for the landing (templates/landing.html) with the same Eta setup and partials as
// tools/build.mjs renders the other pages with, so the landing carries exactly the tags, consent loader and
// bot-link attribution they do. Called by tools/build-landing.py.
// usage: node landing-analytics.mjs → prints {"head": "...", "body": "..."}
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEMPLATES = join(ROOT, "templates");
const eta = new Eta({ views: TEMPLATES, autoEscape: true, useWith: true, cache: false });
// the landing's flags; the conditions and order below are the ones the templated pages use
const analytics = { gtm: true, ga4: true, clarity: true, pixel: true, attribution: "website" };
const HEAD = `<% if (analytics.gtm || analytics.ga4) { %><%~ include("_partials/analytics/partytown.html") %><% } %>
<% if (analytics.gtm) { %><%~ include("_partials/analytics/gtm.html") %><% } %>
<% if (analytics.clarity) { %><%~ include("_partials/analytics/clarity.html") %><% } %>
<% if (analytics.ga4) { %><%~ include("_partials/analytics/ga4.html") %><% } %>
<% if (analytics.pixel) { %><%~ include("_partials/analytics/pixel.html") %><% } %>
<%~ include("_partials/analytics/consent.html", { analytics }) %>`;
const BODY = `<% if (analytics.attribution) { %><%~ include("_partials/analytics/attribution.html") %><% } %>`;

const render = (t) => eta.renderString(t, { analytics }).replace(/\n{2,}/g, "\n").trim();
console.log(JSON.stringify({ head: render(HEAD), body: render(BODY) }));
