// ─── Lifestyle Survey → Baseline Adapter ──────────────────────────────────────
// The Lifestyle Survey's side of the builder seam (js/budget-baseline.js):
// turns survey answers into the same normalized baseline the 2 Minute Budget
// produces. This is the ONLY code that understands survey answers — redesign
// the survey freely and only this adapter (and the screen) change. It never
// touches state.budget.
//
// ⚠ PLACEHOLDER CONTENT. The survey questions and these weight tables are
// throwaway scaffolding that exists to prove the two-builders-one-budget
// contract. When the real survey is designed, replace LS_QUESTIONS
// (screens/lifestyle-survey.js) and the weight math here; the baseline shape
// and submitBudgetBaseline() call are the parts that stay.
//
// Amounts only, no `details` — the survey thinks in whole categories, so the
// writer's canonical splits produce the per-cost lines.

// Base spending mix (% of net income), nudged by each answer's deltas and then
// normalized back to 100% so the built budget always opens balanced.
const LS_BASE_WEIGHTS = { housing: 32, bills: 12, food: 13, transport: 9,
                          health: 7, lifestyle: 9, debt: 6, savings: 12 };

// Per-answer weight deltas (percentage points, pre-normalization).
const LS_ANSWER_EFFECTS = {
  housing: {
    "rent-share":   { housing: -10, savings: +6, lifestyle: +4 },
    "rent-solo":    { housing: +4 },
    "own-mortgage": { housing: +2, bills: +2 },
    "own-outright": { housing: -18, savings: +12, lifestyle: +6 }
  },
  spending: {
    "homebody":     { food: -2, lifestyle: -3, transport: -2, savings: +7 },
    "balanced":     {},
    "out-and-about":{ food: +4, lifestyle: +5, transport: +2, savings: -11 }
  },
  savings: {
    "safety-first": { savings: +6, lifestyle: -3, food: -3 },
    "steady":       {},
    "aggressive":   { savings: +12, lifestyle: -6, food: -4, transport: -2 },
    "debt-crusher": { debt: +10, savings: -4, lifestyle: -4, food: -2 }
  }
};

// Flat effective tax estimate — PLACEHOLDER divergence from the 2MB, which has
// a bracket-based estimate inside its iframe (estimateCaTax in bb_template).
// The real survey should share one host-side tax helper with the wizard.
function lsEstimateNetMonthly(grossAnnual) {
  return Math.round((grossAnnual || 0) / 12 * 0.73);
}

// answers = { housing, spending, savings } (keys into LS_ANSWER_EFFECTS),
// grossAnnual = user-entered pre-tax annual income.
function lsAnswersToBaseline(answers, grossAnnual) {
  const net = lsEstimateNetMonthly(grossAnnual);
  if (net <= 0) return null;

  // Base + answer deltas, floored at 1 so no category vanishes entirely.
  const w = Object.assign({}, LS_BASE_WEIGHTS);
  Object.keys(LS_ANSWER_EFFECTS).forEach(q => {
    const effect = LS_ANSWER_EFFECTS[q][answers && answers[q]] || {};
    Object.keys(effect).forEach(k => { w[k] = Math.max(1, w[k] + effect[k]); });
  });

  // Normalize to 100% of net; savings absorbs rounding (same convention as the
  // 2MB's seeding — it's last and flexes).
  const totalW = Object.keys(w).reduce((s, k) => s + w[k], 0);
  const amounts = {};
  let allocated = 0;
  Object.keys(w).forEach(k => {
    if (k === "savings") return;
    amounts[k] = Math.round(net * w[k] / totalW / 10) * 10;
    allocated += amounts[k];
  });
  amounts.savings = Math.max(0, net - allocated);

  // Profile: the survey skeleton only asks income — carry the rest over from
  // the existing profile (update case) or leave the seeded defaults.
  const p = state.budget.profile;
  return {
    source: "lifestyleSurvey",
    profile: {
      zip:           p.zip || "",
      gender:        p.gender || "",
      age:           p.age || 0,
      householdSize: p.householdSize || 1,
      incomeMode:    "annual",
      grossMonthly:  Math.round((grossAnnual || 0) / 12),
      netMonthly:    net
    },
    amounts: amounts
  };
}
