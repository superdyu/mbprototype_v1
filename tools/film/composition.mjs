// One beat storyboard + one theme palette → one HyperFrames composition.
//
// ── The contract this obeys (skills/hyperframes-core) ───────────────────────
//   · standalone root <div data-composition-id> straight in <body>, no <template>
//   · the root is EXPLICITLY sized in px, or a 100%-height child collapses to
//     nothing and the whole frame piles into the top-left corner, silently
//   · exactly ONE gsap.timeline({ paused: true }), registered on
//     window.__timelines[<composition-id>]
//   · render length is the root's data-duration, not the timeline's
//   · never a CSS initial transform AND a GSAP tween on the same property —
//     always fromTo, or lint rejects it (gsap_css_transform_conflict)
//   · no render-time clocks, no unseeded Math.random, no repeat: -1
//   · the framework owns CLIP visibility, so fades go on an inner wrapper
//
// ── Why clips overlap ────────────────────────────────────────────────────────
// A clip's data-start/data-duration window is a hard cut. Keynote does not cut,
// it dissolves — so every beat's window is extended by CROSSFADE seconds into
// the next one, and the inner wrapper fades across that overlap. data-track-index
// ascends so the incoming beat sits above the outgoing one.

const W = 1000;
const H = 720;
const CROSSFADE = 0.45;

/** Rounded to 3dp — the attributes are read as seconds and want to be stable. */
const s3 = (n) => Math.round(n * 1000) / 1000;

// ── Scenes ───────────────────────────────────────────────────────────────────
// Each returns { svg, tweens }. `tweens` is GSAP source positioned relative to
// the beat's own start; the caller offsets it onto the master timeline.
// `k` is the beat's unique key, so every selector is scoped to its own beat.

function sceneMark(k, p, t) {
  return {
    svg: `
      <svg viewBox="0 0 320 320" class="art">
        <circle class="${k}-r1" cx="160" cy="160" r="118" fill="none" stroke="${t.accent}" stroke-width="2" opacity=".22"/>
        <circle class="${k}-r2" cx="160" cy="160" r="86"  fill="none" stroke="${t.accent}" stroke-width="3" opacity=".38"/>
        <circle class="${k}-r3" cx="160" cy="160" r="54"  fill="${t.accent}" opacity=".92"/>
        <path   class="${k}-r4" d="M160 128 L172 154 L198 160 L172 166 L160 192 L148 166 L122 160 L148 154 Z"
                fill="${t.onAccent}" opacity=".95"/>
      </svg>`,
    tweens: `
      tl.fromTo(".${k}-r3", { scale: .55, autoAlpha: 0 }, { scale: 1, autoAlpha: .92, duration: .7, ease: "back.out(1.6)", transformOrigin: "160px 160px" }, B + .10)
        .fromTo(".${k}-r4", { scale: .4, autoAlpha: 0 },  { scale: 1, autoAlpha: .95, duration: .6, ease: "back.out(2)",   transformOrigin: "160px 160px" }, B + .28)
        .fromTo(".${k}-r2", { scale: .8, autoAlpha: 0 },  { scale: 1, autoAlpha: .38, duration: .8, ease: "power3.out",    transformOrigin: "160px 160px" }, B + .34)
        .fromTo(".${k}-r1", { scale: .74, autoAlpha: 0 }, { scale: 1, autoAlpha: .22, duration: .9, ease: "power3.out",    transformOrigin: "160px 160px" }, B + .44);`
  };
}

function sceneCards(k, p, t) {
  const n = p.count || 3;
  const cw = 210, ch = 62, gap = 20;
  const total = n * ch + (n - 1) * gap;
  const rects = Array.from({ length: n }, (_, i) => {
    const y = (320 - total) / 2 + i * (ch + gap);
    return `<g class="${k}-c${i}">
      <rect x="${(320 - cw) / 2}" y="${y}" width="${cw}" height="${ch}" rx="16"
            fill="${t.card}" stroke="${t.line}" stroke-width="2"/>
      <rect x="${(320 - cw) / 2 + 22}" y="${y + 20}" width="${88 - i * 12}" height="9" rx="4.5"
            fill="${t.text}" opacity=".34"/>
      <rect x="${(320 - cw) / 2 + 22}" y="${y + 37}" width="${140 - i * 18}" height="9" rx="4.5"
            fill="${t.accent}" opacity=".55"/>
    </g>`;
  }).join("");
  const sel = Array.from({ length: n }, (_, i) => `".${k}-c${i}"`).join(", ");
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">${rects}</svg>`,
    tweens: `
      tl.fromTo([${sel}], { y: 26, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: .62, ease: "power3.out", stagger: .16 }, B + .12);`
  };
}

function sceneGrid(k, p, t) {
  const cols = p.cols || 6, rows = p.rows || 4;
  const cell = 40, pad = 8;
  const gw = cols * cell, gh = rows * cell;
  const x0 = (320 - gw) / 2, y0 = (320 - gh) / 2;
  const lit = Math.round(cols * rows * (p.fillTo == null ? 1 : p.fillTo));
  let tiles = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      tiles += `<rect class="${k}-t ${k}-t${i < lit ? "on" : "off"}" x="${x0 + c * cell + pad / 2}" y="${y0 + r * cell + pad / 2}"
                      width="${cell - pad}" height="${cell - pad}" rx="7"
                      fill="${i < lit ? t.accent : t.text}" opacity="${i < lit ? 1 : .12}"/>`;
    }
  }
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">${tiles}</svg>`,
    tweens: `
      tl.fromTo(".${k}-toff", { autoAlpha: 0, scale: .7 },
                { autoAlpha: .12, scale: 1, duration: .4, ease: "power2.out", stagger: { each: .012, from: "start" }, transformOrigin: "50% 50%" }, B + .10)
        .fromTo(".${k}-ton", { autoAlpha: 0, scale: .6 },
                { autoAlpha: 1, scale: 1, duration: .46, ease: "back.out(2)", stagger: { each: .035, from: "start" }, transformOrigin: "50% 50%" }, B + .30);`
  };
}

function sceneBars(k, p, t) {
  const hs = p.heights || [58, 44, 71, 52, 63];
  const n = hs.length;
  const bw = 30, gap = 20;
  const tw = n * bw + (n - 1) * gap;
  const x0 = (320 - tw) / 2, base = 250;
  const bars = hs.map((h, i) => {
    const x = x0 + i * (bw + gap);
    const hot = i === p.restless;
    let g = "";
    if (p.paired) {
      g += `<rect x="${x - 7}" y="${base - h * 1.5 * .72}" width="${bw}" height="${h * 1.5 * .72}" rx="8"
                  fill="${t.text}" opacity=".14"/>`;
    }
    g += `<rect class="${k}-b${i}" x="${x}" y="${base - h * 1.5}" width="${bw}" height="${h * 1.5}" rx="8"
                fill="${hot ? t.accent : t.text}" opacity="${hot ? ".95" : ".26"}"/>`;
    return `<g>${g}</g>`;
  }).join("");
  const sel = hs.map((_, i) => `".${k}-b${i}"`).join(", ");
  const restless = p.restless >= 0 ? `
      tl.to(".${k}-b${p.restless}", { y: -9, duration: .5, ease: "sine.inOut", yoyo: true, repeat: 5 }, B + .95);` : "";
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">
            <line x1="${x0 - 16}" y1="${base + 2}" x2="${x0 + tw + 16}" y2="${base + 2}" stroke="${t.line}" stroke-width="2"/>
            ${bars}
          </svg>`,
    tweens: `
      tl.fromTo([${sel}], { scaleY: 0, autoAlpha: 0 },
                { scaleY: 1, autoAlpha: 1, duration: .6, ease: "power3.out", stagger: .09, transformOrigin: "50% 100%" }, B + .12);${restless}`
  };
}

function sceneCompare(k, p, t) {
  const x0 = 46, x1 = 274, y = 168;
  const bl = 112, br = 208;   // the peer band
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">
        <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${t.line}" stroke-width="3" stroke-linecap="round"/>
        <rect class="${k}-band" x="${bl}" y="${y - 15}" width="${br - bl}" height="30" rx="15"
              fill="${t.accent}" opacity=".2"/>
        <text x="${(bl + br) / 2}" y="${y + 54}" text-anchor="middle" font-size="15"
              fill="${t.muted}" font-family="Inter, sans-serif" font-weight="500">peers like you</text>
        <g class="${k}-mark">
          <circle cx="${br - 22}" cy="${y}" r="13" fill="${t.accent}"/>
          <circle cx="${br - 22}" cy="${y}" r="24" fill="none" stroke="${t.accent}" stroke-width="2" opacity=".35"/>
        </g>
      </svg>`,
    tweens: `
      tl.fromTo(".${k}-band", { scaleX: 0, autoAlpha: 0 },
                { scaleX: 1, autoAlpha: .2, duration: .66, ease: "power3.out", transformOrigin: "${(bl + br) / 2}px ${y}px" }, B + .12)
        .fromTo(".${k}-mark", { x: -${br - 22 - x0 - 10}, autoAlpha: 0 },
                { x: 0, autoAlpha: 1, duration: .9, ease: "power3.inOut" }, B + .42);`
  };
}

function sceneSplit(k, p, t) {
  const x0 = 40, w = 240, y = 150, h = 46;
  const c = p.committed == null ? 0.6 : p.committed;
  const shift = p.shiftTo == null ? c : p.shiftTo;
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">
        <rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.text}" opacity=".12"/>
        <rect class="${k}-fill" x="${x0}" y="${y}" width="${w}" height="${h}" rx="14" fill="${t.accent}" opacity=".9"/>
        <text class="${k}-lab1" x="${x0}" y="${y - 16}" font-size="15" fill="${t.muted}"
              font-family="Inter, sans-serif" font-weight="600">committed</text>
        <text class="${k}-lab2" x="${x0 + w}" y="${y + h + 30}" text-anchor="end" font-size="15" fill="${t.muted}"
              font-family="Inter, sans-serif" font-weight="600">yours to move</text>
      </svg>`,
    tweens: `
      tl.fromTo(".${k}-fill", { scaleX: 0 }, { scaleX: ${c}, duration: .8, ease: "power3.out", transformOrigin: "${x0}px ${y}px" }, B + .14)
        .fromTo([".${k}-lab1", ".${k}-lab2"], { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .5, ease: "power2.out", stagger: .12 }, B + .5)
        ${shift !== c ? `.to(".${k}-fill", { scaleX: ${shift}, duration: .9, ease: "power2.inOut" }, B + 1.5)` : ""};`
  };
}

function sceneDials(k, p, t) {
  const R = 52, C = 2 * Math.PI * R;
  const ring = (cls, cx, frac, label) => `
    <g>
      <circle cx="${cx}" cy="150" r="${R}" fill="none" stroke="${t.text}" stroke-width="12" opacity=".12"/>
      <circle class="${cls}" cx="${cx}" cy="150" r="${R}" fill="none" stroke="${t.accent}" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="${s3(C)}" stroke-dashoffset="${s3(C)}"
              transform="rotate(-90 ${cx} 150)"/>
      <text x="${cx}" y="228" text-anchor="middle" font-size="15" fill="${t.muted}"
            font-family="Inter, sans-serif" font-weight="600">${label}</text>
    </g>`;
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">
            ${ring(`${k}-d1`, 92, .68, "the rate")}
            ${ring(`${k}-d2`, 228, .42, "what you pay")}
          </svg>`,
    tweens: `
      tl.fromTo(".${k}-d1", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - .68))}, duration: .9, ease: "power3.out" }, B + .16)
        .fromTo(".${k}-d2", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - .42))}, duration: .9, ease: "power3.out" }, B + .40);`
  };
}

function sceneSettle(k, p, t) {
  return {
    svg: `<svg viewBox="0 0 320 320" class="art">
        <circle class="${k}-s1" cx="160" cy="146" r="62" fill="${t.accent}" opacity=".14"/>
        <path class="${k}-s2" d="M126 146 L150 170 L196 124" fill="none" stroke="${t.accent}"
              stroke-width="13" stroke-linecap="round" stroke-linejoin="round"
              stroke-dasharray="120" stroke-dashoffset="120"/>
        <rect class="${k}-s3" x="104" y="236" width="112" height="5" rx="2.5" fill="${t.accent}" opacity=".5"/>
      </svg>`,
    tweens: `
      tl.fromTo(".${k}-s1", { scale: .6, autoAlpha: 0 }, { scale: 1, autoAlpha: .14, duration: .7, ease: "back.out(1.5)", transformOrigin: "160px 146px" }, B + .10)
        .fromTo(".${k}-s2", { strokeDashoffset: 120 }, { strokeDashoffset: 0, duration: .62, ease: "power2.out" }, B + .34)
        .fromTo(".${k}-s3", { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: .5, duration: .6, ease: "power3.out", transformOrigin: "160px 238px" }, B + .62);`
  };
}

const SCENE_FNS = {
  mark: sceneMark, cards: sceneCards, grid: sceneGrid, bars: sceneBars,
  compare: sceneCompare, split: sceneSplit, dials: sceneDials, settle: sceneSettle
};

// ── Escaping ─────────────────────────────────────────────────────────────────
// Headlines are authored in beats.mjs, but they land in markup, so they get
// escaped like anything else. Cheap, and it means a future headline with an
// ampersand cannot quietly break the render.
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The whole composition as one HTML string.
 *
 * @param {object}  o
 * @param {string}  o.compositionId  root data-composition-id AND the timeline key
 * @param {Array}   o.beats          from beatsFor()
 * @param {object}  o.theme          from palette()
 * @param {number}  o.totalSec       render length
 * Asset paths are ROOT-relative on purpose. A composition in compositions/ is
 * still served with the project root as its base URL, so "../assets/x" resolves
 * above the root and 404s in Studio — lint calls this
 * invalid_parent_traversal_in_asset_path and it is an error, not a warning.
 */
export function composition({ compositionId, beats, theme: t, totalSec }) {
  const assetPrefix = "assets/";
  const sections = [];
  const tweens = [];

  beats.forEach((b) => {
    const k = `${compositionId}-${b.id}`;
    const fn = SCENE_FNS[b.scene];
    if (!fn) throw new Error(`unknown scene "${b.scene}" on ${compositionId}/${b.id}`);
    const { svg, tweens: art } = fn(k, b.params, t);

    // The window runs past the beat so the outgoing frame can dissolve under the
    // incoming one. The last beat holds to the end instead — the film settles on
    // something rather than emptying out.
    const win = b.last ? Math.max(0.1, totalSec - b.start) : b.duration + CROSSFADE;

    sections.push(`
      <section id="${k}-clip" class="clip" data-start="${s3(b.start)}" data-duration="${s3(win)}" data-track-index="${b.index}">
        <div class="beat" id="${k}-beat">
          <div class="art-wrap" id="${k}-art">${svg}</div>
          <h1 class="headline" id="${k}-h">${esc(b.headline)}</h1>
          <p class="sub" id="${k}-s">${esc(b.sub || "")}</p>
        </div>
      </section>`);

    // Parallax: three layers move by different amounts. The art is the slowest,
    // the sub the fastest, so the frame has depth rather than sliding as a slab.
    const out = b.last ? "" : `
      tl.to("#${k}-beat", { autoAlpha: 0, duration: ${s3(CROSSFADE)}, ease: "power2.in" }, B + ${s3(b.duration)});`;

    tweens.push(`
    { const B = ${s3(b.start)};
      tl.fromTo("#${k}-beat", { autoAlpha: 0 }, { autoAlpha: 1, duration: .42, ease: "power2.out" }, B)
        .fromTo("#${k}-art", { y: 16 },  { y: 0, duration: .9,  ease: "power3.out" }, B)
        .fromTo("#${k}-h",   { y: 30 },  { y: 0, duration: .78, ease: "power3.out" }, B + .08)
        .fromTo("#${k}-s",   { y: 38 },  { y: 0, duration: .82, ease: "power3.out" }, B + .14);
      ${art}${out}
    }`);
  });

  // The background wash drifts across the WHOLE film — the deepest parallax
  // layer, and the only element that is not inside a clip.
  const bg = `
    tl.fromTo("#wash", { xPercent: -6, yPercent: -4 },
              { xPercent: 6, yPercent: 4, duration: ${s3(totalSec)}, ease: "none" }, 0);`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(compositionId)}</title>
    <script src="${assetPrefix}gsap.min.js"></script>
    <style>
      @font-face { font-family: "Inter"; font-weight: 400; font-style: normal;
                   src: url("${assetPrefix}Inter-400.woff2") format("woff2"); font-display: block; }
      @font-face { font-family: "Inter"; font-weight: 700; font-style: normal;
                   src: url("${assetPrefix}Inter-700.woff2") format("woff2"); font-display: block; }

      html, body { margin: 0; padding: 0; background: ${t.ground}; }
      #root {
        position: relative; width: ${W}px; height: ${H}px; overflow: hidden;
        background: ${t.ground};
        font-family: Inter, system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* Layer 1 — the wash. Oversized so the drift never exposes an edge. */
      #wash {
        position: absolute; left: -14%; top: -14%; width: 128%; height: 128%;
        background:
          radial-gradient(46% 42% at 30% 26%, ${t.accent}2E 0%, transparent 62%),
          radial-gradient(52% 46% at 76% 78%, ${t.accent}1F 0%, transparent 66%);
      }

      .clip { position: absolute; inset: 0; }
      .beat {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; padding: 64px 88px; box-sizing: border-box; text-align: center;
      }

      /* Transformed elements are block-level and sized — a lint requirement, and
         it stops the art box collapsing when the SVG is the only child. */
      .art-wrap { display: block; width: 340px; height: 340px; flex: 0 0 auto; }
      .art { display: block; width: 100%; height: 100%; overflow: visible; }

      .headline {
        display: block; margin: 18px 0 0; font-size: 84px; font-weight: 700;
        letter-spacing: -.035em; line-height: 1.02; color: ${t.text};
        max-width: 820px;
      }
      .sub {
        display: block; margin: 14px 0 0; font-size: 30px; font-weight: 400;
        line-height: 1.3; color: ${t.muted}; max-width: 760px;
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${esc(compositionId)}" data-start="0"
         data-width="${W}" data-height="${H}" data-duration="${s3(totalSec)}">
      <div id="wash"></div>
${sections.join("\n")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${bg}
${tweens.join("\n")}
      window.__timelines[${JSON.stringify(compositionId)}] = tl;
    </script>
  </body>
</html>
`;
}

export const CANVAS = { W, H, CROSSFADE };
