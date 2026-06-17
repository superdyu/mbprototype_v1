// ─── Goal Tracker (Goals V2 · Phase 2) ────────────────────────────────────────
// Stub — implemented in commit 7 (tracker). Placeholder render so the screen
// degrades gracefully if navigated to before then.
function renderGoalTracker() {
  return `<div class="card"><p class="helper">Goal tracker — coming in commit 7.</p></div>`;
}
function renderGoalTrackerAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
