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
// Injected by sweep.sh from the swept version's own js/render.js — every id the
// router knows about. Hardcoding this list meant it was wrong for whichever
// version it was not written for; v3 and v3.1 do not have the same screens.
// The literal below is only a fallback for running sweep.js by hand.
var SCREENS = (typeof ROUTED_SCREENS !== "undefined" && ROUTED_SCREENS.length)
  ? ROUTED_SCREENS
  : ["streak","onboarding","login","dailyUpdate","dailySummary","dailyShare","home",
     "journalEntry","journalConfirm","journalDone","aboutMe","lifestyleWizard",
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
section("1. Every screen renders, in all four themes");
var renderFails = [];
THEMES.forEach(function (t) {
  state.settings.colorMode = t.id;
  SCREENS.forEach(function (sc) {
    var html = renderSafe(sc);
    if (html && html.__error) renderFails.push(t.id + " " + sc + ": " + html.__error);
    try { renderAdmin(); adminSubtitle(); renderTopBar(); renderNav(); themeApply(); }
    catch (e) { renderFails.push(t.id + " " + sc + " chrome: " + e); }
  });
});
state.settings.colorMode = THEME_DEFAULT;
chk(renderFails.length === 0, SCREENS.length + " screens x " + THEMES.length + " themes",
    renderFails.slice(0, 6).join("\n          "));

// An unknown id must resolve to the default rather than leaving .screen
// unclassed. Both render Natural Light now that it is the default, so this
// check is load-bearing in a way it was not before: it is what distinguishes a
// resolved theme from no theme at all.
chk(themeById("nonsense").id === THEME_DEFAULT, "unknown theme id falls back to " + THEME_DEFAULT);
chk(state.settings.colorMode === "naturalLight", "Natural Light is the default theme (L21, revised)");

// render() is the real entry point and does things renderScreen() does not —
// applying the theme class and filling the admin theme picker. Exercise it.
var fullRenderFails = [];
THEMES.forEach(function (t) {
  state.settings.colorMode = t.id;
  state.screen = "home";
  try { render(); } catch (e) { fullRenderFails.push(t.id + ": " + e); }
});
state.settings.colorMode = THEME_DEFAULT;
chk(fullRenderFails.length === 0, "full render() in all four themes",
    fullRenderFails.join("\n          "));

// The picker is the whole user-facing deliverable — assert it is populated with
// one working button per theme and exactly one marked active, not just that
// render() did not throw.
render();
var picker = String(document.getElementById("themePicker").innerHTML || "");
var wired = THEMES.filter(function (t) { return picker.indexOf("themeSet('" + t.id + "')") !== -1; });
chk(wired.length === THEMES.length, "admin picker offers all " + THEMES.length + " themes",
    "wired: " + wired.map(function (t) { return t.id; }).join(", "));
chk((picker.match(/aria-pressed="true"/g) || []).length === 1,
    "exactly one theme shown as active");

// ─────────────────────────────────────────────────────────────────────────────
section("1b. Theme token contract (L21)");

// Parse variables.css into { selector: { token: value } }.
function cssBlocks(css) {
  var out = {}, re = /([.:][\w-]+)\s*\{([\s\S]*?)\n\}/g, m;
  while ((m = re.exec(css))) {
    var sel = m[1], body = m[2].replace(/\/\*[\s\S]*?\*\//g, ""), t, tre = /(--[\w-]+)\s*:\s*([^;]+);/g;
    out[sel] = out[sel] || {};
    while ((t = tre.exec(body))) out[sel][t[1]] = t[2].trim();
  }
  return out;
}
var CSS = cssBlocks(__VARS_CSS);

// Tokens that are deliberately theme-INDEPENDENT, plus the chrome a theme must
// never touch. Everything else in :root is the per-theme colour contract.
var THEME_FREE = ["--on-dark","--tier-copper","--radius-card","--radius-button","--radius-pill",
  "--shadow-soft","--ease","--dur","--font-display","--font-body","--phone","--bg",
  "--chrome-card","--chrome-text","--chrome-muted","--chrome-line","--chrome-accent","--chrome-danger",
  "--streak-bg","--streak-burst","--streak-pill","--streak-text","--streak-accent","--streak-on","--streak-off",
  "--space-xs","--space-sm","--space-md","--space-lg","--space-xl","--topbar-h","--nav-h"];

var CONTRACT = Object.keys(CSS[":root"]).filter(function (k) { return THEME_FREE.indexOf(k) === -1; });
chk(CONTRACT.length === 40, "contract is 40 colour tokens", "got " + CONTRACT.length);

// Each theme class must define exactly the contract — no more, no fewer. A
// missing token falls through to :root's cream and paints one warm patch into
// a cool theme, which reads as intentional rather than broken.
THEMES.filter(function (t) { return t.cls; }).forEach(function (t) {
  var have = Object.keys(CSS["." + t.cls] || {});
  var missing = CONTRACT.filter(function (k) { return have.indexOf(k) === -1; });
  var extra   = have.filter(function (k) { return CONTRACT.indexOf(k) === -1; });
  chk(missing.length === 0 && extra.length === 0, t.label + " defines the full contract",
      (missing.length ? "missing: " + missing.join(" ") : "") +
      (extra.length ? "  extra: " + extra.join(" ") : ""));
});

// The frame must hold still. --chrome-*/--bg/--phone style the admin panel, the
// page and the bezel, all of which live OUTSIDE .screen where these classes
// are applied — so an override here is not just unwanted, it is inert.
var chromeLeak = [];
THEMES.filter(function (t) { return t.cls; }).forEach(function (t) {
  Object.keys(CSS["." + t.cls] || {}).forEach(function (k) {
    if (k.indexOf("--chrome-") === 0 || k === "--bg" || k === "--phone") chromeLeak.push(t.cls + " " + k);
  });
});
chk(chromeLeak.length === 0, "no theme touches chrome / --bg / --phone", chromeLeak.join(", "));

// ── Contrast ────────────────────────────────────────────────────────────────
// The reason --accent-fill-text and --on-accent exist: --accent is dark in the
// light themes and light in the dark ones, so a single fixed text colour on it
// cannot clear 4.5:1 in both. Checked rather than eyeballed.
function resolve(theme, tok, depth) {
  if ((depth || 0) > 8) return null;
  var v = (CSS["." + theme] || {})[tok];
  if (v === undefined) v = CSS[":root"][tok];
  if (v === undefined) return null;
  var m = /^var\((--[\w-]+)\)$/.exec(v.trim());
  return m ? resolve(theme, m[1], (depth || 0) + 1) : v.trim();
}
function lum(hex) {
  var m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
  var c = [0, 2, 4].map(function (i) {
    var s = parseInt(m[1].substr(i, 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  var la = lum(a), lb = lum(b); if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
var PAIRS = [["--text","--card"],["--text","--screen"],["--muted","--card"],["--accent","--card"],
  ["--accent-fill-text","--accent-fill"],["--on-accent","--accent"],
  ["--good","--good-bg"],["--warn","--warn-bg"],["--info","--info-bg"],
  ["--good-pill-text","--good-pill-bg"],["--warn-pill-text","--warn-pill-bg"],
  ["--warn-pill-strong-text","--warn-pill-strong-bg"]];
var lowContrast = [];
THEMES.forEach(function (t) {
  PAIRS.forEach(function (p) {
    var fg = resolve(t.cls, p[0]), bg = resolve(t.cls, p[1]), r = ratio(fg, bg);
    if (r !== null && r < 4.5) lowContrast.push(t.id + " " + p[0] + " on " + p[1] +
      " = " + r.toFixed(2) + ":1 (" + fg + " / " + bg + ")");
  });
});
chk(lowContrast.length === 0, THEMES.length + " themes x " + PAIRS.length + " pairs clear 4.5:1",
    lowContrast.join("\n          "));

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

// KNOWN, ACCEPTED thin renders — screen id to its EXACT text.
//
// Not a way to silence D19. The text has to match character for character, so
// any other thin render still fails and this one starts failing again the
// moment it changes. It downgrades to a warning so the exception stays visible
// rather than disappearing.
//
// spendEstimator with no session: a real D19 violation, found when the sweep
// started deriving its screen list from the router instead of a hardcoded array
// that had omitted this screen entirely. FIXED IN v3.1. Left in v3 by owner
// decision — v3 is the A/B control and stays frozen — so this only fires there.
var D19_ACCEPTED = { spendEstimator: "Nothing to estimate." };

var acceptedThin = [];
Object.keys(STATES).forEach(function (name) {
  bootV3();                       // fresh seed
  STATES[name]();
  var thin = [];
  SCREENS.forEach(function (sc) {
    var html = renderSafe(sc);
    if (html && html.__error) { thin.push(sc + " THREW: " + html.__error); return; }
    var text = textOf(html).trim().replace(/\s+/g, " ");
    if (text.length >= MIN_CHARS) return;
    if (D19_ACCEPTED[sc] === text) {
      if (acceptedThin.indexOf(sc) === -1) acceptedThin.push(sc);
      return;
    }
    thin.push(sc + " (" + text.length + " chars)");
  });
  chk(thin.length === 0, "state: " + name, thin.slice(0, 5).join("\n          "));
});
if (acceptedThin.length) {
  warn(acceptedThin.length + " known thin render(s), accepted",
       acceptedThin.join(", ") + " — see D19_ACCEPTED in scripts/sweep.js");
}
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

// Reset must restore the OPENING bubbles, not leave the last reply's follow-ups
// behind. Two copies of chatResetConversation() once existed and the shadowing
// one skipped the bubbles, so a reset left chips pointing at a deleted thread.
// renderChat only falls back to openingBubbles when bubbles is EMPTY, so a
// stale non-empty array is invisible without checking it directly.
// Driven through chatRespond(), not chatSend(): chatSend reads a DOM input the
// stub returns empty, which would make this pass without ever moving bubbles.
var opening = (BUDDY_RESPONSES.openingBubbles || []).join(",");
var moved = false;
(BUDDY_RESPONSES.responses || []).forEach(function (r) {
  if (moved || !r.followUp || !r.followUp.length) return;
  chatResetConversation();
  chatRespond(r.bubble || r.id);
  if ((state.chat.bubbles || []).join(",") !== opening) moved = true;
});
var midChat = (state.chat.bubbles || []).join(",");
chatResetConversation();
chk(moved, "precondition: a reply moves the bubbles off the opening set",
    "no response in the library changed them — the check below would be vacuous");
chk(state.chat.messages.length === 0 && (state.chat.bubbles || []).join(",") === opening,
    "chat reset restores the opening bubbles",
    "mid-chat: " + midChat + "\n          after reset: " + (state.chat.bubbles || []).join(","));

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

// The admin buttons are reachable only from onclick in index.html, so nothing
// else here exercises them. copyAppState() in particular reads a dozen state
// keys and used to name two that no longer exist.
var adminActionErr = null;
try { copyAppState(); } catch (e) { adminActionErr = String(e); }
chk(adminActionErr === null, "copyAppState() runs without throwing", adminActionErr);

// Assert on what appStateSnapshot() ACTUALLY emits. The first version of this
// check built its own object from `state` and tested that — a tautology over
// bootV3() that stayed green no matter what the snapshot contained.
var snap = {};
try { snap = JSON.parse(JSON.stringify(appStateSnapshot())); } catch (e) { adminActionErr = String(e); }
var WANT = ["plan","mtd","nav","theme","journal","journalEntries","observations",
            "strategicGoal","tacticalGoals","dailyTasks"];
var missing = WANT.filter(function (k) {
  return snap[k] === undefined || snap[k] === null;
});
chk(missing.length === 0, "snapshot carries the three layers, goals, tasks and nav",
    "missing/null: " + missing.join(", "));

// The v2 names are parked and vestigial (boot.js). Reporting them as if they
// were v3's is the defect this snapshot was rewritten to fix, and it shipped
// once doing exactly that — so pin the spelling.
chk(snap.goals === undefined && snap.tasks === undefined,
    "snapshot does not report v2's parked goals/tasks as v3's",
    "found top-level: " + ["goals","tasks"].filter(function (k) { return snap[k] !== undefined; }).join(", "));
chk(!!(snap.legacy && "goals" in snap.legacy && "tasks" in snap.legacy),
    "v2's parked arrays are still captured, under legacy");

// ── Slider handlers ─────────────────────────────────────────────────────────
// These had zero coverage: the DOM stub's setTimeout used to discard its
// callback, so debouncedRender() was a no-op and no test ever called them.
// A misspelled debouncedRender would have passed the sweep and thrown in a
// browser on the first pointer move.
// Checked PER HANDLER, not in aggregate: an "any of them queued" assertion
// stays green while three handlers debounce and the fourth calls render()
// directly, which is precisely the regression worth catching.
state.screen = "aboutMe";
var SLIDERS = [
  ["budgetSetPlan",      function () { budgetSetPlan("Dining out", 250, true); }],
  ["lwAdjust",           function () {
      state.lifestyleWizard = { preview: { "Dining out": 200 } };
      lwAdjust("Dining out", 240); }],
  ["journalAdjustEntry", function () {
      state.journalSession = { entries: [{ id: "e1", label: "x", category: "Dining out",
                                           amount: 20, baseAmount: 20 }] };
      journalAdjustEntry("e1", 35); }],
  ["lessonSimSet",       function () {
      state.lessonSim = { values: {} }; lessonSimSet("balance", 4200); }]
];
var sliderErr = [], notDebounced = [];
SLIDERS.forEach(function (pair) {
  flushTimers();                               // empty the queue first
  try { pair[1](); } catch (e) { sliderErr.push(pair[0] + ": " + e); return; }
  if (flushTimers() === 0) notDebounced.push(pair[0]);
});
chk(sliderErr.length === 0, SLIDERS.length + " slider handlers run", sliderErr.join("\n          "));
chk(notDebounced.length === 0, "every slider handler debounces its render",
    "called render() directly (destroys the dragged element): " + notDebounced.join(", "));

// The non-live path must still repaint immediately — the admin number field
// shares budgetSetPlan and would otherwise wait 400ms for no reason.
flushTimers();
budgetSetPlan("Dining out", 260);
chk(flushTimers() === 0, "budgetSetPlan without `live` renders immediately");

// The ceiling must not move when the value does, or the thumb recoils on release.
var maxBefore = budgetSliderMax("Dining out");
budgetSetPlan("Dining out", 999, true);
var maxAfter = budgetSliderMax("Dining out");
budgetSetPlan("Dining out", 250);
chk(maxBefore === maxAfter, "slider ceiling is stable as the value changes",
    "max moved " + maxBefore + " -> " + maxAfter + " (thumb would snap back)");

// ─────────────────────────────────────────────────────────────────────────────
section("7. Data integrity");
chk(CATEGORIES.length === 12, "12-category taxonomy");

// The builder's three steps must PARTITION the taxonomy. A category in no step
// is never put to the tester and saves at whatever the peer model opened it on;
// a category in two steps is asked twice and the second answer silently wins.
// Neither raises anything at runtime.
if (typeof BB_STEPS !== "undefined") {
  var bbCovered = bbAllStepCategories();
  var bbMissing = CATEGORIES.filter(function (c) { return bbCovered.indexOf(c) === -1; });
  var bbTwice   = bbCovered.filter(function (c, i) { return bbCovered.indexOf(c) !== i; });
  chk(bbMissing.length === 0 && bbTwice.length === 0 && bbCovered.length === CATEGORIES.length,
      "the builder's " + BB_STEPS.length + " steps cover all 12 exactly once",
      (bbMissing.length ? "never asked: " + bbMissing.join(", ") + ". " : "") +
      (bbTwice.length ? "asked twice: " + bbTwice.join(", ") : ""));
  chk(BB_STEPS.every(function (s) { return s.input === "exact" || s.input === "range"; }),
      "every step declares exact or range input");
  chk(CATEGORIES.every(function (c) { return typeof catLabel(c) === "string" && catLabel(c).length; }),
      "every category has a display label");
  chk(Object.keys(CATEGORY_LABELS).every(isCategory),
      "every renamed label points at a real taxonomy member",
      Object.keys(CATEGORY_LABELS).filter(function (k) { return !isCategory(k); }).join(", "));
}
// benchSelfTest checks three factors separately now — base lookup, lifestyle
// product, cost of living — because the col factor moved when the tier table
// was replaced by BEA. Report which one failed, not just that something did.
var selfTest = benchSelfTest();
chk(selfTest.pass, "benchmark self-test -> " + selfTest.actual +
    " (spec's retired figure was " + selfTest.specResult + ")",
    selfTest.failed.map(function (f) {
      return f.name + ": expected " + f.expected + ", got " + f.actual;
    }).join("\n          "));
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
section("7b. Unreferenced functions — inventory, not a verdict");

// POLICY: unused code is KEPT, not deleted. This is a prototype under active
// iteration, and something dropped today is something rewritten next week. Git
// history technically preserves a deletion, but retrieving it means knowing
// which commit to dig into — friction that is not worth the tidiness.
//
// So this does not fail on dead code. What it watches for is MOVEMENT: a
// function that used to be referenced and now is not was probably orphaned by
// accident — a handler left behind when its button moved, a cue dropped from a
// dispatch table. That is a refactor bug, and it looks identical to deliberate
// dead code unless you know which ones were already here.
//
// Hence the baseline. Everything below was unreferenced as of the L21 change
// and is kept on purpose. Anything NOT on this list is new, and warns.
var DEAD_BASELINE = [
  "benchSelfTest",              // documents the benchmark formula by example
  // The ZIP-only entry point to the cost-of-living predicate. benchColIndex
  // already holds a resolved lookup and uses benchColSupported, so calling this
  // instead would repeat the lookup. Kept as the module's public
  // "is this area modeled?".
  "benchZipSupported",
  "buddyDescription",           // buddy plumbing, used once art lands (L22)
  // v3.1 inverted the budget flow, so these two lost their callers THERE.
  // Both are still live in v3, which is why they are not deleted: the two
  // versions are an A/B pair and the files stay readable side by side.
  "lwBuildPreview",             // v3: lazily rebuilt the review preview
  "lwSubmit",                   // v3: the single save path, now split in v3.1
  "budgetDelta",
  "catRows",                    // taxonomy helper, pairs with catTotal/catValue
  "completeAndReward",
  "dailySummaryDone",
  "journalDiscard",             // journal seam
  "observationPeerCounterpart",
  "planToBaseline",             // budget-baseline seam (L6)
  // Both orphaned deliberately when the Budget tab became the review surface:
  // the twelve slider rows moved to the per-category screen, and "Worth a look"
  // replaced the observation cards. Kept because a future edit mode wants them.
  "renderBudgetCategoryRow",
  "renderBudgetObservationCards",
  // Orphaned when the three stacked Budget/Peers/You bars became one band
  // track (components/budget-band.js). Kept, not deleted: it is the only
  // implementation of the old per-flag bar scaling, and v3 still renders that
  // layout — the two versions stay diffable.
  "cmpFlagBar",
  "themeIsDark"                 // L21, for a screen that wants to branch on theme
];

// Everything shares one global namespace, so a name declared in two files is
// not an error — the later <script> wins and the earlier becomes unreachable.
// This is invisible to the count above: a shadowed function is still
// referenced, it just never runs. It is how chatResetConversation() sat dead in
// chat-router.js while a second copy in screens/chat.js quietly did less.
chk(__DUPLICATE_DECLS.length === 0, "no name declared twice",
    __DUPLICATE_DECLS.map(function (d) {
      return d.name + "  →  " + d.files.join(" , ") + "   (" + d.scope +
             "; last one wins for function/var, SyntaxError for const/let)";
    }).join("\n          "));

var deadNames = __UNREFERENCED.map(function (d) { return d.name; });
var appeared = __UNREFERENCED.filter(function (d) { return DEAD_BASELINE.indexOf(d.name) === -1; });
var resolved = DEAD_BASELINE.filter(function (n) { return deadNames.indexOf(n) === -1; });

ok(deadNames.length + " unreferenced, " + DEAD_BASELINE.length + " expected (kept on purpose)");
if (appeared.length) {
  warn("newly unreferenced since the baseline — orphaned by a refactor?",
       appeared.map(function (d) { return d.name + "  " + d.file; }).join("\n          "));
} else {
  ok("nothing newly orphaned");
}
if (resolved.length) {
  ok(resolved.length + " baseline entr" + (resolved.length === 1 ? "y is" : "ies are") +
     " now referenced", "prune from DEAD_BASELINE: " + resolved.join(", "));
}

// ─────────────────────────────────────────────────────────────────────────────
section("7c. The rendered films agree with the app's clock");
// The onboarding film is rendered SILENT and narrated live, so the film's
// timeline and the app's caption clock are two independent computations of the
// same per-segment durations. When they disagree the picture and the words come
// apart and NOTHING else reports it — no error, no failed load, just a film that
// feels wrong. This is the only guard.
if (!__FILM_MANIFEST) {
  ok("no rendered films in this version — nothing to compare");
} else {
  var mf = __FILM_MANIFEST;
  chk(mf.wpm === (typeof DU_WPM !== "undefined" ? DU_WPM : 165),
      "the film build and the app narrate at the same wpm",
      "manifest " + mf.wpm + " vs app " + (typeof DU_WPM !== "undefined" ? DU_WPM : "?"));

  var drift = [], missingScript = [];
  Object.keys(mf.films).forEach(function (id) {
    var film = mf.films[id];
    var script = null;
    try {
      script = ONBOARDING_SCRIPT.scripts.filter(function (x) { return x.id === film.script; })[0];
    } catch (e) {}
    if (!script) { missingScript.push(film.script); return; }
    script.segments.forEach(function (seg, i) {
      var appMs = onbVideoSegMs(seg.text);
      if (appMs !== film.segmentMs[i]) {
        drift.push(id + "/" + seg.id + ": film " + film.segmentMs[i] + "ms vs app " + appMs + "ms");
      }
    });
  });
  chk(missingScript.length === 0, "every rendered film still has its script",
      "gone from onboarding-script.json: " + missingScript.join(", "));
  chk(drift.length === 0, "every film's beats match onbVideoSegMs",
      drift.slice(0, 4).join("\n          ") +
      (drift.length ? "\n          → re-run tools/film/build-films.mjs --render" : ""));

  // Every look x script the app can ASK for must have been rendered, or that
  // combination silently drops to the SVG fallback and reads as "broken video".
  // The FULL set the app can ask for, from the script data — not from what has
  // already been rendered. Deriving it from the manifest made the coverage check
  // vacuous: it could only ever compare the renders against themselves.
  var scripts = [];
  try {
    scripts = ONBOARDING_SCRIPT.scripts.map(function (x) { return x.id; });
  } catch (e) {}
  // A look with NO films is simply not rendered yet, and its themes fall back to
  // the live SVG engine — that is a normal state while a look is being iterated
  // on. A look with SOME films is the actual defect: the app lists those themes
  // and then finds nothing for the scripts that are missing.
  var started = (mf.looks || []).filter(function (l) {
    return Object.keys(mf.films).some(function (id) { return mf.films[id].look === l; });
  });
  // Coverage is a WARNING, not a failure. A film that has not been rendered
  // cannot break anything: data/onboarding-films.js is generated from what
  // actually exists, so the app only ever asks for a file that is there and
  // everything else falls back to the live SVG engine by design. What this is
  // for is telling you what is still outstanding.
  var want = (mf.looks || []).length * scripts.length;
  var absent = [];
  (mf.looks || []).forEach(function (l) {
    scripts.forEach(function (s) { if (!mf.films[l + "__" + s]) absent.push(l + "__" + s); });
  });
  if (absent.length) {
    warn((want - absent.length) + " of " + want + " films rendered — the rest use the SVG fallback",
         absent.slice(0, 6).join(", ") +
         (absent.length > 6 ? " …+" + (absent.length - 6) : "") +
         "\n          cd tools && node film/build-films.mjs --render");
  } else {
    ok("all " + want + " films rendered");
  }

  // THIS one is a real failure: a theme listed in the app's index whose film is
  // not in the manifest would have the app ask for a file that is not there.
  var listed = [];
  try {
    Object.keys(ONBOARDING_FILMS).forEach(function (th) {
      var e = ONBOARDING_FILMS[th];
      (e.scripts || []).forEach(function (sc) {
        if (!mf.films[e.look + "__" + sc]) listed.push(th + "/" + sc);
      });
    });
  } catch (e) {}
  chk(listed.length === 0, "the app's film index matches what was rendered",
      "listed but absent: " + listed.slice(0, 6).join(", "));
}

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
print("    · The four themes side by side (L21). The contract and contrast are");
print("      checked above, but not whether Light/Dark actually LOOK like v2,");
print("      nor whether the frame and admin panel hold still while switching");

// ─────────────────────────────────────────────────────────────────────────────
print("");
print("═══════════════════════════════════════════════════════════════");
print("  " + CHECKS + " checks · " + FAIL + " failed · " + WARN + " warnings");
print("═══════════════════════════════════════════════════════════════");
if (FAIL) throw new Error(FAIL + " sweep checks failed");
