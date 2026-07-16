// ─── Budget Setup ─────────────────────────────────────────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible — Budget tab highlighted
//
// PURPOSE
// Budget input sub-screen within the Budget tab (screen id `aboutMe`). Shows
// current budget parameters
// (income, ZIP, household, major bills) and provides entry points for the Baby
// Budget wizard (full setup) and Update This Month (quick monthly check-in).
//
// NAVIGATION
//   Entry: Budget tab → Budget card
//          Chat: budget/planning keyword route when a budget already exists
//   Exit:  ← Budget; Baby Budget CTA → babyBudget screen;
//          Update This Month CTA → (future monthly update flow)
//
// STATES
//   empty/in-progress: shows "Build Your Budget" as the primary CTA
//   complete/refresh/checkup: shows current budget parameters + Edit Budget CTA
//
// PRODUCTION NOTES
//   Budget categories are drillable via selectBudgetCategory().
//   Update This Month captures account + debt balance snapshots (monthly tracking).
//   When monthly update detects >10% gap vs budget estimate, prompts to revisit
//   the Baby Budget sliders for a full budget refresh.

function renderBudgetSetup() {
  const status    = state.budget.status;
  const profile   = state.budget.profile;
  const isEmpty   = status === "empty";
  const hasBudget = !isEmpty;

  const monthlyIncome  = hasBudget ? budgetMonthlyIncome() : 0;
  const housingCat     = hasBudget ? state.budget.categories.find(c => c.key === "housing") : null;
  const housingAmt     = housingCat ? budgetCategoryTotal(housingCat) : 0;
  const fixedOverhead  = hasBudget ? state.budget.fixedOverhead : [];
  const fixedTotal     = hasBudget ? budgetFixedOverheadTotal() : 0;

  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="goBackFromBudgetSetup()">← ${state.flowOrigin === 'myProgress' ? 'My Progress' : 'Budget'}</button>
      <h1 class="title" style="margin:0;font-size:20px;">Budget</h1>
      <p class="subtitle" style="margin:4px 0 0;">Build it once. Update it when life changes.</p>
    </div>

    <!-- Baby Budget card -->
    <div class="card" style="margin-bottom:12px;">
      <div class="section-title" style="margin-bottom:6px;">Baby Budget</div>
      <p class="helper" style="margin-bottom:12px;">Start with estimates. Adjust what feels off.</p>

      ${hasBudget ? `
        <div style="margin-bottom:14px;">
          <div class="row" style="margin-bottom:6px;">
            <span class="helper">Monthly income</span>
            <span style="font-weight:700;">${budgetFmt(monthlyIncome)}</span>
          </div>
          <div class="row" style="margin-bottom:6px;">
            <span class="helper">Housing</span>
            <span style="font-weight:700;">${budgetFmt(housingAmt)}</span>
          </div>
          ${fixedTotal > 0 ? `
          <div class="row" style="margin-bottom:6px;">
            <span class="helper">Required costs</span>
            <span style="font-weight:700;">${budgetFmt(fixedTotal)}</span>
          </div>` : ""}
          ${profile.zip ? `<div class="row" style="margin-bottom:6px;">
            <span class="helper">ZIP code</span>
            <span style="font-weight:700;">${h(profile.zip)}</span>
          </div>` : ""}
          ${profile.householdSize ? `<div class="row" style="margin-bottom:0;">
            <span class="helper">Household</span>
            <span style="font-weight:700;">${h(profile.householdSize)} ${profile.householdSize === 1 ? "person" : "people"}</span>
          </div>` : ""}
        </div>
        <div class="row" style="gap:10px;">
          <button class="button primary" type="button" onclick="launchBabyBudget()">Edit Budget</button>
          <button class="button secondary" type="button" onclick="go('myProgress')">See Results</button>
        </div>
      ` : `
        <button class="button primary full" type="button" onclick="launchBabyBudget()">Build Your Budget</button>
      `}
    </div>

    ${hasBudget ? `
    <!-- Update This Month note -->
    <p class="helper" style="margin:6px 0 16px;font-size:11px;">
      Tip: Log your balances each month to see if your plan still fits.
      <button class="button secondary small" style="margin-left:6px;"
              type="button" onclick="startMonthlyUpdate()">Update now</button>
    </p>
    ` : ""}

    ${hasBudget ? `
    <!-- Spending categories drill-down -->
    <div class="section-title" style="margin:20px 0 8px;">Spending Categories</div>
    <p class="helper" style="margin-bottom:10px;">Tap a category to see and adjust its breakdown.</p>
    ${state.budget.categories.map(cat => `
      <div class="item-card" onclick="selectBudgetCategory('${h(cat.key)}')" style="cursor:pointer;">
        <div>
          <div class="task-title">${h(cat.icon || "")} ${h(cat.name)}</div>
          <p class="task-desc">${budgetFmt(budgetCategoryTotal(cat))}/mo</p>
        </div>
        <div class="helper" style="font-size:18px;">›</div>
      </div>
    `).join("")}

    ${fixedOverhead.length > 0 ? `
    <!-- Required costs breakdown -->
    <div class="section-title" style="margin:20px 0 8px;">Required Costs</div>
    <p class="helper" style="margin-bottom:10px;">Fixed monthly obligations before discretionary spending.</p>
    ${fixedOverhead.map(f => `
      <div class="item-card" style="margin-bottom:8px;">
        <span class="helper">${h(f.name)}</span>
        <span style="font-weight:700;">${budgetFmt(f.amount)}/mo</span>
      </div>
    `).join("")}
    ` : ""}
    ` : ""}
  `;
}

function goBackFromBudgetSetup() {
  const origin = state.flowOrigin;
  if (origin && origin !== "aboutMe") {
    state.flowOrigin = null;
    go(origin);
  } else {
    go("aboutMe");
  }
}

function launchBabyBudget() {
  state.flowOrigin        = state.flowOrigin || "aboutMe";
  state.postResultContext = "budget";
  go("babyBudget");
}

function startMonthlyUpdate() {
  if (state.budget.status === "empty") return;
  state.flowOrigin        = state.flowOrigin || "aboutMe";
  state.postResultContext = "monthlyUpdate";
  go("accountBalances");
}
