// Screens that display the bottom navigation bar.
// lesson and babyBudget are excluded — their CSS mode classes (lesson-mode,
// baby-budget-mode) already extend screenRoot to bottom:0, and the nav
// would visually conflict with their full-height layouts.
const NAV_VISIBLE_SCREENS = ["home", "budget", "budgetCategory", "goals", "learn",
  "topic", "quiz", "simulation", "marketplace", "marketplaceDetail",
  "reward", "settings", "myDebts", "debtAnalyzer"];

function renderNav() {
  if (!NAV_VISIBLE_SCREENS.includes(state.screen)) return "";

  const active = activeTabFor(state.screen);
  return `
    <nav class="bottom-tabs" aria-label="Primary navigation">
      <button class="tab ${active === "home"        ? "active" : ""}" onclick="go('home')">Home</button>
      <button class="tab ${active === "budget"      ? "active" : ""}" onclick="go('budget')">Budget</button>
      <button class="tab ${active === "goals"       ? "active" : ""}" onclick="go('goals')">Goals</button>
      <button class="tab ${active === "learn"       ? "active" : ""}" onclick="go('learn')">Learn</button>
      <button class="tab ${active === "marketplace" ? "active" : ""}" onclick="go('marketplace')">Market</button>
    </nav>
  `;
}
