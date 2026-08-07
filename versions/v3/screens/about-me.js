// ─── Budget (input hub) ───────────────────────────────────────────────────────
// TAB: Budget | NAV BAR: Visible
//
// NAMING: this screen is labeled "Budget" in the UI, but its internal screen id
// is still `aboutMe` (go('aboutMe'), activeTabFor → "aboutMe", file about-me.js).
// The rename was label-only — don't "fix" the ids to match without renaming the
// screen everywhere (render.js switch, utils.js, nav.js, chat-router.js routes).
//
// PURPOSE
// The Budget tab IS the Monthly Budget dashboard. It delegates to
// renderBudgetDashboard() (budget-setup.js) when a budget exists, and to
// renderAboutMeEmpty() (the same dashboard ghosted, behind the forced
// builder-choice popup) when it's empty. Editing happens on the dashboard: tap
// a category tile to edit that category; rebuild the whole budget from the
// header Edit control.
//
// NAVIGATION
//   Entry: Budget tab tap from any screen in NAV_VISIBLE_SCREENS
//          Chat: budget/planning keyword route when no budget exists yet
//   Exit:  category tile → budgetCategory; header Edit / choice popup → builders;
//          See Results → myProgress; Update Now → monthly logging flow
//
// STATES
//   empty            → renderAboutMeEmpty(): ghosted dashboard + choice popup
//   complete/refresh/checkup → renderBudgetDashboard(status, {asTab:true})

// The Budget tab IS the Monthly Budget dashboard: populated when a budget
// exists (renderBudgetDashboard, shared with the budgetSetup deep-link), or the
// same layout ghosted behind the forced builder-choice popup when empty.
// Editing happens on the dashboard itself — tap a category tile to edit that
// category; rebuild the whole budget from the header. (asTab hides the back
// button, which is meaningless on a tab with the nav bar.)
function renderAboutMe() {
  if (state.budget.status === "empty") return renderAboutMeEmpty();
  return renderBudgetDashboard(state.budget.status, { asTab: true });
}

// Empty-budget view: the WHOLE dashboard ghosted (header income/plan/remaining
// as "$—" + faded category tiles) so "empty" reads as "complete, unpopulated",
// with the 2 Minute Budget vs Lifestyle Survey choice floating over it.
// renderBudgetChoice()/renderBudgetGhostHeader()/renderBudgetTileGhost() live in
// budget-setup.js (shared global namespace).
function renderAboutMeEmpty() {
  const cats = state.budget.categories;
  return `
    <div class="budget-ghost-wrap">
      <div style="opacity:.22;pointer-events:none;filter:blur(2px);">
        ${renderBudgetGhostHeader()}
        <div class="budget-tile-grid">
          ${cats.map(cat => renderBudgetTileGhost(cat)).join("")}
        </div>
      </div>
      <div class="budget-ghost-overlay">
        <div class="budget-ghost-card" style="max-width:340px;">
          ${renderBudgetChoice()}
          <p class="helper" style="text-align:center;font-size:11px;margin:2px 0 0;">
            or
            <button type="button" style="background:none;border:none;color:var(--accent);font-size:11px;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;"
                    onclick="goGoalsEntry()">set up a goal instead</button>
          </p>
        </div>
      </div>
    </div>
  `;
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
