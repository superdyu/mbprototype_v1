// ─── Budget Baseline (the builder seam) ───────────────────────────────────────
// The ONE place a budget gets written. Both budget builders — the 2 Minute
// Budget (js/wizard-bridge.js) and the Lifestyle Survey
// (js/lifestyle-survey-bridge.js) — translate their own flow into the
// normalized BASELINE shape below and hand it to submitBudgetBaseline().
// Builders never touch state.budget directly; that is what keeps the two
// structurally independent: either flow can be redesigned freely as long as
// its adapter still produces a baseline.
//
// Consolidation is LATEST-WINS: whichever builder saves last, its baseline
// becomes THE budget (this is planning — a spending plan — not actuals).
// builtWith/builtDate record which door it came through.
//
// BASELINE SHAPE (the common profile — same values regardless of builder):
//   {
//     source:  builder id (Phase 2: the lifestyle wizard),
//     profile: { zip, gender, age, householdSize, incomeMode,
//                grossMonthly, netMonthly },
//     amounts: { housing, bills, food, transport, health, lifestyle,
//                debt, savings },                          // $/month, rolled up
//     details: { housing, housingExtras, utilities, medical, transportFixed,
//                phone, internet, otherFixed }             // OPTIONAL per-cost lines
//   }
// A builder that knows the per-cost lines (the 2MB splits its sliders before
// posting) provides `details`; one that only knows rolled-up amounts omits it
// and the canonical splits below are applied. `amounts` is always required.

// Canonical rolled-up → per-cost splits. The 2 Minute Budget template carries
// its own copy (the retired 2MB wizard had HOUSING_SPLIT / BILLS_SPLIT) because the
// iframe can't reach these — the ratios are "literally the same" shared
// knowledge and MUST stay in sync (old field defaults' proportions:
// 2600/0/250 of 2850 and 250/350/85/70/100 of 855).
const BASELINE_HOUSING_SPLIT = [["housing", 0.912], ["housingExtras", 0], ["utilities", 0.088]];
const BASELINE_BILLS_SPLIT   = [["medical", 0.292], ["transportFixed", 0.409], ["phone", 0.099],
                                ["internet", 0.082], ["otherFixed", 0.117]];

// Display label per builder source id, shown as "Built with X" on the budget
// dashboard. Both v2 builders were retired in 0b (L6); Phase 2's lifestyle
// wizard adds its own id here.
const BUDGET_BUILDER_LABELS = {};

// Display names for the 8 baseline amounts (host-side twin of the wizard's
// BUCKETS labels — the iframe can't share code with us). Order matters: it's
// the display order on the update-confirm screen.
const BASELINE_AMOUNT_LABELS = [
  ["housing",   "Housing"],
  ["bills",     "Bills & Required"],
  ["food",      "Food & Daily"],
  ["transport", "Transportation"],
  ["health",    "Health & Education"],
  ["lifestyle", "Lifestyle"],
  ["debt",      "Debt Payments"],
  ["savings",   "Savings & Future"]
];

// Splits one rolled-up amount into per-cost fields; last key absorbs rounding.
function baselineSplit(total, split) {
  const out = {};
  let allocated = 0;
  split.forEach(([key, ratio], i) => {
    if (i < split.length - 1) {
      out[key] = Math.round((total || 0) * ratio);
      allocated += out[key];
    } else {
      out[key] = Math.max(0, Math.round(total || 0) - allocated);
    }
  });
  return out;
}

// ── Writer ────────────────────────────────────────────────────────────────────
// Applies a baseline as THE budget: profile, categories, fixed overhead,
// status, stamps, home-task completion. Pure override — any previous budget
// (and any lifestyle-chain fine-tuning layered on it) is replaced.
function applyBudgetBaseline(baseline) {
  if (!baseline || !baseline.amounts) return;
  const b   = state.budget;
  const p   = baseline.profile || {};
  const amt = baseline.amounts;
  const det = baseline.details ||
    Object.assign(baselineSplit(amt.housing, BASELINE_HOUSING_SPLIT),
                  baselineSplit(amt.bills,   BASELINE_BILLS_SPLIT));

  // ── Profile (the common user profile both builders feed) ──────────────────
  if (p.zip) b.profile.zip = String(p.zip);
  if (p.householdSize > 0) b.profile.householdSize = Math.max(1, parseInt(p.householdSize));
  if (p.gender) b.profile.gender = String(p.gender);
  if (p.age > 0) b.profile.age = parseInt(p.age);
  if (p.grossMonthly > 0) b.profile.grossMonthly = Math.round(p.grossMonthly);
  if (p.incomeMode) b.profile.incomeMode = p.incomeMode;
  if (p.netMonthly > 0) {
    b.profile.incomeType = "salary";
    b.profile.earners    = [{ label: "Primary", monthlyNet: Math.round(p.netMonthly), type: "salary" }];
  }

  // ── Housing (fixed category — direct field mapping, no distribution) ───────
  const housing = b.categories.find(c => c.key === "housing");
  if (housing) {
    const set = (key, amount) => {
      const sc = housing.subcategories.find(s => s.key === key);
      if (sc) sc.amount = Math.round(amount || 0);
    };
    set("rent",      det.housing);
    set("hoa",       det.housingExtras);
    set("utilities", det.utilities);
  }

  // ── Transport: fixed part + flexible amount split over gas/transit ─────────
  const transport = b.categories.find(c => c.key === "transport");
  if (transport) {
    const carFixed = transport.subcategories.find(s => s.key === "car_fixed");
    const gas      = transport.subcategories.find(s => s.key === "gas");
    const transit  = transport.subcategories.find(s => s.key === "transit");
    if (carFixed) carFixed.amount = Math.round(det.transportFixed || 0);
    const bucket = Math.round(amt.transport || 0);
    // Split proportionally to the current gas/transit ratio (2:1 fallback)
    const gasNow = gas ? gas.amount : 0, trNow = transit ? transit.amount : 0;
    const ratio  = (gasNow + trNow) > 0 ? gasNow / (gasNow + trNow) : 2 / 3;
    if (gas)     gas.amount     = Math.round(bucket * ratio / 10) * 10;
    if (transit) transit.amount = Math.max(0, bucket - (gas ? gas.amount : 0));
  }

  // ── Flexible categories distributed across existing subcategory splits ─────
  [["food", amt.food], ["lifestyle", amt.lifestyle], ["savings", amt.savings]].forEach(([key, total]) => {
    const cat = b.categories.find(c => c.key === key);
    if (cat && total > 0) distributeToSubcategories(cat, Math.round(total));
  });

  // ── Fixed overhead (rebuilt whole; the baseline is the source of truth) ────
  const overhead = [
    { name: "Medical / Insurance",   amount: Math.round(det.medical || 0) },
    { name: "Phone & Internet",      amount: Math.round((det.phone || 0) + (det.internet || 0)) },
    { name: "Health & Education",    amount: Math.round(amt.health || 0) },
    { name: "Debt Minimum Payments", amount: Math.round(amt.debt || 0) }
  ];
  if (det.otherFixed > 0) overhead.push({ name: "Other Fixed", amount: Math.round(det.otherFixed) });
  b.fixedOverhead = overhead.filter(f => f.amount > 0 || f.name === "Debt Minimum Payments");

  // ── Status + stamps + task ─────────────────────────────────────────────────
  b.status    = "complete";
  b.builtWith = baseline.source || null;
  b.builtDate = todayISO();
  b.profile.lastUpdated = todayISO();
  // Home task joins on destination — budgetSetup is where the task now lands.
  state.tasks.forEach(t => {
    if (t.destination === "budgetSetup") t.completed = true;
  });
}

// ── Reverse adapter ───────────────────────────────────────────────────────────
// Current state.budget → baseline. Powers builder re-entry (a builder always
// opens on THE budget as it stands, no matter which builder last saved it) and
// the "old" column of the update-confirm page. Amounts only — per-cost details
// aren't needed by any consumer of the reverse direction.
function budgetToBaseline() {
  const b = state.budget;
  const catTotal = key => {
    const cat = b.categories.find(c => c.key === key);
    return cat ? budgetCategoryTotal(cat) : 0;
  };
  const sub = (catKey, subKey) => {
    const cat = b.categories.find(c => c.key === catKey);
    const sc  = cat && cat.subcategories.find(s => s.key === subKey);
    return sc ? sc.amount : 0;
  };
  const oh = name => {
    const f = b.fixedOverhead.find(f => f.name === name);
    return f ? f.amount : 0;
  };
  const carFixed = sub("transport", "car_fixed");
  return {
    source: b.builtWith || null,
    profile: {
      zip:           b.profile.zip,
      gender:        b.profile.gender || "",
      age:           b.profile.age || 0,
      householdSize: b.profile.householdSize || 1,
      incomeMode:    b.profile.incomeMode || "annual",
      grossMonthly:  b.profile.grossMonthly || 0,
      netMonthly:    budgetMonthlyIncome()
    },
    amounts: {
      housing:   catTotal("housing"),
      // Bills mirrors the 2MB's rolled-up slider: required non-housing costs.
      bills:     oh("Medical / Insurance") + oh("Phone & Internet") + oh("Other Fixed") + carFixed,
      food:      catTotal("food"),
      transport: catTotal("transport") - carFixed,
      health:    oh("Health & Education"),
      lifestyle: catTotal("lifestyle"),
      debt:      oh("Debt Minimum Payments"),
      savings:   catTotal("savings")
    }
  };
}

// ── Routing ───────────────────────────────────────────────────────────────────
// Every builder save lands here. First-time budget → applied immediately and
// straight into the post-result flow. Updating an EXISTING budget → the shared
// old-vs-new confirmation page (screens/budget-update-confirm.js) decides, so
// updates get one unified flow across all builder combinations — same builder
// re-run or a switch, it's the same page.
function submitBudgetBaseline(baseline) {
  if (!baseline) return;
  if (state.budget.status !== "empty") {
    state.pendingBaseline = baseline;
    go("budgetUpdateConfirm");
    return;
  }
  applyBudgetBaseline(baseline);
  if (!state.flowOrigin) state.flowOrigin = "aboutMe";
  state.postResultContext = "budget";
  go("postResult");
}
