// ─── Peer benchmark model (D20–D23) ──────────────────────────────────────────
// Peer values are an external mathematical aggregate — public spending data
// adjusted for where you live and how you live. NEVER real user data (D23).
// When a user asks, say exactly that.
//
// ── The spec states the formula as a one-liner. It is wrong in all three terms ──
//
//   peerValue = base[category][incomeBand][householdSize]
//             × colTier[zipPrefix][category]
//             × lifestyleMod[category]
//
// Verified against the raw JSON, what it actually is:
//
//   peerValue = base[cat][band][householdSize - 1]                  ARRAY INDEX
//             × colTiers.tiers[ colTiers.zipPrefixes[zip3] ][cat]   TWO STEPS
//             × Π lifestyleModifiers[dim][answer][cat]              PRODUCT OF 6
//             → round to nearest 5
//
// Every one of those three reads returns a plausible number when done wrong,
// which is why the worked_example self-test at the bottom is not optional.

const BENCH_LIFESTYLE_DIMS = ["foodie", "cooksAtHome", "hobbySpend",
                              "paysRent", "commute", "travelFrequency"];

/**
 * Annual income → band id (b1–b5). Onboarding collects a BAND, never a precise
 * figure (01-onboarding step 4), so this is mostly for the persona's $68,000.
 */
function benchIncomeBand(annualIncome) {
  const bands = PEER_BENCHMARKS.incomeBands;
  const n = Number(annualIncome) || 0;
  for (let i = 0; i < bands.length; i++) {
    if (n >= bands[i].min && n <= bands[i].max) return bands[i].id;
  }
  return bands[bands.length - 1].id;   // above the top band
}

/**
 * TRAP 1 — household size is an ARRAY INDEX, off by one from the size.
 * base[cat][band] is a 4-element array: ["hh1", "hh2", "hh3", "hh4+"].
 * Household 2 → index 1. 4 or more → index 3 (clamped).
 * Reading it as [householdSize] returns the NEXT household's figure and looks
 * entirely plausible.
 */
function benchHouseholdIndex(householdSize) {
  const n = parseInt(householdSize, 10) || 1;
  return Math.min(Math.max(n, 1), 4) - 1;
}

/**
 * TRAP 2 — cost of living is a TWO-STEP lookup, not colTier[zip][cat].
 * zipPrefixes maps a 3-digit prefix to a tier NAME ("900" → "very_high");
 * tiers[name][category] is the multiplier.
 * Unlisted prefixes fall back to "moderate" rather than failing (A12 covers
 * CA/AR/NY/VA only — every other ZIP in the country lands here).
 */
function benchColTierName(zip) {
  const prefix = String(zip == null ? "" : zip).trim().slice(0, 3);
  const tier = PEER_BENCHMARKS.colTiers.zipPrefixes[prefix];
  // Guard the `_note` key and anything unlisted.
  if (typeof tier !== "string" || tier.charAt(0) === "_") return "moderate";
  return PEER_BENCHMARKS.colTiers.tiers[tier] ? tier : "moderate";
}

/**
 * Is this ZIP's prefix actually modeled, or does it fall through to the
 * `moderate` default? A12 seeds only CA/AR/NY/VA prefixes — every other ZIP in
 * the country lands on the fallback. This distinguishes a genuinely-moderate
 * area from an unmodeled one; both compute the same multiplier, so the tier name
 * alone cannot tell them apart.
 */
function benchZipSupported(zip) {
  const prefix = String(zip == null ? "" : zip).trim().slice(0, 3);
  const tier = PEER_BENCHMARKS.colTiers.zipPrefixes[prefix];
  return typeof tier === "string" && tier.charAt(0) !== "_"
      && !!PEER_BENCHMARKS.colTiers.tiers[tier];
}

/**
 * Single cost-of-living index for a ZIP: the mean of its tier's 12 category
 * multipliers. The `moderate` tier is 1.0 across the board — the national
 * baseline — so index 1.0 == national average. Iterate CATEGORIES, never
 * Object.keys(tier), so the `_note` key never contaminates the mean.
 * Returns { tierName, index, pct, supported }; pct = round((index - 1) * 100).
 */
function benchColIndex(zip) {
  const tierName = benchColTierName(zip);
  const tier = PEER_BENCHMARKS.colTiers.tiers[tierName] || {};
  let sum = 0, n = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const v = Number(tier[CATEGORIES[i]]);
    if (isFinite(v)) { sum += v; n++; }
  }
  const index = n ? sum / n : 1;
  return {
    tierName,
    index,
    pct: Math.round((index - 1) * 100),
    supported: benchZipSupported(zip)
  };
}

/**
 * TRAP 3a — the wizard's answer labels do not all match the data keys, and a
 * missed key silently contributes 1.0 instead of the real multiplier.
 *   paysRent: DATA keys are the STRINGS "true" / "false" / "shared", not
 *             booleans. Option values map onto them: rent/mortgage → "true"
 *             (carries full housing), family → "false" (minimal, living
 *             rent-free), other → "shared" (a middle housing tier).
 *   commute:  "mostly walk" is stored as `none` — the label appears nowhere
 */
function benchLifestyleKey(dim, value) {
  if (dim === "paysRent") {
    if (value === true  || value === "yes" || value === "true"
        || value === "rent" || value === "mortgage")             return "true";
    if (value === false || value === "no"  || value === "false"
        || value === "family")                                   return "false";
    if (value === "other" || value === "shared")                 return "shared";
    return String(value);
  }
  if (dim === "commute") {
    if (value === "mostly walk" || value === "walk" || value === "none") return "none";
  }
  return String(value == null ? "" : value);
}

/**
 * TRAP 3b — lifestyle is a PRODUCT across all six dimensions, not one lookup.
 * A category can be touched by several: Dining out is modified by both `foodie`
 * and `cooksAtHome`. Dimensions that do not name the category contribute 1.0.
 *
 * Reach is only 7 of the 12 categories — Utilities, Subscriptions, Health,
 * Personal care and Debt payments are never lifestyle-adjusted.
 */
function benchLifestyleMultiplier(category, lifestyle) {
  const mods = PEER_BENCHMARKS.lifestyleModifiers;
  const answers = lifestyle || {};
  let m = 1;
  for (let i = 0; i < BENCH_LIFESTYLE_DIMS.length; i++) {
    const dim = BENCH_LIFESTYLE_DIMS[i];
    const table = mods[dim];
    if (!table) continue;
    const entry = table[benchLifestyleKey(dim, answers[dim])];
    if (entry && typeof entry[category] === "number") m *= entry[category];
  }
  return m;
}

/**
 * Peer value for one category, rounded to the nearest 5 (method.roundTo).
 * opts: { annualIncome, householdSize, zip, lifestyle }
 * Returns null for anything outside the taxonomy.
 */
function benchPeerValue(category, opts) {
  if (!isCategory(category)) return null;
  const o = opts || {};
  const bases = PEER_BENCHMARKS.base[category];
  if (!bases) return null;

  const band = benchIncomeBand(o.annualIncome);
  const row  = bases[band];
  if (!row) return null;

  const base = Number(row[benchHouseholdIndex(o.householdSize)]) || 0;
  const col  = Number(PEER_BENCHMARKS.colTiers.tiers[benchColTierName(o.zip)][category]) || 1;
  const life = benchLifestyleMultiplier(category, o.lifestyle);

  const step = PEER_BENCHMARKS.method.roundTo || 5;
  return Math.round((base * col * life) / step) * step;
}

/** All 12 peer values as {category: value}, in taxonomy order. */
function benchAllPeerValues(opts) {
  const out = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    out[CATEGORIES[i]] = benchPeerValue(CATEGORIES[i], opts);
  }
  return out;
}

/** Benchmark inputs for the current user — persona, with onboarding on top (D09). */
function benchOptsForUser() {
  const p = state.profile || {};
  return {
    annualIncome:  p.incomeAnnual,
    householdSize: p.householdSize,
    zip:           p.zip,
    lifestyle:     state.lifestyle
  };
}

// ─── Self-test (PEER_BENCHMARKS.worked_example) ──────────────────────────────
// The spec shipped a worked example specifically so the model can verify itself
// on build. Returns {pass, expected, actual, detail}.
//
// Caveat worth knowing: the persona is household 2 with every lifestyle
// modifier at 1.0, so several WRONG readings also produce 370. A green result
// here confirms the wiring, not the shape — the shape is asserted separately in
// the harness (household 1 vs 2 must differ, foodie high must move Dining out).
function benchSelfTest() {
  const w = PEER_BENCHMARKS.worked_example;
  const actual = benchPeerValue(w.category, {
    annualIncome:  PERSONA.identity.incomeAnnual,   // 68000 → b3
    householdSize: PERSONA.identity.householdSize,  // 2 → index 1
    zip:           PERSONA.identity.zip,            // 90066 → "900" → very_high
    lifestyle:     PERSONA.lifestyle                // foodie moderate, cooks sometimes
  });
  return {
    pass: actual === w.result,
    expected: w.result,
    actual: actual,
    detail: w._check
  };
}
