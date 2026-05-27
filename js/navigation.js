// ─── Screen navigation ────────────────────────────────────────────────────────

function go(screen) {
  state.screen = screen;
  render();
}

function taskGo(destination) {
  state.screen = destination;
  render();
}

function completeAndReward() {
  state.screen = "reward";
  render();
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

// ─── Boot ─────────────────────────────────────────────────────────────────────
// navigation.js loads last in the script order (after render.js), so render()
// is guaranteed to be defined before this call fires.
render();

// Listen for Baby Budget completion signal (postMessage from the iframe).
// When received, mark the budget complete and navigate to the dashboard.
window.addEventListener("message", function(e) {
  if (!e.data) return;
  if (e.data.type === "bb-complete") {
    state.budget.status = "complete";
    state.budget.profile.lastUpdated = new Date().toISOString().slice(0, 10);
    go("budget");
  }
  if (e.data.type === "bb-back") {
    go("budget");
  }
});
