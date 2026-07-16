// ─── Goal Vault (Goals V2 · Phase 3 Victory Vault) ────────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible — Budget highlighted
//
// Strictly a trophy room: completed-goal trophies (each with its permanent rank
// title) and a medal wall of every earned achievement — including medals from
// still-active goals. Positive-only by construction: it renders nothing about
// remaining work, missed sprints, or pending milestones. Read-only.

function renderGoalVault() {
  var entries = goalsVaultEntries();
  var hasTrophies = entries.completedGoals.length > 0;
  var hasMedals = entries.milestoneMedals.length > 0;

  var header = `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="go('aboutMe')">← Budget</button>
      <h1 class="title" style="margin:0;font-size:20px;">🏆 Victory Vault</h1>
      <p class="subtitle" style="margin:4px 0 0;">Everything you've earned.</p>
    </div>`;

  if (!hasTrophies && !hasMedals) {
    return header + `
      <div class="card">
        <p class="helper" style="margin-bottom:14px;">No trophies yet — claim sprints and hit milestones and they'll show up here.</p>
        <button class="button primary full" type="button" onclick="goalsAdminOpenTracker()">Go to your goals →</button>
      </div>`;
  }

  var trophies = hasTrophies ? `
    <div class="section-title" style="margin:6px 0 8px;">Completed goals</div>
    ${entries.completedGoals.map(function(g) { return `
      <div class="card" style="margin-bottom:10px;border-left:4px solid var(--accent);">
        <div class="row" style="align-items:center;gap:10px;">
          <div style="font-size:34px;">🏆</div>
          <div>
            <div style="font-weight:850;">${h(g.title)}</div>
            <p class="helper" style="margin:2px 0 0;">${h(g.rankTitle)} · completed ${h(g.completedAt)}</p>
          </div>
        </div>
      </div>`; }).join("")}` : "";

  var medals = hasMedals ? `
    <div class="section-title" style="margin:18px 0 8px;">Medal wall</div>
    <div class="row" style="gap:10px;flex-wrap:wrap;">
      ${entries.milestoneMedals.map(function(a) { return `
        <div class="card" style="padding:12px;min-width:100px;text-align:center;">
          <div style="font-size:26px;">${a.icon}</div>
          <div style="font-weight:800;font-size:11px;margin-top:4px;">${h(a.title)}</div>
          <p class="helper" style="margin:2px 0 0;font-size:10px;">${h(a.earnedAt)}</p>
        </div>`; }).join("")}
    </div>` : "";

  return header + trophies + medals;
}

function renderGoalVaultAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
