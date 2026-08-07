// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
// Renders the 5-tab persistent nav: Home | Budget | My Progress | Learn | Market.
// Market is deliberately DEAD — D33 makes Marketplace a visible but
// non-interactive tab. The screens still exist and stay reachable from the admin
// jump list (L14); only the tab affordance is disabled.
// NOTE: the "Budget" tab's internal screen id is still `aboutMe` (rename was
// label-only) — go('aboutMe') is correct, not go('budget').
// Only visible on screens in NAV_VISIBLE_SCREENS. Excluded screens:
//   lesson        — full-height audiobook player; full-bleed, no tab context
//   quiz          — full-screen question flow; no tab context needed mid-quiz
//   reward-preview — pre-lesson interstitial; nav would distract from the preview
//   reward        — post-quiz celebration; nav bar would break the reward moment
//   lifestyleChain — full-screen question flow; no tab context needed mid-chain
//   postResult     — post-input reaction prompt; keep focus on the prompt
//   nextAction     — next action selection; keep focus on the choice
//   commitment     — commitment creation; keep focus on the input
//   chat           — full-screen chat; has its own Back button, and the input
//                    bar needs the bottom edge the nav would occupy
//   budgetUpdateConfirm — old→new budget comparison; a decision gate, keep
//                    focus on confirm/keep-editing/discard
const NAV_VISIBLE_SCREENS = ["home", "aboutMe", "budgetSetup", "budgetCategory",
  "myProgress", "goals", "learn", "topic", "simulation", "marketplace", "marketplaceDetail",
  "settings", "myDebts", "debtAnalyzer", "lifestyle", "accountBalances", "debtBalances"];

function renderNav() {
  if (!NAV_VISIBLE_SCREENS.includes(state.screen)) return "";

  const active = activeTabFor(state.screen);
  return `
    <nav class="bottom-tabs" aria-label="Primary navigation">
      <button class="tab ${active === "home"        ? "active" : ""}" onclick="go('home')">Home</button>
      <button class="tab ${active === "aboutMe"     ? "active" : ""}" onclick="go('aboutMe')">Budget</button>
      <button class="tab ${active === "myProgress"  ? "active" : ""}" onclick="go('myProgress')">My Progress</button>
      <button class="tab ${active === "learn"       ? "active" : ""}" onclick="go('learn')">Learn</button>
      <button class="tab tab-disabled" type="button" disabled
              title="Not part of this prototype">Market</button>
    </nav>
  `;
}
