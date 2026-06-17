// ─── Goals V2 · Admin Dev Panel ───────────────────────────────────────────────
// Shared dev panel prepended to all three goal-screen admin panels. v1 (commit 5)
// ships the clock card (time travel) and the navigate card — the module's
// cross-screen entry that satisfied the original "no front-end placement" plan.
// Simulators (commit 7) and the tuning editor (commit 11) extend this file.

function renderGoalsDevPanel() {
  var off = state.goalsV2.clockOffsetDays || 0;
  var offLabel = off === 0 ? "real time" : (off > 0 ? "+" + off + "d" : off + "d");
  return `
    <div class="admin-card">
      <p class="admin-card-title">Goals · Simulated Clock</p>
      <p class="helper" style="margin-bottom:8px;">Sim date: <strong>${h(goalsTodayISO())}</strong> (${h(offLabel)})</p>
      <div class="row" style="gap:6px;flex-wrap:wrap;">
        <button class="button secondary small" type="button" onclick="goalsAdvanceClock(1)">+1 day</button>
        <button class="button secondary small" type="button" onclick="goalsAdvanceClock(7)">+1 week</button>
        <button class="button secondary small" type="button" onclick="goalsAdvanceClock(30)">+1 month</button>
        <button class="button secondary small" type="button" onclick="goalsResetClock()">Reset</button>
      </div>
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Goals · Navigate</p>
      <div class="row" style="gap:6px;flex-wrap:wrap;">
        <button class="button secondary small" type="button" onclick="go('goalCreate')">Create</button>
        <button class="button secondary small" type="button" onclick="goalsAdminOpenTracker()">Tracker</button>
        <button class="button secondary small" type="button" onclick="go('goalVault')">Vault</button>
      </div>
      <p class="helper" style="margin-top:8px;">${state.goalsV2.goals.length} goal(s) in module.</p>
    </div>
    ${typeof renderGoalsSimPanel === "function" ? renderGoalsSimPanel() : ""}
    ${typeof renderGoalsTuningPanel === "function" ? renderGoalsTuningPanel() : ""}
  `;
}

// Open the tracker on a sensible goal (selected, else newest active, else any).
function goalsAdminOpenTracker() {
  var v = state.goalsV2;
  if (!v.selectedGoalId || !goalsById(v.selectedGoalId)) {
    var active = goalsActive();
    var pick = active.length ? active[active.length - 1] : (v.goals[v.goals.length - 1] || null);
    v.selectedGoalId = pick ? pick.id : null;
  }
  go("goalTracker");
}

// ── Simulators (commit 7) ─────────────────────────────────────────────────────
// Drive the selected goal's engagement signals without manual clicking, so the
// cohort/achievement loops are testable in seconds.
function renderGoalsSimPanel() {
  var goal = goalsById(state.goalsV2.selectedGoalId);
  return `
    <div class="admin-card">
      <p class="admin-card-title">Goals · Simulate</p>
      ${goal ? `<p class="helper" style="margin-bottom:8px;">Acting on: <strong>${h(goal.title)}</strong></p>` : `<p class="helper" style="margin-bottom:8px;">Select a goal in the tracker first.</p>`}
      <div class="row" style="gap:6px;flex-wrap:wrap;">
        <button class="button secondary small" type="button" onclick="goalsSimulateEngagedWeek()">Engaged week</button>
        <button class="button secondary small" type="button" onclick="goalsSimulateLapse()">Lapse</button>
        <button class="button secondary small" type="button" onclick="goalsAdminResetModule()">Reset module</button>
      </div>
    </div>
  `;
}

// Claim the current sprint, then jump the clock forward one cadence — repeat to
// build an on-pace, high-sprint-rate (engaged) record.
function goalsSimulateEngagedWeek() {
  var goal = goalsById(state.goalsV2.selectedGoalId);
  if (!goal) { render(); return; }
  var plan = goalsSprintPlan(goal);
  if (!plan.complete && !plan.current.done) goalsCompleteSprint(goal.id, plan.current.key, plan.current.target);
  state.goalsV2.clockOffsetDays = (state.goalsV2.clockOffsetDays || 0) + goalsSprintCadence(goal);
  render();
}

// Advance past the lapse threshold with no action → "lapsed" engagement tier.
function goalsSimulateLapse() {
  var goal = goalsById(state.goalsV2.selectedGoalId);
  var jump = GOALS_TUNING.cohort.engagement.lapseAfterDays + 4;
  state.goalsV2.clockOffsetDays = (state.goalsV2.clockOffsetDays || 0) + (goal ? Math.max(jump, goalsSprintCadence(goal) + 4) : jump);
  render();
}

function goalsAdminResetModule() {
  state.goalsV2 = { clockOffsetDays: 0, goals: [], draft: null, selectedGoalId: null, celebrationDismissedAt: null };
  render();
}
