// ─── Lesson quiz · simulation · reward (06-education) ────────────────────────
// TAB: Education (sub-screens) | NAV BAR: Hidden
//
// The tail of a lesson: quiz → simulation → reward. 06-education biases toward
// the simulation — "a sandbox a user can push numbers through beats a
// multiple-choice question about what a rate means" — so the quiz is short and
// the simulation is the part with something to do.
//
// RETURN ROUTING: came from home, return to home; came from Education, return
// to Education. The per-stack nav already encodes that, so the reward screen
// just pops rather than guessing a destination.

// ── Quiz ─────────────────────────────────────────────────────────────────────

function lessonQuizStart() {
  const lesson = lessonV3(state.lessonFraming ? state.lessonFraming.lessonId : null)
              || lessonV3(state.currentLesson ? state.currentLesson.id : null);
  if (!lesson) { navBack(); return; }
  state.lessonQuiz = {
    lessonId: lesson.id,
    questions: lrQuizQuestions(lesson),
    index: 0,
    correct: 0,
    picked: null,
    wrong: []
  };
  go("lessonQuiz");
}

function renderLessonQuiz() {
  const q = state.lessonQuiz;
  if (!q) { lessonQuizStart(); return ""; }
  const item = q.questions[q.index];
  if (!item) return `<div class="card"><p class="helper">No questions.</p></div>`;

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">Question ${q.index + 1} of ${q.questions.length}</p>
        <div class="journal-progress" aria-hidden="true">
          ${q.questions.map((_, i) => `<span class="journal-pip ${i <= q.index ? "on" : ""}"></span>`).join("")}
        </div>
        <h1 class="title" style="font-size:19px;margin:12px 0 0;">${h(item.prompt)}</h1>
      </div>

      <div class="journal-body">
        <div class="journal-options">
          ${item.options.map((opt, i) => {
            const isWrong = q.wrong.indexOf(i) !== -1;
            const isRight = q.picked === i && i === item.correct;
            return `
              <button class="journal-opt ${isRight ? "quiz-right" : ""} ${isWrong ? "quiz-wrong" : ""}"
                      type="button" ${isWrong || q.picked != null ? "disabled" : ""}
                      onclick="lessonQuizAnswer(${i})">
                <span class="journal-opt-label">${h(opt)}</span>
              </button>`;
          }).join("")}
        </div>
        ${q.picked != null ? `
          <p class="helper" style="margin-top:12px;">
            That's the one. ${LESSONS_V3.badges.xpCorrectAnswer} XP.
          </p>` : ""}
      </div>

      <div class="journal-foot">
        <span></span>
        ${q.picked != null
          ? `<button class="button" type="button" onclick="lessonQuizNext()">
               ${q.index >= q.questions.length - 1 ? "Try the calculator" : "Next"}
             </button>`
          : `<button class="button secondary" type="button" onclick="lessonQuizNext()">Skip</button>`}
      </div>
    </div>
  `;
}

// A wrong pick stays disabled but the question stays open — this is a lesson,
// not an exam, and there is no score to protect.
function lessonQuizAnswer(i) {
  const q = state.lessonQuiz;
  const item = q.questions[q.index];
  if (i === item.correct) { q.picked = i; q.correct++; }
  else if (q.wrong.indexOf(i) === -1) { q.wrong.push(i); }
  render();
}

function lessonQuizNext() {
  const q = state.lessonQuiz;
  if (q.index >= q.questions.length - 1) { lessonSimStart(); return; }
  q.index++; q.picked = null; q.wrong = [];
  render();
}

// ── Simulation ───────────────────────────────────────────────────────────────

function lessonSimStart() {
  const lesson = lessonV3(state.lessonQuiz ? state.lessonQuiz.lessonId : null);
  if (!lesson) { navBack(); return; }
  state.lessonSim = { lessonId: lesson.id, values: lrSimDefaults(lesson) };
  go("lessonSimulation");
}

function lessonSimSet(key, value) {
  state.lessonSim.values[key] = Number(value) || 0;
  render();
}

function lessonSimToggle(i) {
  const rows = state.lessonSim.values.rows || [];
  if (rows[i]) rows[i].on = !rows[i].on;
  render();
}

function renderLessonSimulation() {
  const s = state.lessonSim;
  if (!s) { lessonSimStart(); return ""; }
  const lesson = lessonV3(s.lessonId);
  const type = lesson.simulation.type;

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <h1 class="title" style="font-size:21px;margin:0;">Try it with numbers</h1>
        <p class="helper" style="margin:6px 0 0;">
          These are made-up figures to play with — not yours.
        </p>
      </div>
      <div class="journal-body">
        ${type === "balance_calculator"      ? renderSimBalance(s)   : ""}
        ${type === "savings_pace_calculator" ? renderSimSavings(s)   : ""}
        ${type === "subscription_tally"      ? renderSimSubs(s)      : ""}
      </div>
      <div class="journal-foot">
        <span></span>
        <button class="button" type="button" onclick="lessonRewardStart()">Finish lesson</button>
      </div>
    </div>
  `;
}

function simSlider(label, key, value, min, max, step, fmt) {
  return `
    <div class="card sim-row">
      <div class="row" style="align-items:baseline;margin-bottom:6px;">
        <span class="budget-row-name">${h(label)}</span>
        <span class="budget-row-amt">${fmt ? fmt(value) : value}</span>
      </div>
      <input class="journal-slider" type="range" min="${min}" max="${max}" step="${step}"
             value="${value}" oninput="lessonSimSet('${key}', this.value)"
             aria-label="${h(label)}">
    </div>`;
}

function renderSimBalance(s) {
  const v = s.values;
  const out = lrSimBalance(v);
  return `
    ${simSlider("Balance", "balance", v.balance, 100, 10000, 100, budgetFmt)}
    ${simSlider("APR", "apr", v.apr, 0, 36, 1, x => x + "%")}
    ${simSlider("Monthly payment", "monthlyPayment", v.monthlyPayment, 10, 600, 10, budgetFmt)}
    <div class="card sim-out">
      ${out.monthsToPayoff == null ? `
        <p class="du-figure du-figure-sm">Never</p>
        <p class="helper" style="margin:4px 0 0;">
          At that payment the interest grows faster than the balance falls.
        </p>
      ` : `
        <p class="du-figure du-figure-sm">${out.monthsToPayoff} months</p>
        <p class="helper" style="margin:4px 0 0;">
          and ${budgetFmt(out.totalInterest)} of interest along the way.
        </p>`}
    </div>`;
}

function renderSimSavings(s) {
  const v = s.values;
  const out = lrSimSavings(v);
  return `
    ${simSlider("Target", "target", v.target, 500, 10000, 100, budgetFmt)}
    ${simSlider("Saved so far", "current", v.current, 0, 10000, 50, budgetFmt)}
    ${simSlider("Each month", "monthlyContribution", v.monthlyContribution, 0, 1000, 10, budgetFmt)}
    <div class="card sim-out">
      ${out.monthsToTarget == null ? `
        <p class="du-figure du-figure-sm">—</p>
        <p class="helper" style="margin:4px 0 0;">Nothing going in means nothing arrives.</p>
      ` : `
        <p class="du-figure du-figure-sm">${out.monthsToTarget} months</p>
        <p class="helper" style="margin:4px 0 0;">getting there around ${h(out.targetDate)}.</p>`}
    </div>`;
}

function renderSimSubs(s) {
  const rows = s.values.rows || [];
  const out = lrSimSubscriptions(rows);
  return `
    <p class="helper" style="margin:0 0 10px;">Switch things off and watch the total move.</p>
    ${rows.map((r, i) => `
      <div class="row sim-sub-row">
        <label class="share-toggle" style="flex:1;">
          <input type="checkbox" ${r.on ? "checked" : ""} onchange="lessonSimToggle(${i})">
          <span><strong>${h(r.name)}</strong></span>
        </label>
        <span class="helper">${budgetFmt(r.monthly)}/mo</span>
      </div>`).join("")}
    <div class="card sim-out">
      <p class="du-figure du-figure-sm">${budgetFmt(out.annualTotal)}</p>
      <p class="helper" style="margin:4px 0 0;">a year, at ${budgetFmt(out.monthlyTotal)} a month.</p>
      ${out.savingsIfCancelled > 0 ? `
        <p class="helper" style="margin:8px 0 0;">
          The ones you switched off came to ${budgetFmt(out.savingsIfCancelled)} a year.
        </p>` : ""}
    </div>`;
}

// ── Reward ───────────────────────────────────────────────────────────────────

function lessonRewardStart() {
  const lesson = lessonV3(state.lessonSim ? state.lessonSim.lessonId : null);
  if (!lesson) { navGoHome(); return; }
  const correct = state.lessonQuiz ? state.lessonQuiz.correct : 0;
  const fromTask = state.activeTaskId === "t_lesson_apr";

  const award = lrComputeAward(lesson, correct, fromTask);
  state.lessonReward = {
    lessonId: lesson.id,
    award: award,
    gains: lrApplyAward(lesson, award),
    kibble: lrAwardKibble(award)
  };
  if (fromTask) homeCompleteTask(state.activeTaskId);
  go("lessonReward");
}

function renderLessonReward() {
  const r = state.lessonReward;
  if (!r) return `<div class="card"><p class="helper">Nothing to show.</p></div>`;
  const lesson = lessonV3(r.lessonId);

  return `
    <div class="journal-shell">
      <div class="journal-head" style="text-align:center;">
        <h1 class="title" style="font-size:22px;margin:0;">${h(lesson.title)}</h1>
        <p class="helper" style="margin:6px 0 0;">Done.</p>
      </div>

      <div class="journal-body">
        <div class="card" style="text-align:center;">
          <p class="du-figure">${r.award.total} XP</p>
          <p class="helper" style="margin:4px 0 0;">
            ${r.award.correctCount} right · ${LESSONS_V3.badges.xpLessonComplete} for finishing
            ${r.award.bonus ? " · " + r.award.bonus + " daily-task bonus" : ""}
          </p>
          <p class="helper" style="margin:8px 0 0;">🦴 ${r.kibble} kibble</p>
        </div>

        <div class="section-title" style="margin:18px 0 8px;">Courses this moved</div>
        ${r.gains.map(g => `
          <div class="card reward-course">
            <div class="row" style="align-items:baseline;margin-bottom:4px;">
              <span class="budget-row-name">${h(String(g.course).replace(/-/g, " "))}</span>
              <span class="pill" style="font-size:9px;padding:2px 8px;">
                ${h(g.rankAfter.tier)} ${g.rankAfter.level}
              </span>
            </div>
            <div class="goal-bar" aria-hidden="true"><span style="width:${g.rankAfter.pct}%"></span></div>
            ${g.leveledUp ? `<p class="helper" style="margin:6px 0 0;">Levelled up.</p>` : ""}
          </div>`).join("")}

        <p class="helper" style="margin:12px 0 0;font-size:11px;">
          Badges are for show — they don't unlock anything.
        </p>

        ${renderGoalSuggestions({ source: "lesson" })}
      </div>

      <div class="journal-foot">
        <span></span>
        <button class="button" type="button" onclick="lessonReturnFromLesson()">Done</button>
      </div>
    </div>
  `;
}

/**
 * "Came from home, return to home; came from Education, return to Education."
 * The per-stack nav already knows which — the lesson was pushed onto whichever
 * stack launched it — so this pops rather than guessing.
 */
function lessonReturnFromLesson() {
  state.lessonFraming = null;
  state.lessonQuiz = null;
  state.lessonSim = null;
  state.lessonVariantScript = null;
  state.activeTaskId = null;
  if (state.nav.activeStack === "home") { navGoHome(); return; }
  state.nav.stacks[state.nav.activeStack] = [state.nav.stacks[state.nav.activeStack][0]];
  navCommit(state.nav.stacks[state.nav.activeStack][0]);
}

function renderLessonOutcomeAdmin() {
  const q = state.lessonQuiz, r = state.lessonReward;
  return `
    <div class="admin-card">
      <p class="admin-card-title">Lesson outcome</p>
      <div class="input-group">
        <label>Quiz</label>
        <div class="helper">
          ${q ? `${q.questions.length} questions (${q.questions.filter(x => x.source === "lesson").length} from lessons.json, rest from v2's pool) · ${q.correct} right` : "not started"}
        </div>
      </div>
      <div class="input-group">
        <label>Questions required (v2 knob, L9)</label>
        <input type="number" min="1" max="10" value="${(state.xpConfig && state.xpConfig.quizQuestionsRequired) || 3}"
               onchange="state.xpConfig.quizQuestionsRequired=parseInt(this.value,10)||3;render()">
      </div>
      <div class="input-group">
        <label>Daily-task bonus multiplier (v2 knob, L9)</label>
        <input type="number" min="1" max="10" step="0.5" value="${(state.xpConfig && state.xpConfig.bonusMultiplier) || 1}"
               onchange="state.xpConfig.bonusMultiplier=parseFloat(this.value)||1;render()">
      </div>
      <div class="input-group">
        <label>Course XP — progress is on the LESSON, so cross-cutting ones move several</label>
        <div class="helper" style="line-height:1.7;">
          ${Object.keys(state.courseXp || {}).length
            ? Object.keys(state.courseXp).map(c => {
                const rk = lrRank(state.courseXp[c]);
                return `${h(c)}: ${state.courseXp[c]} XP → ${h(rk.tier)} ${rk.level}`;
              }).join("<br>")
            : "none yet"}
        </div>
      </div>
      ${r ? `<div class="input-group"><label>Last award</label>
        <div class="helper">${r.award.base} base + ${r.award.bonus} bonus = ${r.award.total} · ${r.kibble} kibble</div></div>` : ""}
    </div>
  `;
}
