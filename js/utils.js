// ─── Shared Utilities ─────────────────────────────────────────────────────────
// Helpers used across all screen files.
//
//   h(value)          — HTML-escape for safe injection into template strings
//   scrollTop()       — resets screenRoot scroll position after navigation
//   debouncedRender() — 400ms debounced render for admin input fields
//   activeTabFor(screen) — single source of truth for which bottom tab highlights
//                          on a given screen; used by renderNav() in nav.js

// HTML-escape a value for safe injection into template strings
function h(value) {
  return String(value ?? "")
    .replaceAll("&",  "&amp;")
    .replaceAll("<",  "&lt;")
    .replaceAll(">",  "&gt;")
    .replaceAll('"',  "&quot;")
    .replaceAll("'",  "&#039;");
}

// Scroll the screen content area back to the top
function scrollTop() {
  const root = document.getElementById("screenRoot");
  if (root) root.scrollTop = 0;
}

// Debounced render — waits 400ms after the last call before rendering.
// Used on admin number/text inputs so mid-typing keystrokes don't fire animations
// on partial values. Select dropdowns still use render() directly (no debounce needed).
let _debouncedRenderTimer = null;
function debouncedRender() {
  clearTimeout(_debouncedRenderTimer);
  _debouncedRenderTimer = setTimeout(render, 400);
}

// Map a screen name to its active bottom-tab identifier
function activeTabFor(screen) {
  // About Me sub-screens
  if (screen === "goals")             return "aboutMe";  // goals input editor lives in About Me
  if (screen === "babyBudget")        return "aboutMe";
  if (screen === "budgetSetup")       return "aboutMe";
  if (screen === "budgetCategory")    return "aboutMe";
  if (screen === "myDebts")           return "aboutMe";
  if (screen === "debtAnalyzer")      return "aboutMe";
  if (screen === "lifestyle")         return "aboutMe";
  if (screen === "lifestyleChain")    return "aboutMe";
  if (screen === "accountBalances")   return "aboutMe";
  if (screen === "debtBalances")      return "aboutMe";
  // Marketplace sub-screen
  if (screen === "marketplaceDetail") return "marketplace";
  // Learn sub-screens
  if (["topic", "reward-preview", "lesson", "quiz", "simulation"].includes(screen)) return "learn";
  return screen;
}

