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

// The six dimensions, in spec order. `value` is the DATA key, which is not
// always the label — paysRent keys are the strings "true"/"false", and
// "mostly walk" is stored as `none`. A missed key silently contributes 1.0.
const LW_QUESTIONS = [
  { dim: "foodie", prompt: "How into food are you?",
    help: "Eating out, good coffee, trying places.",
    options: [
      { label: "Not much",  value: "low" },
      { label: "Moderate",  value: "moderate" },
      { label: "Very into it", value: "high" }
    ] },
  { dim: "cooksAtHome", prompt: "How often do you cook?",
    help: "Cooking at home pulls spending out of dining out and into groceries.",
    options: [
      { label: "Rarely",    value: "rarely" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Usually",   value: "usually" }
    ] },
  { dim: "hobbySpend", prompt: "Hobbies and going out?",
    help: "Entertainment, gigs, kit, the stuff you do for fun.",
    options: [
      { label: "Low key",   value: "low" },
      { label: "Moderate",  value: "moderate" },
      { label: "A lot",     value: "high" }
    ] },
  { dim: "paysRent", prompt: "Do you pay rent or a mortgage?",
    help: "Housing is the single biggest swing between households.",
    options: [
      { label: "Yes", value: "true" },
      { label: "No",  value: "false" }
    ] },
  { dim: "commute", prompt: "How do you get around?",
    help: null,
    options: [
      { label: "Car",         value: "car" },
      { label: "Transit",     value: "transit" },
      { label: "Mostly walk", value: "none" }     // stored as `none`, not "walk"
    ] },
  { dim: "travelFrequency", prompt: "How often do you travel?",
    help: null,
    options: [
      { label: "Rarely",   value: "rare" },
      { label: "Now and then", value: "moderate" },
      { label: "Often",    value: "frequent" }
    ] }
];

function lwStart() {
  state.lifestyleWizard = {
    step: 0,
    answers: Object.assign({}, state.lifestyle),   // persona answers as the default
    preview: null
  };
  go("lifestyleWizard");
}

function lwAnswer(dim, value) {
  const w = state.lifestyleWizard;
  w.answers[dim] = value;
  if (w.step < LW_QUESTIONS.length - 1) { w.step++; render(); return; }
  lwBuildPreview();
  go("lifestyleWizardReview");
}

function lwBack() {
  const w = state.lifestyleWizard;
  if (w.step > 0) { w.step--; render(); return; }
  navBack();
}

// The starting budget: peer values for THEIR answers, across all 12.
function lwBuildPreview() {
  const w = state.lifestyleWizard;
  w.preview = benchAllPeerValues({
    annualIncome:  state.profile.incomeAnnual,
    householdSize: state.profile.householdSize,
    zip:           state.profile.zip,
    lifestyle:     w.answers
  });
  return w.preview;
}

// debouncedRender, not render: fires on every pointer move of the slider, and
// a full render replaces the element being dragged (see budgetSetPlan).
function lwAdjust(category, amount) {
  const w = state.lifestyleWizard;
  w.preview[category] = Math.max(0, Math.round(Number(amount) || 0));
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
      </div>

      <div class="journal-foot">
        <button class="button secondary" type="button" onclick="lwBack()">Back</button>
        <span class="helper">No figures needed</span>
      </div>
    </div>
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
function renderBudgetSliderRow(category, amount, _fmt) {
  const max = Math.max(Math.ceil((amount || 0) * 2.2), 100);
  return `
    <div class="card budget-row">
      <div class="row" style="align-items:baseline;margin-bottom:6px;">
        <span class="budget-row-name">${h(category)}</span>
        <span class="budget-row-amt">${budgetFmt(amount || 0)}</span>
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
          paysRent is "true"/"false" as strings; "mostly walk" is stored as
          <code>none</code>. A missed key contributes 1.0 silently.
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
