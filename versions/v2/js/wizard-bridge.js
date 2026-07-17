// ─── Wizard → Budget Bridge ───────────────────────────────────────────────────
// Maps 2 Minute Budget wizard output (the bb-complete postMessage payload) onto the
// app's budget model. The wizard is the SOURCE OF TRUTH for the budget
// baseline: completing it overwrites profile, categories, and fixed overhead.
// Lifestyle chains then modify that baseline (lifestyle-chain.js).
//
// FIELD MAPPING (documented for production handoff):
//   inputs.zip                  → profile.zip
//   inputs.gender               → profile.gender      (2 Minute Budget; segmentation only)
//   inputs.age                  → profile.age         (2 Minute Budget; segmentation only)
//   inputs.householdSize        → profile.householdSize (preferred over dependents)
//   inputs.netIncome            → profile.earners[0].monthlyNet, incomeType "salary"
//   inputs.dependents           → profile.householdSize = dependents + 1 (fallback only)
//
//   inputs.housing              → housing.rent
//   inputs.housingExtras        → housing.hoa
//   inputs.utilities            → housing.utilities
//   inputs.transportFixed       → transport.car_fixed
//   inputs.adjustVals.transport → transport gas/transit (proportional to current split)
//   inputs.adjustVals.food      → food category (distributed across subcategories)
//   inputs.adjustVals.lifestyle → lifestyle category (distributed)
//   inputs.adjustVals.savings   → savings category (distributed)
//   inputs.medical              → fixedOverhead "Medical / Insurance"
//   inputs.phone + internet     → fixedOverhead "Phone & Internet"
//   inputs.otherFixed           → fixedOverhead "Other Fixed" (only when > 0)
//   inputs.adjustVals.health    → fixedOverhead "Health & Education" (app has no
//                                 health category; surfaced as a required-costs line)
//   inputs.adjustVals.debt      → fixedOverhead "Debt Minimum Payments"
//                                 NOTE: debt CRUD in My Debts re-syncs this line to
//                                 the sum of instrument minimums afterward.
//   e.data.debts                → My Debts is untouched (current wizard sends [])
//
// NOTE on the housing/bills fields above: the 2 Minute Budget collects those as
// two rolled-up SLIDERS, not as the per-cost form fields it used to. The wizard
// splits them back into these fields before posting (HOUSING_SPLIT / BILLS_SPLIT
// in bb_template.html), so this mapping is unchanged and the budget model still
// gets its separate rent / utilities / phone / … lines.
//
// RE-RUN SCENARIO: if the wizard completes while a budget already existed AND
// lifestyle answers are saved, state.wizardRerunPrompt is set. The post-result
// screen then asks: re-apply lifestyle settings on top of the new baseline, or
// start fresh (wipe lifestyle data). Until the user chooses, lifestyle answers
// are preserved but NOT applied.

function applyWizardInputsToBudget(inputs) {
  if (!inputs) return;
  const b  = state.budget;
  const av = inputs.adjustVals || {};

  // ── Profile ────────────────────────────────────────────────────────────────
  if (inputs.zip) b.profile.zip = String(inputs.zip);
  // householdSize is what the wizard collects now; dependents is still sent
  // (household - 1) for anything reading the older field. Prefer the direct one.
  b.profile.householdSize = inputs.householdSize > 0
    ? Math.max(1, parseInt(inputs.householdSize))
    : Math.max(1, (parseInt(inputs.dependents) || 0) + 1);
  if (inputs.gender) b.profile.gender = String(inputs.gender);
  if (inputs.age > 0) b.profile.age = parseInt(inputs.age);
  if (inputs.netIncome > 0) {
    b.profile.incomeType = "salary";
    b.profile.earners    = [{ label: "Primary", monthlyNet: Math.round(inputs.netIncome), type: "salary" }];
  }

  // ── Housing (fixed category — direct field mapping, no distribution) ───────
  const housing = b.categories.find(c => c.key === "housing");
  if (housing) {
    const set = (key, amount) => {
      const sc = housing.subcategories.find(s => s.key === key);
      if (sc) sc.amount = Math.round(amount || 0);
    };
    set("rent",      inputs.housing);
    set("hoa",       inputs.housingExtras);
    set("utilities", inputs.utilities);
  }

  // ── Transport: fixed part + flexible bucket split over gas/transit ─────────
  const transport = b.categories.find(c => c.key === "transport");
  if (transport) {
    const carFixed = transport.subcategories.find(s => s.key === "car_fixed");
    const gas      = transport.subcategories.find(s => s.key === "gas");
    const transit  = transport.subcategories.find(s => s.key === "transit");
    if (carFixed) carFixed.amount = Math.round(inputs.transportFixed || 0);
    const bucket = Math.round(av.transport || 0);
    // Split proportionally to the current gas/transit ratio (2:1 fallback)
    const gasNow = gas ? gas.amount : 0, trNow = transit ? transit.amount : 0;
    const ratio  = (gasNow + trNow) > 0 ? gasNow / (gasNow + trNow) : 2 / 3;
    if (gas)     gas.amount     = Math.round(bucket * ratio / 10) * 10;
    if (transit) transit.amount = Math.max(0, bucket - (gas ? gas.amount : 0));
  }

  // ── Flexible buckets distributed across existing subcategory splits ────────
  [["food", av.food], ["lifestyle", av.lifestyle], ["savings", av.savings]].forEach(([key, total]) => {
    const cat = b.categories.find(c => c.key === key);
    if (cat && total > 0) distributeToSubcategories(cat, Math.round(total));
  });

  // ── Fixed overhead (rebuilt from wizard values; wizard is source of truth) ─
  const overhead = [
    { name: "Medical / Insurance",   amount: Math.round(inputs.medical || 0) },
    { name: "Phone & Internet",      amount: Math.round((inputs.phone || 0) + (inputs.internet || 0)) },
    { name: "Health & Education",    amount: Math.round(av.health || 0) },
    { name: "Debt Minimum Payments", amount: Math.round(av.debt || 0) }
  ];
  if (inputs.otherFixed > 0) overhead.push({ name: "Other Fixed", amount: Math.round(inputs.otherFixed) });
  b.fixedOverhead = overhead.filter(f => f.amount > 0 || f.name === "Debt Minimum Payments");
}

// True when at least one lifestyle theme chain has been completed.
function lifestyleHasAnswers() {
  const la = state.lifestyleAnswers || {};
  return Object.keys(la).some(k => la[k] && la[k].lastUpdated);
}

// Re-run prompt path A: re-derive sub-sliders from saved answers against the
// NEW wizard baseline, then apply each affected parent bucket once.
function wizardRerunKeepLifestyle() {
  const la = state.lifestyleAnswers || {};
  const answered = Object.keys(la).filter(k => la[k] && la[k].lastUpdated);

  // Derive ALL themes first (against the untouched wizard baseline), then apply —
  // applying mid-derivation would skew later themes that share a parent bucket.
  answered.forEach(theme => {
    const derived  = deriveSubSliders(theme);
    const subItems = LIFESTYLE_SUB_ITEMS[theme] || [];
    state.lifestyleSubSliders[theme] = {};
    subItems.forEach((item, i) => { state.lifestyleSubSliders[theme][item] = derived.amounts[i] || 0; });
  });
  const parents = [...new Set(answered.map(t => LIFESTYLE_PARENT_BUCKET[t]))];
  parents.forEach(bucketKey => {
    const theme = answered.find(t => LIFESTYLE_PARENT_BUCKET[t] === bucketKey);
    if (theme) applyLifestyleThemeToBudget(theme);
  });

  state.wizardRerunPrompt = false;
  render();
}

// Re-run prompt path B: start fresh — the new wizard baseline stands alone.
function wizardRerunStartFresh() {
  state.lifestyleAnswers    = { food: { answers: {}, lastUpdated: null }, entertainment: { answers: {}, lastUpdated: null }, travel: { answers: {}, lastUpdated: null }, shopping: { answers: {}, lastUpdated: null }, other: { answers: {}, lastUpdated: null } };
  state.lifestyleSubSliders = { food: {}, entertainment: {}, travel: {}, shopping: {}, other: {} };
  state.wizardRerunPrompt   = false;
  render();
}
