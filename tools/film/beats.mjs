// The storyboard: what each of the six beats SHOWS.
//
// ── Why there is a headline at all ───────────────────────────────────────────
// "Subtitles stay out of the video" means the narration script is never burned
// in — and it isn't: the caption line is DOM text under the stage
// (.onb-video-caption) and stays there. What each beat carries here is a
// three-word Keynote headline, which is the opposite of a subtitle: the script
// is a sentence being spoken, this is the one idea being shown.
//
// NEVER paste script text into a headline. If a headline needs a comma it is
// already too long.
//
// ── Shared spine, goal-specific middle ───────────────────────────────────────
// s1, s2, s5 and s6 are the same for everyone; s3 and s4 swap on the tester's
// primary goal. That mirrors data/onboarding-script.json exactly — the two files
// are keyed the same way and must be edited together.
//
// ── Scenes ───────────────────────────────────────────────────────────────────
// Eight parametric scenes cover all five scripts. Adding a script should mean
// picking scenes, not writing a ninth.
//
//   mark     one accent bloom, the opening title
//   cards    N cards arriving in sequence — questions being asked
//   grid     tiles lighting up — a picture filling in
//   bars     a row of bars, one of which refuses to sit still
//   compare  a peer band with your marker sliding onto it
//   split    one bar divided — committed against free
//   dials    two rings — the two numbers that decide a thing
//   settle   everything resolves to one calm mark, and holds

export const SCENES = ["mark", "cards", "grid", "bars", "compare", "split", "dials", "settle"];

// The four beats every script shares.
const SPINE = {
  s1: { scene: "mark",    headline: "Money Buddy",         sub: "a minute on how this works" },
  s2: { scene: "cards",   headline: "A few questions",     sub: "most days", params: { count: 3 } },
  s5: { scene: "compare", headline: "How you compare",     sub: "peers near you in size, income and area" },
  s6: { scene: "settle",  headline: "That's the whole thing", sub: "a little most days" }
};

// s3 and s4 per script id. Keyed to onboarding-script.json's `id`.
const MIDDLES = {
  onboarding_intro: {
    s3: { scene: "grid", headline: "The picture fills in", sub: "where it actually goes",
          params: { cols: 6, rows: 4 } },
    s4: { scene: "bars", headline: "Steady, or drifting",  sub: "and what you hadn't clocked",
          params: { heights: [58, 44, 71, 52, 63], restless: 2 } }
  },
  onboarding_paycheck: {
    s3: { scene: "split", headline: "Already spoken for", sub: "before the month starts",
          params: { committed: 0.62 } },
    s4: { scene: "grid",  headline: "Committed on day one", sub: "what's fixed, what's yours",
          params: { cols: 7, rows: 4, fillTo: 0.62 } }
  },
  onboarding_savings: {
    s3: { scene: "split", headline: "What survives", sub: "not what you meant to put aside",
          params: { committed: 0.78 } },
    s4: { scene: "bars",  headline: "Plan against actual", sub: "week to week",
          params: { heights: [40, 55, 47, 68], restless: 3, paired: true } }
  },
  onboarding_debt: {
    s3: { scene: "dials", headline: "Two numbers decide it", sub: "the rate, and what you pay above the minimum" },
    s4: { scene: "split", headline: "Move either one", sub: "and the finish line moves",
          params: { committed: 0.45, shiftTo: 0.28 } }
  },
  onboarding_understand: {
    s3: { scene: "grid", headline: "A few days of answers", sub: "that's all it takes",
          params: { cols: 6, rows: 4 } },
    s4: { scene: "bars", headline: "The shape of a month", sub: "in your own numbers",
          params: { heights: [72, 51, 44, 38, 29, 22], restless: -1 } }
  }
};

export const SCRIPT_IDS = Object.keys(MIDDLES);

/**
 * The six beats for one script, in order, each carrying its own start and
 * duration in seconds.
 *
 * `segments` is the parsed onboarding-script.json entry, and `durationsSec` are
 * the per-segment lengths computed by the caller — NOT recomputed here, so
 * there is exactly one place that owns the timing formula.
 */
export function beatsFor(scriptId, segments, durationsSec) {
  const middle = MIDDLES[scriptId];
  if (!middle) {
    throw new Error(`no storyboard for "${scriptId}" — add it to MIDDLES in beats.mjs`);
  }
  let t = 0;
  return segments.map((seg, i) => {
    const spec = SPINE[seg.id] || middle[seg.id];
    if (!spec) {
      throw new Error(`${scriptId}: segment "${seg.id}" has no beat. ` +
                      `The script and the storyboard have drifted apart.`);
    }
    const duration = durationsSec[i];
    const beat = {
      id: seg.id,
      index: i,
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
