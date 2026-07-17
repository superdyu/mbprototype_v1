// ─── Budget Update Confirm ────────────────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — focus screen, like postResult
//
// PURPOSE
// The unified "your budget is changing" gate. Whenever a builder saves over an
// EXISTING budget — 2 Minute Budget re-run, Lifestyle Survey over a 2MB budget,
// any combination — submitBudgetBaseline() parks the new baseline in
// state.pendingBaseline and routes here. The user sees current vs proposed per
// category and decides. First-time budgets never see this screen (they apply
// directly). One flow for every update path is the point: builders stay
// independent, the update experience stays identical.
//
// NAVIGATION
//   Entry: submitBudgetBaseline() when state.budget.status !== "empty"
//   Exit:  Update my budget → applies pending → postResult flow
//          Keep editing     → back into the source builder, pending kept
//                             (2MB prefill prefers pendingBaseline, so the
//                             user's slider state survives the round trip)
//          Discard          → pending cleared → budgetSetup
//
// STATES
//   No pendingBaseline (admin jump / stale entry) → fallback card + back link.
//   Otherwise: income row + 8 category rows, old → new with signed deltas,
//   and an overspend callout when the proposed total exceeds take-home.

function renderBudgetUpdateConfirm() {
  const pending = state.pendingBaseline;
  if (!pending) {
    return `
      <div class="card" style="margin-top:24px;">
        <div class="section-title">No budget update in progress</div>
        <p class="helper" style="margin-bottom:12px;">This screen only appears while a builder is saving over an existing budget.</p>
        <button class="button secondary full" type="button" onclick="go('budgetSetup')">Back to Budget</button>
      </div>
    `;
  }

  const oldB     = budgetToBaseline();
  const newLabel = BUDGET_BUILDER_LABELS[pending.source] || "budget builder";
  const oldNet   = Math.round(oldB.profile.netMonthly || 0);
  const newNet   = Math.round(pending.profile.netMonthly || 0);
  const newTotal = BASELINE_AMOUNT_LABELS.reduce((s, [k]) => s + (pending.amounts[k] || 0), 0);
  const overspend = newTotal - newNet;

  const row = (label, oldVal, newVal) => {
    const delta = Math.round(newVal) - Math.round(oldVal);
    const deltaHtml = delta === 0
      ? `<span class="helper" style="font-size:11px;">no change</span>`
      : `<span style="font-size:11px;font-weight:850;color:${delta > 0 ? "var(--accent)" : "var(--muted)"};">${delta > 0 ? "+" : "−"}${budgetFmt(Math.abs(delta))}</span>`;
    return `
      <div class="row" style="margin-bottom:7px;align-items:baseline;">
        <span class="helper">${h(label)}</span>
        <span style="text-align:right;">
          <span class="helper" style="font-size:11px;">${budgetFmt(oldVal)}</span>
          <span class="helper" style="font-size:11px;"> → </span>
          <span style="font-weight:850;">${budgetFmt(newVal)}</span>
          &nbsp;${deltaHtml}
        </span>
      </div>`;
  };

  return `
    <div style="margin-top:10px;">
      <h1 class="title">Confirm your update</h1>
      <p class="subtitle" style="margin-bottom:16px;">
        You're replacing your current budget with the one you just built in the
        ${h(newLabel)}. Here's what changes.
      </p>

      <div class="card" style="margin-bottom:12px;">
        <div class="section-title" style="margin-bottom:10px;">Now → After this update</div>
        ${row("Monthly take-home", oldNet, newNet)}
        <div style="border-top:1px solid var(--line);margin:10px 0;"></div>
        ${BASELINE_AMOUNT_LABELS.map(([key, label]) =>
          row(label, oldB.amounts[key] || 0, pending.amounts[key] || 0)).join("")}
      </div>

      ${overspend > 1 ? `
      <div class="card" style="margin-bottom:12px;border-color:var(--danger);">
        <p class="helper" style="margin:0;color:var(--danger);font-weight:700;">
          Heads up: this plan is ${budgetFmt(overspend)}/mo over your take-home.
          You can still save it — it just means the plan overspends.
        </p>
      </div>` : ""}

      <button class="button primary full" type="button" onclick="budgetUpdateConfirmApply()">
        Update my budget
      </button>
      <button class="button secondary full" style="margin-top:8px;" type="button" onclick="budgetUpdateKeepEditing()">
        Keep editing
      </button>
      <p class="helper" style="text-align:center;margin-top:12px;">
        <button type="button" style="background:none;border:none;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer;"
                onclick="budgetUpdateDiscard()">Discard this update</button>
      </p>
    </div>
  `;
}

function budgetUpdateConfirmApply() {
  const pending = state.pendingBaseline;
  if (!pending) { go("budgetSetup"); return; }
  applyBudgetBaseline(pending);
  state.pendingBaseline = null;
  if (!state.flowOrigin) state.flowOrigin = "aboutMe";
  state.postResultContext = "budget";
  go("postResult");
}

// Back into whichever builder produced the pending baseline. Pending is KEPT —
// the 2MB's prefill prefers it over the applied budget, so the user's slider
// state survives the round trip (see mountBabyBudget in baby-budget.js).
function budgetUpdateKeepEditing() {
  const source = state.pendingBaseline && state.pendingBaseline.source;
  go(source === "lifestyleSurvey" ? "lifestyleSurvey" : "babyBudget");
}

function budgetUpdateDiscard() {
  state.pendingBaseline = null;
  go("budgetSetup");
}
