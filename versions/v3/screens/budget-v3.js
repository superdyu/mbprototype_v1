// ─── Budget (v3) ─────────────────────────────────────────────────────────────
// TAB: Budget | NAV BAR: Visible
//
// Replaces v2's about-me hub + budget-setup dashboard. Twelve flat categories
// (A2), each with a slider, plus the plan-vs-actual signal per row.
//
// Empty state: no budget yet → the wizard is the only door (L6). D19 still
// applies — the screen shows the seeded plan rather than a blank.

function renderBudgetV3() {
  if (state.planStatus !== "complete") return renderBudgetEmpty();

  const total  = catTotal(state.plan);
  const income = state.monthlyIncomeNet;
  const left   = income - total;
  const builtBy = BUDGET_BUILDER_LABELS[state.planBuiltWith] || state.planBuiltWith;

  return `
    <div class="row" style="align-items:baseline;margin-bottom:2px;">
      <h1 class="title" style="margin:0;font-size:20px;">Monthly budget</h1>
      <button class="button secondary" style="font-size:11px;padding:6px 12px;"
              type="button" onclick="lwStart()">Rebuild</button>
    </div>
    <p class="helper" style="margin:0 0 14px;font-size:11px;">
      ${h(state.profile.zip)} · ${h(state.profile.householdSize)} person${state.profile.householdSize > 1 ? "s" : ""}${builtBy ? " · Built with " + h(builtBy) : ""}
    </p>

    <div class="card">
      <div class="row" style="align-items:baseline;">
        <span class="helper">Planned</span>
        <span class="journal-total">${budgetFmt(total)}</span>
      </div>
      <div class="row" style="align-items:baseline;margin-top:4px;">
        <span class="helper">Take-home</span>
        <span class="helper">${budgetFmt(income)}</span>
      </div>
      <div class="budget-bar" aria-hidden="true">
        <span style="width:${Math.min(100, income ? (total / income) * 100 : 0)}%"></span>
      </div>
      <p class="helper" style="margin:8px 0 0;">
        ${left >= 0
          ? budgetFmt(left) + " left over each month."
          : budgetFmt(Math.abs(left)) + " more than you bring in."}
      </p>
    </div>

    ${renderBudgetObservationCards("budget_comparison")}

    <div class="section-title" style="margin:18px 0 8px;">Categories</div>
    ${CATEGORIES.map(c => renderBudgetCategoryRow(c)).join("")}
  `;
}

// Per-row: plan vs what the journal says. The two gaps are NEVER blurred — this
// row shows the PLAN gap; the peer gap is its own card (L11, 2b).
function renderBudgetCategoryRow(category) {
  const plan   = catValue(state.plan, category);
  const actual = catValue(state.mtd, category);
  const pct    = plan ? Math.round(((actual - plan) / plan) * 100) : null;
  const over   = pct != null && pct > 0;
  const max    = Math.max(Math.ceil(plan * 2.2), 100);

  return `
    <div class="card budget-row">
      <div class="row" style="align-items:baseline;margin-bottom:2px;">
        <span class="budget-row-name">${h(category)}</span>
        <span class="budget-row-amt">${budgetFmt(plan)}</span>
      </div>
      <div class="row" style="align-items:baseline;margin-bottom:6px;">
        <span class="helper" style="font-size:11px;">
          You told me ${budgetFmt(actual)}
        </span>
        ${pct == null ? "" : `
          <span class="pill ${over ? "pill-warn" : "pill-good"}" style="font-size:9px;padding:2px 7px;">
            ${over ? "+" : ""}${pct}% vs plan
          </span>`}
      </div>
      <input class="journal-slider" type="range" min="0" max="${max}" step="5"
             value="${plan}"
             oninput="budgetSetPlan('${h(category)}', this.value)"
             aria-label="${h(category)} planned amount">
    </div>
  `;
}

// Direct slider edits are a tweak, not a rebuild — they do not go through the
// seam, which exists to gate whole-budget replacement.
function budgetSetPlan(category, amount) {
  if (!isCategory(category)) return;
  state.plan[category] = Math.max(0, Math.round(Number(amount) || 0));
  state.planTotal = catTotal(state.plan);
  observationsRecompute();
  render();
}

function renderBudgetObservationCards(surface) {
  const obs = observationsFor(surface);
  if (!obs.length) return "";
  return obs.map(o => `
    <div class="card obs-card">
      <div class="row" style="align-items:baseline;margin-bottom:3px;">
        <p class="task-title" style="margin:0;">${h(observationHeadline(o))}</p>
        ${observationFigure(o) ? `<span class="obs-figure">${h(observationFigure(o))}</span>` : ""}
      </div>
      <p class="helper" style="margin:0;">${h(observationDetail(o))}</p>
    </div>
  `).join("");
}

// No budget yet. One door — the wizard (L6). A picker with one option is a
// button, which is why v2's two-card fork is gone.
function renderBudgetEmpty() {
  return `
    <h1 class="title" style="margin:0 0 4px;font-size:20px;">Monthly budget</h1>
    <p class="helper" style="margin:0 0 16px;">You haven't built one yet.</p>

    <div class="card">
      <p class="task-title" style="margin:0 0 6px;">Let's build your budget</p>
      <p class="task-desc" style="margin:0 0 12px;">
        Six questions about how you live. We turn them into the numbers, so you
        never have to guess at a figure.
      </p>
      <button class="button full" type="button" onclick="lwStart()">Start</button>
      <p class="helper" style="font-size:10px;margin:10px 0 0;">
        About two minutes · no figures needed
      </p>
    </div>
  `;
}

// ─── Post-save ───────────────────────────────────────────────────────────────

function renderBudgetDone() {
  return `
    <div class="journal-shell">
      <div class="journal-head">
        <h1 class="title" style="font-size:21px;margin:0;">Budget saved</h1>
        <p class="helper" style="margin:6px 0 0;">
          ${budgetFmt(catTotal(state.plan))} a month across ${CATEGORIES.length} categories.
        </p>
      </div>
      <div class="journal-body">
        ${renderBudgetObservationCards("budget_comparison")}
      </div>
      <div class="journal-foot">
        <span></span>
        <button class="button" type="button" onclick="navGoTab('aboutMe')">See my budget</button>
      </div>
    </div>
  `;
}

function renderBudgetV3Admin() {
  return `
    <div class="admin-card">
      <p class="admin-card-title">Plan (12 categories)</p>
      <div class="input-group">
        <label>Status</label>
        <select onchange="state.planStatus=this.value;render()">
          ${["empty", "complete"].map(x =>
            `<option value="${x}" ${state.planStatus === x ? "selected" : ""}>${x}</option>`).join("")}
        </select>
      </div>
      <div class="input-group">
        <label>Built with</label>
        <div class="helper">${h(state.planBuiltWith || "—")} ${h(state.planBuiltDate || "")}</div>
      </div>
      ${CATEGORIES.map(c => `
        <div class="input-group" style="margin-bottom:6px;">
          <label>${h(c)} — peer ${budgetFmt(benchPeerValue(c, benchOptsForUser()))}</label>
          <input type="number" min="0" value="${catValue(state.plan, c)}"
                 onchange="budgetSetPlan('${h(c)}', this.value)">
        </div>
      `).join("")}
      <div class="helper">Total: <strong>${budgetFmt(catTotal(state.plan))}</strong></div>
    </div>
  `;
}
