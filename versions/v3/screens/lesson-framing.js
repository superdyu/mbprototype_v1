// ─── Lesson framing questions (06-education, D38) ────────────────────────────
// TAB: Education (sub-screen) | NAV BAR: Hidden — full-bleed
//
// "Three to five, decision-tree branching. 'Do you know your card's APR?' Yes
// branches one way, no another. 'I don't know' is a first-class answer, not a
// failure."
//
// So there is no wrong answer here and nothing is scored. The tree decides
// which pre-written script plays; an "I don't know" path lands on the fallback,
// which exists for exactly that.

function renderLessonFraming() {
  const f = state.lessonFraming;
  const lesson = f ? lessonV3(f.lessonId) : null;
  const q = lesson ? lessonQuestion(lesson, f.questionId) : null;
  // D19 — entered directly with no lesson chosen.
  if (!f || !lesson || !q) return lessonOutcomeNoSession("lesson",
    "These questions decide which version of a lesson you get.");

  const asked = f.path.length + 1;
  const total = Math.max(3, Math.min(LESSONS_V3.config.maxFramingQuestions || 5,
                                     (lesson.framing || []).length));

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">${h(lesson.title)}</p>
        <div class="journal-progress" aria-hidden="true">
          ${Array.from({ length: total }).map((_, i) =>
            `<span class="journal-pip ${i < asked ? "on" : ""}"></span>`).join("")}
        </div>
        <h1 class="title" style="font-size:21px;margin:12px 0 0;">${h(q.prompt)}</h1>
        <p class="helper" style="margin:6px 0 0;">
          No wrong answers — this just decides which version you get.
        </p>
      </div>

      <div class="journal-body">
        <div class="journal-options">
          ${q.options.map((o, i) => `
            <button class="journal-opt" type="button" onclick="lessonFramingAnswer(${i})">
              <span class="journal-opt-label">${h(o.label)}</span>
            </button>`).join("")}
        </div>
      </div>

      <div class="journal-foot">
        <button class="button secondary" type="button" onclick="navBack()">Back</button>
        <button class="button secondary" type="button" onclick="lessonSkipFraming()">Skip</button>
      </div>
    </div>
  `;
}

function renderLessonFramingAdmin() {
  const f = state.lessonFraming;
  if (!f) return `<div class="admin-card"><p class="admin-card-title">Framing</p>
    <p class="helper">Not running.</p></div>`;
  const lesson = lessonV3(f.lessonId);
  const would = lessonSelectVariant(lesson, f.tags);

  return `
    <div class="admin-card">
      <p class="admin-card-title">Framing → variant</p>
      <div class="input-group">
        <label>Answers so far</label>
        <div class="helper" style="line-height:1.7;">
          ${f.path.length ? f.path.map(p =>
            `${h(p.questionId)}: ${h(p.label)}${p.tag ? " → <strong>" + h(p.tag) + "</strong>" : " <em>(no tag — routing only)</em>"}`
          ).join("<br>") : "none yet"}
        </div>
      </div>
      <div class="input-group">
        <label>Tags collected</label>
        <div class="helper">${f.tags.join(", ") || "none"}</div>
      </div>
      <div class="input-group">
        <label>Variant that would play</label>
        <div class="helper">
          <strong>${h(would.id)}</strong> · ${h(would.emphasis)}
          ${would.isFallback ? " <em>(fallback)</em>" : ""}<br>
          script: ${lessonScriptFor(would.id) ? lessonScriptFor(would.id).length + " lines" : "MISSING"}
        </div>
      </div>
      <p class="helper" style="font-size:10px;">
        Highest tag overlap wins; ties break by declaration order; zero matches
        plays the fallback, which also serves every "I don't know" path.
      </p>
      ${(lesson.scriptVariants || []).map(v => `
        <div class="helper" style="font-size:10px;line-height:1.6;">
          ${f.tags.length ? (v.matchTags || []).filter(t => f.tags.indexOf(t) !== -1).length : 0}
          · ${h(v.id)} [${(v.matchTags || []).join(", ") || "—"}]
        </div>`).join("")}
    </div>
  `;
}
