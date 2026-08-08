// ─── Shared Utilities ─────────────────────────────────────────────────────────
// Helpers used across all screen files.
//
//   h(value)          — HTML-escape for safe injection into template strings
//   scrollTop()       — resets screenRoot scroll position after navigation
//   debouncedRender() — 400ms debounced render for admin input fields
//   activeTabFor(screen) — single source of truth for which bottom tab highlights
//                          on a given screen; used by renderNav() in nav.js

// Get an element by ID (global helper used in screen event handlers)
const $ = id => document.getElementById(id);

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
/** @returns {string} Today's date as YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Copies a diagnostic state snapshot to the clipboard for sharing/debugging.
// Called from the admin panel "Copy State" button.
function copyAppState() {
  var s = {
    screen: state.screen,
    budget: { status: state.budget.status, wizardInputs: state.budget.wizardInputs, debts: state.budget.debts },
    selectedBadge: state.selectedBadge, selectedDebt: state.selectedDebt, selectedOffer: state.selectedOffer
  };
  navigator.clipboard.writeText(JSON.stringify(s, null, 2))
    .then(function() { alert('State copied to clipboard'); })
    .catch(function() { prompt('Copy this state (Ctrl+A, Ctrl+C):', JSON.stringify(s, null, 2)); });
}

/**
 * Generates a collision-resistant ID with a named prefix.
 * @param {string} prefix - e.g. "g", "c", "ab", "d"
 * @returns {string} e.g. "g_1719000000000_x4k2r"
 */
function generateId(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function activeTabFor(screen) {
  if (screen === "streak")            return "home";   // splash → no nav, but keep mapping defined
  // Budget sub-screens
  if (screen === "goals")             return "goals";    // v3: Goals is its own tab (D34)
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

