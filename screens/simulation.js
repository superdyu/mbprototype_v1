// ─── Simulation ───────────────────────────────────────────────────────────────
// TAB: Learn (sub-screen) | NAV BAR: Visible — Learn tab highlighted
//
// PURPOSE
// Interactive scenario practice — applies a lesson concept to a concrete
// financial decision (e.g. compare two loan structures) before returning to topic.
//
// NAVIGATION
//   Entry: Topic screen for simulation-type lessons
//   Exit:  "Done" button → topic screen
//
// STATES
//   Currently a single hardcoded example (loan tradeoff comparison).
//   No state dependencies — fully static.
//
// PRODUCTION NOTES
//   Content should be keyed by lessonId, matching the LP_SCRIPTS pattern in
//   lesson.js. Each simulation-type lesson provides its own scenario config.
//   The current hardcoded example is a placeholder to show the screen shape.

function renderSimulation() {
  return `
    <div class="card">
      <h1 class="title">Simulation</h1>
      <p class="subtitle">Applied finance practice placeholder.</p>
    </div>

    <div class="card">
      <div class="section-title">Loan Tradeoff Practice</div>
      <p class="helper">Estimate which loan creates less long-term pressure.</p>
      <div class="item-card"><strong>Option A</strong><br><span class="helper">Lower monthly payment, higher APR.</span></div>
      <div class="item-card"><strong>Option B</strong><br><span class="helper">Higher monthly payment, lower APR.</span></div>
    </div>

    <button class="button full" type="button" onclick="go('topic')">Done</button>
  `;
}
