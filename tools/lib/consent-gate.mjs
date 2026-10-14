// Shared oracle for the cookie-consent gate (Privacy Policy §10): every
// analytics / advertising <script> on a built page must ship as
//   <script type="text/plain" data-consent="analytics" [data-type="…"]>
// so the browser neither fetches nor runs it until assets/nt-consent.js clones
// it after the visitor accepts. Used by verify-attribution (chrome pages) and
// verify-legal (offer/privacy/consent) so both agree on what "gated" means.

// Loader signatures only. First-party code that merely CALLS a tag when present
// (`if (typeof window.gtag === "function") gtag("event", …)`) loads nothing and
// stays ungated by design.
const ANALYTICS_MARK =
  /fbevents\.js|googletagmanager\.com|clarity\.ms|\bgtag\(\s*["']config["']|\bfbq\(\s*["']init["']|GTM-[A-Z0-9]+|"clarity",\s*"script"/;

export const CONSENT_ASSET = "/assets/nt-consent.js";

/** Open tags + bodies of every analytics <script> that is NOT consent-gated. */
export function ungatedAnalyticsScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1].replace(/\s+/g, " ");
    const body = m[2];
    if (!ANALYTICS_MARK.test(attrs) && !ANALYTICS_MARK.test(body)) continue;
    // The consent manager itself and Partytown's loader are first-party and
    // carry no tracking; only the tags they gate must be text/plain.
    if (/nt-consent\.js/.test(attrs)) continue;
    const gated =
      /\btype="text\/plain"/.test(attrs) &&
      /\bdata-consent="analytics"/.test(attrs);
    if (!gated) out.push(`<script${m[1].replace(/\s+/g, " ").slice(0, 90)}>`);
  }
  return out;
}

// Hosts that mean "tracking happens". Anything referencing them OUTSIDE a gated
// <script> — a <noscript> iframe/img, a <link rel=preconnect>, an <img> beacon —
// runs or handshakes before consent can be asked and is a leak.
const TRACKER_HOST =
  /googletagmanager\.com|google-analytics\.com|clarity\.ms|connect\.facebook\.net|facebook\.com\/tr\b|app\.nexttick\.it\/api\/pageview/i;

/** A <noscript> fallback (Pixel <img>, GTM <iframe>) fires with no way to ask first. */
export function hasNoscriptTracker(html) {
  const re = /<noscript[\s\S]*?<\/noscript>/gi;
  let m;
  while ((m = re.exec(html))) if (TRACKER_HOST.test(m[0])) return true;
  return false;
}

/** Tracker hosts referenced anywhere except inside a consent-gated <script>. */
export function trackerLeaks(html) {
  const stripped = html.replace(
    /<script\b[^>]*\btype="text\/plain"[^>]*\bdata-consent="analytics"[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  const out = [];
  const re = new RegExp(TRACKER_HOST.source, "gi");
  let m;
  while ((m = re.exec(stripped))) {
    const start = Math.max(0, m.index - 60);
    out.push(
      stripped.slice(start, m.index + m[0].length + 20).replace(/\s+/g, " "),
    );
  }
  return out;
}
