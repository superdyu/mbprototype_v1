// ─── Goals V2 · Achievements ──────────────────────────────────────────────────
// Achievements are DERIVED (a pure scan of frozen baseline + append-only events),
// never stored — so they're idempotent and replay identically across time travel.
// The ONLY stored acknowledgment is a `celebrated` event, which fires each medal's
// full-card celebration exactly once. Strictly positive: missed sprints and unmet
// milestones produce nothing, anywhere.
//
// Achievement: { id, kind, icon, title, desc, earnedAt }

// Has the user's value met a milestone by its due date? (direction-aware)
function goalsMilestoneAchieved(goal, ms) {
  if (ms.dueDate > goalsTodayISO()) return false;
  var val = goalsCurrentValue(goal, ms.dueDate);
  return goal.baseline.direction === "down" ? val <= ms.targetValue + 0.01 : val >= ms.targetValue - 0.01;
}

// Date of the sprintDone event for a window key (for streak earnedAt).
function goalsSprintDoneAt(goal, key) {
  var ev = goal.events.find(function(e) { return e.type === "sprintDone" && e.payload && e.payload.key === key; });
  return ev ? ev.at : goalsTodayISO();
}

// All earned achievements for one goal, oldest first.
function goalsAchievements(goal) {
  var out = [];
  var tuning = GOALS_TUNING.achievements;

  // ── Streaks: consecutive claimed sprint windows crossing [2,4,8] ────────────
  var windows = goalsSprintWindows(goal);
  var run = 0;
  for (var i = 0; i < windows.length; i++) {
    if (goalsSprintDone(goal, windows[i].key)) {
      run++;
      if (tuning.streakTiers.indexOf(run) !== -1) {
        out.push({ id: goal.id + "_streak_" + run, kind: "streak", icon: "🔥",
          title: run + "-sprint streak", desc: "Claimed " + run + " sprints in a row.",
          earnedAt: goalsSprintDoneAt(goal, windows[i].key) });
      }
    } else {
      run = 0;
    }
  }

  // ── Milestone medals: each non-final baseline milestone met by its due date ──
  (goal.baseline.milestones || []).forEach(function(ms) {
    if (ms.kind === "final") return;
    if (goalsMilestoneAchieved(goal, ms)) {
      out.push({ id: goal.id + "_ms_" + ms.id, kind: "milestone", icon: "🏅",
        title: ms.label + " milestone", desc: "On pace at the " + ms.label + " mark.", earnedAt: ms.dueDate });
    }
  });

  // ── Rank firsts: first top-40% day (Front Runner) and first #1 day (Pacesetter)
  var eng = goalsUserEngagement(goal);
  if (eng.actions > 0) {
    var dayIndex = Math.max(0, goalsDaysBetween(goal.createdAt, goalsTodayISO()));
    var scan = Math.min(dayIndex, 180);
    var gotFront = false, gotPace = false;
    for (var d = 1; d <= scan && !(gotFront && gotPace); d++) {
      var date = goalsAddDays(goal.createdAt, d);
      var st = goalsCohortStanding(goal, date);
      if (!gotFront && st.percentile >= 60) {
        gotFront = true;
        out.push({ id: goal.id + "_frontRunner", kind: "rank", icon: "🏃",
          title: "Front Runner", desc: "Broke into the top 40% of your pace group.", earnedAt: date });
      }
      if (!gotPace && st.rank === 1) {
        gotPace = true;
        out.push({ id: goal.id + "_pacesetter", kind: "rank", icon: "⚡",
          title: "Pacesetter", desc: "Took #1 in your pace group.", earnedAt: date });
      }
    }
  }

  // ── Completion trophy + permanent rank title ────────────────────────────────
  var done = goal.events.find(function(e) { return e.type === "complete"; });
  if (done) {
    out.push({ id: goal.id + "_complete", kind: "completion", icon: "🏆",
      title: goalsRankTitle(goal), desc: "Goal complete: " + goal.title + ".", earnedAt: done.at });
  }

  out.sort(function(a, b) { return a.earnedAt < b.earnedAt ? -1 : a.earnedAt > b.earnedAt ? 1 : 0; });
  return out;
}

// Permanent title for a completed goal by milestones-hit ratio.
function goalsRankTitle(goal) {
  var t = GOALS_TUNING.achievements;
  var nonFinal = (goal.baseline.milestones || []).filter(function(m) { return m.kind !== "final"; });
  var hit = nonFinal.filter(function(m) { return goalsMilestoneAchieved(goal, m); }).length;
  var ratio = nonFinal.length ? hit / nonFinal.length : 1;
  var tier = ratio >= t.completionTiers.gold ? "gold" : ratio >= t.completionTiers.silver ? "silver" : "bronze";
  return t.rankTitles[tier];
}

function goalsAllAchievements() {
  var all = [];
  state.goalsV2.goals.forEach(function(g) { all = all.concat(goalsAchievements(g)); });
  return all;
}

// Positive-only vault contents: completed-goal trophies + every earned medal.
function goalsVaultEntries() {
  var completedGoals = state.goalsV2.goals
    .filter(function(g) { return g.status === "completed"; })
    .map(function(g) {
      var done = g.events.find(function(e) { return e.type === "complete"; });
      return { goalId: g.id, title: g.title, icon: (goalsTypeMeta(g.typeKey) || {}).icon || "🏆",
        rankTitle: goalsRankTitle(g), completedAt: done ? done.at : g.createdAt };
    });
  var milestoneMedals = goalsAllAchievements().filter(function(a) { return a.kind !== "completion"; });
  return { completedGoals: completedGoals, milestoneMedals: milestoneMedals };
}

// ── Celebration queue (fires each medal once) ─────────────────────────────────
function goalsCelebratedIds(goal) {
  return goal.events.filter(function(e) { return e.type === "celebrated"; })
    .map(function(e) { return e.payload && e.payload.achievementId; });
}
function goalsPendingCelebration(goal) {
  var seen = goalsCelebratedIds(goal);
  var earned = goalsAchievements(goal);
  for (var i = 0; i < earned.length; i++) { if (seen.indexOf(earned[i].id) === -1) return earned[i]; }
  return null;
}
function goalsDismissCelebration() {
  var goal = goalsById(state.goalsV2.selectedGoalId) || (goalsActive()[0] || null);
  if (!goal) return;
  var pending = goalsPendingCelebration(goal);
  if (pending) recordGoalEvent(goal.id, "celebrated", { achievementId: pending.id });
}

// ── UI ───────────────────────────────────────────────────────────────────────
function renderGoalAchievements(goal) {
  var earned = goalsAchievements(goal);
  if (!earned.length) return "";
  return `
    <div class="section-title" style="margin:18px 0 8px;">Earned</div>
    <div class="row" style="gap:8px;flex-wrap:wrap;">
      ${earned.map(function(a) {
        return `<div class="card" style="padding:10px 12px;min-width:96px;text-align:center;">
          <div style="font-size:22px;">${a.icon}</div>
          <div style="font-weight:800;font-size:11px;margin-top:2px;">${h(a.title)}</div>
        </div>`;
      }).join("")}
    </div>
  `;
}

function renderGoalCelebration(goal, ach) {
  return `
    <div style="position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:120;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div class="card" style="max-width:320px;width:100%;padding:28px;text-align:center;">
        <div style="font-size:52px;line-height:1;">${ach.icon}</div>
        <div style="font-weight:850;font-size:20px;margin:10px 0 4px;">${h(ach.title)}</div>
        <p class="helper" style="margin-bottom:20px;">${h(ach.desc)}</p>
        <button class="button primary full" type="button" onclick="gtDismissCelebration()">Nice! →</button>
      </div>
    </div>
  `;
}
