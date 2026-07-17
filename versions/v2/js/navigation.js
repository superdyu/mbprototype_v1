// ─── Screen navigation ────────────────────────────────────────────────────────

// Captures all navigation-relevant state for history.pushState.
// Called after state.screen and any context fields are already set.
function getNavSnapshot() {
  return {
    screen:                state.screen,
    selectedBadge:         state.selectedBadge,
    selectedBudgetCategory:state.selectedBudgetCategory,
    selectedDebt:          state.selectedDebt,
    selectedOffer:         state.selectedOffer,
    debtAnalyzerIncluded:  JSON.parse(JSON.stringify(state.debtAnalyzerIncluded || {})),
    currentLesson:         state.currentLesson   ? JSON.parse(JSON.stringify(state.currentLesson))   : null,
    activeQuizIndex:       state.activeQuizIndex,
    activeQuizChoice:      state.activeQuizChoice,
    activeQuizWrongChoices:(state.activeQuizWrongChoices || []).slice(),
    rewardBadgeGains:      state.rewardBadgeGains ? JSON.parse(JSON.stringify(state.rewardBadgeGains)) : null,
    rewardXp:              state.rewardXp,
    rewardLessonTitle:     state.rewardLessonTitle,
  };
}

// Restores navigation state from a saved snapshot (used by popstate handler).
function restoreNavSnapshot(snap) {
  if (!snap) return;
  state.screen                  = snap.screen;
  state.selectedBadge           = snap.selectedBadge;
  state.selectedBudgetCategory  = snap.selectedBudgetCategory;
  state.selectedDebt            = snap.selectedDebt;
  state.selectedOffer           = snap.selectedOffer;
  state.debtAnalyzerIncluded    = snap.debtAnalyzerIncluded   || {};
  state.currentLesson           = snap.currentLesson          || null;
  state.activeQuizIndex         = snap.activeQuizIndex        || 0;
  state.activeQuizChoice        = snap.activeQuizChoice       ?? null;
  state.activeQuizWrongChoices  = snap.activeQuizWrongChoices || [];
  state.rewardBadgeGains        = snap.rewardBadgeGains       || null;
  state.rewardXp                = snap.rewardXp               || 0;
  state.rewardLessonTitle       = snap.rewardLessonTitle      || '';
}

function go(screen) {
  if (state.screen === screen) { render(); return; }
  state.screen = screen;
  window.__navLog = [screen, ...window.__navLog].slice(0, 10);
  try { history.pushState(getNavSnapshot(), ''); } catch(e) {}
  render();
}

// Flow entry points that should return to Home when complete.
// Set flowOrigin so the finish screen knows where to send the user back.
const FLOW_ENTRY_SCREENS = ["babyBudget", "budgetSetup", "lifestyle", "lifestyleChain", "accountBalances", "debtBalances"];

function taskGo(destination) {
  if (FLOW_ENTRY_SCREENS.includes(destination)) {
    state.flowOrigin = "home";
    if (["babyBudget", "budgetSetup"].includes(destination)) {
      state.postResultContext = "budget";
    }
  }
  go(destination);
}

function completeAndReward() {
  go("reward");
}

// ─── Badge/offer selection ────────────────────────────────────────────────────

// Navigates to the topic page for a badge selected from the Learn tab.
// Updates recentlyActive so the badge surfaces at the top on next Learn visit.
function selectBadge(name) {
  state.selectedBadge = name;
  // Bubble this badge to the front of recentlyActive (cap at 3 entries)
  state.recentlyActive = [name, ...state.recentlyActive.filter(b => b !== name)].slice(0, 3);
  go("topic");
}

function currentBadge() {
  return state.badges.find(b => b.name === state.selectedBadge) || state.badges[0];
}

function selectBudgetCategory(key) {
  state.selectedBudgetCategory = key;
  go("budgetCategory");
}

function goMyDebts(editId) {
  state.selectedDebt = editId || null;
  go("myDebts");
}

function goDebtAnalyzer() {
  // Initialize inclusion map on first entry — all debts included by default
  if (!state.debtAnalyzerIncluded || Object.keys(state.debtAnalyzerIncluded).length === 0) {
    state.debtAnalyzerIncluded = {};
    state.budget.debts.forEach(function(d) { state.debtAnalyzerIncluded[d.id] = true; });
  }
  go("debtAnalyzer");
}

function applyDebtDataFromWizard(rawDebts) {
  // The current wizard build always sends debts: [] (it no longer collects
  // debt instruments). An empty array must NOT wipe debts the user entered
  // via My Debts — only a non-empty wizard payload replaces the debt list.
  if (!Array.isArray(rawDebts) || rawDebts.length === 0) return;
  var ts = Date.now();
  state.budget.debts = rawDebts.map(function(d, i) {
    return Object.assign({}, d, { id: "d_" + ts + "_" + i, expanded: false });
  });
  // Keep "Debt Minimum Payments" fixed-overhead line in sync
  var minLine = state.budget.fixedOverhead.find(function(f) { return f.name === "Debt Minimum Payments"; });
  if (minLine) minLine.amount = debtTotalMinPayment();
  // Reset analyzer inclusion for new debt set
  state.debtAnalyzerIncluded = {};
}

function selectOffer(name) {
  state.selectedOffer = name;
  go("marketplaceDetail");
}

function currentOffer() {
  return state.offers.find(o => o.name === state.selectedOffer) || state.offers[0];
}

// ─── Education flow ───────────────────────────────────────────────────────────

// Enters a lesson from the topic page. Sets the lesson as the active session
// so lesson.js and quiz.js can read from state.currentLesson without needing
// arguments passed through onclick strings.
function selectLesson(id) {
  const lesson = state.lessons.find(l => l.id === id);
  if (!lesson) return;
  state.currentLesson = lesson;
  // Mark in-progress only if not already completed — a revisit that gets
  // abandoned should not downgrade a completed lesson's status
  if (lesson.status !== "completed") lesson.status = "in-progress";
  // Reset quiz state for a clean session
  state.activeQuizIndex        = 0;
  state.activeQuizChoice       = null;
  state.activeQuizWrongChoices = [];
  go("reward-preview");
}

// Applies XP earned to a badge, handling level-up and tier-advance logic.
// Returns a result object used by completeLesson() to build the reward display.
//
// xpToApply: the final XP after multipliers have been applied by the caller.
// Progress is stored as 0–100. When it hits 100, the badge levels up and
// progress resets. When level hits tier.maxLevel, the badge advances to the
// next tier and level resets to 1.
function advanceBadge(badgeName, xpToApply) {
  const badge = state.badges.find(b => b.name === badgeName);
  if (!badge) return null;

  const oldTier     = badge.tier;
  const oldLevel    = badge.level;
  const oldProgress = badge.progress;

  // Apply XP as progress points (XP maps 1:1 to progress % for prototype simplicity)
  // In production this would use a configurable XP-per-level table
  let newProgress = oldProgress + Math.round(xpToApply);
  let newLevel    = oldLevel;
  let newTier     = oldTier;
  let leveledUp   = false;
  // levelUpHistory: one entry per level-up event in sequence.
  // Each entry records the tier+level the badge reached AFTER that level-up reset.
  // The reward screen uses this to drive per-event label changes and pulse animations
  // so a C7→C9 journey shows C7→C8 pulse, then C8→C9 pulse — not a single jump.
  const levelUpHistory = [];

  // Handle level-up: each time progress hits 100, the badge levels up.
  // Check for absolute max BEFORE incrementing so we don't push a spurious
  // levelUpHistory entry when the badge is already capped at the final tier+level.
  while (newProgress >= 100) {
    const tierDef = state.tiers.find(t => t.name === newTier);
    const isAbsoluteMax = tierDef
      && newLevel >= tierDef.maxLevel
      && !state.tiers[state.tiers.indexOf(tierDef) + 1];
    if (isAbsoluteMax) {
      newProgress = Math.min(newProgress, 99); // cap; loop will not re-enter
      break;
    }

    newProgress -= 100;
    newLevel++;
    leveledUp = true;

    // Check tier advance: if level exceeds the tier's cap, advance to next tier
    const currentTierDef = state.tiers.find(t => t.name === newTier);
    if (currentTierDef && newLevel > currentTierDef.maxLevel) {
      const tierIndex = state.tiers.indexOf(currentTierDef);
      const nextTier  = state.tiers[tierIndex + 1];
      if (nextTier) {
        newTier  = nextTier.name;
        newLevel = 1; // tier advance resets level to 1
      }
      // No else needed — isAbsoluteMax guard above handles the final tier case
    }

    // Record the state reached after this specific level-up.
    // The reward animation fires a separate label change + pulse for each entry.
    levelUpHistory.push({ tier: newTier, level: newLevel });
  }

  // Commit the updated values to state so the badge board reflects them immediately
  badge.progress = newProgress;
  badge.level    = newLevel;
  badge.tier     = newTier;

  return {
    name: badgeName,
    oldTier, oldLevel, oldProgress,
    newTier, newLevel, newProgress,
    leveledUp,
    tieredUp: newTier !== oldTier,
    levelUpHistory  // array of {tier, level} for each level-up event in sequence
  };
}

// Called when the user completes the quiz for the current lesson.
// Calculates XP (base + bonus separately for reward display), applies it to
// all associated badges, builds the reward screen data, then navigates.
function completeLesson() {
  const lesson = state.currentLesson;
  if (!lesson) return;

  // Mark the lesson complete in state so topic page status updates
  lesson.status = "completed";

  // Sync any home task pointing at this lesson
  state.tasks.forEach(t => { if (t.lessonId === lesson.id) t.completed = true; });

  // Separate base and bonus XP so the reward screen can show them as two
  // distinct lines — PRD intent: bonus should feel like a bonus, not just
  // a merged larger number.
  const xpBase  = lesson.xp;
  const xpBonus = lesson.dailyTask ? lesson.xp * (state.xpConfig.bonusMultiplier - 1) : 0;
  const xpTotal = xpBase + xpBonus; // total applied per badge

  // Apply XP to every badge this lesson contributes to and collect results
  const gains = lesson.badges.map(badgeName => {
    const result = advanceBadge(badgeName, xpTotal);
    if (!result) return null;
    return {
      ...result,
      xpBase,
      xpBonus,
      xpTotal
    };
  }).filter(Boolean);

  // Write reward screen data
  state.rewardBadgeGains   = gains;
  state.rewardXp           = xpTotal * gains.length; // total across all badges
  state.rewardLessonTitle  = lesson.title;

  // Reset quiz session state for next time
  state.activeQuizIndex        = 0;
  state.activeQuizChoice       = null;
  state.activeQuizWrongChoices = [];
  state.currentLesson          = null;

  go("reward");
}

// ─── Navigation contract ──────────────────────────────────────────────────────
// All screen changes MUST go through go() or taskGo(). Direct state.screen
// assignment bypasses history tracking and the nav log.
//
// Tab → screens mapping (activeTabFor() in utils.js):
//   home        → home
//   aboutMe     → aboutMe, budgetSetup, babyBudget, budgetCategory, myDebts, debtAnalyzer,
//                 lifestyle, lifestyleChain, accountBalances, debtBalances, goals
//   myProgress  → myProgress
//   learn       → learn, topic, reward-preview, lesson, quiz, simulation
//   marketplace → marketplace, marketplaceDetail
//
// Post-result flow (no tab active, no nav bar):
//   2 Minute Budget complete / lifestyle save / monthly update complete
//     → postResult → nextAction → commit → finish → myProgress
//   "Adjust it" path: nextAction → budgetSetup (mid-loop exit)
//   "Compare more" path: nextAction → myProgress (mid-loop exit)
//   "Make a goal" path: nextAction → commitment → finish → myProgress
//   "Accept" / "Review later": nextAction → finish → myProgress (or flowOrigin)
//
// Screens with no nav bar (intentionally excluded from NAV_VISIBLE_SCREENS):
//   babyBudget    — full-height iframe overrides layout; nav would conflict visually
//   lesson        — full-height audiobook player; same CSS constraint as babyBudget
//   quiz          — full-screen question flow; no tab context needed mid-quiz
//   reward-preview — pre-lesson interstitial; no nav keeps focus on the preview
//   reward        — post-quiz celebration overlay; nav bar would break the moment
//   lifestyleChain — full-screen question flow; no tab context needed mid-chain
//   postResult     — post-input reaction prompt; keep focus on the prompt
//   nextAction     — next action selection; keep focus on the choice
//   commitment     — commitment creation; keep focus on the input
//   finish         — completion moment; keep focus on the confirmation
//
// ─── Boot ─────────────────────────────────────────────────────────────────────
// navigation.js loads last in the script order (after render.js), so render()
// is guaranteed to be defined before this call fires.
// replaceState seeds the initial history entry (screen: "home") so that
// pressing back from the second screen cleanly returns to Home.
try { history.replaceState(getNavSnapshot(), ''); } catch(e) {}
render();

// Restore navigation state when the user presses browser back/forward.
// Guard against null state — srcdoc iframes can fire popstate with e.state=null
// in some browsers, which would spuriously recreate the baby budget iframe.
window.addEventListener('popstate', function(e) {
  if (!e.state) return;
  restoreNavSnapshot(e.state);
  render();
});

// Listen for 2 Minute Budget completion signal (postMessage from the iframe).
// All consolidation lives behind the builder seam: adapter (wizard-bridge.js)
// → baseline → submitBudgetBaseline (budget-baseline.js), which owns status,
// stamps, task completion, and the post-save flow. This listener only ferries
// the message across the iframe boundary.
window.addEventListener("message", function(e) {
  if (!e.data) return;
  if (e.data.type === "bb-complete") {
    applyDebtDataFromWizard(e.data.debts);
    if (e.data.inputs) {
      state.budget.wizardInputs = e.data.inputs;   // kept for the admin state inspector
      submitBudgetBaseline(bbPayloadToBaseline(e.data.inputs));
    }
  }
  if (e.data.type === "bb-back") {
    go("budgetSetup");
  }
});
