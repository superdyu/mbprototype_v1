// ─── Budget builder — three steps, and a Help me out toggle per line ─────────
// TAB: Budget (sub-screen) | NAV BAR: Hidden — full-bleed
//
// Replaces v3.1's single twelve-slider `spendingProfile` screen, and with it
// the six lifestyle questions and the "Which is closer?" reconciliation that
// followed. Those asked everyone the same six questions whether or not they
// needed them; this asks nothing unless the tester says they cannot estimate a
// line, and then asks only about that line.
//
// ── ONE SCREEN, THREE STEPS ──────────────────────────────────────────────────
// The step index lives on state.budgetBuild rather than in three screen ids.
// A screen here costs five wiring points (render.js x4, utils.js, state.js) and
// each one is a place to forget; three steps of one screen cost them once.
//
// ── EXACT vs RANGE ───────────────────────────────────────────────────────────
// Owner's split. Exact lines are ones a tester can actually state — rent is
// rent, and subscriptions resolve to a real list of real prices — so they get a
// number field. Range lines genuinely move month to month, so they get the
// band slider and "roughly right" is the honest target.
//
// Either way the budget is ONE figure. Range describes how it is entered, not
// a low-high pair being stored.

const BB_STEPS = [
  {
    id: "exact",
    input: "exact",
    title: "The ones you already know",
    help: "Rent or mortgage, and what you subscribe to. These barely move from month to month, so a real figure beats an estimate.",
    categories: ["Housing", "Subscriptions"]
  },
  {
    id: "regular",
    input: "range",
    title: "The regular ones",
    help: "These move a little but not wildly. Roughly right is all this needs.",
    categories: ["Transport", "Utilities", "Groceries", "Personal care", "Debt payments"]
  },
  {
    id: "flexible",
    input: "range",
    title: "The ones that move",
    help: "These vary the most, and they are the ones your Money Journal will sharpen over time.",
    categories: ["Health", "Dining out", "Entertainment", "Shopping", "Other"]
  }
];

// The three steps must partition the taxonomy exactly — no category asked
// twice, none skipped. A skipped one would save at whatever the peer model
// opened it on, silently, and nothing on screen would ever have mentioned it.
// scripts/sweep.js asserts this; the function is here so both read the same
// definition.
function bbAllStepCategories() {
  return BB_STEPS.reduce((all, s) => all.concat(s.categories), []);
}

/**
 * Opening figures — the national average for a household this size, adjusted
 * for their ZIP, with nothing about how they live folded in yet.
 *
 * `lifestyle: {}` is deliberate and is the owner's "the start of the slider is
 * unchanged logic": it is exactly what the previous builder opened on. The peer
 * BAND drawn behind the dot uses the user's real lifestyle options, so the two
 * can differ — that difference is information, not a mismatch.
 */
function bbOpeningValues() {
  return benchAllPeerValues({
    annualIncome:  state.profile.incomeAnnual,
    householdSize: state.profile.householdSize,
    zip:           state.profile.zip,
    lifestyle:     {}
  });
}

function bbStart() {
  const opening = bbOpeningValues();
  state.budgetBuild = {
    step: 0,
    opening: opening,                       // frozen: the band's axis anchor
    values: Object.assign({}, opening),
    help: {},                               // category -> true while toggled on
    helped: {}                              // category -> true once its tree ran
  };
  go("budgetBuild");
}

function bbSession() {
  if (!state.budgetBuild) bbStart();
  return state.budgetBuild;
}

function bbStep() {
  const b = state.budgetBuild;
  return BB_STEPS[Math.max(0, Math.min(BB_STEPS.length - 1, (b && b.step) || 0))];
}

function bbValue(category) {
  const b = state.budgetBuild;
  return Math.max(0, Math.round(Number((b && b.values && b.values[category])) || 0));
}

// `live` is set by the slider's oninput, which fires on every pointer move.
// render() reassigns .screen's innerHTML, so an undebounced render destroys the
// element being dragged and the thumb stops tracking. The number field passes
// no flag and repaints immediately.
function bbSet(category, amount, live) {
  if (!isCategory(category)) return;
  const b = bbSession();
  b.values[category] = Math.max(0, Math.round(Number(amount) || 0));
  if (!live) { render(); return; }
  const el = document.getElementById("bbAmt" + CATEGORIES.indexOf(category));
  if (el) el.textContent = budgetFmt(b.values[category]) + " a month";
  debouncedRender();
}

/**
 * "Help me out" — this is a line I cannot estimate, ask me about it instead.
 *
 * Toggling ON disables the row's own input, because the two are alternatives:
 * a slider you have abandoned and a set of questions you have not answered yet
 * would leave the row showing a figure that means nothing. Toggling OFF hands
 * the line back and discards any answer the tree had reached — it was an answer
 * to a question the tester has just withdrawn.
 */
function bbToggleHelp(category) {
  if (!isCategory(category)) return;
  const b = bbSession();
  if (b.help[category]) {
    delete b.help[category];
    delete b.helped[category];
  } else {
    b.help[category] = true;
  }
  render();
}

/** Lines on THIS step that asked for help and have not been asked yet. */
function bbPendingHelp() {
  const b = bbSession();
  return bbStep().categories.filter(c => b.help[c] && !b.helped[c]);
}

/**
 * Continue.
 *
 * Any line on this step still waiting on its questions goes first — that is
 * the whole contract of the toggle, and advancing past it would leave the line
 * sitting on a peer figure the tester explicitly said they could not vouch for.
 */
function bbNext() {
  const b = bbSession();
  const pending = bbPendingHelp();
  if (pending.length) { bbRunHelp(pending[0]); return; }
  if (b.step < BB_STEPS.length - 1) { b.step++; render(); return; }
  bbSubmit();
}

function bbBack() {
  const b = bbSession();
  if (b.step > 0) { b.step--; render(); return; }
  navBack();
}

/**
 * Hand one line to the estimator, in BUDGET mode.
 *
 * The estimator already asks about habits rather than dollars across all
 * twelve categories, which is the same job — the only difference is where the
 * answer lands. So it takes a target rather than being duplicated
 * (screens/spend-estimator.js); "mtd" writes what you have spent, "budget"
 * writes what you are planning.
 */
function bbRunHelp(category) {
  if (!isCategory(category)) return;
  estimatorStart(category, { target: "budget" });
}

/** The estimator calls this back with the figure its questions reached. */
function bbApplyHelp(category, amount) {
  const b = bbSession();
  if (!isCategory(category)) return;
  b.values[category] = Math.max(0, Math.round(Number(amount) || 0));
  b.helped[category] = true;
}

function bbTotal() {
  const b = bbSession();
  return catTotal(b.values);
}

// Saves through the seam, never into state.plan directly (L6).
function bbSubmit() {
  const b = bbSession();
  const monthly = {};
  CATEGORIES.forEach(c => { monthly[c] = bbValue(c); });
  submitBudgetBaseline({
    source: "budgetBuild",
    profile: {
      zip: state.profile.zip,
      householdSize: state.profile.householdSize,
      incomeAnnual: state.profile.incomeAnnual
    },
    lifestyle: Object.assign({}, state.lifestyle),
    monthly: monthly
  });
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderBudgetBuild() {
  const b = bbSession();
  const step = bbStep();
  const total = bbTotal();
  const income = state.monthlyIncome;
  const left = income - total;
  const pending = bbPendingHelp();

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">Step ${b.step + 1} of ${BB_STEPS.length}</p>
        <div class="journal-progress" aria-hidden="true">
          ${BB_STEPS.map((_, i) => `<span class="journal-pip ${i <= b.step ? "on" : ""}"></span>`).join("")}
        </div>
        <h1 class="title" style="font-size:21px;margin:12px 0 0;">${h(step.title)}</h1>
        <p class="helper" style="margin:6px 0 0;">${h(step.help)}</p>
      </div>

      <div class="journal-body">
        <div class="card">
          <div class="row" style="align-items:baseline;">
            <span class="helper">Monthly total so far</span>
            <span class="journal-total">${budgetFmt(total)}</span>
          </div>
          <div class="row" style="align-items:baseline;margin-top:4px;">
            <span class="helper">Coming in each month</span>
            <span class="helper">${budgetFmt(income)}</span>
          </div>
          <p class="helper" style="margin:8px 0 0;color:${left < 0 ? "var(--warn)" : "var(--muted)"};">
            ${left >= 0
              ? budgetFmt(left) + " left over each month."
              : budgetFmt(Math.abs(left)) + " more than you bring in."}
          </p>
        </div>

        ${step.categories.map(c => bbRow(c, step)).join("")}

        <p class="helper" style="margin:14px 0 0;font-size:11px;">
          ${pending.length
            ? "Continue and I'll ask about " +
              (pending.length === 1
                ? h(catLabel(pending[0]).toLowerCase())
                : pending.length + " lines you asked for help with") + "."
            : "Nothing is saved until the last step."}
        </p>
      </div>

      <div class="journal-foot">
        <button class="button secondary" type="button" onclick="bbBack()">Back</button>
        <button class="button" type="button" onclick="bbNext()">
          ${pending.length
            ? "Continue"
            : (b.step < BB_STEPS.length - 1 ? "Continue" : "Save budget")}
        </button>
      </div>
    </div>
  `;
}

/**
 * One line: its figure, its input, and the toggle that hands it over.
 *
 * The peer band behind the input is drawn with the tester's REAL options, so
 * what they are setting their figure against is on screen while they set it.
 * Its axis is budgetSliderMax(), which is derived from the seeded plan and the
 * peer figure and never from the value being dragged — a ceiling that moved
 * with the value would make the thumb recoil on release.
 */
function bbRow(category, step) {
  const b = bbSession();
  const idx = CATEGORIES.indexOf(category);
  const value = bbValue(category);
  const helping = !!b.help[category];
  const done = !!b.helped[category];
  const peer = benchPeerValue(category, benchOptsForUser());
  const catArg = h(category).replace(/'/g, "\\'");

  const input = step.input === "exact"
    ? `<input class="bb-exact" type="number" min="0" step="5" value="${value}"
              ${helping ? "disabled" : ""}
              onchange="bbSet('${catArg}', this.value)"
              aria-label="${h(catLabel(category))} a month">`
    : renderBudgetBandSlider({
        category: category,
        value: value,
        peer: peer,
        max: budgetSliderMax(category),
        disabled: helping,
        oninput: `bbSet('${catArg}', this.value, true)`
      });

  return `
    <div class="card budget-row bb-row ${helping ? "bb-row-helping" : ""}">
      <div class="row" style="align-items:baseline;margin-bottom:8px;">
        <span class="budget-row-name">${h(catLabel(category))}</span>
        <span class="budget-row-amt" id="bbAmt${idx}">
          ${helping && !done ? "I'll ask" : budgetFmt(value) + " a month"}
        </span>
      </div>

      <div class="bb-row-body">
        <div class="bb-row-input ${helping ? "is-disabled" : ""}">${input}</div>
        <div class="bb-help">
          <span class="bb-help-label" id="bbHelpLabel${idx}">Help me out</span>
          <button class="bb-toggle ${helping ? "on" : ""}" type="button"
                  role="switch" aria-checked="${helping ? "true" : "false"}"
                  aria-labelledby="bbHelpLabel${idx}"
                  onclick="bbToggleHelp('${catArg}')">
            <span class="bb-toggle-knob" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      ${helping ? `
        <p class="helper" style="margin:8px 0 0;font-size:10px;">
          ${done
            ? "Worked out from what you told me. Toggle off to set it yourself."
            : "I'll ask a couple of questions about this when you continue."}
        </p>` : ""}
    </div>
  `;
}

function renderBudgetBuildAdmin() {
  const b = state.budgetBuild;
  if (!b) {
    return `<div class="admin-card">
      <p class="admin-card-title">Budget builder</p>
      <p class="helper">Not started.</p></div>`;
  }
  const step = bbStep();
  return `
    <div class="admin-card">
      <p class="admin-card-title">Budget builder — step ${b.step + 1}/${BB_STEPS.length}</p>
      <p class="helper" style="margin-bottom:10px;">
        <strong>${h(step.id)}</strong> · ${h(step.input)} input ·
        ${step.categories.length} lines · total ${budgetFmt(bbTotal())}
      </p>
      <div class="input-group">
        <label>This step — value · help · asked</label>
        <div class="helper" style="line-height:1.8;">
          ${step.categories.map(c => `
            ${h(catLabel(c))}: <strong>${budgetFmt(bbValue(c))}</strong>
            · help ${b.help[c] ? "on" : "off"}
            · ${b.helped[c] ? "asked" : "—"}
            <em>(peer ${budgetFmt(benchPeerValue(c, benchOptsForUser()))})</em>`).join("<br>")}
        </div>
      </div>
      <div class="input-group">
        <label>Opening figures (ZIP-adjusted, no lifestyle)</label>
        <div class="helper">${budgetFmt(catTotal(b.opening))} across ${CATEGORIES.length}</div>
      </div>
      <div class="input-group">
        <label>Step coverage</label>
        <div class="helper">
          ${(function () {
            const covered = bbAllStepCategories();
            const missing = CATEGORIES.filter(c => covered.indexOf(c) === -1);
            const twice = covered.filter((c, i) => covered.indexOf(c) !== i);
            if (!missing.length && !twice.length) {
              return covered.length + " of " + CATEGORIES.length + " categories, each exactly once.";
            }
            return "<strong>BROKEN</strong> — " +
              (missing.length ? "never asked: " + missing.map(h).join(", ") + ". " : "") +
              (twice.length ? "asked twice: " + twice.map(h).join(", ") + "." : "");
          })()}
        </div>
      </div>
    </div>
  `;
}
