function renderAnalysis() {
  const s = state.budget.status;
  if (s === "empty")       return renderBudgetEmpty();
  if (s === "in-progress") return renderBudgetInProgress();
  return renderAnalysisComplete(s);
}

// Depends on renderBudgetComplete() from budget.js — index.html must load budget.js before analysis.js
function renderAnalysisComplete(status) {
  const hasDebts = state.budget.debts && state.budget.debts.length > 0;
  return `
    ${renderBudgetComplete(status)}
    <div style="padding:0 16px 28px">
      <div class="card">
        <div class="card-title">Debt Analysis</div>
        <div class="helper" style="line-height:1.45">
          Your full debt picture, payoff timelines, and optimization scenarios.
          ${hasDebts
            ? "You have " + state.budget.debts.length + " debt instrument" + (state.budget.debts.length > 1 ? "s" : "") + " tracked."
            : "Add debt instruments through the budget wizard to unlock this section."
          }
        </div>
        <div style="margin-top:12px">
          <button class="${hasDebts ? "primary" : "secondary"}" onclick="${hasDebts ? "goDebtAnalyzer()" : ""}"
            style="${hasDebts ? "" : "opacity:.45;cursor:default"}" ${hasDebts ? "" : "disabled"}>
            Open Debt Analyzer
          </button>
        </div>
      </div>
    </div>
  `;
}
