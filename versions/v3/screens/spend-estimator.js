// ─── Spend estimator (behavioral, extends the Money Journal) ─────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible
//
// "Basically the Money Journal itself." It never asks a dollar figure — people
// remember their HABITS (how often, what type: specialty café vs donut shop),
// not their totals. Each option carries a full-rate monthly estimate; we scale
// by how far into the month we are (except bills already incurred, `fullMonth`)
// to triangulate month-to-date, and write it into the "What you told me" layer
// (state.mtd). Same day-clock cooldown as the journal, so nothing is re-asked.

function estimatorConfig() {
  return (typeof ESTIMATOR_QUESTIONS !== "undefined" && ESTIMATOR_QUESTIONS.config) || {};
}

function estimatorQuestionsFor(category) {
  const cats = (typeof ESTIMATOR_QUESTIONS !== "undefined" && ESTIMATOR_QUESTIONS.categories) || {};
  return cats[category] || [];
}

// A category has estimator coverage if the bank defines any questions for it.
function estimatorHasQuestions(category) {
  return estimatorQuestionsFor(category).length > 0;
}

function estimatorOnCooldown(qid) {
  const asked = state.estimatorAsked[qid];
  if (asked == null) return false;
  const cd = estimatorConfig().cooldownDays || 1;
  return (journalDayIndex() - asked) < cd;
}

// How far into the month we are — the fraction of a full month's spend that
// would have landed by now. Floored so an estimate on day 1 isn't ~zero.
function estimatorMonthFraction() {
  const d = new Date();
  const day = d.getDate();
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(0.05, Math.min(1, day / days));
}

function estimatorStart(category) {
  if (!isCategory(category)) return;
  const qs = estimatorQuestionsFor(category).filter(q => !estimatorOnCooldown(q.id));
  state.estimator = { category: category, questions: qs, qIndex: 0, answers: {} };
  go("spendEstimator");
}

function estimatorSetAnswer(qid, optIndex) {
  if (!state.estimator) return;
  state.estimator.answers[qid] = optIndex;
  render();
}

// An unanswered question contributes nothing to the sum, so skipping through
// would quietly under-report — answer-or-stay keeps the estimate honest and
// guarantees the result step is reached with every question answered.
function estimatorAnswered(q) {
  return !!(q && state.estimator && state.estimator.answers[q.id] != null);
}

function estimatorNext() {
  const e = state.estimator;
  if (!e || e.qIndex >= e.questions.length) return;
  if (!estimatorAnswered(e.questions[e.qIndex])) return;
  e.qIndex++;
  render();
}

function estimatorPrev() {
  const e = state.estimator;
  if (e && e.qIndex > 0) { e.qIndex--; render(); }
}

// Σ(option.monthly × month-fraction), fullMonth options counted in full.
// Rounded on the same grid as the peer column (PEER_BENCHMARKS.method.roundTo) —
// these two sit side by side in every cmpRow, so a different step would show up
// as a permanent small gap that traces back to nothing on screen.
function estimatorCompute() {
  const e = state.estimator;
  if (!e) return 0;
  const frac = estimatorMonthFraction();
  let sum = 0;
  e.questions.forEach(q => {
    const i = e.answers[q.id];
    if (i == null) return;
    const opt = q.options[i];
    if (!opt) return;
    const m = Number(opt.monthly) || 0;
    sum += q.fullMonth ? m : m * frac;
  });
  const step = (typeof PEER_BENCHMARKS !== "undefined" &&
                PEER_BENCHMARKS.method && PEER_BENCHMARKS.method.roundTo) || 5;
  return Math.round(sum / step) * step;
}

function estimatorSubmit() {
  const e = state.estimator;
  if (!e) return;
  // Nothing answered → say nothing. Writing the 0 the sum would produce reads
  // as "you spent nothing here" and would overwrite a real self-reported figure.
  if (!e.questions.some(q => e.answers[q.id] != null)) { estimatorDiscard(); return; }
  const est = estimatorCompute();
  // Writes the "What you told me" layer for this category (L17). Spend-limit
  // goals track state.mtd live, so any goal on this category moves as a result.
  if (isCategory(e.category)) state.mtd[e.category] = est;
  // Day-clock cooldown, shared idea with the journal — don't re-ask today.
  e.questions.forEach(q => { if (e.answers[q.id] != null) state.estimatorAsked[q.id] = journalDayIndex(); });
  observationsRecompute();
  state.estimator = null;
  navBack();   // back to the category detail
}

function estimatorDiscard() {
  state.estimator = null;
  navBack();
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderSpendEstimator() {
  const e = state.estimator;
  if (!e) return `<p class="helper">Nothing to estimate.</p>`;
  const cat = e.category;
  const qs = e.questions;

  // Everything for this category was already asked today (cooldown).
  if (!qs.length) {
    return `
      <div class="journal-shell">
        <div class="journal-head">
          <h1 class="title" style="font-size:20px;margin:0 0 6px;">All caught up on ${h(cat)}</h1>
          <p class="helper" style="margin:0;">You already told me about this today — I'll ask again tomorrow.</p>
        </div>
        <div class="journal-body"></div>
        <div class="journal-foot">
          <span></span>
          <button class="button" type="button" onclick="estimatorDiscard()">Back</button>
        </div>
      </div>`;
  }

  // Result step.
  if (e.qIndex >= qs.length) {
    const est = estimatorCompute();
    return `
      <div class="journal-shell">
        <div class="journal-head">
          <h1 class="title" style="font-size:20px;margin:0;">Here's my estimate</h1>
        </div>
        <div class="journal-body">
          <div class="card">
            <p class="helper" style="margin:0 0 2px;">${h(cat)} so far this month</p>
            <p class="journal-total">${budgetFmt(est)}</p>
            <p class="helper" style="margin:8px 0 0;">
              Worked out from your habits. You can always sharpen it by journaling as the month goes.
            </p>
          </div>
        </div>
        <div class="journal-foot">
          <button class="button secondary" type="button" onclick="estimatorPrev()">Back</button>
          <button class="button" type="button" onclick="estimatorSubmit()">Use this</button>
        </div>
      </div>`;
  }

  // Question step.
  const q = qs[e.qIndex];
  const total = qs.length;
  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">${h(cat)} · ${e.qIndex + 1} of ${total}</p>
        <div class="journal-progress" aria-hidden="true">
          ${qs.map((_, i) => `<span class="journal-pip ${i <= e.qIndex ? "on" : ""}"></span>`).join("")}
        </div>
      </div>
      <div class="journal-body">
        <h1 class="title" style="font-size:20px;margin:0 0 12px;">${h(q.prompt)}</h1>
        <div class="journal-options">
          ${q.options.map((opt, i) => `
            <button class="journal-opt ${e.answers[q.id] === i ? "picked" : ""}" type="button"
                    onclick="estimatorSetAnswer('${h(q.id)}',${i})">
              <span class="journal-opt-label">${h(opt.label)}</span>
            </button>`).join("")}
        </div>
      </div>
      <div class="journal-foot">
        ${e.qIndex > 0
          ? `<button class="button secondary" type="button" onclick="estimatorPrev()">Back</button>`
          : `<button class="button secondary" type="button" onclick="estimatorDiscard()">Cancel</button>`}
        <button class="button" type="button" onclick="estimatorNext()"
                ${estimatorAnswered(q) ? "" : "disabled"}>
          ${e.qIndex === total - 1 ? "See the estimate" : "Next"}
        </button>
      </div>
    </div>
  `;
}

function renderSpendEstimatorAdmin() {
  const e = state.estimator;
  return `
    <div class="admin-card">
      <p class="admin-card-title">Spend estimator</p>
      ${e
        ? `<p class="helper" style="line-height:1.7;">
             Estimating <strong>${h(e.category)}</strong> — ${e.questions.length} question(s),
             on ${Math.min(e.qIndex + 1, e.questions.length)}.<br>
             Month elapsed: ${Math.round(estimatorMonthFraction() * 100)}% ·
             running estimate ${budgetFmt(estimatorCompute())}
           </p>`
        : `<p class="helper">Not running. Reached from a category detail's "Update actuals".</p>`}
    </div>
  `;
}
