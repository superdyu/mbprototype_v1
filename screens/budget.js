// ─── Budget Admin Panel ───────────────────────────────────────────────────────
// Admin controls for the budget data model, shown while the budgetSetup screen
// is active (routed from renderAdmin() in render.js).
//
// HISTORY NOTE: this file used to hold a full "Analysis tab" budget dashboard
// (ghost tiles, in-progress banner, category tile grid). That dashboard was
// superseded by the budgetSetup drill-down screen and the renderers became
// unreachable; they were removed in the architecture cleanup pass. Only the
// admin panel survives. Utility functions live in budget-utils.js.

function renderBudgetAdmin() {
  const b = state.budget;
  const p = b.profile;
  const income = budgetMonthlyIncome();
  const trend  = budgetMonthlyNetSpend();

  return `
    <!-- Status -->
    <div class="admin-card">
      <p class="admin-card-title">Budget Status</p>
      <div class="input-group">
        <label>Status</label>
        <select onchange="state.budget.status=this.value;render()">
          ${["empty","in-progress","complete","refresh","checkup"].map(s =>
            `<option value="${s}" ${b.status === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </div>
      ${b.status === "in-progress" ? `
        <div class="input-group">
          <label>In-progress % (0–100)</label>
          <input type="number" min="0" max="100" value="${b.inProgressPct}"
                 oninput="state.budget.inProgressPct=parseInt(this.value)||0;debouncedRender()">
        </div>
      ` : ""}
    </div>

    <!-- Profile -->
    <div class="admin-card">
      <p class="admin-card-title">Profile</p>
      <div class="grid-two">
        <div class="input-group" style="margin:0;">
          <label>ZIP code</label>
          <input value="${h(p.zip)}" oninput="state.budget.profile.zip=this.value;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Household size</label>
          <input type="number" min="1" value="${p.householdSize}"
                 oninput="state.budget.profile.householdSize=parseInt(this.value)||1;debouncedRender()">
        </div>
      </div>
    </div>

    <!-- Income model -->
    <div class="admin-card">
      <p class="admin-card-title">Income Model</p>
      <div class="input-group">
        <label>Income type</label>
        <select onchange="state.budget.profile.incomeType=this.value;render()">
          ${["salary","variable","mixed"].map(t =>
            `<option value="${t}" ${p.incomeType === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </div>

      ${(p.incomeType === "salary" || p.incomeType === "mixed") ? `
        <p class="helper" style="margin-bottom:8px;">Salary earners</p>
        ${p.earners.map((e, i) => `
          <div class="grid-two" style="margin-bottom:8px;align-items:end;">
            <div class="input-group" style="margin:0;">
              <label>Label</label>
              <input value="${h(e.label)}"
                     oninput="state.budget.profile.earners[${i}].label=this.value;debouncedRender()">
            </div>
            <div class="input-group" style="margin:0;">
              <label>Monthly net ($)</label>
              <input type="number" min="0" value="${e.monthlyNet}"
                     oninput="state.budget.profile.earners[${i}].monthlyNet=parseInt(this.value)||0;debouncedRender()">
            </div>
          </div>
        `).join("")}
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button class="button secondary" style="flex:1;font-size:11px;" type="button"
                  onclick="state.budget.profile.earners.push({label:'Earner '+(state.budget.profile.earners.length+1),monthlyNet:0,type:'salary'});render()">
            + Add Earner
          </button>
          ${p.earners.length > 1 ? `
            <button class="button secondary" style="font-size:11px;" type="button"
                    onclick="state.budget.profile.earners.pop();render()">
              − Remove
            </button>
          ` : ""}
        </div>
      ` : ""}

      ${(p.incomeType === "variable" || p.incomeType === "mixed") ? `
        <p class="helper" style="margin-bottom:8px;">Variable income — last 3 months (oldest → recent)</p>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          ${p.variableIncomeMonths.map((v, i) => `
            <div class="input-group" style="margin:0;flex:1;">
              <label>${i === 0 ? "3 mo ago" : i === 1 ? "2 mo ago" : "Last mo"}</label>
              <input type="number" min="0" value="${v}"
                     oninput="state.budget.profile.variableIncomeMonths[${i}]=parseInt(this.value)||0;debouncedRender()">
            </div>
          `).join("")}
        </div>
      ` : ""}

      <div class="helper" style="margin-top:4px;">
        Computed monthly income: <strong>${budgetFmt(income)}</strong>
      </div>
    </div>

    <!-- Bottom-line math -->
    <div class="admin-card">
      <p class="admin-card-title">3-Month Balance Inputs</p>
      <p class="helper" style="margin-bottom:10px;">
        monthlyNetSpend = (start − end + income×3 − debtRepaid + assets) ÷ 3<br>
        <em>debtRepaid = extra principal paid from checking (not lifestyle spending)</em>
      </p>
      <div class="grid-two">
        <div class="input-group" style="margin:0;">
          <label>Balance start ($)</label>
          <input type="number" value="${b.balanceStart}"
                 oninput="state.budget.balanceStart=parseInt(this.value)||0;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Balance end ($)</label>
          <input type="number" value="${b.balanceEnd}"
                 oninput="state.budget.balanceEnd=parseInt(this.value)||0;debouncedRender()">
        </div>
      </div>
      <div class="grid-two" style="margin-top:8px;">
        <div class="input-group" style="margin:0;">
          <label>Extra debt repaid ($)</label>
          <input type="number" value="${b.debtRepaid}"
                 oninput="state.budget.debtRepaid=parseInt(this.value)||0;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Assets sold ($)</label>
          <input type="number" value="${b.assetsSold}"
                 oninput="state.budget.assetsSold=parseInt(this.value)||0;debouncedRender()">
        </div>
      </div>
      <div class="helper" style="margin-top:8px;">
        Computed spend trend: <strong>${budgetFmt(trend)}/mo</strong>
      </div>
    </div>

    <!-- Category spend overrides -->
    <div class="admin-card">
      <p class="admin-card-title">Category Amounts</p>
      ${b.categories.map((cat, ci) => `
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line);">
          <div style="font-size:12px;font-weight:850;margin-bottom:6px;">${cat.icon} ${h(cat.name)}</div>
          ${cat.subcategories.map((sc, si) => `
            <div class="input-group" style="margin-bottom:6px;">
              <label>${h(sc.name)}</label>
              <input type="number" min="0" value="${sc.amount}"
                     oninput="state.budget.categories[${ci}].subcategories[${si}].amount=parseInt(this.value)||0;debouncedRender()">
            </div>
          `).join("")}
          <div class="helper">Total: ${budgetFmt(budgetCategoryTotal(cat))} · Peer avg: ${budgetFmt(budgetPeerAvg(cat.key))}</div>
        </div>
      `).join("")}
    </div>
  `;
}
