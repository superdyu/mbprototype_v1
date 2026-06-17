// ─── Goal Vault (Goals V2 · Phase 3 Victory Vault) ────────────────────────────
// Stub — implemented in commit 10 (vault). Placeholder render so the screen
// degrades gracefully if navigated to before then.
function renderGoalVault() {
  return `<div class="card"><p class="helper">Victory Vault — coming in commit 10.</p></div>`;
}
function renderGoalVaultAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
