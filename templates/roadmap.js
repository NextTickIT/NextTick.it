
      const R = window.ROADMAP;

      // Push CTA clicks to dataLayer for GTM — distinguishes header vs subscribe CTA.
      (function () {
        const locations = { "join-btn": "header", "join-btn-2": "subscribe" };
        window.dataLayer = window.dataLayer || [];
        document.querySelectorAll("#join-btn, #join-btn-2").forEach((btn) => {
          btn.addEventListener("click", () => {
            dataLayer.push({
              event: "cta_click",
              cta_location: locations[btn.id] || btn.id,
              cta_text: btn.textContent.trim().replace(/\s+/g, " "),
              time_level: document.body.dataset.timeLevel || "",
              link_url: btn.href,
            });
          });
        });
      })();

      document.getElementById("lede-sub").innerHTML =
        '<%~ render.c0 %></span>.';
      // (overwritten by time-level picker below — leaving as initial fallback)

      // ── Derived counters / labels ────────────────────────────────────
      const totalEps = R.episodes.length;
      const trackNames = R.tracks
        .map((t) => t.shortName.toLowerCase())
        .join(" · ");

      // (kicker-bar removed — hidden in markup)

      // Tracks matrix: horizon row-headers (left) × 3 track columns
      const tg = document.getElementById("tracks-grid");
      let tgHtml = `<div class="tg-corner"><%~ render.c1 %> →</div>`;
      tgHtml += R.tracks
        .map(
          (t) => `
    <div class="tcol-head" data-track="${t.id}">
      <span class="code">${t.code} / 03</span>
      <div class="accent">// ${t.kicker}</div>
      <div class="name">${t.name}</div>
      <div class="summary">${t.summary}</div>
    </div>
  `,
        )
        .join("");
      R.horizons.forEach((h) => {
        tgHtml += `
      <div class="h-rowhead">
        <span class="code">${h.code}</span>
        <span class="label">${h.label}</span>
        <span class="range">${h.range}</span>
        <span class="hint">${h.hint}</span>
      </div>
      ${R.tracks.map((t) => `<div class="cell" data-track="${t.id}">${t.benefits[h.id]}</div>`).join("")}
    `;
      });
      tg.innerHTML = tgHtml;

      // Mobile stacked version: track cards, then a section per horizon with
      // each track's benefit labelled by track (horizon labels appear once).
      const tgm = document.getElementById("tracks-mobile");
      let tgmHtml = `<div class="tm-cards">`;
      tgmHtml += R.tracks
        .map(
          (t) => `
    <div class="tm-card" data-track="${t.id}">
      <span class="code">${t.code} / 03</span>
      <div class="accent">// ${t.kicker}</div>
      <div class="name">${t.name}</div>
      <div class="summary">${t.summary}</div>
    </div>
  `,
        )
        .join("");
      tgmHtml += `</div>`;
      R.horizons.forEach((h) => {
        tgmHtml += `
      <div class="tm-hz">
        <div class="tm-hz-head">
          <span class="code">${h.code}</span>
          <span class="label">${h.label}</span>
          <span class="range">${h.range}</span>
        </div>
        ${R.tracks
          .map(
            (t) => `
          <div class="tm-row" data-track="${t.id}">
            <span class="tm-tk">${t.shortName}</span>
            <div class="tm-benefit">${t.benefits[h.id]}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
      });
      tgm.innerHTML = tgmHtml;

      // ─── Timeline: 10 months × 4 weeks = 40 weekly cells ───────────────
      // Episode duration: deterministic 8–22 min per episode id.
      const epMins = (ep) => {
        let h = 0;
        for (let i = 0; i < ep.id.length; i++)
          h = (h * 31 + ep.id.charCodeAt(i)) | 0;
        return 8 + (Math.abs(h) % 15);
      };

      const WEEKS = 40;
      const TRACK_IDS = R.tracks.map((t) => t.id);
      // Per-track week offset (first episode sits on this week; 1 = no offset).
      const trackOffset = (tid) => (R.trackStartWeek?.[tid] ?? 1) - 1;
      // Compute the global week index for each episode: month order + track offset.
      const epWeek = new Map();
      R.series.forEach((s) => {
        const off = trackOffset(s.track);
        s.episodes.forEach((ep, idx) => {
          const w = (s.month - 1) * 4 + (idx + 1) + off;
          epWeek.set(ep.id, w);
        });
      });

      // nowWeek = marker position on the 1..40 scale (a column boundary of N means the
      // start of week N+1); nextWeek = the week currently airing. Anchored to a real date
      // (seasonStart = Monday of week 1) so on Monday the marker sits at the very start of
      // the current week's cell and slides across it as the week progresses, stepping to
      // the next column each week. Falls back to the static nowMonth if no/invalid date.
      const { nowWeek, nextWeek } = (() => {
        const start = R.seasonStart
          ? new Date(R.seasonStart + "T00:00:00")
          : null;
        if (start && !isNaN(start)) {
          const elapsed = (Date.now() - start.getTime()) / (7 * 864e5); // fractional weeks since week 1
          const pos = Math.min(WEEKS, Math.max(0, elapsed));
          return {
            nowWeek: pos,
            nextWeek: Math.min(WEEKS, Math.floor(pos) + 1),
          };
        }
        const pos = (R.nowMonth ?? 1) * 4;
        return { nowWeek: pos, nextWeek: Math.ceil(pos) };
      })();

      // Planning horizon: content visible only ~3 months (12 weeks) ahead of now.
      // Beyond that — fog + a hard scroll stop.
      const HORIZON_WEEKS = 12;
      const horizonWeek = nowWeek + HORIZON_WEEKS; // ~17.6
      const FOG_BAND = 3; // weeks of visible fade past horizon
      // A cell is locked once its week passes the horizon.
      const isLocked = (w) => w > horizonWeek;
      // Fog opacity for cells inside the fade band (1 = clear, →0 = fogged out).
      const fogClarity = (w) => {
        if (w <= horizonWeek) return 1;
        const d = w - horizonWeek;
        return Math.max(0, 1 - d / FOG_BAND);
      };

      const tl = document.getElementById("timeline");
      let html = "";

      // Row 1: month band — just month numbers (theme moved into per-track series headers below)
      html += `<div class="mo-cell lbl"><%~ render.c2 %> →</div>`;
      R.months.forEach((m) => {
        const startCol = 2 + (m.num - 1) * 4;
        html += `<div class="mo-cell" style="grid-column: ${startCol} / span 4;">
      <span class="mn">M${String(m.num).padStart(2, "0")}</span>
      <span class="mn-tag">${m.label.toLowerCase()}</span>
    </div>`;
      });

      // Row 2: week axis
      html += `<div class="wk-cell lbl"><%~ render.c3 %> →</div>`;
      for (let w = 1; w <= WEEKS; w++) {
        const isBoundary = w % 4 === 0; // last week of a month
        html += `<div class="wk-cell ${isBoundary ? "boundary" : ""}">
      <span class="wn">w${String(w).padStart(2, "0")}</span>
    </div>`;
      }

      // For each track: row-lbl (spans 2 rows) + 10 series-header cells + 40 episode cells
      R.tracks.forEach((t, ti) => {
        const last = ti === R.tracks.length - 1;
        html += `<div class="row-lbl ${last ? "last" : ""}" data-track="${t.id}">
      <span class="rc">${t.code} ·</span>
      <span class="rn">${t.shortName.toLowerCase()}</span>
      <span class="rs">${t.kicker}</span>
    </div>`;

        // Series headers — offset-aware. A leading "<%~ render.c4 %>…" spacer covers the
        // weeks before the track starts; then one header per series-month, each
        // spanning up to 4 week-columns, clipped at the 40-week edge.
        const off = trackOffset(t.id);
        let weeksUsed = 0;
        if (off > 0) {
          const span = Math.min(off, WEEKS);
          const clarity = fogClarity(span); // judged at its right edge
          const fogStyle =
            clarity < 1
              ? ` opacity:${Math.max(0.12, clarity).toFixed(3)};`
              : "";
          html += `<div class="ser-cell boundary" data-track="${t.id}" data-empty="true" style="grid-column: span ${span};${fogStyle}">
        <span class="m-num">w01</span>
        <span class="s-name"><%~ render.c5 %>…</span>
      </div>`;
          weeksUsed += span;
        }
        const tSeries = R.series
          .filter((x) => x.track === t.id)
          .sort((a, b) => a.month - b.month);
        for (const s of tSeries) {
          if (weeksUsed >= WEEKS) break;
          const span = Math.min(4, WEEKS - weeksUsed);
          const startW = weeksUsed + 1;
          const clarity = fogClarity(startW);
          const locked = startW > horizonWeek;
          const fogStyle =
            clarity < 1
              ? ` opacity:${Math.max(0.12, clarity).toFixed(3)};`
              : "";
          const lockAttr = locked ? ' data-locked="true"' : "";
          html += `<div class="ser-cell boundary" data-track="${t.id}"${lockAttr} style="grid-column: span ${span};${fogStyle}">
        <span class="m-num">M${String(s.month).padStart(2, "0")}</span>
        <span class="s-name">${s.name}</span>
      </div>`;
          weeksUsed += span;
        }
        // Pad the series-header row to the full 40 columns so episode cells flow
        // into the next grid row instead of leaking into unused header columns.
        if (weeksUsed < WEEKS) {
          html += `<div class="ser-cell" data-track="${t.id}" data-empty="true" style="grid-column: span ${WEEKS - weeksUsed};"></div>`;
        }

        // Episode cells — 40 weeks
        for (let w = 1; w <= WEEKS; w++) {
          const isBoundary = w % 4 === 0;
          const ep = R.episodes.find(
            (e) => e.track === t.id && epWeek.get(e.id) === w,
          );
          let state = "future";
          if (w < nextWeek) state = "released";
          else if (w === nextWeek) state = "next";

          const lastRowCls = last ? "last-row" : "";
          const boundCls = isBoundary ? "boundary" : "";
          const locked = isLocked(w);
          const clarity = fogClarity(w);
          const fogStyle =
            clarity < 1 ? ` style="opacity:${clarity.toFixed(3)}"` : "";
          const lockAttr = locked ? ' data-locked="true"' : "";
          if (ep) {
            html += `<div class="tl-cell ${lastRowCls} ${boundCls}"${lockAttr}>
          <div class="ep" data-track="${t.id}" data-state="${state}" data-ep="${ep.id}"${locked ? ' data-locked="true"' : ""}${fogStyle}>
            <div class="h">
              <span class="num">#${ep.num}</span>
            </div>
            <div class="ttl">${ep.title}</div>
          </div>
        </div>`;
          } else {
            html += `<div class="tl-cell ${lastRowCls} ${boundCls}"${lockAttr}></div>`;
          }
        }
      });
      tl.innerHTML = html;

      // Now marker — positioned inside .tl-grid using its CSS variables.
      const tlScroll = document.getElementById("tl-scroll");
      const labelW = parseFloat(
        getComputedStyle(tl).getPropertyValue("--label-w"),
      );
      const cellW = parseFloat(
        getComputedStyle(tl).getPropertyValue("--cell-w"),
      );
      const totalW = labelW + WEEKS * cellW;
      const horizonX = labelW + horizonWeek * cellW;

      // The "known world" ends a little past the horizon — drop the 40-week frame.
      const VIS_WEEKS = Math.min(WEEKS, Math.ceil(horizonWeek + FOG_BAND)); // ≈ 21
      const visExtentX = labelW + VIS_WEEKS * cellW;
      const VIS_MONTHS = Math.min(R.months.length, Math.ceil(VIS_WEEKS / 4));

      // Fog overlay: gradient from transparent (at horizon) to solid bg, covering
      // everything to the right. Scrolls with the grid.
      const fog = document.createElement("div");
      fog.className = "tl-fog";
      fog.style.left = horizonX + "px";
      fog.style.width = totalW - horizonX + "px";
      tl.appendChild(fog);

      // Horizon marker line + label.
      const horizonMarker = document.createElement("div");
      horizonMarker.className = "horizon-line";
      horizonMarker.style.left = horizonX + "px";
      tl.appendChild(horizonMarker);
      const horizonLabel = document.createElement("div");
      horizonLabel.className = "horizon-lbl";
      horizonLabel.innerHTML =
        "<%~ render.c6 %></span>";
      horizonLabel.style.left = horizonX + "px";
      tl.appendChild(horizonLabel);

      // Hard scroll stop: viewport right edge may reach horizon + a small reveal.
      const FOG_REVEAL = 150;
      function maxScroll() {
        return Math.max(0, horizonX + FOG_REVEAL - tlScroll.clientWidth);
      }
      let clamping = false;
      tlScroll.addEventListener(
        "scroll",
        () => {
          if (clamping) return;
          const max = maxScroll();
          if (tlScroll.scrollLeft > max) {
            clamping = true;
            tlScroll.scrollLeft = max;
            clamping = false;
          }
        },
        { passive: true },
      );

      const nowMarker = document.createElement("div");
      nowMarker.className = "now";
      nowMarker.style.left = labelW + nowWeek * cellW + "px";
      tl.appendChild(nowMarker);
      const nowLabel = document.createElement("div");
      nowLabel.className = "now-lbl";
      nowLabel.textContent = "<%~ render.c7 %>";
      nowLabel.style.left = labelW + nowWeek * cellW + "px";
      tl.appendChild(nowLabel);

      // Filters
      const fl = document.getElementById("filters");
      const state = { active: new Set(TRACK_IDS) };
      fl.innerHTML = R.tracks
        .map(
          (t) =>
            `<button class="filt" data-track="${t.id}" data-on="true"><span class="sw"></span>${t.shortName.toLowerCase()}</button>`,
        )
        .join("");
      function applyFilter() {
        [...fl.children].forEach(
          (c) =>
            (c.dataset.on = state.active.has(c.dataset.track)
              ? "true"
              : "false"),
        );
        document.querySelectorAll(".row-lbl[data-track]").forEach((r) => {
          r.dataset.dim = state.active.has(r.dataset.track) ? "false" : "true";
        });
        document.querySelectorAll(".ep").forEach((e) => {
          e.closest(".tl-cell").dataset.dim = state.active.has(e.dataset.track)
            ? "false"
            : "true";
        });
        document.querySelectorAll(".ser-cell").forEach((s) => {
          s.dataset.dim = state.active.has(s.dataset.track) ? "false" : "true";
        });
        // minimap
        document.querySelectorAll(".mm-row").forEach((r) => {
          r.style.opacity = state.active.has(r.dataset.track) ? "1" : ".15";
        });
      }
      fl.addEventListener("click", (e) => {
        const b = e.target.closest(".filt");
        if (!b) return;
        const id = b.dataset.track;
        if (state.active.has(id)) state.active.delete(id);
        else state.active.add(id);
        if (state.active.size === 0) state.active = new Set(TRACK_IDS);
        applyFilter();
      });

      // ─── Minimap ───────────────────────────────────────────────────────
      const mm = document.getElementById("minimap");
      let mmHtml = `<div class="mm-label"><%~ render.c8 %></div>
    <div class="mm-track" id="mm-track">`;
      TRACK_IDS.forEach((tid) => {
        mmHtml += `<div class="mm-row ${tid}" data-track="${tid}" style="grid-template-columns: repeat(${VIS_WEEKS}, 1fr);">`;
        for (let w = 1; w <= VIS_WEEKS; w++) {
          let st = "future";
          if (w < nextWeek) st = "released";
          else if (w === nextWeek) st = "next";
          const lk = isLocked(w) ? ' data-locked="true"' : "";
          mmHtml += `<div class="mm-cell" data-state="${st}"${lk}></div>`;
        }
        mmHtml += `</div>`;
      });
      mmHtml += `
      <div class="mm-now" id="mm-now"></div>
      <div class="mm-horizon" id="mm-horizon"></div>
      <div class="mm-viewport" id="mm-viewport"></div>
      <div class="mm-click" id="mm-click"></div>
    </div>
    <div class="mm-axis" style="grid-template-columns: repeat(${VIS_MONTHS}, 1fr);">
      ${R.months
        .slice(0, VIS_MONTHS)
        .map(
          (m) =>
            `<span>${String(m.num).padStart(2, "0")} · ${m.label.toLowerCase()}</span>`,
        )
        .join("")}
    </div>`;
      mm.innerHTML = mmHtml;

      // Position mm-now and viewport
      const mmTrack = document.getElementById("mm-track");
      const mmNow = document.getElementById("mm-now");
      const mmHorizon = document.getElementById("mm-horizon");
      const mmViewport = document.getElementById("mm-viewport");
      function updateMinimap() {
        const trackW = mmTrack.clientWidth;
        const nowFrac = (labelW + nowWeek * cellW) / visExtentX;
        mmNow.style.left = trackW * nowFrac + "px";
        const horizFrac = horizonX / visExtentX;
        mmHorizon.style.left = trackW * horizFrac + "px";
        const viewFrac = tlScroll.scrollLeft / visExtentX;
        const viewW = (tlScroll.clientWidth / visExtentX) * trackW;
        mmViewport.style.left = trackW * viewFrac + "px";
        mmViewport.style.width = Math.max(20, Math.min(viewW, trackW)) + "px";
      }
      tlScroll.addEventListener("scroll", updateMinimap, { passive: true });
      window.addEventListener("resize", updateMinimap);
      setTimeout(updateMinimap, 60);

      // Click on minimap to jump scroll (clamped to the horizon)
      document.getElementById("mm-click").addEventListener("click", (e) => {
        const rect = mmTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frac = Math.max(0, Math.min(1, x / rect.width));
        let target = frac * visExtentX - tlScroll.clientWidth * 0.35;
        target = Math.max(0, Math.min(target, maxScroll()));
        tlScroll.scrollTo({ left: target, behavior: "smooth" });
      });

      // Hero video facade: load the embed only on user interaction
      const heroVid = document.getElementById("hero-video");
      if (heroVid) {
        const playHeroVid = () => {
          if (heroVid.dataset.loaded === "true") return;
          heroVid.dataset.loaded = "true";
          const ifr = document.createElement("iframe");
          ifr.src = heroVid.dataset.embed;
          ifr.title = "NextTick — intro";
          ifr.allow =
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
          ifr.referrerPolicy = "strict-origin-when-cross-origin";
          ifr.allowFullscreen = true;
          heroVid.innerHTML = "";
          heroVid.appendChild(ifr);
          heroVid.style.cursor = "default";
          heroVid.removeAttribute("role");
        };
        heroVid.addEventListener("click", playHeroVid);
        heroVid.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            playHeroVid();
          }
        });
      }

      // Scroll-to-now button
      document.getElementById("jump-now").addEventListener("click", () => {
        const target = labelW + nowWeek * cellW - tlScroll.clientWidth * 0.35;
        tlScroll.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
      });
      // initial scroll: center the now marker
      setTimeout(() => {
        const target = labelW + nowWeek * cellW - tlScroll.clientWidth * 0.35;
        tlScroll.scrollLeft = Math.max(0, target);
        updateMinimap();
      }, 80);

      // Episode detail
      const det = document.getElementById("ep-detail");
      const trackName = (id) => R.tracks.find((t) => t.id === id).name;
      const monthLabel = (num) =>
        (R.months.find((m) => m.num === num) || {}).label || `<%~ render.c9 %> ${num}`;
      document.getElementById("ep-close").onclick = () =>
        (det.dataset.open = "false");
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") det.dataset.open = "false";
      });
      tl.addEventListener("click", (e) => {
        const c = e.target.closest(".ep");
        if (!c) return;
        if (c.dataset.locked === "true") return; // beyond horizon — not openable
        const ep = R.episodes.find((x) => x.id === c.dataset.ep);
        const w = epWeek.get(ep.id);
        det.dataset.open = "true";
        det.dataset.track = ep.track;
        document.getElementById("ed-num").textContent =
          `#${ep.num} · ${ep.series.toLowerCase()}`;
        document.getElementById("ed-track").textContent =
          `// ${trackName(ep.track).toLowerCase()}`;
        document.getElementById("ed-week").textContent =
          `· ${monthLabel(ep.monthNum).toLowerCase()} · w${String(w).padStart(2, "0")}`;
        document.getElementById("ed-title").textContent = ep.title;
        document.getElementById("ed-blurb").textContent = ep.blurb;
        document.getElementById("ed-points").innerHTML = ep.points
          .map(
            (p, i) =>
              `<div class="pt"><span class="pn">// ${String(i + 1).padStart(2, "0")}</span>${p}</div>`,
          )
          .join("");
      });

      // ── Time-level picker ────────────────────────────────────────────
      (function () {
        const STORAGE_KEY = "nexttick.timeLevel";
        const h1 = document.querySelector(".hero h1");
        const w1 = document.getElementById("h1-w1");
        const w2 = document.getElementById("h1-w2");
        const flagEl = document.querySelector(".prompt-line .flag");
        const ledeEl = document.getElementById("lede-sub");
        const buttons = document.querySelectorAll(".tp-btn");
        const phrases = {
          2: {
            w1: "<%~ render.c10 %>",
            w2: "<%~ render.c11 %>",
            flag: "--quiet",
            lede: '<%~ render.c12 %></span>.',
            ctaH: '<%~ render.c13 %>.</span>',
            ctaS: "<%~ render.c14 %>.",
          },
          4: {
            w1: "<%~ render.c15 %>",
            w2: "<%~ render.c16 %>",
            flag: "",
            lede: '<%~ render.c17 %></span>.',
            ctaH: '<%~ render.c18 %>.</span>',
            ctaS: "<%~ render.c19 %>.",
          },
          6: {
            w1: "<%~ render.c20 %>",
            w2: "<%~ render.c21 %>",
            flag: "--verbose",
            lede: '<%~ render.c22 %></span>.',
            ctaH: '<%~ render.c23 %>.</span>',
            ctaS: "<%~ render.c24 %>.",
          },
        };
        let current = null;
        const ctaH = document.getElementById("cta-heading");
        const ctaS = document.getElementById("cta-sub");
        function applyChrome(p) {
          if (p.flag) {
            flagEl.textContent = p.flag;
            flagEl.style.display = "";
          } else {
            flagEl.style.display = "none";
          }
          ledeEl.innerHTML = p.lede;
          if (ctaH) ctaH.innerHTML = p.ctaH;
          if (ctaS) ctaS.textContent = p.ctaS;
        }
        function apply(level, animate) {
          const lvl = String(level);
          if (!phrases[lvl] || lvl === current) {
            buttons.forEach((b) =>
              b.classList.toggle("on", b.dataset.level === lvl),
            );
            return;
          }
          const p = phrases[lvl];
          document.body.dataset.timeLevel = lvl;
          buttons.forEach((b) =>
            b.classList.toggle("on", b.dataset.level === lvl),
          );

          if (animate && current !== null) {
            h1.classList.add("flip");
            setTimeout(() => {
              w1.textContent = p.w1;
              w2.textContent = p.w2;
              applyChrome(p);
              h1.classList.remove("flip");
            }, 180);
          } else {
            w1.textContent = p.w1;
            w2.textContent = p.w2;
            applyChrome(p);
          }
          current = lvl;
          try {
            localStorage.setItem(STORAGE_KEY, lvl);
          } catch (e) {}
        }
        buttons.forEach((b) =>
          b.addEventListener("click", () => {
            apply(b.dataset.level, true);
            window.dataLayer = window.dataLayer || [];
            dataLayer.push({
              event: "time_level_change",
              time_level: b.dataset.level,
            });
          }),
        );
        // Clickable locked-teaser rows — jump the slider to the required tier.
        document
          .querySelectorAll(".gates-preview .gp-item[data-tier]")
          .forEach((item) => {
            item.setAttribute("role", "button");
            item.setAttribute("tabindex", "0");
            const go = () => {
              apply(item.dataset.tier, true);
              // Scroll to the corresponding gated section after a beat.
              setTimeout(() => {
                const targetId = item.querySelector(".nm")?.textContent || "";
                // Match by section name: simplest is to scroll to the section whose
                // sec-head .name text matches the item's name.
                const wanted = (targetId || "").trim().toLowerCase();
                const target = [...document.querySelectorAll(".gated")].find(
                  (s) => {
                    const n = s.querySelector(".sec-head .name");
                    return n && n.textContent.trim().toLowerCase() === wanted;
                  },
                );
                if (target)
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 220);
            };
            item.addEventListener("click", go);
            item.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                go();
              }
            });
          });
        let initial = null;
        try {
          initial = localStorage.getItem(STORAGE_KEY);
        } catch (e) {}
        if (!initial || !phrases[initial])
          initial = document.body.dataset.timeLevel || "2";
        apply(initial, false);
      })();

      // ── Tab scroll-spy ───────────────────────────────────────────────
      (function () {
        const tabs = document.querySelectorAll(".win-bar .tab[data-tab]");
        const map = {
          roadmap: document.getElementById("sec-roadmap"),
          tracks: document.getElementById("sec-tracks"),
          timeline: document.getElementById("sec-timeline"),
        };
        function setActive(id) {
          tabs.forEach((t) => t.classList.toggle("on", t.dataset.tab === id));
        }
        function onScroll() {
          const probe = 140; // px from top of viewport
          let active = "roadmap";
          for (const [id, el] of Object.entries(map)) {
            if (!el) continue;
            const top = el.getBoundingClientRect().top;
            if (top - probe <= 0) active = id;
          }
          setActive(active);
        }
        // Smooth-scroll for the tab links (let default # behavior happen but soften)
        tabs.forEach((t) =>
          t.addEventListener("click", (e) => {
            e.preventDefault();
            window.dataLayer = window.dataLayer || [];
            dataLayer.push({ event: "tab_click", tab: t.dataset.tab });
            const target = map[t.dataset.tab];
            if (target)
              target.scrollIntoView({ behavior: "smooth", block: "start" });
          }),
        );
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      })();

      // Theme toggle — flip data-theme on <html>, persist choice, sync browser chrome.
      (function () {
        const btn = document.getElementById("theme-toggle");
        if (!btn) return;
        const meta = document.querySelector('meta[name="theme-color"]');
        btn.addEventListener("click", () => {
          const cur =
            document.documentElement.getAttribute("data-theme") === "light"
              ? "light"
              : "dark";
          const next = cur === "light" ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", next);
          try {
            localStorage.setItem("theme", next);
          } catch (e) {}
          if (meta)
            meta.setAttribute(
              "content",
              next === "light" ? "#ffffff" : "#0b0d0f",
            );
        });
      })();

      