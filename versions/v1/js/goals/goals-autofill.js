// ─── Goals V2 · Autofill (mocked automation) ──────────────────────────────────
// THE production-API replacement seam. Everything a real build would fetch from
// a credit bureau, rate feed, or tax service is mocked here and surfaced to the
// user as "context cards" (a value + its source + a plain-English explanation,
// each overridable). Replace GOALS_MOCK + the resolvers with real APIs in the
// native rebuild; nothing else in the module reads these services directly.

const GOALS_MOCK = {
  credit: { score: 712, bureau: "TransUnion (mock)" },
  rates: {
    savingsAPY:   0.043,   // high-yield savings
    mortgage:     0.068,   // 30-yr fixed
    auto:         0.072,   // auto loan, mid credit tier
    refi:         0.059,   // refinance offer
    marketReturn: 0.07     // long-run market assumption
  },
  creditGainPerMonth: 8,   // score points/month with on-time payments + lower utilization
  borrowing: { dtiMax: 0.36, incomeMultiplier: 4.0 }  // rough mortgage affordability
};

// Marginal U.S. federal bracket for a given ANNUAL income (2024 single, simplified).
function goalsTaxBracketFor(annualIncome) {
  var inc = annualIncome || 0;
  if (inc <= 11600)  return 0.10;
  if (inc <= 47150)  return 0.12;
  if (inc <= 100525) return 0.22;
  if (inc <= 191950) return 0.24;
  if (inc <= 243725) return 0.32;
  if (inc <= 609350) return 0.35;
  return 0.37;
}

// Per-key resolvers — each returns { value, source, explanation }. The key set
// matches the autofillKeys declared on catalog types (goals-catalog.js).
const GOALS_AUTOFILL_RESOLVERS = {
  creditScore: function() {
    return { value: GOALS_MOCK.credit.score, source: "mocked bureau pull",
      explanation: "Estimated credit score — replace with a real bureau API in production." };
  },
  savingsAPY: function() {
    return { value: GOALS_MOCK.rates.savingsAPY, source: "mock market rate",
      explanation: "Assumed high-yield savings APY used for growth projections." };
  },
  mortgageRate: function() {
    return { value: GOALS_MOCK.rates.mortgage, source: "mock market rate",
      explanation: "Assumed 30-year fixed mortgage rate." };
  },
  autoRate: function() {
    return { value: GOALS_MOCK.rates.auto, source: "mock market rate",
      explanation: "Assumed auto-loan APR for your credit tier." };
  },
  refiRate: function() {
    return { value: GOALS_MOCK.rates.refi, source: "mock market rate",
      explanation: "Assumed refinance APR you'd likely qualify for." };
  },
  marketReturn: function() {
    return { value: GOALS_MOCK.rates.marketReturn, source: "assumption",
      explanation: "Assumed long-run annual market return (7%)." };
  },
  essentialMonthlySpend: function() {
    return { value: goalsEssentialMonthlySpend(), source: "from your budget",
      explanation: "Housing + transport + fixed obligations — the floor an emergency fund covers." };
  },
  taxBracket: function() {
    var annual = ((typeof budgetMonthlyIncome === "function") ? budgetMonthlyIncome() : 0) * 12;
    return { value: goalsTaxBracketFor(annual), source: "from your income",
      explanation: "Your marginal federal bracket — pre-tax contributions save at this rate." };
  },
  creditGainPerMonth: function() {
    return { value: GOALS_MOCK.creditGainPerMonth, source: "model estimate",
      explanation: "Typical monthly score gain with on-time payments and lower utilization." };
  },
  borrowingPower: function() {
    var annual = ((typeof budgetMonthlyIncome === "function") ? budgetMonthlyIncome() : 0) * 12;
    return { value: Math.round(annual * GOALS_MOCK.borrowing.incomeMultiplier), source: "from your income",
      explanation: "Rough home price you could finance (annual income × " + GOALS_MOCK.borrowing.incomeMultiplier + ")." };
  }
};

// Build the autofill snapshot for a goal type: resolve each of the type's
// autofillKeys into { value, source, explanation, overridden:false }. Returns {}
// until the catalog is loaded (only the create wizard calls this).
function goalsAutofillFor(typeKey) {
  var out = {};
  if (typeof goalsTypeMeta !== "function") return out;
  var meta = goalsTypeMeta(typeKey);
  if (!meta || !meta.autofillKeys) return out;
  meta.autofillKeys.forEach(function(k) {
    var resolver = GOALS_AUTOFILL_RESOLVERS[k];
    if (resolver) {
      var r = resolver();
      out[k] = { value: r.value, source: r.source, explanation: r.explanation, overridden: false };
    }
  });
  return out;
}
