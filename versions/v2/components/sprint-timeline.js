// ─── Sprint Timeline Component (Goals V2) ─────────────────────────────────────
// Reusable visual for the tracker. Per the engagement design it shows ONLY the
// forward, positive path: a streak of recently-claimed sprints, the current
// sprint (colored by pace), and the next few micro-goals. Missed past sprints are
// never rendered. Single source of truth — edit here, not in the tracker.
//
//   renderSprintTimeline(goal, opts) — opts.showUpcoming (default true)

function renderSprintTimeline(goal, opts) {
  opts = opts || {};
  var showUpcoming = opts.showUpcoming !== false;
  var plan = goalsSprintPlan(goal);
  var pace = goalsPaceStatus(goal);
  var unit = goal.baseline.unit;

  if (plan.complete) {
    return `<div class="card" style="margin-bottom:12px;border-left:4px solid var(--accent);">
      <div style="font-weight:800;">🎉 Target reached — claim your goal!</div>
      <p class="helper" style="margin:4px 0 0;">No sprints left. You've hit ${h(goalsFmtValue(goal.baseline.targetValue, unit))}.</p>
    </div>`;
  }

  var paceColor = pace.status === "behind" ? "var(--warn)" : "var(--accent)";
  var paceLabel = pace.status === "ahead" ? "Ahead of pace" : pace.status === "behind" ? "Behind pace" : "On track";

  // Recently-claimed streak (achieved only — never show misses)
  var doneCount = plan.past.filter(function(p) { return p.done; }).length + (plan.current.done ? 1 : 0);
  var streak = doneCount > 0 ? `<span class="helper" style="font-size:11px;">🔥 ${doneCount} sprint${doneCount === 1 ? "" : "s"} claimed</span>` : "";

  var current = `
    <div class="card" style="margin-bottom:10px;border-left:4px solid ${paceColor};">
      <div class="row" style="margin-bottom:4px;">
        <span style="font-weight:850;">This sprint</span>
        <span class="helper" style="font-size:11px;color:${paceColor};font-weight:700;">${paceLabel}</span>
      </div>
      <div style="font-size:22px;font-weight:850;margin:2px 0;">${h(goalsFmtValue(plan.current.target, unit))}</div>
      <p class="helper" style="margin:0;">by ${h(plan.current.window.end)} ${plan.current.done ? "· ✓ claimed" : ""}</p>
    </div>`;

  var upcoming = "";
  if (showUpcoming && plan.upcoming.length) {
    upcoming = `<div class="section-title" style="margin:6px 0 8px;font-size:12px;">Coming up</div>` +
      plan.upcoming.map(function(u) {
        return `<div class="item-card" style="margin-bottom:6px;">
          <div><div class="task-title" style="font-size:13px;">${h(goalsFmtValue(u.target, unit))}</div>
          <p class="task-desc">by ${h(u.window.end)}</p></div>
          <div class="helper" style="font-size:11px;">${milestoneFlag(goal, u.window.end)}</div>
        </div>`;
      }).join("");
  }

  return `${streak ? `<div style="margin-bottom:6px;">${streak}</div>` : ""}${current}${upcoming}`;
}

// Flag an upcoming window that lands on or past a baseline milestone due date.
function milestoneFlag(goal, windowEnd) {
  var ms = (goal.baseline.milestones || []).find(function(m) {
    return m.kind !== "final" && m.dueDate <= windowEnd && m.dueDate >= goalsAddDays(windowEnd, -14);
  });
  return ms ? "🏁 " + h(ms.label) : "";
}
