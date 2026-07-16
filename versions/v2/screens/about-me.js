// ─── Budget (input hub) ───────────────────────────────────────────────────────
// TAB: Budget | NAV BAR: Visible
//
// NAMING: this screen is labeled "Budget" in the UI, but its internal screen id
// is still `aboutMe` (go('aboutMe'), activeTabFor → "aboutMe", file about-me.js).
// The rename was label-only — don't "fix" the ids to match without renaming the
// screen everywhere (render.js switch, utils.js, nav.js, chat-router.js routes).
//
// PURPOSE
// Primary input hub. User tells Money Buddy about their financial life here —
// budget setup, lifestyle patterns, goals, and balance tracking. The cleaner
// the inputs, the more accurate My Progress outputs become.
//
// NAVIGATION
//   Entry: Budget tab tap from any screen in NAV_VISIBLE_SCREENS
//          Chat: budget/planning keyword route when no budget exists yet
//   Exit:  Each component card → its own sub-screen (drill-down model)
//          Back to this hub is the return point for all its sub-screens
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
//   output side. No results or comparisons should appear here. All Budget-hub
//   sub-screens return to aboutMe on back/cancel.

function renderAboutMe() {
  const budgetStatus = state.budget.status;
  const budgetLabel  = budgetStatus === "empty"       ? "Not started"
                     : budgetStatus === "in-progress" ? "In progress"
                     : budgetStatus === "complete"    ? "Set up"
                     : "Needs review";

  const goalsCount = (state.goalsV2.goals || []).length;

  const acctEntries = (state.accountBalances || []).filter(function(e) { return e.type === "account"; });
  const debtEntries = (state.accountBalances || []).filter(function(e) { return e.type === "debt"; });
  const acctLast = acctEntries.length > 0 ? acctEntries[acctEntries.length - 1].date : null;
  const debtLast = debtEntries.length > 0 ? debtEntries[debtEntries.length - 1].date : null;

  const showBudgetPrompt = budgetStatus === "empty";

  return `
    <div class="home-header">
      <div>
        <h1 class="title">Budget</h1>
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

    <!-- Goals component (Goals V2 — persistent entry to the goal flow) -->
    <div class="section-title" style="margin:20px 0 8px;">Goals</div>
    <p class="helper" style="margin-bottom:10px;">Choose what Money Buddy should help with next.</p>
    <div class="item-card" onclick="goGoalsEntry()" style="cursor:pointer;">
      <div>
        <div class="task-title">Goals</div>
        <p class="task-desc">${goalsCount > 0 ? goalsCount + " " + (goalsCount === 1 ? "goal" : "goals") + " set" : "Start your first goal"}</p>
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
        <div style="font-weight:850;font-size:17px;margin-bottom:8px;">Let's get started</div>
        <p class="helper" style="margin-bottom:18px;">Build your budget so Money Buddy can estimate your monthly plan — or jump straight into setting a goal.</p>
        <button class="button primary full" type="button" style="margin-bottom:10px;"
                onclick="dismissAboutMeOverlay(); state.flowOrigin='aboutMe'; state.postResultContext='budget'; go('babyBudget');">
          Build my budget →
        </button>
        <button class="button secondary full" type="button"
                onclick="dismissAboutMeOverlay(); goGoalsEntry();">
          Set up a goal
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

// Persistent entry into the Goals V2 flow (popup button + Goals card both route
// here): straight to the creation wizard if there are no goals yet, otherwise to
// the tracker on the most recent goal.
function goGoalsEntry() {
  var goals = state.goalsV2.goals || [];
  if (goals.length === 0) { go('goalCreate'); return; }
  state.goalsV2.selectedGoalId = goals[goals.length - 1].id;
  go('goalTracker');
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
      <p class="admin-card-title">Budget</p>
      <p class="helper">No admin controls for the hub screen. Use individual component screens.</p>
    </div>
  `;
}
