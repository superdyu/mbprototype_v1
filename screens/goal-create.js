// ─── Goal Create (Goals V2 · Phase 1 wizard) ──────────────────────────────────
// Stub — implemented in commit 5 (create wizard). Placeholder render so the
// screen degrades gracefully if navigated to before then.
function renderGoalCreate() {
  return `<div class="card"><p class="helper">Goal creation — coming in commit 5.</p></div>`;
}
function renderGoalCreateAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
