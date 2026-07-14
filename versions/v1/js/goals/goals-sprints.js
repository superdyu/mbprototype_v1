// ─── Goals V2 · Sprints ───────────────────────────────────────────────────────
// Long goals are abandoned; tiny ones aren't. Sprints chop a goal into a fixed
// grid of short windows (keys "s0","s1",… frozen at creation so sprintDone events
// never dangle) but the *targets* roll forward: each render re-splits whatever
// distance remains across the windows left, then EASES the current window down to
// firstSprintEase (60%) so the next action is always hyper-achievable.
//
// Claiming a sprint records a sprintDone event AND a check-in for its target, so a
// single tap both advances progress and feeds the streak/engagement signals.
// Free-form check-ins (goalsCheckIn) let a user log a different amount.

function goalsSprintCadence(goal) {
  var totalDays = goalsDaysBetween(goal.baseline.startDate, goal.baseline.targetDate);
  return totalDays < GOALS_TUNING.sprints.weeklyIfUnderDays ? 7 : 14;
}

// Fixed window grid anchored at createdAt. Keys never change across re-plans.
function goalsSprintWindows(goal) {
  var cadence = goalsSprintCadence(goal);
  var start = goal.baseline.startDate;
  var end = goal.baseline.targetDate;
  var totalDays = Math.max(cadence, goalsDaysBetween(start, end));
  var n = Math.max(1, Math.ceil(totalDays / cadence));
  var windows = [];
  for (var i = 0; i < n; i++) {
    var ws = goalsAddDays(start, i * cadence);
    var we = i === n - 1 ? end : goalsAddDays(start, (i + 1) * cadence - 1);
    windows.push({ key: "s" + i, index: i, start: ws, end: we });
  }
  return windows;
}

function goalsSprintDone(goal, key) {
  return goal.events.some(function(e) { return e.type === "sprintDone" && e.payload && e.payload.key === key; });
}

// Round a sprint target sensibly per unit (usd → nearest roundTo; else integer).
function goalsRoundTarget(v, unit) {
  if (v <= 0) return 0;
  if (unit === "usd") {
    var r = GOALS_TUNING.sprints.roundTo;
    return Math.max(r, Math.round(v / r) * r);
  }
  return Math.max(1, Math.round(v));
}

// The live sprint plan: past windows (with done flags), the eased current window,
// and the next `upcomingShown` windows with their forward-split targets.
function goalsSprintPlan(goal, asOf) {
  var iso = asOf || goalsTodayISO();
  var windows = goalsSprintWindows(goal);
  var n = windows.length;
  var cadence = goalsSprintCadence(goal);
  var idx = Math.floor(goalsDaysBetween(goal.baseline.startDate, iso) / cadence);
  idx = goalsClamp(idx, 0, n - 1);

  var unit = goal.baseline.unit;
  var remaining = goalsRemaining(goal, iso);
  var windowsLeft = n - idx;
  var complete = remaining <= 0;

  var even = remaining / Math.max(1, windowsLeft);
  var curTarget = complete ? 0 : goalsRoundTarget(even * GOALS_TUNING.sprints.firstSprintEase, unit);
  var futureRemaining = Math.max(0, remaining - curTarget);
  var futureEven = futureRemaining / Math.max(1, windowsLeft - 1);

  var past = [];
  for (var i = 0; i < idx; i++) past.push({ key: windows[i].key, index: i, window: windows[i], done: goalsSprintDone(goal, windows[i].key) });

  var current = { key: windows[idx].key, index: idx, window: windows[idx], target: curTarget, done: goalsSprintDone(goal, windows[idx].key) };

  var upcoming = [];
  for (var j = idx + 1; j < n && upcoming.length < GOALS_TUNING.sprints.upcomingShown; j++) {
    upcoming.push({ key: windows[j].key, index: j, window: windows[j], target: complete ? 0 : goalsRoundTarget(futureEven, unit), done: goalsSprintDone(goal, windows[j].key) });
  }

  return { past: past, current: current, upcoming: upcoming, windowsTotal: n, complete: complete, remaining: remaining, unit: unit };
}

// ── Mutators ─────────────────────────────────────────────────────────────────
// Claim the current sprint: guarded against double-claim; logs sprintDone + a
// check-in of `target` so progress advances in one tap.
function goalsCompleteSprint(goalId, key, target) {
  var goal = goalsById(goalId);
  if (!goal || goalsSprintDone(goal, key)) return;
  recordGoalEvent(goalId, "sprintDone", { key: key, target: target });
  if (target > 0) recordGoalEvent(goalId, "checkin", { amount: target, sprintKey: key });
}

// Free-form progress log (a custom amount toward the goal).
function goalsCheckIn(goalId, value) {
  if (!value || value <= 0) return;
  recordGoalEvent(goalId, "checkin", { amount: value });
}
