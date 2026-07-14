// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
// Renders the 5-tab persistent nav: Home | About Me | My Progress | Learn | Market.
// Only visible on screens in NAV_VISIBLE_SCREENS. Excluded screens:
//   babyBudget    — full-height iframe; nav conflicts with the layout
//   lesson        — full-height audiobook player; same constraint as babyBudget
//   quiz          — full-screen question flow; no tab context needed mid-quiz
//   reward-preview — pre-lesson interstitial; nav would distract from the preview
//   reward        — post-quiz celebration; nav bar would break the reward moment
//   lifestyleChain — full-screen question flow; no tab context needed mid-chain
//   postResult     — post-input reaction prompt; keep focus on the prompt
//   nextAction     — next action selection; keep focus on the choice
//   commitment     — commitment creation; keep focus on the input
const NAV_VISIBLE_SCREENS = ["home", "aboutMe", "budgetSetup", "budgetCategory",
  "myProgress", "goals", "learn", "topic", "simulation", "marketplace", "marketplaceDetail",
  "settings", "myDebts", "debtAnalyzer", "lifestyle", "accountBalances", "debtBalances"];

function renderNav() {
  if (!NAV_VISIBLE_SCREENS.includes(state.screen)) return "";

  const active = activeTabFor(state.screen);
  return `
    <nav class="bottom-tabs" aria-label="Primary navigation">
      <button class="tab ${active === "home"        ? "active" : ""}" onclick="go('home')">Home</button>
      <button class="tab ${active === "aboutMe"     ? "active" : ""}" onclick="go('aboutMe')">About Me</button>
      <button class="tab ${active === "myProgress"  ? "active" : ""}" onclick="go('myProgress')">My Progress</button>
      <button class="tab ${active === "learn"       ? "active" : ""}" onclick="go('learn')">Learn</button>
      <button class="tab ${active === "marketplace" ? "active" : ""}" onclick="go('marketplace')">Market</button>
    </nav>
  `;
}
