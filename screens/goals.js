// ─── Goals & Milestones ───────────────────────────────────────────────────────
// TAB: Goals | NAV BAR: Visible
//
// PURPOSE
// User-defined financial goals with progress tracking, and measurable savings
// milestones tied to financial outcomes.
//
// NAVIGATION
//   Entry: Goals tab tap from any screen in NAV_VISIBLE_SCREENS
//   Exit:  Goals tab → any other tab (top-level tab, no back button)
//
// STATES
//   Static seed data always present — no empty state in prototype.
//   Goal progress and milestone progress are adjustable via admin panel sliders.
//
// PRODUCTION NOTES
//   "Add Goal" and "Add Milestone" buttons are non-functional stubs.
//   Production: goal-creation flow with title, target amount, target date.
//   Milestone progress should link automatically to budget category actuals
//   (e.g. "Emergency Fund" milestone tracks against savings category balance).
//   Strategic Goals (top section) are qualitative progression goals;
//   Financial Milestones (bottom section) are quantitative with a target value.

function renderGoals() {
  return `
    <div class="row" style="margin-bottom:14px;">
      <button class="button" type="button">Add Goal</button>
      <button class="button secondary" type="button">Add Milestone</button>
    </div>

    <div class="card">
      <div class="section-title">Strategic Goals</div>
      <p class="helper">High-level learning progression and repeated learning.</p>
    </div>

    ${state.goals.map((goal, index) => `
      <div class="item-card">
        <div class="task-title">${h(goal.title)}</div>
        <p class="task-desc">${h(goal.description)}</p>
        <div class="progress"><div class="progress-fill" style="width:${goal.progress}%;"></div></div>
        <div class="helper" style="margin-top:8px;">${goal.progress}% complete</div>
      </div>
    `).join("")}

    <div class="card" style="margin-top:14px;">
      <div class="section-title">Financial Milestones</div>
      <p class="helper">Measurable bars tied to financial progress.</p>
    </div>

    ${state.milestones.map((milestone, index) => `
      <div class="item-card">
        <div class="task-title">${h(milestone.title)}</div>
        <p class="task-desc">${h(milestone.current)} / ${h(milestone.target)}</p>
        <div class="progress"><div class="progress-fill" style="width:${milestone.progress}%;"></div></div>
        <div class="helper" style="margin-top:8px;">${milestone.progress}% complete</div>
      </div>
    `).join("")}
  `;
}

function renderGoalsAdmin() {
  return `
    <div class="admin-card">
      <p class="admin-card-title">Strategic Goal Progress</p>
      ${state.goals.map((g, index) => `
        <div class="input-group">
          <label>${h(g.title)}</label>
          <input type="number" value="${g.progress}" oninput="state.goals[${index}].progress=parseInt(this.value)||0;render()">
        </div>
      `).join("")}
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Milestone Progress</p>
      ${state.milestones.map((g, index) => `
        <div class="input-group">
          <label>${h(g.title)}</label>
          <input type="number" value="${g.progress}" oninput="state.milestones[${index}].progress=parseInt(this.value)||0;render()">
        </div>
      `).join("")}
    </div>
  `;
}
