// The storyboard: what each of the six beats SHOWS.
//
// ── The register ─────────────────────────────────────────────────────────────
// CNBC crossed with TikTok. Charts that draw live rather than diagrams that sit
// there; type that punches in word by word; a ticker rail running under the
// whole film. Broadcast furniture, at the pace of a feed.
//
// ── NO DOLLAR AMOUNTS. EVER. ─────────────────────────────────────────────────
// This film is pre-rendered and plays BEFORE the tester has entered anything, so
// every figure in it would be invented. A dollar amount on screen at that moment
// reads as "the app already knows something about me", which is worse than
// unhelpful. Percentages, proportions, directional badges and motion carry the
// energy instead. Owner decision; do not add a currency figure here later.
//
// ── Why there is a headline at all ───────────────────────────────────────────
// "Subtitles stay out of the video" means the narration script is never burned
// in — and it isn't: the caption is DOM text under the stage. What a beat
// carries here is a three-word broadcast headline, which is the opposite of a
// subtitle. NEVER paste script text into one.
//
// ── Shared spine, goal-specific middle ───────────────────────────────────────
// s1, s2, s5 and s6 are the same for everyone; s3 and s4 swap on the primary
// goal, mirroring data/onboarding-script.json. The two files are keyed the same
// way and must be edited together.
//
// ── Scenes ───────────────────────────────────────────────────────────────────
//   pulse   the open — mark, pulse rings, wordmark
//   chips   category chips arriving fast, one after another
//   mosaic  a tile grid filling in, cell by cell
//   line    a chart drawing under a live plot head, with a direction badge
//   donut   a ring sweeping to a share, with a counting percentage
//   dials   two rings, the two numbers that decide a thing
//   race    bars growing and re-sorting
//   band    a peer distribution with a marker slamming onto it
//   close   everything condenses back to the mark

export const SCENES = ["pulse", "chips", "mosaic", "line", "donut", "dials", "race", "band", "close"];

const SPINE = {
  s1: { scene: "pulse", headline: "Money Buddy",           sub: "sixty seconds on how this works" },
  s2: { scene: "chips", headline: "A few questions",       sub: "most days, and that's it" },
  s5: { scene: "band",  headline: "How you compare",       sub: "peers near you in size, income and area",
        params: { pct: 12, dir: "up" } },
  s6: { scene: "close", headline: "That's the whole thing", sub: "a little most days" }
};

const MIDDLES = {
  onboarding_intro: {
    s3: { scene: "mosaic", headline: "The picture fills in", sub: "where it actually goes",
          params: { cols: 8, rows: 5 } },
    s4: { scene: "line",   headline: "Steady, or drifting",  sub: "and what you hadn't clocked",
          params: { series: [38, 42, 40, 44, 41, 58, 52, 71], pct: 24, dir: "up" } }
  },
  onboarding_paycheck: {
    s3: { scene: "donut", headline: "Already spoken for", sub: "before the month starts",
          params: { pct: 62 } },
    s4: { scene: "race",  headline: "Committed on day one", sub: "what's fixed, what's yours",
          params: { bars: [92, 74, 58, 41, 33, 21], hot: 0 } }
  },
  onboarding_savings: {
    s3: { scene: "donut", headline: "What survives", sub: "not what you meant to put aside",
          params: { pct: 22 } },
    s4: { scene: "line",  headline: "Plan against actual", sub: "week to week",
          params: { series: [50, 47, 52, 44, 55, 41, 48, 36], pct: 14, dir: "down" } }
  },
  onboarding_debt: {
    s3: { scene: "dials", headline: "Two numbers decide it", sub: "the rate, and what you pay above the minimum",
          params: { a: 68, b: 34, aLabel: "the rate", bLabel: "what you pay" } },
    s4: { scene: "race",  headline: "Move either one", sub: "and the finish line moves",
          params: { bars: [88, 70, 55, 38, 26], hot: 4, shift: true } }
  },
  onboarding_understand: {
    s3: { scene: "mosaic", headline: "A few days of answers", sub: "that's all it takes",
          params: { cols: 8, rows: 5 } },
    s4: { scene: "race",   headline: "The shape of a month", sub: "in your own numbers",
          params: { bars: [96, 68, 54, 44, 33, 25, 18], hot: 0 } }
  }
};

export const SCRIPT_IDS = Object.keys(MIDDLES);

// The ticker rail runs the app's REAL taxonomy — the twelve categories the
// budget is built from (js/taxonomy.js). Inventing plausible-looking category
// names would have been the easy thing and would have put words on screen that
// the product never uses.
export const TICKER = [
  "Housing", "Groceries", "Dining out", "Transport",
  "Utilities", "Subscriptions", "Health", "Personal care",
  "Entertainment", "Shopping", "Debt payments", "Other"
];

export function beatsFor(scriptId, segments, durationsSec) {
  const middle = MIDDLES[scriptId];
  if (!middle) throw new Error(`no storyboard for "${scriptId}" — add it to MIDDLES in beats.mjs`);
  let t = 0;
  return segments.map((seg, i) => {
    const spec = SPINE[seg.id] || middle[seg.id];
    if (!spec) {
      throw new Error(`${scriptId}: segment "${seg.id}" has no beat. ` +
                      `The script and the storyboard have drifted apart.`);
    }
    const duration = durationsSec[i];
    const beat = {
      id: seg.id, index: i,
      start: Math.round(t * 1000) / 1000,
      duration: Math.round(duration * 1000) / 1000,
      last: i === segments.length - 1,
      ...spec,
      params: spec.params || {}
    };
    t += duration;
    return beat;
  });
}
