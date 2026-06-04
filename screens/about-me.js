// ─── About Me ─────────────────────────────────────────────────────────────────
// TAB: About Me | NAV BAR: Visible
//
// PURPOSE
// Primary input hub. User tells Money Buddy about their financial life here —
// budget setup, lifestyle patterns, goals, and balance tracking. The cleaner
// the inputs, the more accurate My Progress outputs become.
//
// NAVIGATION
//   Entry: About Me tab tap from any screen in NAV_VISIBLE_SCREENS
//   Exit:  Each component card → its own sub-screen (drill-down model)
//          Back to About Me is the return point for all About Me sub-screens
//
// STATES
//   Component cards show completion/status indicators based on user data state.
//   Budget card: status from state.budget.status (empty/in-progress/complete)
//   Lifestyle cards: show lastUpdated date or "Not started" per theme
//   Goals card: shows count of active goals
//   Account Balances card: shows last entry date or "No entries"
//   Debt Balances card: shows last entry date or "No entries"
//
// PRODUCTION NOTES
//   This screen is the input side of the input/output loop. My Progress is the
//   output side. No results or comparisons should appear here. All About Me
//   sub-screens return to aboutMe on back/cancel.

function renderAboutMe() {
  const budgetStatus = state.budget.status;
  const budgetLabel  = budgetStatus === "empty"       ? "Not started"
                     : budgetStatus === "in-progress" ? "In progress"
                     : budgetStatus === "complete"    ? "Set up"
                     : "Needs review";

  const goalsCount = (state.goals || []).length;

  const acctEntries = (state.accountBalances || []).filter(function(e) { return e.type === "account"; });
  const debtEntries = (state.accountBalances || []).filter(function(e) { return e.type === "debt"; });
  const acctLast = acctEntries.length > 0 ? acctEntries[acctEntries.length - 1].date : null;
  const debtLast = debtEntries.length > 0 ? debtEntries[debtEntries.length - 1].date : null;

  const showBudgetPrompt = budgetStatus === "empty";

  return `
    <div class="home-header">
      <div>
        <h1 class="title">About Me</h1>
        <p class="subtitle">Update your money picture.</p>
      </div>
    </div>

    <!-- Debt Balances component (first when budget complete) -->
    <div class="section-title" style="margin:16px 0 8px;">Debt Balances</div>
    <p class="helper" style="margin-bottom:10px;">Log current balances on your debts.</p>
    <div class="item-card" onclick="go('debtBalances')" style="cursor:pointer;">
      <div>
        <div class="task-title">Debt Balances</div>
        <p class="task-desc">${debtLast ? "Last updated " + h(debtLast) : "No entries yet"}</p>
      </div>
      <div class="helper" style="font-size:18px;">›</div>
    </div>

    <!-- Lifestyle component -->
    <div class="section-title" style="margin:20px 0 8px;">Lifestyle</div>
    <p class="helper" style="margin-bottom:10px;">Small answers. Better results.</p>
    <div class="item-card" onclick="go('lifestyle')" style="cursor:pointer;">
      <div>
        <div class="task-title">Lifestyle</div>
        <p class="task-desc">${lifestyleCompletedCount()} of 5 themes answered</p>
      </div>
      <div class="helper" style="font-size:18px;">›</div>
    </div>

    <!-- Goals component -->
    <div class="section-title" style="margin:20px 0 8px;">Goals</div>
    <p class="helper" style="margin-bottom:10px;">Choose what Money Buddy should help with next.</p>
    <div class="item-card" onclick="go('goals')" style="cursor:pointer;">
      <div>
        <div class="task-title">Goals</div>
        <p class="task-desc">${goalsCount} ${goalsCount === 1 ? "goal" : "goals"} set</p>
      </div>
      <div class="helper" style="font-size:18px;">›</div>
    </div>

    <!-- Account Balances component -->
    <div class="section-title" style="margin:20px 0 8px;">Account Balances</div>
    <p class="helper" style="margin-bottom:10px;">Track where your money is sitting.</p>
    <div class="item-card" onclick="go('accountBalances')" style="cursor:pointer;">
      <div>
        <div class="task-title">Account Balances</div>
        <p class="task-desc">${acctLast ? "Last updated " + h(acctLast) : "No entries yet"}</p>
      </div>
      <div class="helper" style="font-size:18px;">›</div>
    </div>

    <!-- Budget component (last when complete) -->
    <div class="section-title" style="margin:20px 0 8px;">Budget</div>
    <p class="helper" style="margin-bottom:10px;">Build it once. Update it when life changes.</p>
    <div class="item-card" onclick="go('budgetSetup')" style="cursor:pointer;">
      <div>
        <div class="task-title">Budget</div>
        <p class="task-desc">${h(budgetLabel)}</p>
      </div>
      <div class="helper" style="font-size:18px;">›</div>
    </div>

    ${showBudgetPrompt ? `
    <!-- Budget prompt overlay (shown when budget empty) -->
    <div id="aboutMeBudgetOverlay" style="position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div class="card" style="max-width:340px;width:100%;padding:24px;">
        <div style="font-weight:850;font-size:17px;margin-bottom:8px;">Build your budget</div>
        <p class="helper" style="margin-bottom:20px;">Answer a few questions and Money Buddy will estimate your monthly plan — takes about 3 minutes.</p>
        <button class="button primary full" type="button"
                onclick="dismissAboutMeOverlay(); state.flowOrigin='aboutMe'; state.postResultContext='budget'; go('babyBudget');">
          Let's go →
        </button>
      </div>
    </div>
    ` : ""}
  `;
}

function dismissAboutMeOverlay() {
  var el = document.getElementById('aboutMeBudgetOverlay');
  if (el) el.remove();
}

function lifestyleCompletedCount() {
  const themes = ["food", "entertainment", "travel", "shopping", "other"];
  return themes.filter(t => {
    const la = state.lifestyleAnswers && state.lifestyleAnswers[t];
    return la && la.lastUpdated;
  }).length;
}

function renderAboutMeAdmin() {
  return `
    <div class="admin-card">
      <p class="admin-card-title">About Me</p>
      <p class="helper">No admin controls for the hub screen. Use individual component screens.</p>
    </div>
  `;
}
