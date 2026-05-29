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

    <div class="card stage-card">Stage</div>

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
            : `<button class="button" type="button" onclick="${task.lessonId ? `selectLesson('${h(task.lessonId)}')` : `taskGo('${h(task.destination)}')`}">${h(task.cta)}</button>`
          }
        </div>
      `).join("")}
    </div>
  `;
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
            <option value="analysis"    ${task.tab === "analysis"    ? "selected" : ""}>Analysis</option>
            <option value="goals"       ${task.tab === "goals"       ? "selected" : ""}>Goals</option>
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
    // Set destination based on tab name where it maps to a screen
    const tabDestMap = { analysis: "analysis", goals: "goals", marketplace: "marketplace", settings: "settings", other: "home" };
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
