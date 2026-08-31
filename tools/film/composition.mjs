// One beat storyboard + one look → one HyperFrames composition.
//
// ── The frame is a broadcast segment, not a slide deck ──────────────────────
// Every frame carries the same furniture and only the middle changes:
//
//   · a LIVE dot and an elapsed rail across the top    (this is happening now)
//   · the SCENE — a chart that draws, not a diagram    (the content)
//   · a lower third: accent rule, headline, sub        (the chyron)
//   · a ticker rail crawling the real taxonomy         (the crawl)
//
// The furniture is continuous across all six beats, so the film reads as one
// segment rather than six slides. That continuity is most of the difference
// between this and a presentation.
//
// ── The contract this obeys (skills/hyperframes-core) ───────────────────────
//   · standalone root <div data-composition-id> straight in <body>
//   · the root is EXPLICITLY sized in px, or children collapse silently
//   · exactly ONE gsap.timeline({ paused: true }) on window.__timelines[id]
//   · render length is the root's data-duration
//   · never a CSS initial transform AND a GSAP tween on the same property
//   · no render-time clocks, no unseeded Math.random, no repeat: -1
//   · the framework owns CLIP visibility, so fades go on an inner wrapper
//
// ── NOTHING HERE SCALES AN SVG SHAPE ────────────────────────────────────────
// This cost hours. scaleY/scaleX on an SVG child left every shape displaced by
// its own size — bars floating clear of the baseline they stand on. It was not
// the origin: transformOrigin percentages, transform-box: fill-box and GSAP's
// svgOrigin all failed the same way, and stripping the tween proved the markup
// was right. So scenes animate GEOMETRY instead — a rect's y/width/height, a
// circle's r, a path's stroke-dashoffset. There is no origin to resolve, so it
// cannot be displaced. TRANSLATION (x/y) and opacity are fine and used freely,
// and scaleX on ordinary HTML elements is fine too.
//
// If you add motion to an SVG shape, animate its attributes the same way, and
// look at a snapshot: nothing in lint, check or the render reports this bug.

const W = 1000;
const H = 720;
const CROSSFADE = 0.4;
// THE VERTICAL BUDGET. 720 total, less the 64px top rail and the 96px ticker,
// leaves 560 for a beat. The chyron's worst case is a two-line headline plus a
// two-line sub — 8 rule + 14 + 2x64 + 12 + 2x31 = 226 — so the stage gets 330
// and the sub still clears the ticker. Grow the type or the stage past this and
// `check` fails with text_occluded, which is how this number was arrived at.
const STAGE_H = 330;

const s3 = (n) => Math.round(n * 1000) / 1000;

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ── Scenes ───────────────────────────────────────────────────────────────────
// Each returns { svg, tweens }. `tweens` is GSAP source positioned against B,
// the beat's start; `k` scopes every selector to its own beat. The scene viewBox
// is 1000 x 330 — the stage in real pixels, so nothing needs rescaling by hand.

function scenePulse(k, p, t) {
  const cx = 500, cy = 160;
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
      <circle class="${k}-p1" cx="${cx}" cy="${cy}" r="60" fill="none" stroke="${t.accent}" stroke-width="3" opacity="0"/>
      <circle class="${k}-p2" cx="${cx}" cy="${cy}" r="60" fill="none" stroke="${t.accent}" stroke-width="3" opacity="0"/>
      <circle class="${k}-core" cx="${cx}" cy="${cy}" r="0" fill="${t.accent}"/>
      <path class="${k}-star" d="M${cx} ${cy - 40} L${cx + 15} ${cy - 15} L${cx + 40} ${cy} L${cx + 15} ${cy + 15} L${cx} ${cy + 40} L${cx - 15} ${cy + 15} L${cx - 40} ${cy} L${cx - 15} ${cy - 15} Z"
            fill="${t.onAccent}" opacity="0"/>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-core", { attr: { r: 0 } }, { attr: { r: 60 }, duration: .5, ease: "back.out(2.2)" }, B + .06)
        .fromTo(".${k}-star", { opacity: 0 }, { opacity: 1, duration: .3, ease: "power2.out" }, B + .26)
        .fromTo(".${k}-p1", { attr: { r: 60 }, opacity: .85 }, { attr: { r: 150 }, opacity: 0, duration: 1.5, ease: "power2.out" }, B + .34)
        .fromTo(".${k}-p2", { attr: { r: 60 }, opacity: .6 },  { attr: { r: 186 }, opacity: 0, duration: 1.9, ease: "power2.out" }, B + .8);`
  };
}

function sceneChips(k, p, t) {
  const labels = ["Groceries", "Dining out", "Transport", "Subscriptions", "Shopping"];
  const cw = 320, ch = 46, gap = 12;
  const y0 = 165 - ((labels.length * ch + (labels.length - 1) * gap) / 2);
  const rows = labels.map((wd, i) => {
    const y = y0 + i * (ch + gap);
    const hot = i === 2;
    return `<g class="${k}-q${i}" opacity="0">
      <rect x="${500 - cw / 2}" y="${y}" width="${cw}" height="${ch}" rx="23"
            fill="${hot ? t.accent : t.panel}" stroke="${hot ? t.accent : t.rule}" stroke-width="2"/>
      <text x="500" y="${y + 31}" text-anchor="middle" font-size="22" font-weight="700"
            font-family="Inter, sans-serif" fill="${hot ? t.onAccent : t.ink}">${esc(wd)}</text>
    </g>`;
  }).join("");
  const sel = labels.map((_, i) => `".${k}-q${i}"`).join(", ");
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">${rows}</svg>`,
    tweens: `
      tl.fromTo([${sel}], { opacity: 0, x: 70 },
                { opacity: 1, x: 0, duration: .34, ease: "back.out(1.7)", stagger: .11 }, B + .10);`
  };
}

function sceneMosaic(k, p, t) {
  const cols = p.cols || 8, rows = p.rows || 5;
  const cell = 58, pad = 8;
  const x0 = 500 - (cols * cell) / 2, y0 = 165 - (rows * cell) / 2;
  // A FIXED pattern, never Math.random — renders must be reproducible.
  const accentAt = (i) => (i * 7 + 3) % 11 < 4;
  let tiles = "";
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    tiles += `<rect class="${k}-m" x="${x0 + c * cell + pad / 2}" y="${y0 + r * cell + pad / 2}"
                    width="${cell - pad}" height="${cell - pad}" rx="10"
                    fill="${accentAt(i) ? t.accent : t.ink}" opacity="0"/>`;
  }
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">${tiles}</svg>`,
    tweens: `
      tl.fromTo(".${k}-m", { opacity: 0 },
                { opacity: .92, duration: .3, ease: "power2.out",
                  stagger: { each: .02, grid: [${rows}, ${cols}], from: "start" } }, B + .10);`
  };
}

function sceneLine(k, p, t) {
  const pts = p.series || [38, 42, 40, 44, 41, 58, 52, 71];
  const x0 = 160, x1 = 840, base = 268, top = 44;
  const step = (x1 - x0) / (pts.length - 1);
  const max = Math.max(...pts) * 1.14;
  const xy = pts.map((v, i) => [x0 + i * step, base - (v / max) * (base - top)]);
  const d = xy.map((q, i) => `${i ? "L" : "M"}${s3(q[0])} ${s3(q[1])}`).join(" ");
  const head = xy[xy.length - 1];
  const up = p.dir !== "down";
  const badge = up ? t.accent : t.hot;
  // Only needs to be >= the true path length; over-estimating just means the
  // dash never repeats.
  const L = Math.ceil(xy.reduce((a, q, i) =>
    i ? a + Math.hypot(q[0] - xy[i - 1][0], q[1] - xy[i - 1][1]) : 0, 0) * 1.15);

  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
      ${[0, 1, 2, 3].map(i => `<line x1="${x0}" y1="${s3(top + i * (base - top) / 3)}" x2="${x1}" y2="${s3(top + i * (base - top) / 3)}" stroke="${t.rule}" stroke-width="1.5"/>`).join("")}
      <path class="${k}-area" d="${d} L${s3(x1)} ${base} L${s3(x0)} ${base} Z" fill="${t.accent}" opacity="0"/>
      <path class="${k}-line" d="${d}" fill="none" stroke="${t.accent}" stroke-width="8"
            stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="${L}" stroke-dashoffset="${L}"/>
      <circle class="${k}-halo" cx="${s3(head[0])}" cy="${s3(head[1])}" r="0" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0"/>
      <circle class="${k}-head" cx="${s3(head[0])}" cy="${s3(head[1])}" r="0" fill="${t.accent}"/>
      <g class="${k}-badge" opacity="0">
        <rect x="${s3(head[0]) - 66}" y="${s3(head[1]) - 92}" width="132" height="50" rx="25" fill="${badge}"/>
        <text x="${s3(head[0])}" y="${s3(head[1]) - 58}" text-anchor="middle" font-size="26" font-weight="800"
              font-family="Inter, sans-serif" fill="${t.onAccent}">${up ? "▲" : "▼"} ${p.pct || 0}%</text>
      </g>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-line", { strokeDashoffset: ${L} }, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, B + .12)
        .fromTo(".${k}-area", { opacity: 0 }, { opacity: .14, duration: .8, ease: "power2.out" }, B + .5)
        .fromTo(".${k}-head", { attr: { r: 0 } }, { attr: { r: 14 }, duration: .34, ease: "back.out(2.4)" }, B + 1.5)
        .fromTo(".${k}-halo", { attr: { r: 14 }, opacity: .9 }, { attr: { r: 52 }, opacity: 0, duration: 1.1, ease: "power2.out" }, B + 1.62)
        .fromTo(".${k}-badge", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .34, ease: "back.out(2)" }, B + 1.66);`
  };
}

function sceneDonut(k, p, t) {
  const cx = 500, cy = 148, r = 104, sw = 38;
  const C = 2 * Math.PI * r;
  const pct = p.pct || 50;
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.rule}" stroke-width="${sw}"/>
      <circle class="${k}-arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.accent}"
              stroke-width="${sw}" stroke-linecap="round"
              stroke-dasharray="${s3(C)}" stroke-dashoffset="${s3(C)}" transform="rotate(-90 ${cx} ${cy})"/>
      <text class="${k}-num" x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="66" font-weight="800"
            font-family="Inter, sans-serif" fill="${t.ink}">0%</text>
      <text x="${cx}" y="${cy + 148}" text-anchor="middle" font-size="22" font-weight="600"
            font-family="Inter, sans-serif" fill="${t.inkSoft}">of the month</text>
    </svg>`,
    // The counter is driven off a proxy object, and it writes a PERCENTAGE.
    // Never a currency figure — see the note at the top of beats.mjs.
    tweens: `
      tl.fromTo(".${k}-arc", { strokeDashoffset: ${s3(C)} },
                { strokeDashoffset: ${s3(C * (1 - pct / 100))}, duration: 1.3, ease: "power3.out" }, B + .14)
        .to({ v: 0 }, { v: ${pct}, duration: 1.3, ease: "power3.out",
              onUpdate: function () {
                var el = document.querySelector(".${k}-num");
                if (el) el.textContent = Math.round(this.targets()[0].v) + "%";
              } }, B + .14);`
  };
}

function sceneDials(k, p, t) {
  const r = 72, sw = 26, C = 2 * Math.PI * r;
  const a = (p.a || 68) / 100, b = (p.b || 34) / 100;
  const one = (cls, cx, frac, label) => `
    <g>
      <circle cx="${cx}" cy="150" r="${r}" fill="none" stroke="${t.rule}" stroke-width="${sw}"/>
      <circle class="${cls}" cx="${cx}" cy="150" r="${r}" fill="none" stroke="${t.accent}" stroke-width="${sw}"
              stroke-linecap="round" stroke-dasharray="${s3(C)}" stroke-dashoffset="${s3(C)}"
              transform="rotate(-90 ${cx} 150)"/>
      <text x="${cx}" y="166" text-anchor="middle" font-size="40" font-weight="800"
            font-family="Inter, sans-serif" fill="${t.ink}">${Math.round(frac * 100)}%</text>
      <text x="${cx}" y="270" text-anchor="middle" font-size="22" font-weight="600"
            font-family="Inter, sans-serif" fill="${t.inkSoft}">${esc(label)}</text>
    </g>`;
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
            ${one(`${k}-d1`, 340, a, p.aLabel || "the rate")}
            ${one(`${k}-d2`, 660, b, p.bLabel || "what you pay")}
          </svg>`,
    tweens: `
      tl.fromTo(".${k}-d1", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - a))}, duration: 1.0, ease: "power3.out" }, B + .14)
        .fromTo(".${k}-d2", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - b))}, duration: 1.0, ease: "power3.out" }, B + .44);`
  };
}

function sceneRace(k, p, t) {
  const vals = p.bars || [92, 74, 58, 41, 33, 21];
  const x0 = 210, wMax = 590, bh = 28, gap = 13;
  const y0 = 165 - ((vals.length * bh + (vals.length - 1) * gap) / 2);
  const rows = vals.map((v, i) => {
    const y = y0 + i * (bh + gap);
    const hot = i === p.hot;
    return `<g>
      <rect x="${x0}" y="${y}" width="${wMax}" height="${bh}" rx="17" fill="${t.rule}" opacity=".55"/>
      <rect class="${k}-r${i}" x="${x0}" y="${y}" width="0" height="${bh}" rx="17"
            fill="${hot ? t.accent : t.ink}" opacity="${hot ? "1" : ".6"}"/>
    </g>`;
  }).join("");
  const grow = vals.map((v, i) => `
      tl.fromTo(".${k}-r${i}", { attr: { width: 0 } },
                { attr: { width: ${s3(wMax * v / 100)} }, duration: .8, ease: "power3.out" }, B + .12 + ${s3(i * 0.08)});`).join("");
  const shift = p.shift ? `
      tl.to(".${k}-r${p.hot}", { attr: { width: ${s3(wMax * 0.94)} }, duration: .9, ease: "power2.inOut" }, B + 1.7);` : "";
  return { svg: `<svg viewBox="0 0 1000 330" class="art">${rows}</svg>`, tweens: `${grow}${shift}` };
}

function sceneBand(k, p, t) {
  const x0 = 130, x1 = 870, y = 158;
  const bl = 380, br = 660, mid = (bl + br) / 2, mark = 706;
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
      <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${t.rule}" stroke-width="5" stroke-linecap="round"/>
      <rect class="${k}-band" x="${mid}" y="${y - 34}" width="0" height="68" rx="34" fill="${t.accent}" opacity=".24"/>
      <text x="${mid}" y="${y + 108}" text-anchor="middle" font-size="22" font-weight="600"
            font-family="Inter, sans-serif" fill="${t.inkSoft}">peers like you</text>
      <g class="${k}-mark" opacity="0">
        <circle class="${k}-ring" cx="${mark}" cy="${y}" r="24" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0"/>
        <circle cx="${mark}" cy="${y}" r="24" fill="${t.accent}"/>
        <rect x="${mark - 62}" y="${y - 104}" width="124" height="48" rx="24" fill="${t.accent}"/>
        <text x="${mark}" y="${y - 71}" text-anchor="middle" font-size="25" font-weight="800"
              font-family="Inter, sans-serif" fill="${t.onAccent}">▲ ${p.pct || 12}%</text>
      </g>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-band", { attr: { x: ${mid}, width: 0 } },
                { attr: { x: ${bl}, width: ${br - bl} }, duration: .7, ease: "power3.out" }, B + .12)
        .fromTo(".${k}-mark", { opacity: 0, x: -260 }, { opacity: 1, x: 0, duration: .6, ease: "back.out(1.8)" }, B + .66)
        .fromTo(".${k}-ring", { attr: { r: 24 }, opacity: .9 }, { attr: { r: 92 }, opacity: 0, duration: 1.2, ease: "power2.out" }, B + 1.16);`
  };
}

function sceneClose(k, p, t) {
  const cx = 500, cy = 140;
  return {
    svg: `<svg viewBox="0 0 1000 330" class="art">
      <circle class="${k}-halo" cx="${cx}" cy="${cy}" r="0" fill="${t.accent}" opacity=".18"/>
      <path class="${k}-tick" d="M${cx - 58} ${cy} L${cx - 16} ${cy + 42} L${cx + 62} ${cy - 40}"
            fill="none" stroke="${t.accent}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="210" stroke-dashoffset="210"/>
      <rect class="${k}-bar" x="${cx}" y="${cy + 118}" width="0" height="9" rx="4.5" fill="${t.accent}" opacity=".6"/>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-halo", { attr: { r: 0 } }, { attr: { r: 100 }, duration: .6, ease: "back.out(1.8)" }, B + .08)
        .fromTo(".${k}-tick", { strokeDashoffset: 210 }, { strokeDashoffset: 0, duration: .55, ease: "power2.out" }, B + .3)
        .fromTo(".${k}-bar", { attr: { x: ${cx}, width: 0 } }, { attr: { x: ${cx - 95}, width: 190 }, duration: .6, ease: "power3.out" }, B + .62);`
  };
}

const SCENE_FNS = {
  pulse: scenePulse, chips: sceneChips, mosaic: sceneMosaic, line: sceneLine,
  donut: sceneDonut, dials: sceneDials, race: sceneRace, band: sceneBand, close: sceneClose
};

// ── Kinetic type ─────────────────────────────────────────────────────────────
// The headline arrives WORD BY WORD with a short overshoot. One tween on the
// whole string reads as a slide transition; per-word is what makes it feel like
// a feed rather than a deck. Each word is its own inline-block so a transform is
// legal on it, and the line is clipped so the rise comes from nowhere.
function kineticWords(text, cls) {
  return String(text).split(/\s+/).filter(Boolean)
    .map(w => `<span class="kw"><span class="${cls}" data-layout-allow-overlap>${esc(w)}</span></span>`).join(" ");
}

export function composition({ compositionId, beats, theme: t, totalSec, ticker }) {
  const sections = [];
  const tweens = [];

  beats.forEach((b) => {
    const k = `${compositionId}-${b.id}`;
    const fn = SCENE_FNS[b.scene];
    if (!fn) throw new Error(`unknown scene "${b.scene}" on ${compositionId}/${b.id}`);
    const { svg, tweens: art } = fn(k, b.params, t);
    const win = b.last ? Math.max(0.1, totalSec - b.start) : b.duration + CROSSFADE;

    sections.push(`
      <section id="${k}-clip" class="clip" data-start="${s3(b.start)}" data-duration="${s3(win)}" data-track-index="${b.index}">
        <div class="beat" id="${k}-beat">
          <div class="stage" id="${k}-art">${svg}</div>
          <div class="chyron">
            <span class="rule" id="${k}-rule"></span>
            <h1 class="headline" data-layout-allow-overlap>${kineticWords(b.headline, k + "-w")}</h1>
            <p class="sub" id="${k}-s" data-layout-allow-overlap>${esc(b.sub || "")}</p>
          </div>
        </div>
      </section>`);

    const out = b.last ? "" : `
      tl.to("#${k}-beat", { autoAlpha: 0, duration: ${s3(CROSSFADE)}, ease: "power2.in" }, B + ${s3(b.duration)});`;

    tweens.push(`
    { const B = ${s3(b.start)};
      tl.fromTo("#${k}-beat", { autoAlpha: 0 }, { autoAlpha: 1, duration: .26, ease: "power2.out" }, B)
        .fromTo("#${k}-art", { y: 24 }, { y: 0, duration: .8, ease: "power3.out" }, B)
        .fromTo("#${k}-rule", { scaleX: 0 }, { scaleX: 1, duration: .42, ease: "power3.out" }, B + .06)
        .fromTo(".${k}-w", { yPercent: 118, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: .44, ease: "back.out(1.9)", stagger: .055 }, B + .1)
        .fromTo("#${k}-s", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: "power3.out" }, B + .32);
      ${art}${out}
    }`);
  });

  // ── Furniture: outside every clip, so it never restarts ────────────────────
  // The list is doubled and the rail travels exactly -50%, which lands the
  // second copy where the first began — a seamless crawl with no wrap logic.
  const chips = ticker.concat(ticker).map(c => `<span class="tk"><i></i>${esc(c)}</span>`).join("");
  const blinks = Math.max(1, Math.round(totalSec / 1.2));

  const furniture = `
    tl.fromTo("#ticker", { xPercent: 0 }, { xPercent: -50, duration: ${s3(totalSec)}, ease: "none" }, 0)
      .fromTo("#elapsed", { scaleX: 0 }, { scaleX: 1, duration: ${s3(totalSec)}, ease: "none" }, 0)
      .fromTo("#live", { opacity: 1 }, { opacity: .2, duration: .6, ease: "power1.inOut", yoyo: true, repeat: ${blinks} }, 0)
      .fromTo("#wash", { xPercent: -5, yPercent: -3 }, { xPercent: 5, yPercent: 3, duration: ${s3(totalSec)}, ease: "none" }, 0);`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(compositionId)}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Inter"; font-weight: 400; src: url("assets/Inter-400.woff2") format("woff2"); font-display: block; }
      @font-face { font-family: "Inter"; font-weight: 700; src: url("assets/Inter-700.woff2") format("woff2"); font-display: block; }

      html, body { margin: 0; padding: 0; background: ${t.ground}; }
      #root {
        position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
        background: ${t.ground}; color: ${t.ink};
        font-family: Inter, system-ui, sans-serif; -webkit-font-smoothing: antialiased;
      }

      #wash {
        position: absolute; left: -12%; top: -12%; width: 124%; height: 124%;
        background:
          radial-gradient(44% 40% at 26% 22%, ${t.wash}${t.isDark ? "40" : "30"} 0%, transparent 62%),
          radial-gradient(50% 44% at 78% 74%, ${t.wash}${t.isDark ? "2A" : "20"} 0%, transparent 66%);
      }

      /* Top rail — the "this is live" furniture. */
      #toprail { position: absolute; top: 0; left: 0; right: 0; height: 60px; display: flex;
                 align-items: center; gap: 13px; padding: 0 42px; box-sizing: border-box; }
      #live { display: block; width: 14px; height: 14px; border-radius: 50%; background: ${t.hot}; flex: 0 0 auto; }
      #livetext { font-size: 17px; font-weight: 700; letter-spacing: .2em; color: ${t.inkSoft}; }
      #railtrack { position: absolute; left: 0; right: 0; top: 60px; height: 4px; background: ${t.rule}; }
      #elapsed { display: block; height: 100%; width: 100%; background: ${t.accent}; transform-origin: 0 50%; }

      .clip { position: absolute; inset: 0; }
      .beat { position: absolute; left: 0; right: 0; top: 64px; bottom: 96px; display: flex; flex-direction: column; }

      .stage { display: block; width: 100%; height: ${STAGE_H}px; flex: 0 0 auto; }
      .art { display: block; width: 100%; height: 100%; overflow: visible; }

      /* The chyron. */
      .chyron { display: block; padding: 0 78px; box-sizing: border-box; }
      .rule { display: block; width: 92px; height: 8px; border-radius: 4px; background: ${t.accent};
              transform-origin: 0 50%; margin-bottom: 14px; }
      .headline { display: block; margin: 0; font-size: 64px; font-weight: 700; letter-spacing: -.035em;
                  line-height: 1.04; color: ${t.ink}; }
      /* Two nested spans: the outer clips, the inner rides the transform. */
      .kw { display: inline-block; overflow: hidden; vertical-align: bottom; }
      .headline .kw > span { display: inline-block; }
      .sub { display: block; margin: 12px 0 0; font-size: 24px; font-weight: 400; line-height: 1.28; color: ${t.inkSoft}; }

      /* The crawl. */
      #tickerbar { position: absolute; left: 0; right: 0; bottom: 0; height: 96px;
                   background: ${t.panel}; border-top: 2px solid ${t.rule};
                   display: flex; align-items: center; overflow: hidden; }
      #ticker { display: flex; align-items: center; gap: 46px; white-space: nowrap; padding-left: 42px; }
      .tk { font-size: 23px; font-weight: 700; color: ${t.inkSoft}; display: inline-flex; align-items: center; gap: 12px; }
      .tk i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${t.accent}; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${esc(compositionId)}" data-start="0"
         data-width="${W}" data-height="${H}" data-duration="${s3(totalSec)}">
      <div id="wash"></div>
      <div id="toprail"><span id="live"></span><span id="livetext">MONEY BUDDY</span></div>
      <div id="railtrack"><span id="elapsed"></span></div>
${sections.join("\n")}
      <div id="tickerbar"><div id="ticker">${chips}</div></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${furniture}
${tweens.join("\n")}
      window.__timelines[${JSON.stringify(compositionId)}] = tl;
    </script>
  </body>
</html>
`;
}

export const CANVAS = { W, H, CROSSFADE };
