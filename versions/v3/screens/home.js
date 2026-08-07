// ─── Home ─────────────────────────────────────────────────────────────────────
// TAB: Home | NAV BAR: Visible
//
// PURPOSE
// Default landing screen. Daily task cards surface the user's highest-priority
// next action across all tabs — this is the primary cross-feature engagement loop.
//
// NAVIGATION
//   Entry: Default screen on launch; Home tab tap from anywhere
//   Exit:  Task CTAs: lessons via selectLesson(), other screens via taskGo()
//          Settings button in header → settings screen
//          "Chat with Buddy" pill on the stage → chat screen
//
// STATES
//   Tasks show "Done" badge when task.completed = true, CTA button when false.
//   Progress counter shows X of Y complete for the day's task list.
//
// PRODUCTION NOTES
//   Tasks are currently static seed data in state.tasks. Production: tasks
//   generated dynamically from user progress state (incomplete lessons, stale
//   budget, unreviewed debts, goal check-ins). The task card model is the
//   primary engagement surface — treat as a first-class feature in production.
//   Admin panel provides full control over task content and destinations.

function renderHome() {
  const completed = state.tasks.filter(t => t.completed).length;
  return `
    <div class="home-header">
      <div>
        <h1 class="title">Today</h1>
        <p class="subtitle">Returning user home screen with daily check-in tasks.</p>
      </div>
      <button class="settings-btn" type="button" onclick="go('settings')">Settings</button>
    </div>

    <!-- Stage: placeholder for the future Buddy character/scene. The chat pill is
         positioned to overhang its bottom edge (see .chat-buddy-btn in components.css). -->
    <div class="card stage-card">
      Stage
      <button class="chat-buddy-btn" type="button" onclick="go('chat')">Chat with Buddy</button>
    </div>

    <div class="row" style="margin-bottom:12px;">
      <div class="section-title" style="margin:0;">Daily Tasks</div>
      <div class="helper">${completed} of ${state.tasks.length} complete</div>
    </div>

    <div class="task-list">
      ${state.tasks.map((task, index) => `
        <div class="task-card ${task.completed ? "completed" : ""}">
          <div>
            <p class="task-title">${h(task.title)}</p>
            <p class="task-desc">${h(task.description)}</p>
          </div>
          ${task.completed
            ? `<div class="done-state">Done</div>`
            : `<button class="button" type="button" onclick="handleTaskCTA(${index})">${h(task.cta)}</button>`
          }
        </div>
      `).join("")}
    </div>
  `;
}

function handleTaskCTA(index) {
  const task = state.tasks[index];
  if (!task) return;
  if (task.lessonId) selectLesson(task.lessonId);
  else taskGo(task.destination);
}

function buildLessonOptgroups(selectedLessonId) {
  const badgeLessonMap = {};
  state.badges.forEach(b => { badgeLessonMap[b.name] = []; });
  state.lessons.forEach(l => {
    const primary = l.badges[0];
    if (badgeLessonMap[primary]) badgeLessonMap[primary].push(l);
  });
  return Object.entries(badgeLessonMap)
    .filter(([, ls]) => ls.length > 0)
    .map(([badge, ls]) => `
      <optgroup label="${h(badge)}">
        ${ls.map(l => `<option value="${l.id}" ${l.id === selectedLessonId ? "selected" : ""}>${h(l.title)}</option>`).join("")}
      </optgroup>
    `).join("");
}

function renderHomeAdmin() {
  return `
    ${state.tasks.map((task, index) => `
      <div class="admin-card">
        <p class="admin-card-title">Task ${index + 1}</p>

        <div class="input-group">
          <label>Task title</label>
          <input value="${h(task.title)}" oninput="updateTask(${index}, 'title', this.value)">
        </div>

        <div class="input-group">
          <label>Description</label>
          <textarea oninput="updateTask(${index}, 'description', this.value)">${h(task.description)}</textarea>
        </div>

        <div class="input-group">
          <label>CTA label</label>
          <input value="${h(task.cta)}" oninput="updateTask(${index}, 'cta', this.value)">
        </div>

        <div class="input-group">
          <label>Tab</label>
          <select onchange="setTaskTab(${index}, this.value)">
            <option value="learn"       ${task.tab === "learn"       ? "selected" : ""}>Learn (Lesson)</option>
            <option value="aboutMe"     ${task.tab === "aboutMe"     ? "selected" : ""}>Budget</option>
            <option value="myProgress"  ${task.tab === "myProgress"  ? "selected" : ""}>My Progress</option>
            <option value="marketplace" ${task.tab === "marketplace" ? "selected" : ""}>Marketplace</option>
            <option value="settings"    ${task.tab === "settings"    ? "selected" : ""}>Settings</option>
            <option value="other"       ${task.tab === "other"       ? "selected" : ""}>Other</option>
          </select>
        </div>

        ${task.tab === "learn" ? `
          <div class="input-group">
            <label>Lesson</label>
            <select onchange="setTaskLesson(${index}, this.value)">
              ${buildLessonOptgroups(task.lessonId)}
            </select>
          </div>
        ` : `
          <div class="input-group">
            <label>Destination</label>
            <select onchange="updateTask(${index}, 'destination', this.value)">
              ${destinations.map(([value, label]) => `
                <option value="${value}" ${task.destination === value ? "selected" : ""}>${label}</option>
              `).join("")}
            </select>
          </div>
        `}

        <div class="input-group">
          <label>Completed</label>
          <select onchange="updateTask(${index}, 'completed', this.value === 'true')">
            <option value="false" ${!task.completed ? "selected" : ""}>false</option>
            <option value="true"  ${task.completed  ? "selected" : ""}>true</option>
          </select>
        </div>

        <button class="button secondary full" type="button" onclick="removeTask(${index})">Remove Task</button>
      </div>
    `).join("")}

    <button class="button full" type="button" onclick="addTask()">Add Task</button>
  `;
}

function updateTask(index, field, value) {
  state.tasks[index][field] = value;
  render();
}

function setTaskTab(index, tab) {
  const task = state.tasks[index];
  task.tab = tab;
  if (tab === "learn") {
    task.lessonId = state.lessons[0].id;
    delete task.destination;
  } else {
    delete task.lessonId;
    // Map tab to a default destination; "aboutMe" and "myProgress" are hub screens
    // so they're the correct default. Sub-screen destinations (e.g. babyBudget) must
    // be set manually via the Destination dropdown after choosing a tab.
    const tabDestMap = { aboutMe: "aboutMe", myProgress: "myProgress", marketplace: "marketplace", settings: "settings", other: "home" };
    task.destination = tabDestMap[tab] || destinations[0][0];
  }
  render();
}

function setTaskLesson(index, lessonId) {
  state.tasks[index].lessonId = lessonId;
  render();
}

function addTask() {
  state.tasks.push({
    title: "New task",
    description: "Short description for this task.",
    cta: "Open",
    tab: "other",
    destination: "home",
    completed: false
  });
  render();
}

function removeTask(index) {
  state.tasks.splice(index, 1);
  render();
}
