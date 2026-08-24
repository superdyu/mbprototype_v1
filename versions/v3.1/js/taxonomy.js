// ─── The 12-category taxonomy (A2) ───────────────────────────────────────────
// The single most load-bearing contract in the build. Frozen, ordered, and the
// join key across four independent data surfaces:
//
//   PEER_BENCHMARKS.base[cat]              peer layer
//   SEED_STATE.budget.monthly[cat]         plan layer
//   SEED_STATE.monthToDateActuals[cat]     self-reported layer
//   JOURNAL_QUESTIONS[].options[].category journal entries
//
// Strings are used as object keys VERBATIM — note the space and lowercase in
// "Dining out". Do not slugify; every data file keys on the display string.
//
// There is no Savings category. Saving is a goal, not a budget line — v2's
// `savings` bucket has no equivalent here.
const CATEGORIES = [
  "Housing", "Groceries", "Dining out", "Transport",
  "Utilities", "Subscriptions", "Health", "Personal care",
  "Entertainment", "Shopping", "Debt payments", "Other"
];

// ── Always iterate CATEGORIES, never Object.keys(data) ───────────────────────
// Four of the data objects carry a `_note` key alongside their real entries:
//   monthToDateActuals (13) · PEER_BENCHMARKS.base (13) ·
//   colTiers.zipPrefixes (151) · lifestyleModifiers (7)
// Object.keys() on any of them yields a "_note" category that renders as a
// tile, corrupts a total, or fails a benchmark lookup. These helpers exist so
// nobody has to remember that.

/** Sum a {category: amount} map over the taxonomy only. Ignores `_note`. */
function catTotal(map) {
  if (!map) return 0;
  return CATEGORIES.reduce((sum, c) => sum + (Number(map[c]) || 0), 0);
}

/** Read one category from a data map, 0 when absent. */
function catValue(map, category) {
  return (map && Number(map[category])) || 0;
}

/** [{category, amount}] in taxonomy order — safe for rendering. */
function catRows(map) {
  return CATEGORIES.map(c => ({ category: c, amount: catValue(map, c) }));
}

/** True when the string is a real taxonomy member (guards journal writes). */
function isCategory(c) {
  return CATEGORIES.indexOf(c) !== -1;
}
