// ─── Lifestyle wizard (04-budget-benchmarks) ─────────────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Hidden — full-bleed question flow
//
// The single budget builder (L6), replacing v2's 2 Minute Budget and Lifestyle
// Survey. Six questions, asked BEFORE the budget exists.
//
// "Answers feed lifestyleModifiers in peer-benchmarks.json and produce a
// starting budget across all twelve categories. The user then adjusts with
// sliders."
//
// So the starting budget IS the peer model run against their own answers —
// which is why no question asks for a figure. That is the pitch: you never have
// to guess at a number.

// The six dimensions, in spec order. `value` is usually the DATA key, but not
// always — paysRent values (rent/mortgage/family/other) map to the data keys
// "true"/"false"/"shared" via benchLifestyleKey, and "mostly walk" is stored as
// `none`. A value that resolves to no key silently contributes 1.0.
// `meaning` is what the option says about how you live, in behaviour rather
// than numbers (D26 — describe, never prescribe). The FIGURES beside it are
// computed at render time from the peer model, so they already carry the ZIP's
// cost-of-living multiplier; never author a dollar amount here.
const LW_QUESTIONS = [
  { dim: "foodie", prompt: "How into food are you?",
    help: "Eating out, good coffee, trying places.",
    options: [
      { label: "Not much",  value: "low",
        meaning: "Food is mostly fuel. You eat what's easy, and where it comes from isn't something you think about much." },
      { label: "Moderate",  value: "moderate",
        meaning: "You eat out when it suits you — a few times a week, nothing built around it." },
      { label: "Very into it", value: "high",
        meaning: "Eating out is something you do for its own sake. Good coffee, new places, the meal is the point." }
    ] },
  { dim: "cooksAtHome", prompt: "How often do you cook?",
    help: "Cooking at home pulls spending out of dining out and into groceries.",
    options: [
      { label: "Rarely",    value: "rarely",
        meaning: "The kitchen is mostly storage. Most meals turn up already made." },
      { label: "Sometimes", value: "sometimes",
        meaning: "You cook when there's time and pick something up when there isn't." },
      { label: "Usually",   value: "usually",
        meaning: "Groceries carry the week. Eating out is an occasion rather than a habit." }
    ] },
  { dim: "hobbySpend", prompt: "Hobbies and going out?",
    help: "Entertainment, gigs, kit, the stuff you do for fun.",
    options: [
      { label: "Low key",   value: "low",
        meaning: "Your free time costs close to nothing — home, outdoors, things you already own." },
      { label: "Moderate",  value: "moderate",
        meaning: "A night out here, a bit of kit there. It adds up without being the main line." },
      { label: "A lot",     value: "high",
        meaning: "Gigs, gear, going out. Your weekends have a price on them." }
    ] },
  { dim: "paysRent", prompt: "What's your housing setup?",
    help: "Housing is the single biggest swing between households.",
    // These values are NOT the data keys — benchLifestyleKey maps them:
    // rent/mortgage → "true", family → "false", other → "shared".
    options: [
      { label: "Rent",             value: "rent",
        meaning: "The whole housing cost lands on you each month, on someone else's terms." },
      { label: "Mortgage",         value: "mortgage",
        meaning: "The whole housing cost lands on you each month, and part of it is buying the place." },
      { label: "Live with family", value: "family",
        meaning: "Housing barely registers — you're covering a share of the bills rather than a market rate." },
      { label: "Other",            value: "other",
        meaning: "Housing is split with someone, so you carry part of a market rate instead of all of it." }
    ] },
  { dim: "commute", prompt: "How do you get around?",
    help: null,
    options: [
      { label: "Car",         value: "car",
        meaning: "A car means fuel, insurance, and the repair you didn't plan for." },
      { label: "Transit",     value: "transit",
        meaning: "Fares and passes. No repair bills, no parking." },
      { label: "Mostly walk", value: "none",     // stored as `none`, not "walk"
        meaning: "Getting around costs you almost nothing — the odd fare and not much else." }
    ] },
  { dim: "travelFrequency", prompt: "How often do you travel?",
    help: null,
    options: [
      { label: "Rarely",   value: "rare",
        meaning: "A trip is a rare thing, so nothing is going aside for one month to month." },
      { label: "Now and then", value: "moderate",
        meaning: "A couple of trips a year — enough that it shows up in an ordinary month." },
      { label: "Often",    value: "frequent",
        meaning: "You're away often, and the flights, rooms and everything around them sit in your normal spending." }
    ] }
];

// ─── The relative model ──────────────────────────────────────────────────────
// The preview is a RUNNING figure, not a recomputation. Q1 sets a rough
// starting point for Dining out; the user can drag it; Q2 then applies its own
// change ON TOP of where they left it. So a number you moved by hand is never
// silently thrown away two questions later.
//
// PEER_BENCHMARKS.lifestyleModifiers is already a per-dimension multiplier
// table, which makes that a straight ratio:
//
//   new = current × mods[dim][newAnswer][cat] / mods[dim][answerAlreadyApplied][cat]
//
// An unanswered dimension contributes 1.0, so the first answer is just the
// multiplier. Re-answering (via Back) divides the old one out with no special
// case. With no drags at all this lands on exactly what benchAllPeerValues
// would have produced — the product of the same six multipliers.

/** The 12 peer values with every lifestyle modifier at 1.0 — the starting point. */
function lwNeutralPreview() {
  return benchAllPeerValues({
    annualIncome:  state.profile.incomeAnnual,
    householdSize: state.profile.householdSize,
    zip:           state.profile.zip,
    lifestyle:     {}
  });
}

/** Categories this dimension actually moves. Guards the `_note` key. */
function lwTouchedCategories(dim) {
  const table = (PEER_BENCHMARKS.lifestyleModifiers || {})[dim];
  if (!table) return [];
  const seen = {};
  Object.keys(table).forEach(answerKey => {
    if (answerKey.charAt(0) === "_") return;
    const entry = table[answerKey];
    if (!entry) return;
    CATEGORIES.forEach(c => { if (typeof entry[c] === "number") seen[c] = true; });
  });
  return CATEGORIES.filter(c => seen[c]);
}

/** One dimension's multiplier for one category, or 1.0 when it says nothing. */
function lwModifier(dim, value, category) {
  const table = (PEER_BENCHMARKS.lifestyleModifiers || {})[dim];
  if (!table || value == null) return 1;
  const entry = table[benchLifestyleKey(dim, value)];
  if (!entry || typeof entry[category] !== "number") return 1;
  return entry[category];
}

/** What `category` becomes if this dimension is answered `value`. */
function lwProjected(dim, value, category) {
  const w = state.lifestyleWizard;
  const current = Number(w.preview[category]) || 0;
  const ratio = lwModifier(dim, value, category) / lwModifier(dim, w.applied[dim], category);
  return Math.round((current * ratio) / 5) * 5;
}

/** Fold an answer into the running preview and record it as applied. */
function lwApplyDimension(dim, value) {
  const w = state.lifestyleWizard;
  lwTouchedCategories(dim).forEach(c => { w.preview[c] = lwProjected(dim, value, c); });
  w.applied[dim] = value;
}

function lwStart() {
  // Blank by default. state.lifestyle is fully populated from the persona at
  // boot (js/boot.js), so seeding from it pre-selected all six questions with
  // answers the tester never gave. Only dimensions they actually answered
  // elsewhere — onboarding step 5 asks two of the six — carry over.
  const answered = state.lifestyleAnswered || {};
  const answers = {};
  LW_QUESTIONS.forEach(q => {
    if (answered[q.dim] && state.lifestyle[q.dim] != null) answers[q.dim] = state.lifestyle[q.dim];
  });

  state.lifestyleWizard = {
    step: 0,
    answers: answers,
    applied: {},                 // what the running preview already has folded in
    preview: lwNeutralPreview()
  };
  // Fold in whatever carried over, so the first question's figures start from
  // the same place the rest of the flow will.
  Object.keys(answers).forEach(dim => lwApplyDimension(dim, answers[dim]));
  go("lifestyleWizard");
}

// Pick an option. Does NOT advance — the tester confirms with Continue, so a
// mis-tap is recoverable and the description below has something to describe.
function lwAnswer(dim, value) {
  const w = state.lifestyleWizard;
  if (w.answers[dim] === value) return;
  w.answers[dim] = value;
  lwApplyDimension(dim, value);
  render();
}

function lwNext() {
  const w = state.lifestyleWizard;
  if (w.step < LW_QUESTIONS.length - 1) { w.step++; render(); return; }
  go("lifestyleWizardReview");
}

function lwBack() {
  const w = state.lifestyleWizard;
  if (w.step > 0) { w.step--; render(); return; }
  navBack();
}

// The starting budget IS the running preview — the peer model walked forward
// one answer at a time, with the user's own drags left in place. Rebuilding it
// from benchAllPeerValues here (as this used to) threw away every adjustment
// they made on the way through.
function lwBuildPreview() {
  const w = state.lifestyleWizard;
  if (!w.preview) {
    w.preview = lwNeutralPreview();
    w.applied = {};
    Object.keys(w.answers).forEach(dim => lwApplyDimension(dim, w.answers[dim]));
  }
  return w.preview;
}

// debouncedRender, not render: fires on every pointer move of the slider, and
// a full render replaces the element being dragged (see budgetSetPlan). The
// readout is painted directly so the figure still tracks during the gesture.
function lwAdjust(category, amount) {
  const w = state.lifestyleWizard;
  w.preview[category] = Math.max(0, Math.round(Number(amount) || 0));
  const el = document.getElementById("lwAmt" + CATEGORIES.indexOf(category));
  if (el) el.textContent = budgetFmt(w.preview[category]);
  debouncedRender();
}

// Save goes through the seam — never straight into state.plan (L6).
function lwSubmit() {
  const w = state.lifestyleWizard;
  submitBudgetBaseline({
    source: "lifestyleWizard",
    profile: {
      zip: state.profile.zip,
      householdSize: state.profile.householdSize,
      incomeAnnual: state.profile.incomeAnnual
    },
    lifestyle: Object.assign({}, w.answers),
    monthly: Object.assign({}, w.preview)
  });
}

function renderLifestyleWizard() {
  const w = state.lifestyleWizard || (lwStart(), state.lifestyleWizard);
  const q = LW_QUESTIONS[w.step];
  const picked = w.answers[q.dim];
  const opt = q.options.find(o => o.value === picked);

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">Question ${w.step + 1} of ${LW_QUESTIONS.length}</p>
        <div class="journal-progress" aria-hidden="true">
          ${LW_QUESTIONS.map((_, i) => `<span class="journal-pip ${i <= w.step ? "on" : ""}"></span>`).join("")}
        </div>
        <h1 class="title" style="font-size:21px;margin:12px 0 0;">${h(q.prompt)}</h1>
        ${q.help ? `<p class="helper" style="margin:6px 0 0;">${h(q.help)}</p>` : ""}
      </div>

      <div class="journal-body">
        <div class="journal-options">
          ${q.options.map(o => `
            <button class="journal-opt ${picked === o.value ? "picked" : ""}" type="button"
                    onclick="lwAnswer('${q.dim}','${o.value}')">
              <span class="journal-opt-label">${h(o.label)}</span>
            </button>
          `).join("")}
        </div>

        ${opt ? lwMeaningBlock(q, opt) : `
          <p class="helper" style="margin:16px 0 0;">
            Pick the one that sounds most like you and I'll show what it means.
          </p>`}
      </div>

      <div class="journal-foot">
        <button class="button secondary" type="button" onclick="lwBack()">Back</button>
        <button class="button" type="button" onclick="lwNext()" ${opt ? "" : "disabled"}>
          ${w.step < LW_QUESTIONS.length - 1 ? "Continue" : "See the budget"}
        </button>
      </div>
    </div>
  `;
}

// What the pick means, then the categories it moves — each with a slider seeded
// where that option puts it. The figures come from the peer model, so the ZIP's
// cost of living is already in them; the copy above says what the behaviour is,
// never what to do about it (D26).
function lwMeaningBlock(q, opt) {
  const cats = lwTouchedCategories(q.dim);
  const zip = state.profile.zip;
  return `
    <div class="card lw-meaning">
      <p class="task-title" style="margin:0 0 4px;font-size:13px;">${h(opt.label)}</p>
      <p class="task-desc" style="margin:0;">${h(opt.meaning || "")}</p>
      ${cats.length ? `
        <p class="helper" style="margin:10px 0 0;font-size:11px;">
          For ${h(zip)}, that puts ${cats.length === 1 ? "this" : "these"} here.
          Drag if it looks wrong — the questions after this one adjust from
          wherever you leave it.
        </p>` : `
        <p class="helper" style="margin:10px 0 0;font-size:11px;">
          This one shapes how I read the rest rather than moving a category on
          its own.
        </p>`}
    </div>
    ${cats.map(c => renderBudgetSliderRow(c, state.lifestyleWizard.preview[c])).join("")}
  `;
}

// ─── Review: the starting budget, with sliders ───────────────────────────────

function renderLifestyleWizardReview() {
  const w = state.lifestyleWizard;
  if (!w || !w.preview) { lwBuildPreview(); }
  const total = catTotal(w.preview);
  const income = state.monthlyIncomeNet;
  const left = income - total;

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <h1 class="title" style="font-size:21px;margin:0;">Your starting budget</h1>
        <p class="helper" style="margin:6px 0 0;">
          Built from your answers and what things cost in ${h(state.profile.zip)}.
          Drag anything that looks wrong.
        </p>
      </div>

      <div class="journal-body">
        <div class="card">
          <div class="row" style="align-items:baseline;">
            <span class="helper">Monthly total</span>
            <span class="journal-total">${budgetFmt(total)}</span>
          </div>
          <div class="row" style="align-items:baseline;margin-top:4px;">
            <span class="helper">Take-home</span>
            <span class="helper">${budgetFmt(income)}</span>
          </div>
          <p class="helper" style="margin:8px 0 0;color:${left < 0 ? "var(--warn)" : "var(--muted)"};">
            ${left >= 0
              ? budgetFmt(left) + " left over each month."
              : budgetFmt(Math.abs(left)) + " more than you bring in."}
          </p>
        </div>

        ${CATEGORIES.map(c => renderBudgetSliderRow(c, w.preview[c], v => v)).join("")}
      </div>

      <div class="journal-foot">
        <button class="button secondary" type="button" onclick="state.lifestyleWizard.step=${LW_QUESTIONS.length - 1};go('lifestyleWizard')">Back</button>
        <button class="button" type="button" onclick="lwSubmit()">Save budget</button>
      </div>
    </div>
  `;
}

// Shared by the wizard review and the Budget tab.
// max comes from budgetSliderMax(), which is derived from the seeded plan and
// the peer figure — never from `amount`, which is what the drag changes. A
// value-derived ceiling moves under the thumb and makes it recoil on release.
function renderBudgetSliderRow(category, amount, _fmt) {
  const max = budgetSliderMax(category);
  const idx = CATEGORIES.indexOf(category);
  return `
    <div class="card budget-row">
      <div class="row" style="align-items:baseline;margin-bottom:6px;">
        <span class="budget-row-name">${h(category)}</span>
        <span class="budget-row-amt" id="lwAmt${idx}">${budgetFmt(amount || 0)}</span>
      </div>
      <input class="journal-slider" type="range" min="0" max="${max}" step="5"
             value="${amount || 0}"
             oninput="lwAdjust('${h(category)}', this.value)"
             aria-label="${h(category)} monthly amount">
    </div>
  `;
}

function renderLifestyleWizardAdmin() {
  const w = state.lifestyleWizard;
  return `
    <div class="admin-card">
      <p class="admin-card-title">Lifestyle Wizard</p>
      ${!w ? `<p class="helper">Not started.</p>` : `
        <div class="input-group">
          <label>Answers (data keys, not labels)</label>
          <div class="helper" style="line-height:1.7;">
            ${LW_QUESTIONS.map(q => `${h(q.dim)} → <strong>${h(w.answers[q.dim] || "—")}</strong>`).join("<br>")}
          </div>
        </div>
        <p class="helper" style="font-size:10px;">
          paysRent values map to "true"/"false"/"shared"; "mostly walk" is stored
          as <code>none</code>. A missed key contributes 1.0 silently.
        </p>
        ${w.preview ? `
          <div class="input-group">
            <label>Preview total</label>
            <div class="helper">${budgetFmt(catTotal(w.preview))}</div>
          </div>` : ""}
      `}
    </div>
  `;
}
