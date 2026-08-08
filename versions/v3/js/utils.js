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
//
// This dumps the THREE-LAYER model (architecture §5) plus what drives the
// screens. It used to emit v2's shape — `budget.status` and
// `budget.wizardInputs`, neither of which exists in v3 (nothing writes them, so
// JSON.stringify dropped them silently) — and none of v3's own state. A
// snapshot that cannot see state.plan or state.mtd is no use for diagnosing a
// prototype whose whole point is the plan-vs-reported gap.
function copyAppState() {
  var s = {
    screen: state.screen,
    nav: state.nav,
    // The three layers, never blurred (architecture §5)
    plan: state.plan,
    planTotal: state.planTotal,
    mtd: state.mtd,
    journalSession: state.journalSession,
    // Derived / display
    observations: (state.observations || []).map(function (o) { return o.id; }),
    goals: state.goals,
    tasks: state.tasks,
    buddy: state.buddy,
    kibble: state.kibble,
    streak: state.streak,
    courseXp: state.courseXp,
    theme: state.settings && state.settings.colorMode,
    // Inherited v2 surfaces still reachable from the admin jump (L14)
    legacy: { debts: state.budget.debts, fixedOverhead: state.budget.fixedOverhead,
              selectedBadge: state.selectedBadge, selectedDebt: state.selectedDebt,
              selectedOffer: state.selectedOffer }
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
  if (screen === "streak")            return "home";
  if (screen === "login")             return "home";
  if (screen === "dailyUpdate")       return "home";
  if (screen === "dailySummary")      return "home";
  if (screen === "dailyShare")        return "home";
  if (screen === "onboarding")        return "home";
  if (["journalEntry","journalConfirm","journalDone"].includes(screen)) return "home";   // splash → no nav, but keep mapping defined
  // Budget sub-screens
  if (screen === "goals")             return "goals";    // v3: Goals is its own tab (D34)
  if (["lifestyleWizard","lifestyleWizardReview","budgetDone"].includes(screen)) return "aboutMe";
  if (screen === "myDebts")           return "aboutMe";
  if (screen === "debtAnalyzer")      return "aboutMe";
  if (screen === "comparison")        return "aboutMe";
  if (screen === "accountBalances")   return "aboutMe";
  if (screen === "debtBalances")      return "aboutMe";
  if (screen === "budgetUpdateConfirm") return "aboutMe";
  if (screen === "chat")              return "home";
  if (screen === "settings")          return "home";
  // The post-result loop is entered from a flow, and lands back on home.
  if (["postResult", "nextAction", "commitment", "finish"].includes(screen)) return "home";
  if (screen === "reward")            return "learn";
  // Marketplace sub-screen
  if (screen === "marketplaceDetail") return "marketplace";
  // Learn sub-screens
  if (["topic", "reward-preview", "lessonFraming", "lesson", "lessonQuiz", "lessonSimulation", "lessonReward", "quiz", "simulation"].includes(screen)) return "learn";
  // Anything unmapped falls back to home rather than naming a stack that does
  // not exist — navAdminJump would otherwise have nowhere to reset.
  return state.nav && state.nav.stacks[screen] ? screen : "home";
}

