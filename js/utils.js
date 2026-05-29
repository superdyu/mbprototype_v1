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
  if (screen === "babyBudget")     return "analysis";
  if (screen === "budgetCategory") return "analysis";
  if (screen === "myDebts")        return "analysis";
  if (screen === "debtAnalyzer")   return "analysis";
  if (["topic", "reward-preview", "lesson", "quiz", "simulation"].includes(screen)) return "learn";
  if (screen === "marketplaceDetail") return "marketplace";
  return screen;
}

