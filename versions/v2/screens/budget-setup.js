// ─── Budget Setup ─────────────────────────────────────────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible — Budget tab highlighted
//
// PURPOSE
// Budget input sub-screen within the Budget tab (screen id `aboutMe`). Two jobs,
// split by budget status:
//   - No budget yet  → the SETUP CHOICE: Lifestyle Survey vs 2 Minute Budget.
//     This is the single front door for first-time setup; every entry point
//     (Budget tab overlay, home task card) routes here rather than jumping
//     straight into the wizard, so the choice can't be skipped.
//   - Budget exists   → current parameters (income, ZIP, household, major bills)
//     plus Edit Budget, See Results, and the category drill-down.
//
// NAVIGATION
//   Entry: Budget tab → Budget card; Budget tab empty-state overlay;
//          home task card "Build your starter budget"
//          Chat: budget/planning keyword route when a budget already exists
//   Exit:  ← Budget; 2 Minute Budget card / Edit Budget → babyBudget screen;
//          See Results → myProgress; Update now → monthly update flow
//
// STATES
//   empty/in-progress: the side-by-side setup choice (renderBudgetChoice)
//   complete/refresh/checkup: current budget parameters + Edit Budget CTA
//
// PRODUCTION NOTES
//   Budget categories are drillable via selectBudgetCategory().
//   Update This Month captures account + debt balance snapshots (monthly tracking).
//   When monthly update detects >10% gap vs budget estimate, prompts to revisit
//   the wizard's sliders for a full budget refresh.

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

    ${isEmpty ? renderBudgetChoice() : ""}

    ${hasBudget ? `
    <!-- Budget summary card (only once a budget exists) -->
    <div class="card" style="margin-bottom:12px;">
      <div class="section-title" style="margin-bottom:6px;">2 Minute Budget</div>
      <p class="helper" style="margin-bottom:12px;">Start with estimates. Adjust what feels off.</p>

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
    </div>
    ` : ""}

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

// ─── First-time setup: pick how to build the budget ──────────────────────────
// Only rendered when status === "empty". Two side-by-side cards so the choice
// reads as a fork, not a list. Pros/cons are the point — the two paths trade
// speed against thinking, and the user should see that before picking.
//
// LIFESTYLE SURVEY IS A STUB. No from-scratch survey wizard exists yet: the
// current lifestyle screens (screens/lifestyle.js, lifestyle-chain.js) only
// MODIFY a budget that already exists — they're guarded to no-op when status is
// "empty", which is exactly the state this screen renders in. When that wizard
// is built, swap chooseLifestyleSurvey() for its real launcher and drop the
// coming-soon badge + note.
function renderBudgetChoice() {
  return `
    <div class="section-title" style="margin:0 0 6px;">How do you want to start?</div>
    <p class="helper" style="margin-bottom:12px;">Two ways to the same place. Neither one is wrong.</p>

    <div style="display:flex;gap:10px;align-items:stretch;margin-bottom:12px;">

      <!-- Lifestyle Survey (stub) -->
      <div class="card" style="flex:1;margin-bottom:0;display:flex;flex-direction:column;opacity:.75;"
           onclick="chooseLifestyleSurvey()">
        <div class="pill" style="align-self:flex-start;font-size:9px;padding:2px 7px;margin-bottom:8px;">Coming soon</div>
        <div class="task-title" style="margin-bottom:6px;">Lifestyle Survey</div>
        <p class="task-desc" style="flex:1;">
          Answer questions about how you live. We turn them into the numbers, so
          you never have to guess at a figure.
        </p>
        <p class="helper" style="font-size:10px;margin:10px 0 0;">Slower &bull; No figures needed</p>
      </div>

      <!-- 2 Minute Budget -->
      <div class="card" style="flex:1;margin-bottom:0;display:flex;flex-direction:column;cursor:pointer;border-color:var(--accent);"
           onclick="launchBabyBudget()">
        <div class="pill" style="align-self:flex-start;font-size:9px;padding:2px 7px;margin-bottom:8px;background:var(--accent);color:#fff;border-color:var(--accent);">Fastest</div>
        <div class="task-title" style="margin-bottom:6px;">2 Minute Budget</div>
        <p class="task-desc" style="flex:1;">
          Know your rough numbers? Enter a few figures, drag the sliders, done.
          Estimates are fine &mdash; you can change them later.
        </p>
        <p class="helper" style="font-size:10px;margin:10px 0 0;">~2 minutes &bull; Rough figures</p>
      </div>

    </div>

    <p id="lifestyleSurveyNote" class="helper" style="display:none;font-size:11px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:12px;">
      The Lifestyle Survey isn't built yet. For now, the 2 Minute Budget is the
      way in &mdash; once you have a budget, the Lifestyle screens can fine-tune it.
    </p>
  `;
}

// Stub handler: reveals the note instead of navigating. Direct DOM write rather
// than a state flag + render() — this is a transient hint, not app state.
function chooseLifestyleSurvey() {
  const note = document.getElementById("lifestyleSurveyNote");
  if (note) note.style.display = "block";
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
