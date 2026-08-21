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
//             × benchColMultipliers(zip)[cat]                       COUNTY, THEN PREFIX
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
 * Unlisted prefixes fall back to "moderate" rather than failing.
 */
function benchColTierName(zip) {
  const prefix = String(zip == null ? "" : zip).trim().slice(0, 3);
  const tier = PEER_BENCHMARKS.colTiers.zipPrefixes[prefix];
  // Guard the `_note` key and anything unlisted.
  if (typeof tier !== "string" || tier.charAt(0) === "_") return "moderate";
  return PEER_BENCHMARKS.colTiers.tiers[tier] ? tier : "moderate";
}

/**
 * THE ONE CHOKEPOINT for "what does living here cost".
 *
 * Two resolutions, tried in order:
 *
 *   1. The ZIP's own COUNTY (data/zip-cost-of-living.json). Arkansas and every
 *      county bordering it are listed at five-digit precision. The county's
 *      typical home value over the national median gives a ratio, and the ratio
 *      is interpolated between the SAME four tiers the prefix table uses — so
 *      this adds precision to the existing model rather than a second model.
 *   2. The 3-digit prefix tier, for everywhere else.
 *
 * Why step 1 exists: the prefix table already carried all fourteen Arkansas
 * prefixes, but Little Rock, Fayetteville, Springdale and Bentonville all
 * resolved to "moderate", which is exactly 1.0 across all twelve categories.
 * Two identical bars on the onboarding chart read as "Arkansas is missing".
 * It was not missing; it was flat. Benton County now lands at +11% and Phillips
 * at −8%, a nineteen-point spread the four-rung ladder could not express.
 *
 * Returns { source, multipliers, tierName?, county?, ratio?, estimated? }.
 * `source` is "county" | "prefix" | "fallback" — fallback meaning nothing was
 * modeled and the national baseline is standing in.
 */
function benchColMultipliers(zip) {
  const z = String(zip == null ? "" : zip).trim().slice(0, 5);
  const tiers = PEER_BENCHMARKS.colTiers.tiers;

  const table = (typeof ZIP_COST_OF_LIVING !== "undefined") ? ZIP_COST_OF_LIVING : null;
  const countyKey = table && table.zips ? table.zips[z] : null;
  const county = countyKey && table.counties ? table.counties[countyKey] : null;

  if (county && county.ratio != null) {
    return {
      source: "county",
      county: countyKey,
      ratio: county.ratio,
      estimated: !!county.estimated,
      multipliers: benchInterpolateTiers(county.ratio)
    };
  }

  const prefix = String(z).slice(0, 3);
  const named = PEER_BENCHMARKS.colTiers.zipPrefixes[prefix];
  const modeled = typeof named === "string" && named.charAt(0) !== "_" && !!tiers[named];
  const tierName = benchColTierName(zip);
  return {
    source: modeled ? "prefix" : "fallback",
    tierName: tierName,
    multipliers: tiers[tierName] || tiers.moderate
  };
}

/**
 * A home-value ratio placed on the four-tier ladder, interpolated linearly
 * between the two tiers it falls between and clamped at both ends. Iterates
 * CATEGORIES so the tiers' `_note` key can never leak into the result.
 */
function benchInterpolateTiers(ratio) {
  const tiers = PEER_BENCHMARKS.colTiers.tiers;
  const anchors = (typeof ZIP_COST_OF_LIVING !== "undefined" &&
                   ZIP_COST_OF_LIVING.method && ZIP_COST_OF_LIVING.method.tierAnchors) || {};
  const ladder = [["low", anchors.low], ["moderate", anchors.moderate],
                  ["high", anchors.high], ["very_high", anchors.very_high]]
                 .filter(a => typeof a[1] === "number")
                 .sort((a, b) => a[1] - b[1]);
  if (!ladder.length) return tiers.moderate;

  const r = Number(ratio);
  if (!isFinite(r) || r <= ladder[0][1])              return tiers[ladder[0][0]];
  if (r >= ladder[ladder.length - 1][1])              return tiers[ladder[ladder.length - 1][0]];

  for (let i = 0; i < ladder.length - 1; i++) {
    const lo = ladder[i], hi = ladder[i + 1];
    if (r >= lo[1] && r <= hi[1]) {
      const t = (r - lo[1]) / (hi[1] - lo[1]);
      const out = {};
      for (let c = 0; c < CATEGORIES.length; c++) {
        const cat = CATEGORIES[c];
        const a = Number(tiers[lo[0]][cat]), b = Number(tiers[hi[0]][cat]);
        out[cat] = (isFinite(a) && isFinite(b)) ? a + (b - a) * t : 1;
      }
      return out;
    }
  }
  return tiers.moderate;
}

/**
 * Did we actually model this area, or is the national baseline standing in?
 * Distinguishes a genuinely-average area from an unmodeled one — both compute
 * the same multiplier, so the figure alone cannot tell them apart.
 *
 * One definition, two entry points: callers holding a resolved lookup use
 * benchColSupported, callers holding only a ZIP use benchZipSupported. Written
 * twice they would eventually disagree.
 */
function benchColSupported(col) {
  return !!col && col.source !== "fallback";
}

function benchZipSupported(zip) {
  return benchColSupported(benchColMultipliers(zip));
}

/**
 * Single cost-of-living index for a ZIP: the mean of its 12 category
 * multipliers. The `moderate` tier is 1.0 across the board — the national
 * baseline — so index 1.0 == national average. Iterate CATEGORIES, never
 * Object.keys(tier), so the `_note` key never contaminates the mean.
 * Returns { tierName, county, index, pct, supported }; pct = round((index-1)*100).
 */
function benchColIndex(zip) {
  const col = benchColMultipliers(zip);
  let sum = 0, n = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const v = Number(col.multipliers[CATEGORIES[i]]);
    if (isFinite(v)) { sum += v; n++; }
  }
  const index = n ? sum / n : 1;
  return {
    tierName: col.tierName || null,
    county: col.county || null,
    source: col.source,
    index,
    pct: Math.round((index - 1) * 100),
    supported: benchColSupported(col)
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
  const col  = Number(benchColMultipliers(o.zip).multipliers[category]) || 1;
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
