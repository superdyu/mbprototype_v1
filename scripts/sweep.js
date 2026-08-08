// ─── Phase 6 correctness sweep ────────────────────────────────────────────────
// Run:  bash scripts/sweep.sh
//
// PROGRESS.md's Phase 6 says "verified by actually clicking through, not by
// inspection". There is no browser here, so this automates everything that CAN
// be checked mechanically and prints an explicit list of what cannot — rather
// than letting the un-checkable items quietly pass.
//
// This is a committed script, not a throwaway harness, because Phase 6 is the
// check you want to re-run whenever scope shifts.

var FAIL = 0, WARN = 0, CHECKS = 0;
function ok(label, extra)  { CHECKS++; print("  ok    " + label + (extra ? "  " + extra : "")); }
function bad(label, detail){ CHECKS++; FAIL++; print("  FAIL  " + label + (detail ? "\n          " + detail : "")); }
function warn(label, detail){ CHECKS++; WARN++; print("  warn  " + label + (detail ? "\n          " + detail : "")); }
function chk(cond, label, detail) { cond ? ok(label) : bad(label, detail); }
function section(t) { print(""); print("── " + t + " " + Array(Math.max(2, 66 - t.length)).join("─")); }

// Every routable screen. Kept here rather than derived, so a screen that loses
// its route is a visible diff rather than silently dropping out of the sweep.
var SCREENS = ["streak","onboarding","login","dailyUpdate","dailySummary","dailyShare","home",
 "journalEntry","journalConfirm","journalDone","aboutMe","lifestyleWizard","lifestyleWizardReview",
 "budgetDone","budgetUpdateConfirm","comparison","myProgress","accountBalances","debtBalances",
 "postResult","nextAction","commitment","finish","goals","learn","topic","reward-preview",
 "lessonFraming","lesson","lessonQuiz","lessonSimulation","lessonReward","quiz","simulation",
 "marketplace","marketplaceDetail","reward","settings","chat","myDebts","debtAnalyzer"];

function textOf(html) {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    // h() escapes before this sees it, so entities must be decoded or a
    // headline containing an apostrophe will never match its own text.
    .replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
function renderSafe(sc) {
  state.screen = sc;
  try { return renderScreen(); } catch (e) { return { __error: String(e) }; }
}

// ─────────────────────────────────────────────────────────────────────────────
section("1. Every screen renders, in both colour modes");
var renderFails = [];
["light", "dark"].forEach(function (mode) {
  state.settings.colorMode = mode;
  SCREENS.forEach(function (sc) {
    var html = renderSafe(sc);
    if (html && html.__error) renderFails.push(mode + " " + sc + ": " + html.__error);
    try { renderAdmin(); adminSubtitle(); renderTopBar(); renderNav(); }
    catch (e) { renderFails.push(mode + " " + sc + " chrome: " + e); }
  });
});
state.settings.colorMode = "light";
chk(renderFails.length === 0, SCREENS.length + " screens x 2 modes", renderFails.slice(0, 6).join("\n          "));

// ─────────────────────────────────────────────────────────────────────────────
section("2. D19 — no screen renders empty, in any state");
// The states a tester can actually reach, not just the seeded one.
var STATES = {
  "seeded":            function () {},
  "no budget":         function () { state.planStatus = "empty"; },
  "no journal yet":    function () { state.journalEntries = []; state.journal = []; },
  "no goals":          function () { state.tacticalGoals = []; state.strategicGoal = null; },
  "no bills or subs":  function () { state.bills = []; state.subs = []; },
  "zero kibble/streak":function () { state.kibble = 0; state.streak = 0; state.buddyLevel = 0; },
  "all tasks done":    function () { (state.dailyTasks || []).forEach(function (t) { t.completed = true; }); },
  "no observations":   function () { state.observations = []; }
};
var MIN_CHARS = 40;
Object.keys(STATES).forEach(function (name) {
  bootV3();                       // fresh seed
  STATES[name]();
  var thin = [];
  SCREENS.forEach(function (sc) {
    var html = renderSafe(sc);
    if (html && html.__error) { thin.push(sc + " THREW: " + html.__error); return; }
    if (textOf(html).length < MIN_CHARS) thin.push(sc + " (" + textOf(html).length + " chars)");
  });
  chk(thin.length === 0, "state: " + name, thin.slice(0, 5).join("\n          "));
});
bootV3();

// ─────────────────────────────────────────────────────────────────────────────
section("3. D18 — every observation reachable from >= 2 surfaces, and rendered");
var SURFACES = ["home_tip","home_task","budget_comparison","progress","progress_bills","goals","daily_update"];
var reach = {};
SURFACES.forEach(function (su) {
  observationsFor(su).forEach(function (o) { reach[o.id] = (reach[o.id] || 0) + 1; });
});
var ids = (state.observations || []).map(function (o) { return o.id; });
chk(ids.length === 4, "four seeded observations", ids.join(", "));
ids.forEach(function (id) {
  chk((reach[id] || 0) >= 2, "  " + id + " on " + (reach[id] || 0) + " surfaces");
});
// Registry membership is not the same as appearing on screen — check the text.
var appears = {};
["home", "aboutMe", "comparison", "myProgress", "dailySummary", "goals"].forEach(function (sc) {
  var t = textOf(renderSafe(sc));
  ids.forEach(function (id) {
    var o = observationById(id);
    var head = observationHeadline(o);
    if (head && t.indexOf(head.slice(0, 24)) !== -1) appears[id] = (appears[id] || 0) + 1;
  });
});
ids.forEach(function (id) {
  var n = appears[id] || 0;
  n >= 1 ? ok("  " + id + " actually renders on " + n + " screen(s)")
         : warn("  " + id + " is registered but its headline renders nowhere",
                "registry says " + (reach[id] || 0) + " surfaces");
});

// ─────────────────────────────────────────────────────────────────────────────
section("4. D26 / L20 — no financial advice anywhere");
var ADVICE = [/\byou should\b/i, /\bwe recommend\b/i, /\byou ought to\b/i, /\bcancel your\b/i,
              /\bswitch to\b/i, /\byou must\b/i, /\bbest option\b/i, /\bwe suggest\b/i,
              /\bI recommend\b/i, /\byou need to\b/i];
var adviceHits = [];
SCREENS.forEach(function (sc) {
  var t = textOf(renderSafe(sc));
  ADVICE.forEach(function (re) { var m = t.match(re); if (m) adviceHits.push(sc + ': "' + m[0] + '"'); });
});
chk(adviceHits.length === 0, "no advice-shaped copy on any screen", adviceHits.slice(0, 6).join("\n          "));

var libHits = [];
(BUDDY_RESPONSES.responses || []).forEach(function (r) {
  ADVICE.forEach(function (re) { if (re.test(r.text)) libHits.push(r.id); });
});
chk(libHits.length === 0, "no advice in the buddy response library", libHits.join(", "));

var scriptHits = [];
Object.keys(LESSON_SCRIPTS).forEach(function (k) {
  LESSON_SCRIPTS[k].forEach(function (line) {
    ADVICE.forEach(function (re) { if (re.test(line)) scriptHits.push(k); });
  });
});
chk(scriptHits.length === 0, "no advice in the 15 lesson scripts", scriptHits.join(", "));

var duHits = [];
(DAILY_SCRIPTS.scripts || []).forEach(function (s) {
  s.segments.forEach(function (seg) {
    ADVICE.forEach(function (re) { if (re.test(seg.text)) duHits.push(s.id + "/" + seg.id); });
  });
});
chk(duHits.length === 0, "no advice in the daily-update scripts", duHits.join(", "));

// The guardrail itself, both directions.
var ADVICE_Q = ["should i invest","what should i do","is it a good idea to cancel hulu",
  "would you cancel it","which is better","help me decide","can i afford this",
  "is it smart to pay it off","shall i cancel","what would you do","recommend something",
  "tell me what to do","is it worth it","how much should i save"];
var leaked = ADVICE_Q.filter(function (q) { return chatRoute(q).id !== "advice_deflect"; });
chk(leaked.length === 0, ADVICE_Q.length + " advice phrasings all deflect", leaked.join(" | "));

var LEGIT_Q = (BUDDY_RESPONSES.responses || []).filter(function (r) { return r.bubble; })
  .map(function (r) { return r.bubble.toLowerCase(); });
var overzealous = LEGIT_Q.filter(function (q) { return chatRoute(q).id === "advice_deflect"; });
chk(overzealous.length === 0, LEGIT_Q.length + " real questions NOT wrongly deflected", overzealous.join(" | "));

// ─────────────────────────────────────────────────────────────────────────────
section("5. A13 — tone");
var exclam = [];
SCREENS.forEach(function (sc) {
  var t = textOf(renderSafe(sc));
  // An exclamation mark in the same sentence as a figure.
  var m = t.match(/[^.!?]*[$%]\s?\d[^.!?]*!/);
  if (m) exclam.push(sc + ': "' + m[0].slice(0, 44).trim() + '"');
});
chk(exclam.length === 0, "no exclamation marks on a financial figure", exclam.slice(0, 4).join("\n          "));

var VOCAB_BAD = [[/\bexpense tracker\b/i, 'use "Money Journal"'],
                 [/\baverage users\b/i,   'use "peers"'],
                 [/\bother users\b/i,     'peer data is not real people (D23)']];
var vocabHits = [];
SCREENS.forEach(function (sc) {
  var t = textOf(renderSafe(sc));
  VOCAB_BAD.forEach(function (p) { if (p[0].test(t)) vocabHits.push(sc + " — " + p[1]); });
});
chk(vocabHits.length === 0, "vocabulary consistent", vocabHits.join("\n          "));

var tip = String(state.tipBanner || "");
chk(tip.length <= 90, "tip banner within 90 chars", tip.length + " chars");

// ─────────────────────────────────────────────────────────────────────────────
section("6. Admin wiring — 5 points per screen");
var noSubtitle = [], noJump = [];
SCREENS.forEach(function (sc) {
  state.screen = sc;
  var sub = adminSubtitle();
  if (!sub || sub === "Manual controls for this wireframe screen.") noSubtitle.push(sc);
});
var jumpList = (typeof destinations !== "undefined" ? destinations : []).map(function (d) { return d[0]; });
SCREENS.forEach(function (sc) { if (jumpList.indexOf(sc) === -1) noJump.push(sc); });

noSubtitle.length === 0
  ? ok("every screen has an admin subtitle")
  : warn(noSubtitle.length + " screens fall back to the generic subtitle", noSubtitle.join(", "));
noJump.length === 0
  ? ok("every screen is in the admin jump list")
  : warn(noJump.length + " screens are not in destinations[]", noJump.join(", "));

var noTab = SCREENS.filter(function (sc) {
  var t = activeTabFor(sc);
  return !state.nav.stacks[t];
});
chk(noTab.length === 0, "every screen maps to a real nav stack", noTab.join(", "));

// ─────────────────────────────────────────────────────────────────────────────
section("7. Data integrity");
chk(CATEGORIES.length === 12, "12-category taxonomy");
var selfTest = benchSelfTest();
chk(selfTest.pass, "benchmark self-test -> " + selfTest.actual, "expected " + selfTest.expected);
chk(catTotal(SEED_STATE.monthToDateActuals) > 0, "month-to-date sums without _note contamination");
var noteLeak = CATEGORIES.indexOf("_note") === -1;
chk(noteLeak, "_note is not a category");
var d = cmpRow("Dining out");
chk(d.vsPlan !== d.vsPeer, "the two dining gaps stay distinct",
    "plan " + d.vsPlan + "% vs peers " + d.vsPeer + "%");
var missingScripts = [];
(LESSONS_V3.lessons || []).forEach(function (l) {
  (l.scriptVariants || []).forEach(function (v) { if (!lessonScriptFor(v.id)) missingScripts.push(v.id); });
});
chk(missingScripts.length === 0, "all 15 lesson variants have a script body", missingScripts.join(", "));

// ─────────────────────────────────────────────────────────────────────────────
section("8. Cannot be checked here — needs the owner");
print("  These are real Phase 6 items that no headless check can settle:");
print("");
print("    · Mobile viewport at 390px — layout, wrapping, no horizontal scroll");
print("    · Keyboard focus visibly moving through every interactive element");
print("    · Tap targets genuinely >= 44px as rendered (CSS declares it; only a");
print("      browser measures it)");
print("    · prefers-reduced-motion actually stilling the buddy idle and the");
print("      daily-update sequence");
print("    · Narration audio lining up with the visuals it is cued to");
print("    · Whether the repaint reads as 'not a bank'");

// ─────────────────────────────────────────────────────────────────────────────
print("");
print("═══════════════════════════════════════════════════════════════");
print("  " + CHECKS + " checks · " + FAIL + " failed · " + WARN + " warnings");
print("═══════════════════════════════════════════════════════════════");
if (FAIL) throw new Error(FAIL + " sweep checks failed");
