// ─── Goals V2 · Tuning ────────────────────────────────────────────────────────
// Every behavioral knob for the goals module in ONE place — tunable like a game
// economy. No functions here; this file only declares the GOALS_TUNING const and
// must load FIRST among the goals module files (other goals files read it at call
// time). The admin tuning editor (goals-admin.js) writes into this object live.
//
// See docs/goals-module-plan.md §GOALS_TUNING for the design rationale.

const GOALS_TUNING = {

  // ── Feasibility verdict thresholds ──────────────────────────────────────────
  // ratio = requiredMonthly / monthlyCapacity. Lower ratio = easier.
  feasibility: {
    comfortableRatio: 0.50,   // ratio ≤ this → "comfortable"
    tightRatio:       0.90,   // ratio ≤ this → "tight"; above → "unrealistic"
    spendCutFloorPct: 0.70,   // categoryCut can't push spend below peerAvg × this
    lessonsPerWeekComfortable: 2,
    lessonsPerWeekTight:       4,
    annualReturnAssumption:    0.07  // mocked market return for retirement/passive goals
  },

  // ── Sprint cadence + sizing ─────────────────────────────────────────────────
  sprints: {
    weeklyIfUnderDays: 180,   // horizon < this → 7-day sprints, else 14-day
    firstSprintEase:   0.60,  // current window target = even-split × this (hyper-achievable)
    roundTo:           5,      // round sprint targets to nearest (usd goals)
    upcomingShown:     3       // how many upcoming sprints the timeline shows
  },

  // ── Simulated cohort ────────────────────────────────────────────────────────
  cohort: {
    size: 24,
    archetypeMix: { leader: 0.15, steady: 0.45, sporadic: 0.30, laggard: 0.10 },
    // Per-archetype daily score-gain ranges [min,max] (deterministic jitter between)
    dailyGain: {
      leader:   [14, 22],
      steady:   [8,  14],
      sporadic: [3,  16],   // wide = streaky
      laggard:  [1,  6]
    },
    // User raw-score weights — engagement-driven, NOT dollar-driven
    pointsPerAction:  30,
    sprintRateWeight: 200,
    onPaceBonus:      150,
    // Guardrail clamps (applied to the USER's rank only, never to bots)
    neutralPercentile:  50,   // day 1 / zero events → median
    firstActionFloorPct: 60,  // ≥1 action ever → floor here (top-40% unlock)
    lapsedFloorPct:      55,  // lapsed (>lapseAfterDays inactive) → pinned here, never bottom
    engagement: {
      minSprintRate: 0.75,    // "engaged" needs sprintRate ≥ this …
      onPaceRatio:   0.90,    // … AND actual ≥ expected × this
      lapseAfterDays: 10      // no action in this many sim-days → "lapsed"
    },
    replayCapDays: 730        // cap day-by-day standing replay (achievements) for cost
  },

  // ── Achievements ────────────────────────────────────────────────────────────
  achievements: {
    streakTiers:     [2, 4, 8],            // consecutive sprint-done runs that earn a streak medal
    completionTiers: { gold: 0.90, silver: 0.60 },  // milestones-hit ratio → trophy tier
    rankTitles: {
      gold:   "Goal Champion",
      silver: "Goal Finisher",
      bronze: "Goal Closer"
    }
  }
};
