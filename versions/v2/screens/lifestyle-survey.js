// ─── Lifestyle Survey (budget builder) ────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full-screen flow, like lifestyleChain
//
// PURPOSE
// The second way to build a budget: answer questions about how you live and
// the numbers get derived for you (vs the 2 Minute Budget, where you supply
// the numbers). Fully independent of the 2MB — different files, different
// input model — converging only on the builder seam: answers → its own
// adapter (js/lifestyle-survey-bridge.js) → submitBudgetBaseline(). Same
// routing as every builder: first budget applies directly, an update goes
// through the shared old → new confirmation screen.
//
// ⚠ PLACEHOLDER CONTENT. These three questions are throwaway scaffolding that
// proves the structure; the real survey (question set, branching, tone) is a
// future design effort. Replace LS_QUESTIONS + the adapter's weight tables;
// keep the screen-flow shape and the submit call.
//
// NOTE: this is a different feature from the lifestyle THEME CHAINS
// (screens/lifestyle.js / lifestyle-chain.js), which fine-tune sub-line-items
// of an EXISTING budget. Same word, different jobs.
//
// NAVIGATION
//   Entry: "Lifestyle Survey" card on the budgetSetup setup choice
//          (startLifestyleSurvey() — resets answers); "Keep editing" on the
//          update-confirm screen returns here with answers intact.
//   Exit:  ← Back on the first step → budgetSetup
//          Build my budget → submitBudgetBaseline (→ postResult or confirm)
//
// STATES
//   state.lifestyleSurvey = { step, grossAnnual, answers } — survives
//   navigation within the session, cleared by resetUserData().

const LS_QUESTIONS = [
  {
    key: "housing",
    title: "Where do you live?",
    sub: "Housing is the biggest lever in any budget.",
    options: [
      ["rent-share",   "Rent, with roommates"],
      ["rent-solo",    "Rent, my own place"],
      ["own-mortgage", "Own, paying a mortgage"],
      ["own-outright", "Own it outright"]
    ]
  },
  {
    key: "spending",
    title: "What's your week like?",
    sub: "Roughly how your going-out spending behaves.",
    options: [
      ["homebody",      "Mostly home — cooking, streaming"],
      ["balanced",      "A mix of in and out"],
      ["out-and-about", "Out a lot — dining, events, travel"]
    ]
  },
  {
    key: "savings",
    title: "What matters most right now?",
    sub: "Sets how aggressively we point money at the future.",
    options: [
      ["safety-first", "Building a safety cushion"],
      ["steady",       "Steady progress, no squeeze"],
      ["aggressive",   "Saving as hard as I can"],
      ["debt-crusher", "Getting rid of debt"]
    ]
  }
];

// Entry point from the setup-choice card — fresh answers every launch.
function startLifestyleSurvey() {
  state.lifestyleSurvey = { step: 0, grossAnnual: state.budget.profile.grossMonthly > 0
    ? state.budget.profile.grossMonthly * 12 : "", answers: {} };
  go("lifestyleSurvey");
}

function renderLifestyleSurvey() {
  const ls = state.lifestyleSurvey || { step: 0, grossAnnual: "", answers: {} };
  const step = ls.step;
  const lastStep = LS_QUESTIONS.length;   // final step = income + build
  const q = LS_QUESTIONS[step];

  return `
    <div style="margin-top:10px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="lsBack()">← ${step === 0 ? "Budget" : "Back"}</button>
      <h1 class="title">Lifestyle Survey</h1>
      <p class="subtitle" style="margin-bottom:6px;">Placeholder questions — real survey coming.</p>
      <p class="helper" style="margin-bottom:16px;">Step ${step + 1} of ${lastStep + 1}</p>

      ${step < lastStep ? `
      <div class="card">
        <div class="section-title" style="margin-bottom:4px;">${h(q.title)}</div>
        <p class="helper" style="margin-bottom:12px;">${h(q.sub)}</p>
        ${q.options.map(([value, label]) => `
          <button class="button ${ls.answers[q.key] === value ? "primary" : "secondary"} full"
                  style="margin-bottom:8px;text-align:left;"
                  type="button" onclick="lsAnswer('${h(q.key)}','${h(value)}')">
            ${h(label)}
          </button>
        `).join("")}
      </div>
      ` : `
      <div class="card">
        <div class="section-title" style="margin-bottom:4px;">Last thing — your income</div>
        <p class="helper" style="margin-bottom:12px;">Gross (pre-tax) per year. We estimate taxes from here.</p>
        <div class="input-group">
          <label>Annual gross income</label>
          <input inputmode="numeric" value="${h(String(ls.grossAnnual || ""))}" placeholder="e.g. 120000"
                 onchange="lsSetIncome(this.value)">
        </div>
        ${ls.grossAnnual > 0 ? `
        <p class="helper" style="margin-bottom:12px;">≈ ${budgetFmt(lsEstimateNetMonthly(ls.grossAnnual))}/mo take-home (estimated)</p>` : ""}
        <button class="button primary full" type="button"
                ${ls.grossAnnual > 0 ? "" : "disabled"}
                onclick="lsBuildBudget()">Build my budget</button>
      </div>
      `}
    </div>
  `;
}

function lsAnswer(key, value) {
  const ls = state.lifestyleSurvey;
  ls.answers[key] = value;
  ls.step++;
  render();
}

function lsBack() {
  const ls = state.lifestyleSurvey;
  if (!ls || ls.step === 0) { go("budgetSetup"); return; }
  ls.step--;
  render();
}

function lsSetIncome(value) {
  state.lifestyleSurvey.grossAnnual = parseFloat(String(value).replace(/[$,\s]/g, "")) || 0;
  render();
}

function lsBuildBudget() {
  const ls = state.lifestyleSurvey;
  const baseline = lsAnswersToBaseline(ls.answers, ls.grossAnnual);
  if (!baseline) return;
  if (!state.flowOrigin) state.flowOrigin = "aboutMe";
  submitBudgetBaseline(baseline);
}
