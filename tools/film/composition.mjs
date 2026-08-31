// One beat storyboard + one look → one HyperFrames composition.
//
// ── This is promo material ───────────────────────────────────────────────────
// Not a deck, and no longer a news desk either. The stock-ticker crawl went:
// it read as furniture borrowed from a channel nobody watches, and it ate the
// bottom eighth of the frame that the visuals wanted. What is left:
//
//   · a thin LIVE strip at the very top          (small, cheap, sets the register)
//   · the SCENE, given most of the frame          (the reason to watch)
//   · a lower-left chyron: rule, headline, sub    (the claim)
//   · an accent progress hairline at the foot     (the only remaining furniture)
//
// The energy comes from three things, in order of how much they matter:
//   1. every scene DRAWS — nothing fades into its final state
//   2. the headline lands word by word with an overshoot
//   3. a light sweep wipes across the frame on each beat change
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
// ── NOTHING HERE SCALES OR ROTATES AN SVG SHAPE ─────────────────────────────
// This cost hours. scaleY/scaleX on an SVG child left every shape displaced by
// its own size — bars floating clear of the baseline they stand on. It was not
// the origin: transformOrigin percentages, transform-box: fill-box and GSAP's
// svgOrigin all failed the same way, and stripping the tween proved the markup
// was right. So SVG scenes animate GEOMETRY — a rect's x/y/width/height, a
// circle's r, a path's stroke-dashoffset. There is no origin to resolve, so it
// cannot be displaced.
//
// TRANSLATION (x/y) and opacity on SVG are fine and used freely. So is any
// transform on an ORDINARY HTML element, which is why the decorative motion —
// the glow, the sweep — is HTML rather than SVG.
//
// If you add motion to an SVG shape, animate its attributes, and look at a
// snapshot: nothing in lint, check or the render reports this class of bug.

// Everything below is authored against a 1000x720 frame and rendered at SCALE.
// The SVG viewBoxes are unitless and fit their box, so only the CSS pixel
// values multiply — which is why every one of them goes through px().
const SCALE = 1.5;
const W = 1000 * SCALE;
const H = 720 * SCALE;
const CROSSFADE = 0.4;
const px = (n) => Math.round(n * SCALE);

// THE VERTICAL BUDGET, in AUTHORED units (before SCALE). 720 total. The beat runs from the 62px live strip to a
// 26px foot, leaving 632. The chyron's worst case is a two-line headline plus a
// two-line sub — 8 rule + 14 + 2x71 + 12 + 2x34 = 244 — so the stage takes 370
// and there is still slack. Grow the type or the stage past this and `check`
// fails with text_occluded, which is how these numbers were arrived at.
const STAGE_H = 370;   // authored units; multiplied by SCALE at use

const s3 = (n) => Math.round(n * 1000) / 1000;

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ── Scenes ───────────────────────────────────────────────────────────────────
// Each returns { svg, tweens }. `tweens` is GSAP source positioned against B,
// the beat's start; `k` scopes every selector to its own beat. The scene viewBox
// is 1000 x 370 — the stage in real pixels, so nothing needs rescaling by hand.

const MID = 185;   // the stage's vertical centre

/**
 * The opener. A burst, not a logo reveal: the disc lands, twelve shards fly out
 * of it, and two rings chase them. It is the first two seconds of the film and
 * the only chance to make someone want to watch the rest.
 */
function sceneOpen(k, p, t) {
  const cx = 500, cy = MID;
  const N = 12;
  const shards = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return { i, dx: s3(Math.cos(a) * 210), dy: s3(Math.sin(a) * 150),
             x: s3(cx + Math.cos(a) * 74), y: s3(cy + Math.sin(a) * 74) };
  });
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">
      ${shards.map(sh => `<circle class="${k}-sh${sh.i}" cx="${sh.x}" cy="${sh.y}" r="7" fill="${t.accent}" opacity="0"/>`).join("")}
      <circle class="${k}-r1" cx="${cx}" cy="${cy}" r="66" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0"/>
      <circle class="${k}-r2" cx="${cx}" cy="${cy}" r="66" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0"/>
      <circle class="${k}-core" cx="${cx}" cy="${cy}" r="0" fill="${t.accent}"/>
      <path class="${k}-star" d="M${cx} ${cy - 42} L${cx + 16} ${cy - 16} L${cx + 42} ${cy} L${cx + 16} ${cy + 16} L${cx} ${cy + 42} L${cx - 16} ${cy + 16} L${cx - 42} ${cy} L${cx - 16} ${cy - 16} Z"
            fill="${t.onAccent}" opacity="0"/>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-core", { attr: { r: 0 } }, { attr: { r: 66 }, duration: .42, ease: "back.out(3)" }, B + .04)
        .fromTo(".${k}-star", { opacity: 0 }, { opacity: 1, duration: .24, ease: "power2.out" }, B + .2)
${shards.map(sh => `        .fromTo(".${k}-sh${sh.i}", { x: 0, y: 0, opacity: 1 }, { x: ${sh.dx}, y: ${sh.dy}, opacity: 0, duration: 1.05, ease: "power3.out" }, B + ${s3(0.24 + sh.i * 0.012)})`).join("\n")}
        .fromTo(".${k}-r1", { attr: { r: 66 }, opacity: .9 }, { attr: { r: 168 }, opacity: 0, duration: 1.1, ease: "power3.out" }, B + .26)
        .fromTo(".${k}-r2", { attr: { r: 66 }, opacity: .55 }, { attr: { r: 250 }, opacity: 0, duration: 1.6, ease: "power3.out" }, B + .52);`
  };
}

function sceneChips(k, p, t) {
  const labels = ["Groceries", "Dining out", "Transport", "Subscriptions", "Shopping"];
  const cw = 340, ch = 50, gap = 14;
  const y0 = MID - ((labels.length * ch + (labels.length - 1) * gap) / 2);
  const rows = labels.map((wd, i) => {
    const y = y0 + i * (ch + gap);
    const hot = i === 2;
    return `<g class="${k}-q${i}" opacity="0">
      <rect x="${500 - cw / 2}" y="${y}" width="${cw}" height="${ch}" rx="25"
            fill="${hot ? t.accent : t.panel}" stroke="${hot ? t.accent : t.rule}" stroke-width="2"/>
      <text x="500" y="${y + 33}" text-anchor="middle" font-size="23" font-weight="700"
            font-family="Inter, sans-serif" fill="${hot ? t.onAccent : t.ink}">${esc(wd)}</text>
    </g>`;
  }).join("");
  const sel = labels.map((_, i) => `".${k}-q${i}"`).join(", ");
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">${rows}</svg>`,
    tweens: `
      tl.fromTo([${sel}], { opacity: 0, x: 90 },
                { opacity: 1, x: 0, duration: .32, ease: "back.out(1.8)", stagger: .1 }, B + .08);`
  };
}

function sceneMosaic(k, p, t) {
  const cols = p.cols || 8, rows = p.rows || 5;
  const cell = 62, pad = 8;
  const x0 = 500 - (cols * cell) / 2, y0 = MID - (rows * cell) / 2;
  // A FIXED pattern, never Math.random — renders must be reproducible.
  const accentAt = (i) => (i * 7 + 3) % 11 < 4;
  let tiles = "";
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    tiles += `<rect class="${k}-m" x="${x0 + c * cell + pad / 2}" y="${y0 + r * cell + pad / 2}"
                    width="${cell - pad}" height="${cell - pad}" rx="11"
                    fill="${accentAt(i) ? t.accent : t.ink}" opacity="0"/>`;
  }
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">${tiles}</svg>`,
    tweens: `
      tl.fromTo(".${k}-m", { opacity: 0, y: -14 },
                { opacity: .92, y: 0, duration: .32, ease: "back.out(2)",
                  stagger: { each: .018, grid: [${rows}, ${cols}], from: "start" } }, B + .08);`
  };
}

function sceneLine(k, p, t) {
  const pts = p.series || [38, 42, 40, 44, 41, 58, 52, 71];
  // `top` is not the top of the box: the delta badge sits ~92 units ABOVE the
  // final plot point, and with top=46 that put it off-canvas — the badge was
  // visibly guillotined. The plot ceiling now leaves room for its own label.
  const BADGE_LIFT = 92;
  const x0 = 150, x1 = 850, base = 302, top = BADGE_LIFT + 34;
  const step = (x1 - x0) / (pts.length - 1);
  const max = Math.max(...pts) * 1.14;
  const xy = pts.map((v, i) => [x0 + i * step, base - (v / max) * (base - top)]);
  const d = xy.map((q, i) => `${i ? "L" : "M"}${s3(q[0])} ${s3(q[1])}`).join(" ");
  const head = xy[xy.length - 1];
  const up = p.dir !== "down";
  const badge = up ? t.accent : t.hot;
  const L = Math.ceil(xy.reduce((a, q, i) =>
    i ? a + Math.hypot(q[0] - xy[i - 1][0], q[1] - xy[i - 1][1]) : 0, 0) * 1.15);

  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">
      ${[0, 1, 2, 3].map(i => `<line x1="${x0}" y1="${s3(top + i * (base - top) / 3)}" x2="${x1}" y2="${s3(top + i * (base - top) / 3)}" stroke="${t.rule}" stroke-width="1.5"/>`).join("")}
      <path class="${k}-area" d="${d} L${s3(x1)} ${base} L${s3(x0)} ${base} Z" fill="${t.accent}" opacity="0"/>
      <path class="${k}-line" d="${d}" fill="none" stroke="${t.accent}" stroke-width="9"
            stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="${L}" stroke-dashoffset="${L}"/>
      <circle class="${k}-halo" cx="${s3(head[0])}" cy="${s3(head[1])}" r="0" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0"/>
      <circle class="${k}-head" cx="${s3(head[0])}" cy="${s3(head[1])}" r="0" fill="${t.accent}"/>
      <g class="${k}-badge" opacity="0">
        <rect x="${s3(head[0]) - 68}" y="${s3(head[1] - BADGE_LIFT)}" width="136" height="52" rx="26" fill="${badge}"/>
        <text x="${s3(head[0])}" y="${s3(head[1] - BADGE_LIFT + 36)}" text-anchor="middle" font-size="27" font-weight="800"
              font-family="Inter, sans-serif" fill="${t.onAccent}">${up ? "▲" : "▼"} ${p.pct || 0}%</text>
      </g>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-line", { strokeDashoffset: ${L} }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, B + .1)
        .fromTo(".${k}-area", { opacity: 0 }, { opacity: .15, duration: .8, ease: "power2.out" }, B + .46)
        .fromTo(".${k}-head", { attr: { r: 0 } }, { attr: { r: 15 }, duration: .32, ease: "back.out(2.6)" }, B + 1.4)
        .fromTo(".${k}-halo", { attr: { r: 15 }, opacity: .9 }, { attr: { r: 58 }, opacity: 0, duration: 1.1, ease: "power2.out" }, B + 1.5)
        .fromTo(".${k}-badge", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .32, ease: "back.out(2.2)" }, B + 1.54);`
  };
}

function sceneDonut(k, p, t) {
  const cx = 500, cy = MID - 12, r = 116, sw = 42;
  const C = 2 * Math.PI * r;
  const pct = p.pct || 50;
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.rule}" stroke-width="${sw}"/>
      <circle class="${k}-arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.accent}"
              stroke-width="${sw}" stroke-linecap="round"
              stroke-dasharray="${s3(C)}" stroke-dashoffset="${s3(C)}" transform="rotate(-90 ${cx} ${cy})"/>
      <text class="${k}-num" x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="72" font-weight="800"
            font-family="Inter, sans-serif" fill="${t.ink}">0%</text>
      <text x="${cx}" y="${cy + 160}" text-anchor="middle" font-size="22" font-weight="600"
            font-family="Inter, sans-serif" fill="${t.inkSoft}">of the month</text>
    </svg>`,
    // The counter writes a PERCENTAGE. Never a currency figure — see beats.mjs.
    tweens: `
      tl.fromTo(".${k}-arc", { strokeDashoffset: ${s3(C)} },
                { strokeDashoffset: ${s3(C * (1 - pct / 100))}, duration: 1.25, ease: "power3.out" }, B + .12)
        .to({ v: 0 }, { v: ${pct}, duration: 1.25, ease: "power3.out",
              onUpdate: function () {
                var el = document.querySelector(".${k}-num");
                if (el) el.textContent = Math.round(this.targets()[0].v) + "%";
              } }, B + .12);`
  };
}

function sceneDials(k, p, t) {
  const r = 80, sw = 28, C = 2 * Math.PI * r, cy = MID - 18;
  const a = (p.a || 68) / 100, b = (p.b || 34) / 100;
  const one = (cls, cx, frac, label) => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.rule}" stroke-width="${sw}"/>
      <circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.accent}" stroke-width="${sw}"
              stroke-linecap="round" stroke-dasharray="${s3(C)}" stroke-dashoffset="${s3(C)}"
              transform="rotate(-90 ${cx} ${cy})"/>
      <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="42" font-weight="800"
            font-family="Inter, sans-serif" fill="${t.ink}">${Math.round(frac * 100)}%</text>
      <text x="${cx}" y="${cy + 128}" text-anchor="middle" font-size="22" font-weight="600"
            font-family="Inter, sans-serif" fill="${t.inkSoft}">${esc(label)}</text>
    </g>`;
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">
            ${one(`${k}-d1`, 335, a, p.aLabel || "the rate")}
            ${one(`${k}-d2`, 665, b, p.bLabel || "what you pay")}
          </svg>`,
    tweens: `
      tl.fromTo(".${k}-d1", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - a))}, duration: 1.0, ease: "power3.out" }, B + .12)
        .fromTo(".${k}-d2", { strokeDashoffset: ${s3(C)} }, { strokeDashoffset: ${s3(C * (1 - b))}, duration: 1.0, ease: "power3.out" }, B + .4);`
  };
}

function sceneRace(k, p, t) {
  const vals = p.bars || [92, 74, 58, 41, 33, 21];
  const x0 = 200, wMax = 600, bh = 30, gap = 15;
  const y0 = MID - ((vals.length * bh + (vals.length - 1) * gap) / 2);
  const rows = vals.map((v, i) => {
    const y = y0 + i * (bh + gap);
    const hot = i === p.hot;
    return `<g>
      <rect x="${x0}" y="${y}" width="${wMax}" height="${bh}" rx="15" fill="${t.rule}" opacity=".55"/>
      <rect class="${k}-r${i}" x="${x0}" y="${y}" width="0" height="${bh}" rx="15"
            fill="${hot ? t.accent : t.ink}" opacity="${hot ? "1" : ".6"}"/>
    </g>`;
  }).join("");
  const grow = vals.map((v, i) => `
      tl.fromTo(".${k}-r${i}", { attr: { width: 0 } },
                { attr: { width: ${s3(wMax * v / 100)} }, duration: .75, ease: "power3.out" }, B + .1 + ${s3(i * 0.07)});`).join("");
  const shift = p.shift ? `
      tl.to(".${k}-r${p.hot}", { attr: { width: ${s3(wMax * 0.94)} }, duration: .85, ease: "power2.inOut" }, B + 1.6);` : "";
  return { svg: `<svg viewBox="0 0 1000 370" class="art">${rows}</svg>`, tweens: `${grow}${shift}` };
}

/**
 * Peer comparison, one horizontal track per category.
 *
 * The shaded span is where peers like you land; the marker is where you sit on
 * it; the badge says how far off you are. Positions on a 0-100 track, never
 * amounts — the film has no dollar figures in it anywhere (beats.mjs).
 *
 * This replaced a single abstract band, which said "you differ" without saying
 * from what. Four named categories say the same thing and are worth reading.
 */
function scenePeers(k, p, t) {
  const rows = p.rows || [];
  const labX = 250, x0 = 286, wTrack = 560, bh = 22, gap = 40;
  const y0 = MID - ((rows.length * bh + (rows.length - 1) * gap) / 2) + 16;
  const at = (v) => s3(x0 + (v / 100) * wTrack);

  const svg = rows.map((r, i) => {
    const y = y0 + i * (bh + gap);
    const up = r.dir !== "down";
    const badge = up ? t.accent : t.hot;
    return `<g>
      <text x="${labX}" y="${y + 17}" text-anchor="end" font-size="21" font-weight="700"
            font-family="Inter, sans-serif" fill="${t.ink}">${esc(r.label)}</text>
      <rect x="${x0}" y="${y + 4}" width="${wTrack}" height="${bh - 8}" rx="7" fill="${t.rule}" opacity=".6"/>
      <rect class="${k}-b${i}" x="${at((r.lo + r.hi) / 2)}" y="${y}" width="0" height="${bh}" rx="11"
            fill="${t.accent}" opacity=".3"/>
      ${i === 0 ? `<text class="${k}-cap" x="${at((r.lo + r.hi) / 2)}" y="${y - 14}" text-anchor="middle"
            font-size="20" font-weight="700" font-family="Inter, sans-serif"
            fill="${t.accent}" opacity="0">Peers like you</text>` : ""}
      <circle class="${k}-y${i}" cx="${at(r.you)}" cy="${y + bh / 2}" r="13" fill="${t.accent}" opacity="0"/>
      <g class="${k}-p${i}" opacity="0">
        <rect x="${x0 + wTrack + 22}" y="${y - 6}" width="92" height="34" rx="17" fill="${badge}"/>
        <text x="${x0 + wTrack + 68}" y="${y + 18}" text-anchor="middle" font-size="19" font-weight="800"
              font-family="Inter, sans-serif" fill="${t.onAccent}">${up ? "▲" : "▼"} ${r.pct}%</text>
      </g>
    </g>`;
  }).join("");

  const tweens = rows.map((r, i) => `
      tl.fromTo(".${k}-b${i}", { attr: { x: ${at((r.lo + r.hi) / 2)}, width: 0 } },
                { attr: { x: ${at(r.lo)}, width: ${s3(at(r.hi) - at(r.lo))} }, duration: .55, ease: "power3.out" }, B + .1 + ${s3(i * 0.13)})
        .fromTo(".${k}-y${i}", { opacity: 0, x: -170 }, { opacity: 1, x: 0, duration: .5, ease: "back.out(2)" }, B + .28 + ${s3(i * 0.13)})
        .fromTo(".${k}-p${i}", { opacity: 0, x: 22 }, { opacity: 1, x: 0, duration: .3, ease: "back.out(2)" }, B + .5 + ${s3(i * 0.13)});`).join("");

  // The legend used to be a caption under the whole chart — "shaded band =
  // peers like you" — which reads like a footnote apologising for the chart.
  // It labels the FIRST band directly instead, so the thing and its name are in
  // the same place and the other three rows inherit the reading.
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">${svg}</svg>`,
    tweens: tweens + `
      tl.fromTo(".${k}-cap", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .34, ease: "power2.out" }, B + .5);`
  };
}

function sceneClose(k, p, t) {
  const cx = 500, cy = MID - 10;
  return {
    svg: `<svg viewBox="0 0 1000 370" class="art">
      <circle class="${k}-halo" cx="${cx}" cy="${cy}" r="0" fill="${t.accent}" opacity=".18"/>
      <circle class="${k}-ring" cx="${cx}" cy="${cy}" r="112" fill="none" stroke="${t.accent}" stroke-width="4" opacity="0"/>
      <path class="${k}-tick" d="M${cx - 62} ${cy} L${cx - 18} ${cy + 46} L${cx + 66} ${cy - 44}"
            fill="none" stroke="${t.accent}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="230" stroke-dashoffset="230"/>
      <rect class="${k}-bar" x="${cx}" y="${cy + 142}" width="0" height="9" rx="4.5" fill="${t.accent}" opacity=".6"/>
    </svg>`,
    tweens: `
      tl.fromTo(".${k}-halo", { attr: { r: 0 } }, { attr: { r: 112 }, duration: .55, ease: "back.out(2)" }, B + .06)
        .fromTo(".${k}-tick", { strokeDashoffset: 230 }, { strokeDashoffset: 0, duration: .5, ease: "power2.out" }, B + .26)
        .fromTo(".${k}-ring", { attr: { r: 112 }, opacity: .8 }, { attr: { r: 220 }, opacity: 0, duration: 1.3, ease: "power3.out" }, B + .5)
        .fromTo(".${k}-bar", { attr: { x: ${cx}, width: 0 } }, { attr: { x: ${cx - 100}, width: 200 }, duration: .55, ease: "power3.out" }, B + .58);`
  };
}

const SCENE_FNS = {
  open: sceneOpen, chips: sceneChips, mosaic: sceneMosaic, line: sceneLine,
  donut: sceneDonut, dials: sceneDials, race: sceneRace, peers: scenePeers, close: sceneClose
};

// ── Kinetic type ─────────────────────────────────────────────────────────────
// The headline arrives WORD BY WORD with an overshoot. One tween on the whole
// string reads as a slide transition; per-word is what makes it feel like a cut
// rather than a dissolve. Two nested spans: the outer clips, the inner rides the
// transform, so each word rises out of nothing.
function kineticWords(text, cls) {
  return String(text).split(/\s+/).filter(Boolean)
    .map(w => `<span class="kw"><span class="${cls}" data-layout-allow-overlap>${esc(w)}</span></span>`).join(" ");
}

export function composition({ compositionId, beats, theme: t, totalSec }) {
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
          <div class="sweep" id="${k}-sweep"></div>
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
      tl.fromTo("#${k}-beat", { autoAlpha: 0 }, { autoAlpha: 1, duration: .24, ease: "power2.out" }, B)
        .fromTo("#${k}-sweep", { xPercent: -130 }, { xPercent: 130, duration: .75, ease: "power2.inOut" }, B)
        .fromTo("#${k}-art", { y: 26 }, { y: 0, duration: .75, ease: "power3.out" }, B)
        .fromTo("#${k}-rule", { scaleX: 0 }, { scaleX: 1, duration: .4, ease: "power3.out" }, B + .04)
        .fromTo(".${k}-w", { yPercent: 118, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: .42, ease: "back.out(2)", stagger: .05 }, B + .08)
        .fromTo("#${k}-s", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .48, ease: "power3.out" }, B + .28);
      ${art}${out}
    }`);
  });

  // Furniture, outside every clip so it never restarts.
  const blinks = Math.max(1, Math.round(totalSec / 1.2));
  const furniture = `
    tl.fromTo("#elapsed", { scaleX: 0 }, { scaleX: 1, duration: ${s3(totalSec)}, ease: "none" }, 0)
      .fromTo("#live", { opacity: 1 }, { opacity: .2, duration: .6, ease: "power1.inOut", yoyo: true, repeat: ${blinks} }, 0)
      .fromTo("#glow", { xPercent: -7, yPercent: -5 }, { xPercent: 7, yPercent: 5, duration: ${s3(totalSec)}, ease: "none" }, 0);`;

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

      /* Decorative motion is HTML, never SVG — see the transform note above. */
      #glow {
        position: absolute; left: -14%; top: -14%; width: 128%; height: 128%;
        background:
          radial-gradient(42% 38% at 24% 20%, ${t.wash}${t.isDark ? "44" : "34"} 0%, transparent 62%),
          radial-gradient(48% 42% at 80% 76%, ${t.wash}${t.isDark ? "2E" : "22"} 0%, transparent 66%);
      }

      #toprail { position: absolute; top: 0; left: 0; right: 0; height: ${px(58)}px; display: flex;
                 align-items: center; gap: ${px(12)}px; padding: 0 ${px(78)}px; box-sizing: border-box; }
      #live { display: block; width: ${px(12)}px; height: ${px(12)}px; border-radius: 50%; background: ${t.hot}; flex: 0 0 auto; }
      /* Full ink, not inkSoft: it is the wordmark, and inkSoft failed AA here —
         it clears 4.5:1 against the flat ground, but the glow drifts underneath
         it and takes the effective contrast down to 3.7. Caught by hyperframes check. */
      #livetext { font-size: ${px(15)}px; font-weight: 700; letter-spacing: .22em; color: ${t.ink}; }

      .clip { position: absolute; inset: 0; }
      .beat { position: absolute; left: 0; right: 0; top: ${px(62)}px; bottom: ${px(26)}px;
              display: flex; flex-direction: column; overflow: hidden; }

      /* A light wipe across the frame on every beat change. Cheap, and it does
         more for the "promo" register than any amount of extra scene motion. */
      .sweep {
        position: absolute; inset: -10% -40%; pointer-events: none;
        background: linear-gradient(100deg, transparent 38%, ${t.wash}${t.isDark ? "30" : "26"} 50%, transparent 62%);
      }

      .stage { display: block; width: 100%; height: ${px(STAGE_H)}px; flex: 0 0 auto; position: relative; }
      .art { display: block; width: 100%; height: 100%; overflow: visible; }

      .chyron { display: block; padding: 0 ${px(78)}px; box-sizing: border-box; position: relative; }
      .rule { display: block; width: ${px(96)}px; height: ${px(8)}px; border-radius: ${px(4)}px; background: ${t.accent};
              transform-origin: 0 50%; margin-bottom: ${px(14)}px; }
      .headline { display: block; margin: 0; font-size: ${px(68)}px; font-weight: 700; letter-spacing: -.035em;
                  line-height: 1.04; color: ${t.ink}; }
      .kw { display: inline-block; overflow: hidden; vertical-align: bottom; }
      .headline .kw > span { display: inline-block; }
      .sub { display: block; margin: ${px(12)}px 0 0; font-size: ${px(26)}px; font-weight: 400; line-height: 1.28; color: ${t.inkSoft}; }

      /* The only furniture left at the foot: how far through we are. */
      #foot { position: absolute; left: 0; right: 0; bottom: 0; height: ${px(6)}px; background: ${t.rule}; }
      #elapsed { display: block; height: 100%; width: 100%; background: ${t.accent}; transform-origin: 0 50%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${esc(compositionId)}" data-start="0"
         data-width="${W}" data-height="${H}" data-duration="${s3(totalSec)}">
      <div id="glow"></div>
      <div id="toprail"><span id="live"></span><span id="livetext">MONEY BUDDY</span></div>
${sections.join("\n")}
      <div id="foot"><span id="elapsed"></span></div>
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
