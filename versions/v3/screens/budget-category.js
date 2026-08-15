// ─── Budget category detail (04-budget-benchmarks) ───────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible
//
// Reached by tapping a category on the budget tab or a "Worth a look" flag.
// Read-only by design: it shows the three-layer comparison for one category and
// the goals scoped to it. Two edit affordances, kept distinct (owner's model):
//   • the PLAN is editable here (a slider, same seam as the list)
//   • the ACTUALS are updated through a clear CTA that opens the behavioral
//     estimator (Money-Journal style) — you never type a dollar figure.

function renderBudgetCategory() {
  const category = isCategory(state.selectedCategory) ? state.selectedCategory : CATEGORIES[0];
  const r = cmpRow(category);
  const idx = CATEGORIES.indexOf(category);
  const max = budgetSliderMax(category);
  const hasData = catValue(state.mtd, category) > 0;
  const catArg = h(category).replace(/'/g, "\\'");

  return `
    <h1 class="title" style="margin:0 0 4px;font-size:20px;">${h(category)}</h1>
    <p class="helper" style="margin:0 0 14px;">
      Your plan, what you've told me, and peers — for this one category.
    </p>

    ${renderComparisonRow(r)}

    ${r.hasPlan ? `
    <div class="card">
      <div class="row" style="align-items:baseline;margin-bottom:2px;">
        <span class="budget-row-name">Your plan</span>
        <!-- id is budgetSetPlan's live-drag target (budget-v3.js) — keep in step -->
        <span class="budget-row-amt" id="planAmt${idx}">${budgetFmt(r.plan)}</span>
      </div>
      <input class="journal-slider" type="range" min="0" max="${max}" step="5" value="${r.plan}"
             oninput="budgetSetPlan('${catArg}', this.value, true)"
             aria-label="${h(category)} planned amount">
      <p class="helper" style="font-size:11px;margin:6px 0 0;">Drag to adjust your monthly plan.</p>
    </div>` : `
    <div class="card">
      <p class="helper" style="margin:0 0 10px;">
        You haven't built a budget yet, so there's no plan to compare against here.
      </p>
      <button class="button full" type="button" onclick="go('aboutMe')">Build my budget ›</button>
    </div>`}

    <button class="button full" style="margin-top:12px;" type="button"
            onclick="estimatorStart('${catArg}')">
      ${hasData ? "Update what you've spent" : "Help me estimate what you've spent"} ›
    </button>
    <p class="helper" style="font-size:11px;margin:6px 0 0;text-align:center;">
      A few quick questions about your habits — I'll work out the number.
    </p>

    ${renderGoalSuggestions({ source: "budget", category: category }, h(category) + " goals")}
  `;
}

function renderBudgetCategoryAdmin() {
  const category = isCategory(state.selectedCategory) ? state.selectedCategory : CATEGORIES[0];
  const r = cmpRow(category);
  return `
    <div class="admin-card">
      <p class="admin-card-title">Category — ${h(category)}</p>
      <div class="helper" style="line-height:1.9;">
        plan <strong>${budgetFmt(r.plan)}</strong> ·
        you told me <strong>${budgetFmt(r.user)}</strong> ·
        peers <strong>${r.peer == null ? "—" : budgetFmt(r.peer)}</strong><br>
        vs plan ${r.vsPlan == null ? "—" : r.vsPlan + "%"} ·
        vs peers ${r.vsPeer == null ? "—" : r.vsPeer + "%"}
      </div>
      <div class="input-group" style="margin-top:10px;">
        <label>Jump to a different category</label>
        <select onchange="state.selectedCategory=this.value;render()">
          ${CATEGORIES.map(c => `<option value="${h(c)}" ${c === category ? "selected" : ""}>${h(c)}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}
