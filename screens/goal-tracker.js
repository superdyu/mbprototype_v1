// ─── Goal Tracker (Goals V2 · Phase 2) ────────────────────────────────────────
// TAB: About Me (sub-screen) | NAV BAR: Visible — About Me highlighted
//
// The active goal cockpit: pace vs the frozen baseline (thermometer), the sprint
// timeline, and the two actions — claim the current sprint or log a custom
// check-in. When the target is reached the CTA flips to "claim completion".
// Cohort board (commit 8) and celebration overlay (commit 9) are rendered through
// typeof guards so this screen degrades gracefully before those land.

function gtCurrentGoal() {
  var v = state.goalsV2;
  if (v.selectedGoalId) { var g = goalsById(v.selectedGoalId); if (g) return g; }
  var active = goalsActive();
  return active.length ? active[active.length - 1] : null;
}

function renderGoalTracker() {
  var goal = gtCurrentGoal();
  if (!goal) {
    return `
      <div class="card" style="margin-bottom:14px;">
        <h1 class="title" style="margin:0;font-size:20px;">Goals</h1>
        <p class="subtitle" style="margin:4px 0 0;">No active goals yet.</p>
      </div>
      <div class="card">
        <p class="helper" style="margin-bottom:14px;">Set a goal and Money Buddy will break it into bite-size sprints.</p>
        <button class="button primary full" type="button" onclick="go('goalCreate')">Set up a goal →</button>
      </div>`;
  }

  // Celebration overlay takes over the screen when one is pending (commit 9).
  if (typeof goalsPendingCelebration === "function") {
    var pending = goalsPendingCelebration(goal);
    if (pending && typeof renderGoalCelebration === "function") return renderGoalCelebration(goal, pending);
  }

  var meta = goalsTypeMeta(goal.typeKey) || {};
  var unit = goal.baseline.unit;
  var total = Math.abs(goal.baseline.targetValue - goal.baseline.startValue) || 1;
  var pace = goalsPaceStatus(goal);
  var actualDone = Math.abs(pace.actual - goal.baseline.startValue);
  var expectedDone = Math.abs(pace.expected - goal.baseline.startValue);
  var pct = goalsProgressPct(goal);
  var plan = goalsSprintPlan(goal);

  var switcher = gtRenderSwitcher(goal);

  var paceCard = `
    <div class="card" style="margin-bottom:12px;">
      <div class="row" style="margin-bottom:2px;">
        <span style="font-weight:850;">${pct}% there</span>
        <span class="helper">${h(goalsFmtValue(goal.baseline.targetValue, unit))} by ${h(goal.baseline.targetDate)}</span>
      </div>
      <p class="helper" style="margin:0 0 2px;">${h(goalsFmtValue(goalsCurrentValue(goal), unit))} ${goal.baseline.direction === "down" ? "remaining" : "saved"}</p>
      ${renderThermometer(actualDone, expectedDone, { higherIsBetter: true, userLabel: "You", peerLabel: "On-pace" })}
    </div>`;

  var actions = plan.complete
    ? `<button class="button primary full" type="button" onclick="gtClaimComplete()">🏆 Claim completion</button>`
    : `
      <button class="button primary full" type="button" ${plan.current.done ? "disabled" : ""} onclick="gtCompleteSprint()">
        ${plan.current.done ? "✓ Sprint claimed" : "Claim this sprint (" + h(goalsFmtValue(plan.current.target, unit)) + ")"}
      </button>
      <div class="card" style="margin-top:10px;">
        <label style="display:block;font-size:12px;font-weight:700;margin-bottom:4px;">Log a custom amount</label>
        <div class="row" style="gap:6px;align-items:center;">
          <input id="gtCheckinAmount" type="number" min="0" step="any" placeholder="${unit === "usd" ? "$ amount" : unit}" style="flex:1;padding:9px;border-radius:8px;">
          <button class="button secondary" type="button" onclick="gtCheckIn()">Log</button>
        </div>
      </div>`;

  var cohort = (typeof renderCohortBoard === "function") ? renderCohortBoard(goal) : "";
  var achievements = (typeof renderGoalAchievements === "function") ? renderGoalAchievements(goal) : "";

  return `
    <div class="card" style="margin-bottom:12px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="go('aboutMe')">← About Me</button>
      <h1 class="title" style="margin:0;font-size:20px;">${h(meta.icon || "🎯")} ${h(goal.title)}</h1>
      <p class="subtitle" style="margin:4px 0 0;">${h((goalsCategoryMeta(goal.categoryKey) || {}).label || "")}</p>
    </div>
    ${switcher}
    ${paceCard}
    ${renderSprintTimeline(goal)}
    ${actions}
    ${achievements}
    ${cohort}
  `;
}

function gtRenderSwitcher(goal) {
  var active = goalsActive();
  if (active.length <= 1) return "";
  return `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px;">` +
    active.map(function(g) {
      var on = g.id === goal.id;
      var m = goalsTypeMeta(g.typeKey) || {};
      return `<button class="button ${on ? "primary" : "secondary"} small" type="button" onclick="gtSelectGoal('${h(g.id)}')">${h(m.icon || "🎯")} ${h(g.title)}</button>`;
    }).join("") + `</div>`;
}

// ── Handlers ─────────────────────────────────────────────────────────────────
function gtSelectGoal(id) { state.goalsV2.selectedGoalId = id; render(); }

function gtCompleteSprint() {
  var goal = gtCurrentGoal();
  if (!goal) return;
  var plan = goalsSprintPlan(goal);
  goalsCompleteSprint(goal.id, plan.current.key, plan.current.target);
  render();
}

function gtCheckIn() {
  var goal = gtCurrentGoal();
  if (!goal) return;
  var el = document.getElementById("gtCheckinAmount");
  var amt = el ? parseFloat(el.value) : 0;
  if (!amt || amt <= 0) return;
  goalsCheckIn(goal.id, amt);
  render();
}

function gtClaimComplete() {
  var goal = gtCurrentGoal();
  if (!goal) return;
  recordGoalEvent(goal.id, "complete", { at: goalsTodayISO() });
  goal.status = "completed";
  if (typeof go === "function") go("goalVault");
  else render();
}

function gtDismissCelebration() {
  if (typeof goalsDismissCelebration === "function") goalsDismissCelebration();
  render();
}

function renderGoalTrackerAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
