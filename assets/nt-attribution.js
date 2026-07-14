// nt-attribution.js — appends Meta ads attribution params to SendPulse bot CTAs.
//
// Loaded before </body> on pages that link to the Telegram bot. Degrades
// gracefully: if this file fails to load, CTAs keep their static start= +
// source_channel= from the HTML (only the Meta params are lost).
//
// Field partition:
//   first-touch persisted (localStorage nt_attribution): utm_*, campaign_id,
//     adset_id, ad_id, placement, site_source_name, fbclid
//   live per-click (never persisted): source_channel (read from the link's own
//     href, default 'website'), fbp, fbc, landing_path, landing_lang, last_touch_at
//   start=69ce57941f15eb55e90ea47a is always preserved.
(function () {
  "use strict";
  var BOT = 'a[href*="tg.pulse.is/next_tick_bot"]';
  var START = "69ce57941f15eb55e90ea47a";
  var K_CLICK = "nt_click_id",
    K_FT = "nt_first_touch_at",
    K_ATTR = "nt_attribution";
  var PERSIST = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "campaign_id",
    "adset_id",
    "ad_id",
    "placement",
    "site_source_name",
    "fbclid",
  ];

  var qs = new URLSearchParams(location.search);

  // localStorage guarded — Safari private mode throws on read/write.
  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  }
  function uuid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return "nt_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }
  function cookie(n) {
    var m = document.cookie.split("; ").find(function (r) {
      return r.indexOf(n + "=") === 0;
    });
    return m ? m.slice(n.length + 1) : "";
  }
  function setCookie(n, v, d) {
    document.cookie =
      n +
      "=" +
      encodeURIComponent(v) +
      "; path=/; max-age=" +
      d * 86400 +
      "; SameSite=Lax";
  }

  function persistOnce(key, make) {
    var v = lsGet(key);
    if (!v) {
      v = make();
      lsSet(key, v);
    }
    return v;
  }
  var clickId = persistOnce(K_CLICK, uuid);
  var firstTouch = persistOnce(K_FT, function () {
    return new Date().toISOString();
  });

  var attr = (function () {
    try {
      return JSON.parse(lsGet(K_ATTR) || "{}");
    } catch (e) {
      return {};
    }
  })();
  var incoming = {};
  PERSIST.forEach(function (k) {
    var v = qs.get(k);
    if (v) incoming[k] = v;
  });
  if (Object.keys(incoming).length) {
    attr = Object.assign({}, attr, incoming);
    lsSet(K_ATTR, JSON.stringify(attr));
  }

  // Synthesize _fbc from fbclid ONLY when the cookie is absent — never
  // overwrite the cookie the Meta Pixel itself sets (keeps CAPI dedup intact).
  var fbclid = attr.fbclid || qs.get("fbclid") || "";
  if (!cookie("_fbc") && fbclid) {
    setCookie("_fbc", "fb.1." + Date.now() + "." + fbclid, 90);
  }

  function landingLang() {
    var seg = location.pathname.split("/").filter(Boolean)[0];
    return seg || document.documentElement.lang || "uk";
  }

  function patch(link) {
    var url;
    try {
      url = new URL(link.href); // URL API decodes &amp; on DOM read
    } catch (e) {
      return;
    }
    // Keep the link's own start code (pages may use different SendPulse flows);
    // default it in only if the link somehow lacks one.
    if (!url.searchParams.get("start")) url.searchParams.set("start", START);
    // source_channel: a ?utm_source (or ?utm) on the landing URL OVERRIDES the
    // channel — this restores the pre-refactor index behavior (utm_source swap).
    // Otherwise keep the link's own value (e.g. 'conf' / 'website:all'), defaulting
    // to 'website' only if absent.
    var utmChannel =
      qs.get("utm_source") || qs.get("utm") || attr.utm_source;
    if (utmChannel) {
      url.searchParams.set("source_channel", utmChannel);
    } else if (!url.searchParams.get("source_channel")) {
      url.searchParams.set("source_channel", "website");
    }
    PERSIST.forEach(function (k) {
      if (attr[k]) url.searchParams.set(k, attr[k]);
    });
    var live = {
      nt_click_id: clickId,
      fbp: cookie("_fbp"),
      fbc: cookie("_fbc"),
      landing_path: location.pathname,
      landing_lang: landingLang(),
      first_touch_at: firstTouch,
      last_touch_at: new Date().toISOString(),
    };
    Object.keys(live).forEach(function (k) {
      if (live[k]) url.searchParams.set(k, live[k]);
    });
    link.href = url.toString(); // idempotent: set() re-read from the live href
  }

  // In-app / mobile WebViews (Telegram, Instagram, Facebook, …) frequently do
  // NOT act on a target="_blank" tap — the bot CTA looks dead / "not followed".
  // On those, force the link to open in the SAME view by dropping target, so the
  // SendPulse → Telegram deep link actually fires. Desktop keeps its new tab
  // (target left intact there), so there is no regression for working browsers.
  var IN_APP =
    /Android|iPhone|iPad|iPod|Mobile|Telegram|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|OKApp|VKClient/i.test(
      navigator.userAgent || "",
    );
  function sameView(link) {
    if (IN_APP && link.getAttribute("target")) link.removeAttribute("target");
  }

  // best-effort at load
  document.querySelectorAll(BOT).forEach(function (l) {
    patch(l);
    sameView(l);
  });
  // Authoritative: capture-phase delegation survives render() re-injecting CTAs.
  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest && e.target.closest(BOT);
      if (link) {
        patch(link);
        sameView(link);
      }
    },
    true,
  );
})();
