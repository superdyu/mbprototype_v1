// Screens that display the bottom navigation bar
const NAV_VISIBLE_SCREENS = ["home", "budget", "babyBudget", "goals", "learn",
  "topic", "lesson", "quiz", "simulation", "marketplace", "marketplaceDetail",
  "reward", "settings"];

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
