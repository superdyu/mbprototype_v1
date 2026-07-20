// ─── Lifestyle Survey (budget builder — full flow) ────────────────────────────
// TAB: None | NAV BAR: Hidden — full-screen flow, like lifestyleChain
//
// PURPOSE
// The question-driven way to build a budget: lean above/below "normal" on a
// 4-notch scale per spending category, with fixed-prerequisite follow-ups that
// refine (or pivot back) the big movers, then fine-tune everything on a final
// slider review. All content/percentages live in js/lifestyle-survey-content.js
// (tune there); all math in js/lifestyle-survey-bridge.js; this file only
// renders and walks the flow. Saves through the builder seam like every
// builder: first budget applies directly, an update routes to the shared
// old → new confirm screen.
//
// FLOW    basics (2MB-twin fields + Exit) → questions (base + armed follow-ups,
//         Skip top-right w/ first-time confirm) → review (8 sliders, pinned
//         totals, 2MB save conventions) → submitBudgetBaseline()
//
// NAVIGATION
//   Entry: setup-choice card / "rebuild a different way" link (startLifestyleSurvey
//          — fresh answers, basics prefilled from the shared profile);
//          "Keep editing" on update-confirm returns here with answers intact.
//   Exit:  Exit (basics) → budgetSetup; save → postResult or budgetUpdateConfirm
//
// STATES
//   state.lifestyleSurvey = { phase: "basics"|"questions"|"review", qIndex,
//     basics{gender,age,householdSize,zip,incomeMode,grossIncome},
//     answers{base{}, followups{}}, tweaks{}, skipPromptSeen, skipPromptOpen }
//   Skipped base question = category at exact peer average; its follow-ups
//   disarm (the path shrinks). Extreme answers can ARM a follow-up (the path
//   grows) — the step counter recomputes honestly either way.

function startLifestyleSurvey() {
  const p = state.budget.profile;
  state.lifestyleSurvey = {
    phase: "basics", qIndex: 0,
    basics: {
      gender: p.gender || "", age: p.age || "",
      householdSize: p.householdSize || 1,
      zip: p.zip || "",
      incomeMode: p.incomeMode || "annual",
      grossIncome: p.grossMonthly > 0
        ? (p.incomeMode === "monthly" ? p.grossMonthly : p.grossMonthly * 12) : ""
    },
    answers: { base: {}, followups: {} },
    tweaks: {}, skipPromptSeen: false, skipPromptOpen: false
  };
  go("lifestyleSurvey");
}

function lsState() {
  if (!state.lifestyleSurvey || !state.lifestyleSurvey.answers ||
      !state.lifestyleSurvey.answers.base || !state.lifestyleSurvey.basics) {
    state.lifestyleSurvey = { phase: "basics", qIndex: 0,
      basics: { gender: "", age: "", householdSize: 1, zip: "", incomeMode: "annual", grossIncome: "" },
      answers: { base: {}, followups: {} }, tweaks: {}, skipPromptSeen: false, skipPromptOpen: false };
  }
  return state.lifestyleSurvey;
}

function renderLifestyleSurvey() {
  const ls = lsState();
  if (ls.phase === "questions") return lsRenderQuestion(ls);
  if (ls.phase === "review")    return lsRenderReview(ls);
  return lsRenderBasics(ls);
}

// ── Phase: basics (field-identical twin of the 2MB's Basics step) ─────────────
function lsRenderBasics(ls) {
  const b = ls.basics;
  const ctx = lsContext(b);
  const total = 2 + lsPlannedPath(ls.answers, ctx).length;
  return `
    <div class="ls-wrap">
      <div class="ls-header">
        <button class="button secondary" type="button" onclick="go('budgetSetup')">Exit</button>
        <span class="helper">Step 1 of ${total}</span>
        <span></span>
      </div>
      <h1 class="title">Lifestyle Survey</h1>
      <p class="subtitle" style="margin-bottom:14px;">A few basics, then we talk about how you actually live.</p>

      <div class="card">
        <div class="section-title" style="margin-bottom:10px;">About you</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Gender</label>
            <select onchange="lsSetBasic('gender', this.value)">
              <option value="">Select</option>
              <option value="female"      ${b.gender === "female" ? "selected" : ""}>Female</option>
              <option value="male"        ${b.gender === "male" ? "selected" : ""}>Male</option>
              <option value="nonbinary"   ${b.gender === "nonbinary" ? "selected" : ""}>Non-binary</option>
              <option value="unspecified" ${b.gender === "unspecified" ? "selected" : ""}>Prefer not to say</option>
            </select>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Age</label>
            <input type="number" min="18" max="99" value="${h(String(b.age || ""))}" placeholder="e.g. 32"
                   onchange="lsSetBasic('age', this.value)">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Household size</label>
            <select onchange="lsSetBasic('householdSize', this.value)">
              ${[1,2,3,4,5,6,7,8].map(n => `
                <option value="${n}" ${+b.householdSize === n ? "selected" : ""}>${n === 1 ? "1 (just me)" : n === 8 ? "8+ people" : n + " people"}</option>
              `).join("")}
            </select>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>ZIP code</label>
            <input inputmode="numeric" maxlength="5" value="${h(b.zip || "")}" placeholder="ZIP"
                   onchange="lsSetBasic('zip', this.value)">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title" style="margin-bottom:10px;">Income</div>
        <div class="ls-seg">
          <button type="button" class="ls-seg-btn ${b.incomeMode === "annual" ? "active" : ""}" onclick="lsSetIncomeMode('annual')">Annual</button>
          <button type="button" class="ls-seg-btn ${b.incomeMode === "monthly" ? "active" : ""}" onclick="lsSetIncomeMode('monthly')">Monthly</button>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Gross income, before taxes</label>
          <input inputmode="numeric" value="${b.grossIncome > 0 ? (+b.grossIncome).toLocaleString() : ""}"
                 placeholder="${b.incomeMode === "annual" ? "e.g. 120,000" : "e.g. 10,000"}"
                 onchange="lsSetBasic('grossIncome', this.value)">
        </div>
        <p class="helper" style="margin:8px 0 0;">
          ${ctx.net > 0 ? `≈ ${budgetFmt(ctx.net)}/mo take-home after estimated taxes` : "Enter your income to estimate take-home pay."}
        </p>
      </div>

      <button class="button primary full" type="button" ${ctx.net > 0 ? "" : "disabled"}
              onclick="lsStartQuestions()">Start</button>
    </div>
  `;
}

function lsSetBasic(key, value) {
  const b = lsState().basics;
  if (key === "grossIncome") value = parseFloat(String(value).replace(/[$,\s]/g, "")) || 0;
  if (key === "age" || key === "householdSize") value = parseInt(value) || (key === "householdSize" ? 1 : "");
  b[key] = value;
  render();
}

function lsSetIncomeMode(mode) {
  const b = lsState().basics;
  if (b.incomeMode === mode) return;
  // Convert the typed figure so it keeps meaning the same money (2MB behavior).
  if (b.grossIncome > 0) {
    b.grossIncome = mode === "monthly" ? Math.round(b.grossIncome / 12) : Math.round(b.grossIncome * 12);
  }
  b.incomeMode = mode;
  render();
}

function lsStartQuestions() {
  const ls = lsState();
  ls.phase = "questions";
  ls.qIndex = 0;
  render();
}

// ── Phase: questions ──────────────────────────────────────────────────────────
function lsRenderQuestion(ls) {
  const ctx  = lsContext(ls.basics);
  const path = lsPlannedPath(ls.answers, ctx);
  if (ls.qIndex >= path.length) { ls.phase = "review"; return lsRenderReview(ls); }
  const stepQ = path[ls.qIndex];
  const total = 2 + path.length;
  const stepN = 2 + ls.qIndex;

  const header = `
    <div class="ls-header">
      <button class="button secondary" type="button" onclick="lsBack()">← Back</button>
      <span class="helper">Step ${stepN} of ${total}</span>
      <button class="button secondary" type="button" onclick="lsSkipTap()">Skip</button>
    </div>`;

  const parts = stepQ.kind === "base"
    ? lsRenderBaseQuestion(stepQ, ls, ctx)
    : lsRenderFollowup(stepQ, ls, ctx);

  // Full-height column: header at top, a large stage that grows to fill the
  // space, and the selector pinned at the bottom (the room the survey has spare).
  return `
    <div class="ls-q-layout">
      ${header}
      <div class="ls-q-stage">${parts.stage}</div>
      <div class="ls-q-selector">${parts.selector}</div>
      ${ls.skipPromptOpen ? lsRenderSkipModal() : ""}
    </div>
  `;
}

// Friendly lowercase noun for the "most people spend … on {noun}" reference.
const LS_CAT_NOUN = {
  housing:   "housing",
  food:      "food & groceries",
  transport: "getting around",
  lifestyle: "fun & extras",
  bills:     "fixed bills",
  debt:      "debt payments",
  health:    "health & learning"
};

// Base spending question → { stage, selector } for the question shell.
// No pre-pick: until a notch is tapped the stage shows the typical figure as a
// reference and Next stays disabled (the no-center, always-lean rule).
function lsRenderBaseQuestion(stepQ, ls, ctx) {
  const q = LS_BASE_QUESTIONS.find(x => x.cat === stepQ.cat);
  const notch = ls.answers.base[q.cat];
  const answered = typeof notch === "number";
  const sel = answered ? q.notches[notch - 1] : null;
  const range = answered ? lsNotchRange(q.cat, notch, ctx) : null;
  const baseline = Math.round(lsBaselineFor(q.cat, ctx));
  const noun = LS_CAT_NOUN[q.cat] || "this";

  const stage = answered ? `
    <div class="ls-stage-eyebrow">${h(q.title)}</div>
    <div class="ls-stage-lead" style="color:${sel.pct >= 0 ? "var(--accent)" : "var(--good)"};">
      ${h(sel.label)}
      <span class="ls-stage-pct">${sel.pct >= 0 ? "+" : "−"}${Math.round(Math.abs(sel.pct) * 100)}% vs most people like you</span>
    </div>
    <p class="ls-stage-desc">${h(sel.desc)}</p>
    <p class="ls-stage-figure">For you, that's about <strong>${budgetFmt(range[0])}–${budgetFmt(range[1])}</strong>/mo.</p>
  ` : `
    <div class="ls-stage-eyebrow">${h(q.title)}</div>
    <p class="ls-stage-ref">Most people like you spend about <strong>${budgetFmt(baseline)}</strong>/mo on ${h(noun)}.</p>
    <p class="ls-stage-desc">${h(q.sub)}</p>
    <p class="ls-stage-prompt">Where do you honestly land?</p>
  `;

  const selector = `
    <div class="ls-notches">
      ${q.notches.map((nn, i) => `
        <button type="button" class="ls-notch${answered && notch === i + 1 ? " active" : ""}"
                onclick="lsSetNotch('${h(q.cat)}', ${i + 1})">
          <span class="ls-notch-dot"></span>
          <span class="ls-notch-label">${h(nn.label)}</span>
        </button>`).join("")}
    </div>
    <button class="button primary full" type="button" ${answered ? "" : "disabled"}
            onclick="lsNext()">Next</button>
  `;

  return { stage, selector };
}

// Follow-up: 3-option "this / that / neither" → { stage, selector }. Same shell:
// prompt in the stage, options pinned at the bottom, picked option's real-world
// description fills the stage.
function lsRenderFollowup(stepQ, ls, ctx) {
  const fu = LS_FOLLOWUPS.find(x => x.id === stepQ.id);
  const chosen = ls.answers.followups[fu.id];
  const answered = typeof chosen === "number";

  const stage = answered ? `
    <div class="ls-stage-eyebrow">${h(fu.title)}</div>
    <div class="ls-stage-lead">${h(fu.options[chosen].label)}</div>
    <p class="ls-stage-desc">${h(fu.options[chosen].desc)}</p>
  ` : `
    <div class="ls-stage-eyebrow">${h(fu.title)}</div>
    <p class="ls-stage-ref">One more on this — it moves real dollars.</p>
    <p class="ls-stage-prompt">Which fits best?</p>
  `;

  const selector = `
    ${fu.options.map((opt, i) => `
      <button class="button ${chosen === i ? "primary" : "secondary"} full"
              style="margin-bottom:8px;text-align:left;"
              type="button" onclick="lsSetFollowup('${h(fu.id)}', ${i})">
        ${h(opt.label)}
      </button>`).join("")}
    <button class="button primary full" type="button" ${answered ? "" : "disabled"}
            onclick="lsNext()">Next</button>
  `;

  return { stage, selector };
}

function lsSetNotch(cat, notch) {
  lsState().answers.base[cat] = notch;
  render();
}

function lsSetFollowup(id, optIndex) {
  lsState().answers.followups[id] = optIndex;
  render();
}

function lsNext() {
  const ls = lsState();
  const path = lsPlannedPath(ls.answers, lsContext(ls.basics));
  ls.qIndex++;
  if (ls.qIndex >= path.length) ls.phase = "review";
  render();
}

function lsBack() {
  const ls = lsState();
  if (ls.qIndex === 0) { ls.phase = "basics"; render(); return; }
  ls.qIndex--;
  render();
}

// ── Skip (current question only; confirm modal on first use) ──────────────────
function lsSkipTap() {
  const ls = lsState();
  if (!ls.skipPromptSeen) { ls.skipPromptOpen = true; render(); return; }
  lsApplySkip();
}

function lsRenderSkipModal() {
  return `
    <div class="ls-modal-bg">
      <div class="card" style="max-width:300px;margin:0;">
        <div style="font-weight:850;font-size:15px;margin-bottom:8px;">Skip this one?</div>
        <p class="helper" style="margin:0 0 14px;line-height:1.5;">
          Skipped questions default to the average spend for someone like you.
          You can still adjust every number on the final step.
        </p>
        <button class="button primary full" type="button" onclick="lsSkipConfirm()">Confirm &amp; continue</button>
        <button class="button secondary full" style="margin-top:8px;" type="button" onclick="lsSkipCancel()">Go back</button>
      </div>
    </div>
  `;
}

function lsSkipConfirm() {
  const ls = lsState();
  ls.skipPromptSeen = true;
  ls.skipPromptOpen = false;
  lsApplySkip();
}

function lsSkipCancel() {
  lsState().skipPromptOpen = false;
  render();
}

function lsApplySkip() {
  const ls = lsState();
  const ctx = lsContext(ls.basics);
  const stepQ = lsPlannedPath(ls.answers, ctx)[ls.qIndex];
  if (!stepQ) { render(); return; }

  if (stepQ.kind === "base") {
    // "skip" = exact peer average; also disarms this category's follow-ups
    // (lsFollowupArmed requires a numeric notch), so the path may shrink.
    ls.answers.base[stepQ.cat] = "skip";
  }
  // A skipped follow-up stays unanswered — no adjustment applies.

  // Advance against the RECOMPUTED path (a base skip may have shrunk it; the
  // skipped question itself is still on it, so land just past it).
  const newPath = lsPlannedPath(ls.answers, ctx);
  ls.qIndex = newPath.findIndex(p => p.id === stepQ.id) + 1;
  if (ls.qIndex >= newPath.length) ls.phase = "review";
  render();
}

// ── Phase: review (native slider tweak, 2MB save conventions) ─────────────────
function lsRenderReview(ls) {
  const ctx = lsContext(ls.basics);
  const amounts = Object.assign(lsComputeAmounts(ls.answers, ctx), ls.tweaks);
  const total = BASELINE_AMOUNT_LABELS.reduce((s, [k]) => s + (amounts[k] || 0), 0);
  const leftOver = ctx.net - total;
  const isOver = leftOver < -1;

  return `
    <div class="ls-wrap">
      <div class="ls-header">
        <button class="button secondary" type="button" onclick="lsReviewBack()">← Back</button>
        <span class="helper">Final step</span>
        <span></span>
      </div>
      <h2 class="title" style="font-size:19px;">Here's where you landed</h2>
      <p class="subtitle" style="margin-bottom:12px;">Built from your answers. Nudge anything that feels off, then save.</p>

      <div class="ls-review-totals">
        <div class="ls-total-box">
          <div class="helper" style="font-size:10px;">Take-home</div>
          <div style="font-weight:850;font-size:17px;">${budgetFmt(ctx.net)}</div>
        </div>
        <div class="ls-total-box">
          <div class="helper" style="font-size:10px;">${isOver ? "Overspent" : "Unallocated"}</div>
          <div style="font-weight:850;font-size:17px;color:${isOver ? "var(--danger)" : (Math.abs(leftOver) <= ctx.net * 0.01 ? "var(--good)" : "var(--warn, var(--muted))")};">
            ${budgetFmt(Math.abs(leftOver))}
          </div>
        </div>
      </div>

      ${BASELINE_AMOUNT_LABELS.map(([key, label]) => {
        const amt = amounts[key] || 0;
        const max = Math.max(100, Math.round(Math.max(amt * 2, ctx.net * 0.6) / 10) * 10);
        return `
        <div class="card ls-review-row">
          <div class="row" style="margin-bottom:2px;">
            <span style="font-weight:850;font-size:13px;">${h(label)}</span>
            <span style="font-weight:850;">${budgetFmt(amt)}</span>
          </div>
          <input type="range" class="ls-slider" min="0" max="${max}" step="10" value="${Math.min(amt, max)}"
                 onchange="lsTweak('${h(key)}', +this.value)">
        </div>`;
      }).join("")}

      <button class="button primary full" type="button" onclick="lsSaveTap()">Build my budget</button>
      ${ls.skipPromptOpen ? lsRenderSkipModal() : ""}
      ${ls.savePromptOpen ? lsRenderSavePrompt(leftOver) : ""}
    </div>
  `;
}

function lsReviewBack() {
  const ls = lsState();
  ls.phase = "questions";
  const path = lsPlannedPath(ls.answers, lsContext(ls.basics));
  ls.qIndex = Math.max(0, path.length - 1);
  render();
}

function lsTweak(key, value) {
  lsState().tweaks[key] = Math.max(0, Math.round(value));
  render();
}

// Save conventions match the 2MB: >1% of take-home unallocated → ask (dump to
// savings / keep adjusting); sub-1% crumbs sweep silently; overspend saves
// as-is and shows red downstream.
function lsSaveTap() {
  const ls = lsState();
  const ctx = lsContext(ls.basics);
  const amounts = Object.assign(lsComputeAmounts(ls.answers, ctx), ls.tweaks);
  const total = BASELINE_AMOUNT_LABELS.reduce((s, [k]) => s + (amounts[k] || 0), 0);
  const leftOver = ctx.net - total;
  if (leftOver > ctx.net * 0.01) { ls.savePromptOpen = true; render(); return; }
  lsFinalizeSave(false);
}

function lsRenderSavePrompt(leftOver) {
  return `
    <div class="ls-modal-bg">
      <div class="card" style="max-width:300px;margin:0;">
        <p class="helper" style="margin:0 0 14px;line-height:1.5;">
          You still have <strong>${budgetFmt(leftOver)}</strong> of your take-home
          unassigned. Save it as savings, or keep adjusting?
        </p>
        <button class="button primary full" type="button" onclick="lsSavePromptConfirm()">Add to Savings &amp; save</button>
        <button class="button secondary full" style="margin-top:8px;" type="button" onclick="lsSavePromptCancel()">Keep adjusting</button>
      </div>
    </div>
  `;
}

function lsSavePromptConfirm() { lsState().savePromptOpen = false; lsFinalizeSave(true); }
function lsSavePromptCancel()  { lsState().savePromptOpen = false; render(); }

function lsFinalizeSave(sweepToSavings) {
  const ls = lsState();
  const ctx = lsContext(ls.basics);
  const amounts = Object.assign(lsComputeAmounts(ls.answers, ctx), ls.tweaks);
  const spendKeys = BASELINE_AMOUNT_LABELS.map(([k]) => k);
  const total = spendKeys.reduce((s, k) => s + (amounts[k] || 0), 0);
  const leftOver = ctx.net - total;
  if (leftOver > 0 && (sweepToSavings || leftOver <= ctx.net * 0.01)) {
    amounts.savings = (amounts.savings || 0) + Math.round(leftOver);
  }
  ls.tweaks = amounts;   // freeze the final numbers into tweaks → baseline uses them 1:1
  const baseline = lsAnswersToBaseline(ls);
  if (!baseline) return;
  if (!state.flowOrigin) state.flowOrigin = "aboutMe";
  submitBudgetBaseline(baseline);
}

// ── Admin: live response-impact log + tree status + Explorer link ─────────────
function renderLifestyleSurveyAdmin() {
  const ls = lsState();
  const ctx = lsContext(ls.basics);
  const answered = LS_BASE_QUESTIONS.filter(q => ls.answers.base[q.cat] !== undefined);

  return `
    <div class="admin-card">
      <p class="admin-card-title">Survey Under the Hood</p>
      <p class="helper" style="margin-bottom:10px;">
        Net ${budgetFmt(ctx.net)}/mo · quintile ${ctx.quintile} · zip ×${ctx.zipMult}
      </p>
      <a class="button secondary full" style="text-align:center;display:block;text-decoration:none;"
         href="survey-explorer.html" target="_blank">Open Survey Explorer ↗</a>
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Response → Budget Impact</p>
      ${answered.length === 0 ? `<p class="helper">No answers yet.</p>` : answered.map(q => {
        const notch = ls.answers.base[q.cat];
        const skipped = notch === "skip";
        const impact = lsAnswerImpact(q.cat, ls.answers, ctx);
        return `
          <div style="margin-bottom:8px;">
            <div style="font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);">${h(q.cat)}</div>
            <div style="font-size:12px;">
              ${skipped ? "Skipped → average" : h(q.notches[notch - 1].label)}
              · <span style="font-weight:850;color:${impact > 0 ? "var(--accent)" : impact < 0 ? "var(--good)" : "var(--muted)"};">
                ${impact === 0 ? "±$0" : (impact > 0 ? "+" : "−") + budgetFmt(Math.abs(impact))}</span> vs avg
            </div>
          </div>`;
      }).join("")}
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Follow-up Tree</p>
      ${LS_FOLLOWUPS.map(fu => {
        const armed = lsFollowupArmed(fu, ls.answers, ctx);
        const chosen = ls.answers.followups[fu.id];
        const status = typeof chosen === "number"
          ? `answered: ${h(fu.options[chosen].label)} (adj ${fu.options[chosen].adj >= 0 ? "+" : ""}${Math.round(fu.options[chosen].adj * 100)}%)`
          : armed ? "ARMED — prereq met" : "dormant";
        return `
          <div style="margin-bottom:8px;">
            <div style="font-size:11px;font-weight:850;color:var(--muted);">${h(fu.id)}</div>
            <div style="font-size:12px;color:${armed || typeof chosen === "number" ? "var(--accent)" : "var(--muted)"};">${status}</div>
            <div style="font-size:10px;color:var(--muted);">needs ${h(fu.prereq.cat)} ∈ [${fu.prereq.notches.join(",")}]${fu.prereq.quintiles ? " · quintile ∈ [" + fu.prereq.quintiles.join(",") + "]" : ""}${fu.prereq.minZipMult ? " · zip ≥ ×" + fu.prereq.minZipMult : ""}</div>
          </div>`;
      }).join("")}
    </div>

    <div class="admin-card">
      <button class="button secondary full" type="button" onclick="startLifestyleSurvey()">Reset Survey</button>
    </div>
  `;
}
