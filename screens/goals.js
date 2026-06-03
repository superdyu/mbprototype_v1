// ─── Goals ────────────────────────────────────────────────────────────────────
// TAB: About Me (sub-screen) | NAV BAR: Visible — About Me tab highlighted
//
// PURPOSE
// Source of truth for goal creation and editing within About Me. Users set what
// they want Money Buddy to help with here. Goal progress is displayed in
// My Progress (read side). This screen is the write side.
//
// NAVIGATION
//   Entry: About Me → Goals card
//   Exit:  ← About Me
//
// STATES
//   List: shows all goals with Edit/Delete per card; Add Goal form when
//         state.editingGoalId === "new"
//   Editing: shows inline edit form for the goal matching state.editingGoalId
//
// PRODUCTION NOTES
//   Goals: qualitative strategic targets (where I want to go).
//   Milestones: quantitative targets that prove progress toward a goal.
//   V1: milestone CRUD is a stub — progress tracked via admin panel sliders.
//   Goal priority = order in state.goals[] (index 0 = highest priority).

function renderGoals() {
  const goals      = state.goals || [];
  const milestones = state.milestones || [];
  const editing    = state.editingGoalId;

  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="goBackFromGoals()">← ${state.flowOrigin === 'myProgress' ? 'My Progress' : 'About Me'}</button>
      <h1 class="title" style="margin:0;font-size:20px;">Goals</h1>
      <p class="subtitle" style="margin:4px 0 0;">Choose what Money Buddy should help with next.</p>
    </div>

    <!-- Add Goal form / button -->
    ${editing === "new" ? renderGoalForm(null) : `
      <button class="button full" style="margin-bottom:16px;" type="button"
              onclick="startAddGoal()">+ Add Goal</button>
    `}

    <!-- Goals list -->
    ${goals.length === 0 && editing !== "new" ? `
      <div class="card" style="text-align:center;padding:24px;">
        <p class="helper" style="margin-bottom:12px;">No goals yet. Add one to get started.</p>
      </div>
    ` : goals.map((goal, index) => editing === goal.id
      ? renderGoalForm(goal)
      : renderGoalCard(goal, index)
    ).join("")}

    <!-- Financial Milestones (read-only in V1, editable via admin) -->
    ${milestones.length > 0 ? `
      <div class="section-title" style="margin:24px 0 8px;">Financial Milestones</div>
      <p class="helper" style="margin-bottom:10px;">Measurable targets tied to financial progress.</p>

      ${milestones.map(m => `
        <div class="item-card" style="margin-bottom:8px;">
          <div style="flex:1;">
            <div class="task-title">${h(m.title)}</div>
            <p class="task-desc">${h(m.current)} / ${h(m.target)}</p>
            <div class="progress" style="margin:6px 0 4px;">
              <div class="progress-fill" style="width:${m.progress}%;"></div>
            </div>
            <div class="helper" style="font-size:11px;">${m.progress}% complete</div>
          </div>
        </div>
      `).join("")}

      <p class="helper" style="margin-top:8px;font-style:italic;">
        Milestone editing available in the next update.
      </p>
    ` : ""}
  `;
}

function renderGoalCard(goal, index) {
  return `
    <div class="item-card" style="margin-bottom:10px;">
      <div style="flex:1;">
        <div class="task-title">${h(goal.title)}</div>
        ${goal.description ? `<p class="task-desc" style="margin-bottom:8px;">${h(goal.description)}</p>` : ""}
        <div class="progress" style="margin:6px 0 4px;">
          <div class="progress-fill" style="width:${goal.progress || 0}%;"></div>
        </div>
        <div class="helper" style="font-size:11px;">${goal.progress || 0}% complete</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-left:10px;flex-shrink:0;">
        <button class="button secondary" style="font-size:11px;padding:5px 10px;"
                type="button" onclick="startEditGoal('${h(goal.id)}')">Edit</button>
        <button class="button secondary" style="font-size:11px;padding:5px 10px;"
                type="button" onclick="deleteGoal('${h(goal.id)}')">Delete</button>
      </div>
    </div>
  `;
}

function renderGoalForm(goal) {
  const isNew    = !goal;
  const id       = goal ? goal.id       : "";
  const title    = goal ? goal.title    : "";
  const desc     = goal ? goal.description : "";

  return `
    <div class="card" style="margin-bottom:14px;">
      <div class="section-title" style="margin-bottom:10px;">${isNew ? "New Goal" : "Edit Goal"}</div>

      <div class="input-group" style="margin-bottom:10px;">
        <label>What's the goal? <span style="color:var(--danger);">*</span></label>
        <input id="goalTitleInput" type="text" value="${h(title)}"
               placeholder="e.g. Become debt free"
               oninput="document.getElementById('goalTitleError').style.display='none';this.style.borderColor='';">
        <div id="goalTitleError" class="caption" style="color:var(--danger);display:none;margin-top:4px;">
          Goal title can't be empty.
        </div>
      </div>

      <div class="input-group" style="margin-bottom:14px;">
        <label>Describe it (optional)</label>
        <textarea id="goalDescInput" style="height:70px;"
                  placeholder="e.g. Pay off all credit cards within 2 years.">${h(desc)}</textarea>
      </div>

      <div class="row" style="gap:10px;">
        <button class="button primary" type="button"
                onclick="saveGoal('${h(id)}')">
          ${isNew ? "Add Goal" : "Save Changes"}
        </button>
        <button class="button secondary" type="button"
                onclick="cancelGoalEdit()">Cancel</button>
      </div>
    </div>
  `;
}

// ─── Goal CRUD handlers ───────────────────────────────────────────────────────

function startAddGoal() {
  state.editingGoalId = "new";
  render();
}

function startEditGoal(goalId) {
  state.editingGoalId = goalId;
  render();
}

function cancelGoalEdit() {
  state.editingGoalId = null;
  render();
}

function goBackFromGoals() {
  state.editingGoalId = null;
  const origin = state.flowOrigin;
  if (origin && origin !== "aboutMe") {
    state.flowOrigin = null;
    go(origin);
  } else {
    go("aboutMe");
  }
}

function saveGoal(goalId) {
  const titleEl = document.getElementById("goalTitleInput");
  const descEl  = document.getElementById("goalDescInput");

  const title = titleEl ? titleEl.value.trim() : "";
  if (!title) {
    if (titleEl) titleEl.style.borderColor = "var(--danger)";
    const errEl = document.getElementById("goalTitleError");
    if (errEl) errEl.style.display = "block";
    return;
  }
  const description = descEl ? descEl.value.trim() : "";

  if (!goalId) {
    // Adding new goal
    const newGoal = {
      id:          "g_" + Date.now(),
      title,
      description,
      progress:    0,
      priority:    (state.goals || []).length + 1
    };
    state.goals = state.goals || [];
    state.goals.push(newGoal);
  } else {
    // Editing existing
    const goal = (state.goals || []).find(g => g.id === goalId);
    if (goal) {
      goal.title       = title;
      goal.description = description;
    }
  }

  state.editingGoalId = null;
  render();
}

function deleteGoal(goalId) {
  state.goals         = (state.goals || []).filter(g => g.id !== goalId);
  state.editingGoalId = null;
  render();
}

// ─── Admin panel ─────────────────────────────────────────────────────────────

function renderGoalsAdmin() {
  const goals      = state.goals || [];
  const milestones = state.milestones || [];

  return `
    <div class="admin-card">
      <p class="admin-card-title">Goal Progress</p>
      ${goals.length === 0
        ? `<p class="helper">No goals yet.</p>`
        : goals.map((g, index) => `
          <div class="input-group">
            <label>${h(g.title)}</label>
            <input type="number" min="0" max="100" value="${g.progress || 0}"
                   oninput="updateGoalProgress('${h(g.id)}', parseInt(this.value)||0)">
          </div>
        `).join("")}
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Milestone Progress</p>
      ${milestones.map((m, index) => `
        <div class="input-group">
          <label>${h(m.title)}</label>
          <input type="number" min="0" max="100" value="${m.progress}"
                 oninput="state.milestones[${index}].progress=parseInt(this.value)||0;render()">
        </div>
      `).join("")}
    </div>
  `;
}

function updateGoalProgress(goalId, value) {
  const goal = (state.goals || []).find(g => g.id === goalId);
  if (goal) goal.progress = value;
  render();
}
