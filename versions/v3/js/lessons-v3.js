// ─── Lesson framing + variant matching (D38, 06-education) ───────────────────
// The two gaps v2's pipeline does not cover:
//   1. the pre-lesson framing decision tree
//   2. answer-driven script personalization
//
// v2's lesson player is NOT rewritten (D38). It keeps its audio, its cue map
// and its subtitle rendering; the only hook is which sentence array it plays.
//
// ── THREE STRUCTURAL TRAPS IN THE DATA (architecture §12b) ───────────────────
// 1. The key is `tag`, SINGULAR — not `tags`. A `.tags` lookup collects
//    nothing, the tag set comes back empty, and every lesson silently plays its
//    fallback. You still get a script, just always the wrong one.
// 2. `next` lives at TWO levels — on the option for some questions, on the
//    question for others — and every lesson's f3 is terminal with neither.
//    Resolution order: option → question → done.
// 3. `nocard` is declared in apr_v5's matchTags but never emitted by any
//    answer. apr_v5 stays reachable via `no_debt`, so it is harmless. Do not
//    "fix" it by inventing a question.

function lessonV3(id) {
  return (LESSONS_V3.lessons || []).find(l => l.id === id) || null;
}

function lessonQuestion(lesson, qid) {
  return (lesson.framing || []).find(q => q.id === qid) || null;
}

/** The first question — always the first declared. */
function lessonFirstQuestion(lesson) {
  return (lesson.framing || [])[0] || null;
}

/**
 * Where an answer leads. TRAP 2: option-level `next` wins, then question-level,
 * then null meaning the tree is done.
 */
function lessonNextId(question, option) {
  if (option && option.next) return option.next;
  if (question && question.next) return question.next;
  return null;
}

// ── Session ──────────────────────────────────────────────────────────────────

function lessonFramingStart(lessonId) {
  const lesson = lessonV3(lessonId);
  if (!lesson) return null;
  const first = lessonFirstQuestion(lesson);
  state.lessonFraming = {
    lessonId: lessonId,
    questionId: first ? first.id : null,
    tags: [],
    path: [],
    variantId: null
  };
  return state.lessonFraming;
}

function lessonFramingAnswer(optionIndex) {
  const f = state.lessonFraming;
  if (!f) return;
  const lesson = lessonV3(f.lessonId);
  const q = lessonQuestion(lesson, f.questionId);
  if (!q) return;
  const opt = q.options[optionIndex];
  if (!opt) return;

  // TRAP 1: `tag`, singular. Reading `.tags` here is the silent failure.
  if (opt.tag) f.tags.push(opt.tag);
  f.path.push({ questionId: q.id, label: opt.label, tag: opt.tag || null });

  const nextId = lessonNextId(q, opt);
  if (nextId && lessonQuestion(lesson, nextId)) {
    f.questionId = nextId;
    render();
    return;
  }

  // Terminal — pick the script and hand off to the player.
  f.questionId = null;
  f.variantId = lessonSelectVariant(lesson, f.tags).id;
  lessonOpenPlayer(lesson, f.variantId);
}

/**
 * Collect tags from all framing answers, score each variant by overlap, play
 * the highest. Ties break by declaration order. Zero matches plays the
 * fallback (LESSONS_V3.matching).
 *
 * Unmatched tags are the DESIGN, not a gap: `unsure_apr`, `unknown_*` and all
 * of f3's confidence tags deliberately match no variant and fall through to the
 * fallback, whose own note says it "also serves every 'I don't know' path".
 * That is 06-education's "'I don't know' is a first-class answer, not a
 * failure". Do not add variants to cover them.
 */
function lessonSelectVariant(lesson, tags) {
  const variants = lesson.scriptVariants || [];
  const fallback = variants.find(v => v.isFallback) || variants[variants.length - 1];

  let best = null, bestScore = 0;
  variants.forEach(v => {
    if (v.isFallback) return;
    const score = (v.matchTags || []).reduce((n, t) => n + (tags.indexOf(t) !== -1 ? 1 : 0), 0);
    if (score > bestScore) { best = v; bestScore = score; }   // > keeps the first on a tie
  });

  return best || fallback;
}

function lessonScriptFor(variantId) {
  return (typeof LESSON_SCRIPTS !== "undefined" && LESSON_SCRIPTS[variantId]) || null;
}

/**
 * Hand off to v2's player. The ONLY thing v3 changes is which sentence array it
 * plays — everything else about the player is untouched (D38).
 */
function lessonOpenPlayer(lesson, variantId) {
  state.lessonVariantId = variantId;
  state.lessonVariantScript = lessonScriptFor(variantId);

  // v2's player keys its content off state.currentLesson, so present the v3
  // lesson in the shape it expects rather than teaching it a new one.
  state.currentLesson = {
    id: lesson.id,
    title: lesson.title,
    description: (lesson.courses || []).join(" · "),
    badges: lesson.courses || [],
    xp: LESSONS_V3.badges.xpLessonComplete || 100,
    dailyTask: state.activeTaskId === "t_lesson_apr",
    status: "in-progress"
  };
  state.activeQuizIndex = 0;
  state.activeQuizChoice = null;
  state.activeQuizWrongChoices = [];
  go("lesson");
}

/** Skip framing entirely — plays the fallback, which is what it is for. */
function lessonSkipFraming() {
  const f = state.lessonFraming;
  if (!f) return;
  const lesson = lessonV3(f.lessonId);
  f.questionId = null;
  f.variantId = lessonSelectVariant(lesson, []).id;
  lessonOpenPlayer(lesson, f.variantId);
}

/** Entry point from a task route or the Learn tab. */
function lessonV3Start(lessonId) {
  if (!lessonV3(lessonId)) return;
  lessonFramingStart(lessonId);
  go("lessonFraming");
}
