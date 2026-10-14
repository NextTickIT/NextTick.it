// nt-consent.js — cookie consent for the optional analytics / advertising tags.
//
// Privacy Policy §10 (uk/ru/en) promises that Google Analytics / GTM, Microsoft
// Clarity and Meta Pixel start ONLY after a prior, explicit, revocable choice,
// and that refusing is no harder than accepting. This file is that mechanism:
//
//   • Every analytics tag ships as <script type="text/plain" data-consent=
//     "analytics"> (optionally data-type="text/partytown" | "text/javascript").
//     A text/plain script is never fetched or executed by the browser, so until
//     consent is granted no third-party request leaves the page.
//   • On "accept" (now, or on any later page view where the stored choice is
//     "granted") each gated tag is cloned into a live <script> with its real
//     type, in document order. Partytown picks up the text/partytown clones
//     through its MutationObserver; the main-thread ones run at once. A
//     "nt-consent" event on document tells first-party code (nt-attribution.js)
//     that it may now persist ad identifiers.
//   • The choice is stored in localStorage (nt_consent) with a strictly-
//     necessary first-party cookie of the same name as the fallback for browsers
//     where localStorage throws or is wiped (Safari private mode). It is never
//     re-asked while valid. Bump VERSION when the set of tools changes
//     materially, which re-prompts everyone.
//   • A [data-nt-consent-open] element (the "Cookie" footer link) reopens the
//     banner. Declining always deletes the first-party cookies and localStorage
//     keys those tools set; if tags were already running on this page it also
//     reloads so they stop.
//
// Loaded with `defer` from <head>, so it runs after the gated tags are in the
// DOM and before DOMContentLoaded (which is when Partytown scans the page).
(function () {
  "use strict";
  var KEY = "nt_consent";
  var VERSION = 1;
  var SEL = 'script[type="text/plain"][data-consent="analytics"]';
  // Cookies set by the gated tags (GA4/GTM, Meta Pixel, Clarity) and by the
  // first-party attribution / CAPI code once consent was granted.
  var COOKIE_RE = /^(_ga|_gid|_gat|_gcl|_fbp|_fbc|_clck|_clsk|nt_uid)/;
  var LS_KEYS = ["nt_attribution", "nt_click_id", "nt_first_touch_at"];

  var T = {
    uk: {
      text: "Цей сайт використовує cookie для аналітики та реклами — Google Analytics, Microsoft Clarity і Meta Pixel. Ми вмикаємо їх лише з твоєї згоди. Вибір можна змінити будь-коли за посиланням «Cookie» внизу сторінки.",
      link: "Політика конфіденційності",
      accept: "Прийняти",
      decline: "Відхилити",
      label: "Згода на cookie",
    },
    ru: {
      text: "Этот сайт использует cookie для аналитики и рекламы — Google Analytics, Microsoft Clarity и Meta Pixel. Мы включаем их только с твоего согласия. Выбор можно изменить в любой момент по ссылке «Cookie» внизу страницы.",
      link: "Политика конфиденциальности",
      accept: "Принять",
      decline: "Отклонить",
      label: "Согласие на cookie",
    },
    en: {
      text: "This site uses cookies for analytics and advertising — Google Analytics, Microsoft Clarity and Meta Pixel. We turn them on only with your consent. You can change your choice at any time via the “Cookies” link at the bottom of the page.",
      link: "Privacy Policy",
      accept: "Accept",
      decline: "Decline",
      label: "Cookie consent",
    },
  };

  // Both buttons share one style on purpose: refusing must look and cost exactly
  // the same as accepting (Privacy Policy §10.3–10.4).
  var CSS =
    ".nt-consent{--nc-bg:#15191c;--nc-line:#3a444c;--nc-text:#d6d8da;--nc-accent:#7ee787;" +
    "position:fixed;left:0;right:0;bottom:0;z-index:2147483000;padding:0 16px calc(12px + env(safe-area-inset-bottom));" +
    "font-family:var(--mono,'JetBrains Mono',ui-monospace,Menlo,monospace);font-size:12px;line-height:1.55;color:var(--nc-text)}" +
    "[data-theme=light] .nt-consent{--nc-bg:#f0f3f6;--nc-line:#b6bfc8;--nc-text:#1f2328;--nc-accent:#1a7f37}" +
    ".nt-consent[hidden]{display:none}" +
    ".nt-consent__inner{max-width:960px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;padding:14px 18px;" +
    "background:var(--nc-bg);border:1px solid var(--nc-line);box-shadow:0 12px 40px rgba(0,0,0,.35)}" +
    ".nt-consent__text{flex:1 1 420px;margin:0}" +
    ".nt-consent__text a{color:var(--nc-text);text-decoration:underline;text-underline-offset:2px}" +
    ".nt-consent__text a:hover{color:var(--nc-accent)}" +
    ".nt-consent__actions{display:flex;gap:8px;flex:0 0 auto;margin-left:auto}" +
    ".nt-consent__btn{appearance:none;cursor:pointer;min-height:40px;min-width:120px;padding:8px 18px;border:1px solid var(--nc-text);" +
    "background:transparent;color:var(--nc-text);font:inherit;font-weight:700;transition:border-color .15s,color .15s}" +
    ".nt-consent__btn:hover{border-color:var(--nc-accent);color:var(--nc-accent)}" +
    ".nt-consent__btn:focus-visible{outline:2px solid var(--nc-accent);outline-offset:2px}" +
    "@media (max-width:560px){.nt-consent{padding-left:8px;padding-right:8px}.nt-consent__actions{margin-left:0;width:100%}.nt-consent__btn{flex:1 1 0;min-width:0}}";

  var lang = (document.documentElement.getAttribute("lang") || "").slice(0, 2);
  var t = T[lang] || T.en;
  var loc = T[lang] ? lang : "en";

  function readCookie(name) {
    var m = document.cookie.split("; ").find(function (r) {
      return r.indexOf(name + "=") === 0;
    });
    return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
  }
  // Stored choice: {v, analytics, at} in localStorage, or "<v>:<0|1>" in the
  // fallback cookie. Returns null when nothing valid for VERSION is stored.
  function getChoice() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && v.v === VERSION && typeof v.analytics === "boolean") return v;
    } catch (e) {}
    var c = readCookie(KEY).split(":");
    if (
      c.length === 2 &&
      Number(c[0]) === VERSION &&
      (c[1] === "0" || c[1] === "1")
    ) {
      return { v: VERSION, analytics: c[1] === "1", at: null };
    }
    return null;
  }
  function setChoice(analytics) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          v: VERSION,
          analytics: analytics,
          at: new Date().toISOString(),
        }),
      );
    } catch (e) {}
    try {
      document.cookie =
        KEY +
        "=" +
        VERSION +
        ":" +
        (analytics ? "1" : "0") +
        "; path=/; max-age=31536000; SameSite=Lax";
    } catch (e) {}
  }
  function granted() {
    var c = getChoice();
    return !!(c && c.analytics);
  }

  var activated = false;
  function activate() {
    if (activated) return;
    activated = true;
    var nodes = document.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var s = document.createElement("script");
      var type = n.getAttribute("data-type");
      if (type) s.type = type;
      var src = n.getAttribute("src");
      if (src) s.src = src;
      else s.text = n.text;
      n.setAttribute("data-consent", "activated");
      n.parentNode.insertBefore(s, n.nextSibling);
    }
    document.documentElement.setAttribute("data-consent", "granted");
    try {
      document.dispatchEvent(
        new CustomEvent("nt-consent", { detail: { analytics: true } }),
      );
    } catch (e) {}
  }

  function clearTracking() {
    var names = document.cookie.split(";");
    var host = location.hostname;
    var domains = ["", host, "." + host];
    var parts = host.split(".");
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    for (var i = 0; i < names.length; i++) {
      var name = names[i].split("=")[0].replace(/^\s+/, "");
      if (!COOKIE_RE.test(name)) continue;
      for (var d = 0; d < domains.length; d++) {
        document.cookie =
          name +
          "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" +
          (domains[d] ? "; domain=" + domains[d] : "");
      }
    }
    for (var k = 0; k < LS_KEYS.length; k++) {
      try {
        localStorage.removeItem(LS_KEYS[k]);
      } catch (e) {}
    }
  }

  var banner = null;
  function build() {
    if (banner) return banner;
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    banner = document.createElement("div");
    banner.className = "nt-consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", t.label);

    var inner = document.createElement("div");
    inner.className = "nt-consent__inner";

    var p = document.createElement("p");
    p.className = "nt-consent__text";
    p.appendChild(document.createTextNode(t.text + " "));
    var a = document.createElement("a");
    a.href = "/privacy/" + loc + ".html";
    a.textContent = t.link;
    p.appendChild(a);

    var actions = document.createElement("div");
    actions.className = "nt-consent__actions";
    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "nt-consent__btn nt-consent__btn--accept";
    accept.textContent = t.accept;
    var decline = document.createElement("button");
    decline.type = "button";
    decline.className = "nt-consent__btn nt-consent__btn--decline";
    decline.textContent = t.decline;
    accept.addEventListener("click", onAccept);
    decline.addEventListener("click", onDecline);
    actions.appendChild(accept);
    actions.appendChild(decline);

    inner.appendChild(p);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
    return banner;
  }
  function show() {
    build().hidden = false;
  }
  function hide() {
    if (banner) banner.hidden = true;
  }
  function onAccept() {
    setChoice(true);
    hide();
    activate();
  }
  function onDecline() {
    setChoice(false);
    hide();
    // Always drop what the tags (or an earlier, pre-consent build) left behind.
    clearTracking();
    // Tags already running on this page cannot be unloaded: reload so the gated
    // scripts stay inert on the next view.
    if (activated) location.reload();
  }

  function init() {
    var saved = getChoice();
    if (saved && saved.analytics) activate();
    else if (!saved) show();
    document.addEventListener("click", function (e) {
      var el =
        e.target &&
        e.target.closest &&
        e.target.closest("[data-nt-consent-open]");
      if (!el) return;
      e.preventDefault();
      show();
    });
  }

  window.ntConsent = {
    open: show,
    accept: onAccept,
    decline: onDecline,
    get: getChoice,
    granted: granted,
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
