// ─── My Moves ─────────────────────────────────────────────────────────────────
// Output/feedback tab. Shows progress, trajectories, and opportunities.
// Currently a placeholder — sections fill in as features are built.

function renderMyMoves() {
  const hasDebts = state.budget.debts && state.budget.debts.length > 0;
  const budgetDone = state.budget.status === "complete" || state.budget.status === "refresh" || state.budget.status === "checkup";

  return `
    <div class="card" style="margin-bottom:14px;">
      <h1 class="title" style="margin-bottom:4px;">My Moves</h1>
      <p class="subtitle">Your progress, trajectories, and opportunities — how your financial decisions are playing out.</p>
    </div>

    <!-- Debt Payoff -->
    <div class="card" style="margin-bottom:14px;${!hasDebts ? "opacity:.5;" : ""}">
      <div class="card-title">Debt Payoff</div>
      <p class="helper" style="line-height:1.45;">
        ${hasDebts
          ? "View payoff timelines, compare strategies, and see how extra payments change your outcome."
          : "Add debt instruments in About Me to unlock payoff analysis."}
      </p>
      <div style="margin-top:12px;">
        <button class="${hasDebts ? "button primary" : "button secondary"}"
          onclick="${hasDebts ? "goDebtAnalyzer()" : ""}"
          style="${hasDebts ? "" : "opacity:.45;cursor:default"}" ${hasDebts ? "" : "disabled"}>
          Open Debt Analyzer
        </button>
      </div>
    </div>

    <!-- Goal Trajectory -->
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title">Goals & Milestones</div>
      <p class="helper" style="line-height:1.45;">Track progress toward your financial goals and savings targets.</p>
      <div style="margin-top:12px;">
        <button class="button secondary" onclick="go('goals')">View Goals →</button>
      </div>
    </div>

    <!-- Marketplace / Opportunities -->
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title">Opportunities</div>
      <p class="helper" style="line-height:1.45;">Financial products matched to your profile and goals.</p>
      <div style="margin-top:12px;">
        <button class="button secondary" onclick="go('marketplace')">Browse Marketplace →</button>
      </div>
    </div>
  `;
}

function renderMyMovesAdmin() {
  return `
    <div class="admin-card">
      <p class="admin-card-title">My Moves</p>
      <p class="helper">Placeholder screen — content fills in as features are built. Debt Analyzer, Goal Trajectory, and Cashflow sections are planned.</p>
    </div>
  `;
}
