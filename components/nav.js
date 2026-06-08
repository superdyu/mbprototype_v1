// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
// Renders the 5-tab persistent nav: Home | Budget | Goals | Learn | Market.
// Only visible on screens in NAV_VISIBLE_SCREENS. Excluded screens:
//   babyBudget    — full-height iframe; nav conflicts with the layout
//   lesson        — full-height audiobook player; same constraint as babyBudget
//   quiz          — full-screen question flow; no tab context needed mid-quiz
//   reward-preview — pre-lesson interstitial; nav would distract from the preview
//   reward        — post-quiz celebration; nav bar would break the reward moment
const NAV_VISIBLE_SCREENS = ["home", "analysis", "budgetCategory", "goals", "learn",
  "topic", "simulation", "marketplace", "marketplaceDetail",
  "settings", "myDebts", "debtAnalyzer"];

function renderNav() {
  if (!NAV_VISIBLE_SCREENS.includes(state.screen)) return "";

  const active = activeTabFor(state.screen);
  return `
    <nav class="bottom-tabs" aria-label="Primary navigation">
      <button class="tab ${active === "home"        ? "active" : ""}" onclick="go('home')">Home</button>
      <button class="tab ${active === "analysis"    ? "active" : ""}" onclick="go('analysis')">Budget</button>
      <button class="tab ${active === "goals"       ? "active" : ""}" onclick="go('goals')">Goals</button>
      <button class="tab ${active === "learn"       ? "active" : ""}" onclick="go('learn')">Learn</button>
      <button class="tab ${active === "marketplace" ? "active" : ""}" onclick="go('marketplace')">Market</button>
    </nav>
  `;
}
