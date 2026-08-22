// ─── Onboarding (01-onboarding, D06) ─────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full-bleed flow
//
// Eight steps. A single config constant bypasses the whole thing (D07) — see
// js/config.js. Flipping it must not require unwinding anything here.
//
//   1 name   2 ZIP   3 household   4 income band
//   5 lifestyle (a 2-question SUBSET of the budget builder — housing, commute;
//     food/hobby/travel questions belong to the wizard, not install)
//   6 improvement areas (multi-select)   7 buddy creation
//   8 intro video (how it works)   9 trial popup
//
// PERSONA OVERRIDE (D09): steps 2, 3 and 4 override the hardcoded persona.
// Everything else falls back to persona.json. If a tester skips a field, the
// persona value stands — NEVER block progress to collect data.

const ONB_STEPS = ["name", "zip", "household", "income", "lifestyle", "goal", "buddy", "video", "trial"];

// Onboarding asks only the install-relevant lifestyle dimensions. The full six
// live in the standalone lifestyle wizard (LW_QUESTIONS); the dims not asked
// here keep their persona defaults (D09). Same dims and keys either way, so an
// answer means the same thing in both places.
const ONB_LIFESTYLE_DIMS = ["paysRent", "commute"];

// Intro "video" narration — one caption per segment, spoken by live Web Speech
// and advanced on each utterance's `onend` so text and voice stay in sync (the
// spec's D04 intent; no recorded asset). Generalised, no figures. Buddy's voice.
// Narration text is data (data/onboarding-script.json) so the build-time TTS
// pipeline can read it — see scripts/gen-audio.sh. Falls back to the literals
// only if that file failed to load.
const ONB_VIDEO_SCRIPT_ID = "onboarding_intro";
const ONB_VIDEO_SEGMENT_IDS = (function () {
  try {
    const s = ONBOARDING_SCRIPT.scripts.find(x => x.id === ONB_VIDEO_SCRIPT_ID);
    return s.segments.map(seg => seg.id);
  } catch (e) { return ["s1","s2","s3","s4","s5","s6"]; }
})();
const ONB_VIDEO_SEGMENTS = (function () {
  try {
    const s = ONBOARDING_SCRIPT.scripts.find(x => x.id === ONB_VIDEO_SCRIPT_ID);
    return s.segments.map(seg => seg.text);
  } catch (e) {
    return [
      "Here's the short version of how this works — no pressure, no jargon.",
      "Each day I'll ask you a few quick questions about your money. That's your Money Journal.",
      "Every answer fills in a little more of your picture — what you spend on, what matters to you, where things feel tight.",
      "The more you tell me, the more your lessons and check-ins shape around your life, not some generic average.",
      "So the read you get, and the peers I hold you up against, actually fit you.",
      "That's it. Answer a little each day and I'll handle the rest. Let's get you set up."
    ];
  }
})();

// Detached audio for the segment in flight. Module-level rather than on `state`
// so the admin state inspector never tries to serialise a media element.
let onbAudioEl = null;
function onbLifestyleQuestions() {
  return LW_QUESTIONS.filter(q => ONB_LIFESTYLE_DIMS.indexOf(q.dim) !== -1);
}

// Five bands, presented as ranges, never a precise figure (01-onboarding).
// The stored value is a representative annual figure so benchIncomeBand() maps
// it back to the same band without a second code path.
const ONB_INCOME_BANDS = [
  { id: "b1", label: "Under $35,000",      annual: 25000 },
  { id: "b2", label: "$35,000 – $60,000",  annual: 47500 },
  { id: "b3", label: "$60,000 – $90,000",  annual: 75000 },
  { id: "b4", label: "$90,000 – $140,000", annual: 115000 },
  { id: "b5", label: "Over $140,000",      annual: 175000 }
];

// "If you could improve one thing about your money…" — multi-select, max 3,
// presets only. Folds into the single state.strategicGoal the app expects.
const ONB_GOALS = [
  "Stop living paycheck to paycheck",
  "Build up some savings",
  "Get on top of what I owe",
  "Just understand where it goes"
];
const ONB_GOALS_MAX = 3;

// Character creator sub-steps (Mii/Nintendogs style — one element per screen,
// each with a control suited to it). Buddy option lists + colour maps live in
// components/buddy.js and are read at render time (that file loads AFTER this
// one, so they must never be touched at top level here).
const ONB_BUDDY_STEPS = ["breed", "furColor", "furPattern", "eyeColor", "name"];

function onbStart() {
  state.onboarding = {
    step: 0,
    lwIndex: 0,
    buddyIndex: 0,         // sub-step within the character creator
    video: null,           // built by onbVideoInit() on first use
    skipPrompt: false,     // name-step "skip this / skip all" confirmation
    name: "",
    zip: "",
    householdSize: null,
    incomeBand: null,
    lifestyle: Object.assign({}, PERSONA.lifestyle),   // persona is the fallback
    // Which lifestyle dims the tester actually picked here. The persona fills
    // state.lifestyle regardless, so this is the only way the budget wizard can
    // tell "you already told me this" from "a stranger's default".
    lifestyleAnswered: {},
    improveAreas: [],      // multi-select, max 3 (folds into strategicGoal)
    buddy: Object.assign({}, PERSONA.buddy)
  };
  // Cosmetic name has no persona fallback (D09 override): an untouched or
  // skipped buddy shows as "Buddy", never "Biscuit". Appearance fields still
  // carry over from the persona; the new pattern attribute gets a default so the
  // stage is never blank.
  state.onboarding.buddy.name = "";
  state.onboarding.buddy.furPattern = state.onboarding.buddy.furPattern || "solid";
  return state.onboarding;
}

function onbNext() {
  const o = state.onboarding;
  if (ONB_STEPS[o.step] === "video") onbVideoStop();   // silence narration on exit
  // Step 5 is the lifestyle subset — advance within it before moving on.
  if (ONB_STEPS[o.step] === "lifestyle" && o.lwIndex < onbLifestyleQuestions().length - 1) {
    o.lwIndex++; render(); return;
  }
  // The buddy step is a multi-element creator — walk its sub-steps too.
  if (ONB_STEPS[o.step] === "buddy" && o.buddyIndex < ONB_BUDDY_STEPS.length - 1) {
    o.buddyIndex++; render(); return;
  }
  if (o.step < ONB_STEPS.length - 1) { o.step++; render(); return; }
  onbFinish();
}

function onbBack() {
  const o = state.onboarding;
  if (ONB_STEPS[o.step] === "video") onbVideoStop();
  if (ONB_STEPS[o.step] === "lifestyle" && o.lwIndex > 0) { o.lwIndex--; render(); return; }
  if (ONB_STEPS[o.step] === "buddy" && o.buddyIndex > 0) { o.buddyIndex--; render(); return; }
  if (o.step > 0) { o.step--; render(); return; }
}

// Top-right Skip. Writes no value, so the persona fallback stands for the
// financial fields. The name step is special — it opens a confirmation instead
// (skip only this screen, or skip the whole setup).
function onbSkip() {
  const o = state.onboarding;
  const key = ONB_STEPS[o.step];
  if (key === "video") onbVideoStop();
  if (key === "name") { o.skipPrompt = true; render(); return; }
  o.lwIndex = 0;   // skip the entire lifestyle block in one go
  if (o.step < ONB_STEPS.length - 1) { o.step++; render(); return; }
  onbFinish();
}

// "Just this screen" from the name-skip prompt — leave o.name blank (→ "Buddy")
// and move on to ZIP.
function onbSkipName() {
  const o = state.onboarding;
  o.skipPrompt = false;
  if (o.step < ONB_STEPS.length - 1) { o.step++; }
  render();
}

// "Skip all setup" — finish right here; blank name resolves to "Buddy".
function onbSkipAll() {
  state.onboarding.skipPrompt = false;
  onbFinish();
}

function onbSkipCancel() {
  state.onboarding.skipPrompt = false;
  render();
}

// Goal step: toggle one improvement area, capped at ONB_GOALS_MAX. Deselecting
// is always allowed; a new pick past the cap is ignored.
function onbToggleGoal(label) {
  const o = state.onboarding;
  const i = o.improveAreas.indexOf(label);
  if (i !== -1) { o.improveAreas.splice(i, 1); }
  else if (o.improveAreas.length < ONB_GOALS_MAX) { o.improveAreas.push(label); }
  render();
}

/**
 * Every free-text field in onboarding writes through here.
 *
 * It never calls render(): a full repaint mid-keystroke replaces the input the
 * caret is in, and the tester loses their place at the third character. Instead
 * it patches the only two things that depend on the value — the Continue
 * button's disabled state and, for ZIP, the cost-of-living chart. `commit` is
 * passed by onchange where a real repaint IS wanted once the field is done.
 */
function onbLiveInput(field, value, commit) {
  const o = state.onboarding;
  if (!o) return;

  if (field === "buddyName") {
    o.buddy.name = value;
    state.buddy.name = value;       // so the stage above updates on commit
  } else {
    o[field] = value;
  }

  if (commit) { render(); return; }

  uiSetEnabled("onbContinue", onbAnswered(ONB_STEPS[o.step], o));
  if (field === "zip") uiPatchHTML("onbColChart", onbColChart(value));
}

// Step 5 picks. Records the dim as USER-answered as well as writing the value,
// so the budget wizard can pre-select exactly the questions already answered
// here and leave the other four blank.
function onbSetLifestyle(dim, value) {
  const o = state.onboarding;
  o.lifestyle[dim] = value;
  if (!o.lifestyleAnswered) o.lifestyleAnswered = {};
  o.lifestyleAnswered[dim] = true;
  render();
}

// "A" · "A and B" · "A, B and C" — a readable phrase for strategicGoal.label.
function onbJoinAreas(areas) {
  if (areas.length <= 1) return areas[0] || "";
  if (areas.length === 2) return areas[0] + " and " + areas[1];
  return areas.slice(0, -1).join(", ") + " and " + areas[areas.length - 1];
}

/**
 * Apply everything and land on home with a 1-day streak.
 * Only ZIP, household size and income touch the persona (D09).
 */
function onbFinish() {
  const o = state.onboarding;

  // Cosmetic name has no persona fallback — a skipped name is "Buddy", not "Sam".
  state.profile.name = o.name || "Buddy";
  if (o.zip) state.profile.zip = o.zip;
  if (o.householdSize) state.profile.householdSize = o.householdSize;
  if (o.incomeBand) {
    const band = ONB_INCOME_BANDS.find(b => b.id === o.incomeBand);
    if (band) state.profile.incomeAnnual = band.annual;
  }

  state.lifestyle = Object.assign({}, o.lifestyle);
  state.lifestyleAnswered = Object.assign({}, o.lifestyleAnswered || {});
  state.buddy = Object.assign({}, o.buddy);

  // The multi-select folds into the single strategic goal the app renders as
  // "What you're here for" (goals-v3.js). Keep the raw picks on `areas`.
  const areas = (o.improveAreas || []);
  state.strategicGoal = {
    id: "g_strategic_1",
    label: areas.length ? onbJoinAreas(areas) : "Get on top of my money",
    areas: areas.slice(),
    setDuringOnboarding: true
  };

  // The budget is NOT built here — the setup wizard is the first thing the
  // Budget tab shows (spec 04: "the wizard, before the budget exists"). We only
  // carry the lifestyle answers forward (written above), which pre-fill the
  // wizard when the tester opens Budget or taps the "Set up your budget" task.
  // Leaving planStatus empty is what makes renderBudgetEmpty (the wizard door)
  // appear on first visit.
  state.planStatus = "empty";

  state.streak = PERSONA.state.streakDaysIfOnboarded;   // 1 day (D06)
  state.onboarding = null;
  observationsRecompute();

  state.nav.stacks.home = ["home"];
  state.nav.activeStack = "home";
  navCommit("home");
}

// ─── Render ──────────────────────────────────────────────────────────────────

function renderOnboarding() {
  const o = state.onboarding || onbStart();
  const key = ONB_STEPS[o.step];
  const total = ONB_STEPS.length;
  // Trial has its own two buttons — no generic Skip / Continue there.
  const showControls = key !== "trial";

  return `
    <div class="journal-shell">
      <div class="journal-head onb-head">
        <div class="onb-head-progress">
          <p class="helper" style="margin:0 0 4px;">Step ${o.step + 1} of ${total}</p>
          <div class="journal-progress" aria-hidden="true">
            ${ONB_STEPS.map((_, i) => `<span class="journal-pip ${i <= o.step ? "on" : ""}"></span>`).join("")}
          </div>
        </div>
        ${showControls
          ? `<button class="onb-skip" type="button" onclick="onbSkip()">Skip</button>`
          : ""}
      </div>
      <div class="journal-body">${onbStepBody(key, o)}</div>
      <div class="journal-foot">
        ${o.step > 0 || o.lwIndex > 0 || o.buddyIndex > 0
          ? `<button class="button secondary" type="button" onclick="onbBack()">Back</button>`
          : `<span></span>`}
        ${showControls
          ? `<button class="button" type="button" id="onbContinue" onclick="onbNext()"
                     ${onbAnswered(key, o) ? "" : "disabled"}>Continue</button>`
          : ""}
      </div>
    </div>
    ${o.skipPrompt ? onbSkipPrompt() : ""}
  `;
}

// Name-step skip confirmation. Reuses the shared .ls-modal-bg scrim.
function onbSkipPrompt() {
  return `
    <div class="ls-modal-bg" onclick="onbSkipCancel()">
      <div class="card" style="max-width:300px;" onclick="event.stopPropagation()">
        <h1 class="title" style="font-size:19px;margin:0 0 6px;">No name, no problem</h1>
        <p class="task-desc" style="margin:0 0 14px;">
          I can just call you Buddy. Want to skip only this, or the whole setup?
        </p>
        <button class="button full" style="margin-bottom:8px;" type="button"
                onclick="onbSkipName()">Just this screen</button>
        <button class="button secondary full" style="margin-bottom:8px;" type="button"
                onclick="onbSkipAll()">Skip all setup</button>
        <button class="onb-skip full" type="button" onclick="onbSkipCancel()">Keep going</button>
      </div>
    </div>
  `;
}

// Nothing blocks progress — an unanswered step is skippable and the persona
// value stands (D09).
function onbAnswered(key, o) {
  if (key === "name")      return !!o.name;
  if (key === "zip")       return !!o.zip;
  if (key === "household") return !!o.householdSize;
  if (key === "income")    return !!o.incomeBand;
  if (key === "goal")      return o.improveAreas.length > 0;
  // Same contract as the lesson player: Next unlocks when the piece ends.
  // Skip (top right) still exits at any point, so nothing is blocked (D09).
  if (key === "video")     return !!(o.video && o.video.finished);
  // Attribute sub-steps always have a default; only naming the buddy is required.
  if (key === "buddy")     return ONB_BUDDY_STEPS[o.buddyIndex] !== "name"
                                  || !!(o.buddy.name && o.buddy.name.trim());
  return true;
}

// Cost-of-living comparison shown on the ZIP step, once all five digits are in.
// Nation is the 100% baseline; the ZIP's index sits next to it. Descriptive
// only, never prescriptive (D26); "peers", never "average users" (D23).
function onbColChart(zip) {
  const digits = String(zip == null ? "" : zip).replace(/\D/g, "");

  // Wait for the whole ZIP. It used to draw at three digits, which was the old
  // prefix model showing through — three digits named a tier. A ZIP now
  // resolves to its county, and four digits of a five-digit code identify
  // nothing, so a partial chart would be a figure for somewhere else.
  if (digits.length < 5) return onbColTeaser(digits.length);

  const col = benchColIndex(zip);

  // Every US ZIP is modeled, so this is a guard rather than a path — but a ZIP
  // that is genuinely nonsense should say so plainly rather than draw a chart
  // that implies we looked something up.
  if (!col.supported) {
    return `
    <div class="note" style="margin-top:16px;">
      I don't recognise that one, so I'll use the national average for now. Your peer numbers still work — they're just not tuned to local costs.
    </div>`;
  }

  const zipPct    = 100 + col.pct;
  const nationPct = 100;
  const scaleMax  = Math.max(nationPct, zipPct);
  const nationW   = nationPct / scaleMax * 100;
  const zipW      = zipPct / scaleMax * 100;
  const markerX   = Math.max(6, Math.min(94, nationPct / scaleMax * 100));

  const where = col.place ? h(col.place) : "your area";

  let text;
  if (col.pct > 0) {
    text = `Compared to the national average, the cost of living in ${where} is <strong>${col.pct}% higher</strong>. This helps put your spending in context next to your peers.`;
  } else if (col.pct < 0) {
    text = `Compared to the national average, the cost of living in ${where} is <strong>${Math.abs(col.pct)}% lower</strong>. This helps put your spending in context next to your peers.`;
  } else {
    text = `The cost of living in ${where} is <strong>about the same</strong> as the national average. This helps put your spending in context next to your peers.`;
  }

  return `
    <div class="onb-col-chart">
      <div class="onb-col-row">
        <div class="onb-col-head"><span>Nation</span><span>${nationPct}%</span></div>
        <div class="cmp-bar"><span style="width:${nationW}%;background:var(--muted);"></span></div>
      </div>
      <div class="onb-col-row">
        <div class="onb-col-head"><span>Your ZIP</span><span>${zipPct}%</span></div>
        <div class="cmp-bar"><span style="width:${zipW}%;background:var(--accent);"></span></div>
      </div>
      <div class="onb-col-baseline" style="left:${markerX}%;" aria-hidden="true"></div>
      <!-- No label on the line: the axis caption below already names it, and
           two "national average" strings a few pixels apart read as a bug. -->
      <p class="onb-col-axis">Cost of living · national average = 100%</p>
    </div>
    <p class="helper onb-col-text">${text}</p>
    ${onbColHousingLine(col)}`;
}

// The composite is a weighted basket, and most of that basket is priced
// nationally — so even Silicon Valley lands near 120%, which reads as wrong to
// anyone who knows what their own rent is. Housing is where nearly all the
// variation actually lives, so name it.
function onbColHousingLine(col) {
  const h1 = col.housingIndex;
  if (!h1 || !isFinite(h1)) return "";
  const mult = Math.round(h1 * 10) / 10;
  let phrase;
  if (h1 >= 1.15)      phrase = `runs about <strong>${mult}× the national average</strong>`;
  else if (h1 <= 0.85) phrase = `runs about <strong>${mult}× the national average</strong>`;
  else                 phrase = `is <strong>close to the national average</strong>`;
  return `
    <p class="helper onb-col-text" style="margin-top:8px;">
      Housing there ${phrase} — that's where most of the difference sits. The rest
      of a budget, from groceries to streaming, is priced much the same everywhere.
    </p>`;
}

// Before there is anything to chart. The step was a bare input with no reason
// to fill it in; this says what typing it buys.
function onbColTeaser(typed) {
  if (typed > 0) {
    return `
    <p class="helper onb-col-teaser">
      ${5 - typed} more digit${5 - typed === 1 ? "" : "s"} and I'll show you the comparison.
    </p>`;
  }
  return `
    <div class="note onb-col-teaser-card">
      <p class="task-title" style="margin:0 0 4px;font-size:13px;">There's a number waiting behind this one</p>
      <p class="task-desc" style="margin:0;">
        Type your ZIP and I'll show you how your corner of the country compares
        to the rest of it. Some places run a third above the national average,
        some a fifth below — and housing swings further than that.
      </p>
    </div>`;
}

function onbStepBody(key, o) {
  if (key === "name") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Hi! I'm Buddy, your money learning companion.</h1>
    <p class="helper" style="margin:0 0 14px;">
      Nice to meet you! Sorry it's a bit awkward — but what should I call you?
    </p>
    <div class="input-group">
      <input placeholder="Your name" value="${h(o.name)}"
             oninput="onbLiveInput('name', this.value)"
             onchange="onbLiveInput('name', this.value)">
    </div>`;

  if (key === "zip") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Where are you these days?</h1>
    <p class="helper" style="margin:0 0 14px;">
      A ZIP is plenty — it just helps me learn what things cost near you. Nothing gets shared.
    </p>
    <div class="input-group">
      <input inputmode="numeric" maxlength="5" placeholder="ZIP code" value="${h(o.zip)}"
             oninput="onbLiveInput('zip', this.value)"
             onchange="onbLiveInput('zip', this.value)">
    </div>
    <div id="onbColChart">${onbColChart(o.zip)}</div>`;

  if (key === "household") {
    const HH_LABELS = { 1: "Only me", 2: "2 people", 3: "3 people", 4: "4 or more people" };
    return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Who's in your corner?</h1>
    <p class="helper" style="margin:0 0 14px;">How many people share your place, counting you?</p>
    <div class="journal-options">
      ${[1, 2, 3, 4].map(n => `
        <button class="journal-opt ${o.householdSize === n ? "picked" : ""}" type="button"
                onclick="state.onboarding.householdSize=${n};render()">
          <span class="journal-opt-label">${HH_LABELS[n]}</span>
        </button>`).join("")}
    </div>
    <p class="helper" style="margin:14px 0 0;">
      This helps me size things up — costs like groceries and utilities shift a lot depending on how many people share a home.
    </p>`;
  }

  if (key === "income") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Roughly what comes in each year?</h1>
    <p class="helper" style="margin:0 0 14px;">A range is all I need here — just pick the band that fits.</p>
    <div class="journal-options">
      ${ONB_INCOME_BANDS.map(b => `
        <button class="journal-opt ${o.incomeBand === b.id ? "picked" : ""}" type="button"
                onclick="state.onboarding.incomeBand='${b.id}';render()">
          <span class="journal-opt-label">${h(b.label)}</span>
        </button>`).join("")}
    </div>`;

  // A subset of the standalone budget builder's questions — same dimensions and
  // keys, so an answer means the same thing either way; onboarding just asks the
  // install-relevant few (housing, commute, travel) and lets the rest keep their
  // persona defaults.
  if (key === "lifestyle") {
    const lwq = onbLifestyleQuestions();
    const q = lwq[o.lwIndex];
    return `
      <p class="helper" style="margin:0 0 4px;">A few quick ones about how you live (${o.lwIndex + 1}/${lwq.length})</p>
      <h1 class="title" style="font-size:21px;margin:0 0 6px;">${h(q.prompt)}</h1>
      ${q.help ? `<p class="helper" style="margin:0 0 14px;">${h(q.help)}</p>` : ""}
      <div class="journal-options">
        ${q.options.map(opt => `
          <button class="journal-opt ${o.lifestyle[q.dim] === opt.value ? "picked" : ""}" type="button"
                  onclick="onbSetLifestyle('${q.dim}','${opt.value}')">
            <span class="journal-opt-label">${h(opt.label)}</span>
          </button>`).join("")}
      </div>`;
  }

  if (key === "goal") {
    const atMax = o.improveAreas.length >= ONB_GOALS_MAX;
    return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">If you could improve one thing about your money, what would it be?</h1>
    <p class="helper" style="margin:0 0 14px;">Pick up to ${ONB_GOALS_MAX} — we can always change these later.</p>
    <div class="journal-options">
      ${ONB_GOALS.map(g => {
        const on = o.improveAreas.indexOf(g) !== -1;
        const dim = !on && atMax;   // greyed once 3 are chosen
        return `
        <button class="journal-opt opt-check ${on ? "picked" : ""} ${dim ? "opt-check-dim" : ""}" type="button"
                ${dim ? "disabled" : ""}
                onclick="onbToggleGoal('${h(g).replace(/'/g, "\\'")}')">
          <span class="journal-opt-label">${h(g)}</span>
          <span class="opt-check-box" aria-hidden="true">${on ? "✓" : ""}</span>
        </button>`;
      }).join("")}
    </div>`;
  }

  if (key === "buddy") return onbBuddyStep(o);

  if (key === "video") return onbVideoBody(o);

  // D32 — the trial popup still appears. Accept or decline, the experience
  // afterward is identical. No paywalls, no gated features anywhere (D31).
  return `
    <div class="card">
      <p class="pill" style="display:inline-block;font-size:9px;padding:3px 9px;margin-bottom:10px;">7 days free</p>
      <h1 class="title" style="font-size:21px;margin:0 0 6px;">Last thing — want to try Platinum with me?</h1>
      <p class="task-desc" style="margin:0 0 12px;">
        Seven days free, then $6.99 a month. Cancel any time.
      </p>
      <ul class="onb-trial-list">
        <li>Daily updates on how you're doing</li>
        <li>Video updates on reported spending</li>
        <li>Peer comparisons for every category</li>
        <li>Unlimited journal entries and history</li>
        <li>All lessons and simulations</li>
      </ul>
      <button class="button full" style="margin-bottom:8px;" type="button"
              onclick="onbTrial(true)">Start free trial</button>
      <button class="button secondary full" type="button"
              onclick="onbTrial(false)">Not right now</button>
      <p class="helper" style="font-size:10px;margin:12px 0 0;">
        Nothing is locked either way — this prototype has no paid features.
      </p>
    </div>`;
}

function onbSetBuddy(key, value) {
  state.onboarding.buddy[key] = value;
  state.buddy[key] = value;      // so the stage above updates live
  render();
}

// ─── Character creator (one element per sub-step, Mii/Nintendogs style) ───────
// Reads the shared option lists from components/buddy.js at render time.
const ONB_BUDDY_COPY = {
  breed:      ["Now the fun part — let's give me a look.", "Scroll and pick a breed."],
  furColor:   ["What colour is my coat?",                  "Tap a colour."],
  furPattern: ["Any markings?",                            "Scroll and pick a pattern."],
  eyeColor:   ["And my eyes?",                             "Tap a colour."],
  name:       ["Last thing — what's my name?",             "Naming me is required."]
};

function onbBuddyStep(o) {
  const sub = ONB_BUDDY_STEPS[o.buddyIndex];
  const b = o.buddy || {};
  const copy = ONB_BUDDY_COPY[sub] || ["Design your buddy", ""];

  let control;
  if (sub === "breed") {
    control = onbBuddyScrollList("breed", BUDDY_BREEDS, b.breed);
  } else if (sub === "furPattern") {
    control = onbBuddyScrollList("furPattern", BUDDY_FUR_PATTERNS, b.furPattern);
  } else if (sub === "furColor") {
    control = onbBuddySwatches("furColor", BUDDY_FUR_COLORS, BUDDY_FUR_COLOR_CSS, b.furColor);
  } else if (sub === "eyeColor") {
    control = onbBuddySwatches("eyeColor", BUDDY_EYE_COLORS, BUDDY_EYE_COLOR_CSS, b.eyeColor);
  } else {
    control = `
      <div class="input-group">
        <input placeholder="Name your buddy" value="${h(b.name || "")}"
               oninput="onbLiveInput('buddyName', this.value)"
               onchange="onbLiveInput('buddyName', this.value, true)">
      </div>`;
  }

  return `
    <p class="helper" style="margin:0 0 4px;">Your buddy (${o.buddyIndex + 1}/${ONB_BUDDY_STEPS.length})</p>
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">${h(copy[0])}</h1>
    <p class="helper" style="margin:0 0 12px;">${h(copy[1])}</p>
    ${renderBuddyStage({ square: true })}
    ${control}`;
}

// Vertical scrollable list — breed, fur pattern.
function onbBuddyScrollList(key, options, current) {
  return `
    <div class="buddy-scroll-list">
      ${options.map(opt => `
        <button class="buddy-scroll-opt ${current === opt ? "picked" : ""}" type="button"
                onclick="onbSetBuddy('${key}','${h(opt).replace(/'/g, "\\'")}')">
          <span>${h(String(opt).replace(/_/g, " "))}</span>
          ${current === opt ? `<span aria-hidden="true">✓</span>` : ""}
        </button>`).join("")}
    </div>`;
}

// Circular colour swatches — fur colour, eye colour. Fill comes from the shared
// colour map; the current pick is named beneath (a circle alone isn't labelled).
function onbBuddySwatches(key, options, cssMap, current) {
  return `
    <div class="buddy-swatch-row">
      ${options.map(opt => `
        <button class="buddy-swatch-circle ${current === opt ? "picked" : ""}" type="button"
                aria-label="${h(opt)}"
                onclick="onbSetBuddy('${key}','${h(opt).replace(/'/g, "\\'")}')">
          <span class="buddy-swatch-fill" style="background:${cssMap[opt] || "var(--muted)"};"></span>
        </button>`).join("")}
    </div>
    <p class="helper buddy-swatch-label">${current ? h(String(current)) : "&nbsp;"}</p>`;
}

// ─── Intro video ─────────────────────────────────────────────────────────────
// REBUILT to the lesson player's model (screens/lesson.js) so step 8 and a
// lesson behave the same way: an elapsed-time clock against a per-segment CUE
// map, with skip / scrub / speed acting on that clock and a Next that unlocks
// on completion.
//
// It used to be event-driven — each segment's audio `onended` advanced to the
// next — which gave the captions nothing to seek against. There was no clock to
// scrub, no position to skip to and no rate to change, which is why the controls
// were Restart and Play and nothing else.
//
// Cue times come from onbVideoSegMs(), i.e. word count at DU_WPM, the same pace
// the build-time TTS renders at. The clock stays authoritative and the audio
// rides along beside it, exactly as lpSpeakCurrent documents for the lesson.

const ONB_VIDEO_TICK_MS = 100;
const ONB_VIDEO_SPEEDS  = [1, 1.5, 2];

function onbVideoSegMs(seg) {
  const words = String(seg || "").trim().split(/\s+/).length;
  // Same narration pace as the daily update (DU_WPM, architecture §10) so
  // retuning it moves both surfaces. Floor 1.6s so a two-word line still reads.
  const wpm = (typeof DU_WPM !== "undefined" && DU_WPM) || 165;
  return Math.max(1600, Math.round((words / wpm) * 60000));
}

function onbVideoInit() {
  const cues = [];
  let t = 0;
  ONB_VIDEO_SEGMENTS.forEach(seg => { cues.push(t); t += onbVideoSegMs(seg) / 1000; });
  return {
    index: 0, playing: false, finished: false,
    elapsed: 0, total: Math.max(1, t), cues: cues,
    speed: 1, lastTick: 0, timer: null, gen: 0
  };
}

/** The video state, built on first use and after a restart. */
function onbVideo() {
  const o = state.onboarding;
  if (!o.video || !o.video.cues) o.video = onbVideoInit();
  return o.video;
}

function onbVideoIndexFor(elapsed, cues) {
  let idx = 0;
  for (let i = 0; i < cues.length; i++) {
    if (elapsed >= cues[i]) idx = i; else break;
  }
  return idx;
}

function onbVideoBody(o) {
  const v = onbVideo();
  const segs = ONB_VIDEO_SEGMENTS;
  const seg = segs[v.index] || segs[segs.length - 1];
  const pct = (v.total > 0 ? (v.elapsed / v.total) * 100 : 0).toFixed(2);
  const playLabel = v.finished ? "↻" : (v.playing ? "⏸" : "▶");

  return `
    <p class="helper" style="margin:0 0 4px;">How Money Buddy works</p>
    <h1 class="title" style="font-size:20px;margin:0 0 12px;">A quick hello before we start</h1>
    <div class="onb-video">
      ${renderBuddyStage({ square: true })}
      <p class="onb-video-caption" id="onb-video-caption">${h(seg)}</p>

      <!-- Same control set as the lesson player, and the same ids-based
           repainting: nothing here calls render(), because a repaint mid-drag
           replaces the element the pointer is captured on. -->
      <div class="lp-ctrl-row">
        <button class="button secondary lp-ctrl-btn" type="button" onclick="onbVideoSkip(-1)">◀ Back</button>
        <button class="button lp-ctrl-btn" id="onb-video-playbtn" type="button"
                onclick="onbVideoPlayAction()">${playLabel}</button>
        <button class="button secondary lp-ctrl-btn" type="button" onclick="onbVideoSkip(1)">Next ▶</button>
        <button class="button secondary lp-speed-btn" id="onb-video-speed" type="button"
                onclick="onbVideoCycleSpeed()">${v.speed}×</button>
      </div>
      <div class="lp-progress-row">
        <span id="onb-video-time" class="lp-time-label">${lpFmtTime(Math.round(v.elapsed))}</span>
        <div class="lp-progress" id="onb-video-progress" role="slider" tabindex="0"
             aria-label="Intro position" aria-valuemin="0" aria-valuemax="100"
             aria-valuenow="${Math.round(Number(pct))}"
             onpointerdown="onbVideoScrubStart(event)" onkeydown="onbVideoScrubKey(event)">
          <div class="lp-progress-fill" id="onb-video-bar" style="width:${pct}%;"></div>
          <div class="lp-progress-knob" id="onb-video-knob" style="left:${pct}%;"></div>
        </div>
        <span class="lp-time-label">${lpFmtTime(Math.round(v.total))}</span>
      </div>
    </div>`;
}

// ── Direct repaints. None of these render() — see the note above. ─────────────

function onbVideoPaintCaption() {
  const v = onbVideo();
  const el = document.getElementById("onb-video-caption");
  if (el) el.textContent = ONB_VIDEO_SEGMENTS[v.index] || "";
}

function onbVideoPaintProgress() {
  const v = onbVideo();
  const pct = Math.max(0, Math.min(100, v.total > 0 ? (v.elapsed / v.total) * 100 : 0));
  const bar = document.getElementById("onb-video-bar");
  if (bar) bar.style.width = pct.toFixed(2) + "%";
  const knob = document.getElementById("onb-video-knob");
  if (knob) knob.style.left = pct.toFixed(2) + "%";
  const track = document.getElementById("onb-video-progress");
  if (track) track.setAttribute("aria-valuenow", String(Math.round(pct)));
  const time = document.getElementById("onb-video-time");
  if (time) time.textContent = lpFmtTime(Math.round(v.elapsed));
}

function onbVideoPaintPlayBtn() {
  const v = onbVideo();
  const btn = document.getElementById("onb-video-playbtn");
  if (btn) btn.textContent = v.finished ? "↻" : (v.playing ? "⏸" : "▶");
  // Continue is this step's Next and unlocks on completion, same as the lesson.
  uiSetEnabled("onbContinue", onbAnswered("video", state.onboarding));
}

// ── Clock ────────────────────────────────────────────────────────────────────

function onbVideoTick() {
  const v = onbVideo();
  const now = Date.now();
  v.elapsed += ((now - v.lastTick) / 1000) * v.speed;
  v.lastTick = now;

  if (v.elapsed >= v.total) { onbVideoFinish(); return; }

  const idx = onbVideoIndexFor(v.elapsed, v.cues);
  if (idx !== v.index) {
    v.index = idx;
    onbVideoPaintCaption();
    onbVideoSpeak();          // the new segment's voice rides along beside the clock
  }
  onbVideoPaintProgress();
}

function onbVideoClearTimer() {
  const o = state.onboarding;
  if (o && o.video && o.video.timer) { clearInterval(o.video.timer); o.video.timer = null; }
}

// Cancel any narration and the ticker — on pause or on leaving the step.
function onbVideoStop() {
  const o = state.onboarding;
  // Was THIS surface using the shared narration seam? render() calls this on
  // every render that is not the onboarding video step, and the lesson player
  // starts its own speech a few lines EARLIER in that same render — so
  // cancelling unconditionally killed the lesson's voice before it could speak.
  const wasNarrating = !!(o && o.video && o.video.playing);
  if (o && o.video) {
    o.video.playing = false;
    // A media `ended`/`error` handler can still be queued when we stop. If a
    // restart re-arms `playing` in the same synchronous turn, that stale
    // callback lands afterwards and starts a second voice over the same
    // segments. Bumping the generation invalidates anything already in flight —
    // belt and braces alongside detaching the handlers in onbVideoReleaseAudio.
    o.video.gen = (o.video.gen || 0) + 1;
  }
  onbVideoClearTimer();
  onbVideoReleaseAudio();
  if (wasNarrating) narrationCancel();   // only silence what we started
}

/** Where gen-audio.sh writes this segment's narration. */
function onbVideoAudioSrc(index) {
  const segId = ONB_VIDEO_SEGMENT_IDS[index] || ("s" + (index + 1));
  return "assets/audio/onboarding/" + ONB_VIDEO_SCRIPT_ID + "/" + segId + ".wav";
}

/**
 * Give the current segment a voice. Does NOT drive advancement — the clock is
 * authoritative, so a seek lands the caption and the voice in the same place.
 *
 * Under L10, Web Speech is a BUILD-TIME generator and never a runtime player —
 * runtime plays the .wav that scripts/gen-audio.sh produced, exactly like the
 * daily update and the lesson player. That .wav is absent until gen-audio.sh has
 * been run, so a load or autoplay failure falls back to runtime speech, and a
 * browser with no voice falls back to silence. Captions move either way.
 */
function onbVideoSpeak() {
  const o = state.onboarding;
  if (!o || !o.video || !o.video.playing) return;
  const seg = ONB_VIDEO_SEGMENTS[o.video.index];
  if (!seg) return;

  const speakFallback = function () { narrationSpeak(seg); };

  onbVideoReleaseAudio();
  narrationCancel();
  if (typeof Audio === "undefined") { speakFallback(); return; }

  try {
    const a = new Audio(onbVideoAudioSrc(o.video.index));
    onbAudioEl = a;
    a.playbackRate = o.video.speed || 1;
    a.onerror = speakFallback;                 // not generated yet → speak it live
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(speakFallback);  // autoplay blocked
  } catch (e) { speakFallback(); }
}

/** Stop and detach the segment audio, so a stale element cannot fire onended. */
function onbVideoReleaseAudio() {
  if (!onbAudioEl) return;
  try {
    onbAudioEl.onended = null;
    onbAudioEl.onerror = null;
    onbAudioEl.pause();
  } catch (e) {}
  onbAudioEl = null;
}

function onbVideoFinish() {
  const v = onbVideo();
  onbVideoStop();
  v.elapsed  = v.total;
  v.index    = ONB_VIDEO_SEGMENTS.length - 1;
  v.finished = true;
  onbVideoPaintCaption();
  onbVideoPaintProgress();
  onbVideoPaintPlayBtn();
}

// ── Controls ─────────────────────────────────────────────────────────────────

function onbVideoPlay() {
  const v = onbVideo();
  if (v.playing || v.finished) return;
  v.playing  = true;
  v.lastTick = Date.now();
  v.timer    = setInterval(onbVideoTick, ONB_VIDEO_TICK_MS);
  onbVideoPaintPlayBtn();
  onbVideoSpeak();
}

function onbVideoPause() {
  onbVideoStop();
  onbVideoPaintPlayBtn();
}

function onbVideoPlayAction() {
  const v = onbVideo();
  if (v.finished) onbVideoRestart(); else if (v.playing) onbVideoPause(); else onbVideoPlay();
}

function onbVideoRestart() {
  const o = state.onboarding;
  onbVideoStop();
  const gen = (o.video && o.video.gen) || 0;
  o.video = onbVideoInit();
  o.video.gen = gen;                 // carry it forward, or a stale callback matches again
  onbVideoPaintCaption();
  onbVideoPaintProgress();
  onbVideoPlay();
}

/** ±1 segment, seeking the clock to that segment's cue — same as lpSkip. */
function onbVideoSkip(delta) {
  const v = onbVideo();
  if (v.finished && delta < 0) v.finished = false;
  const idx = Math.max(0, Math.min(ONB_VIDEO_SEGMENTS.length - 1, v.index + delta));
  onbVideoApplyElapsed(v.cues[idx] || 0);
}

function onbVideoCycleSpeed() {
  const v = onbVideo();
  v.speed = ONB_VIDEO_SPEEDS[(ONB_VIDEO_SPEEDS.indexOf(v.speed) + 1) % ONB_VIDEO_SPEEDS.length];
  const btn = document.getElementById("onb-video-speed");
  if (btn) btn.textContent = v.speed + "×";
  if (onbAudioEl) { try { onbAudioEl.playbackRate = v.speed; } catch (e) {} }
  // The ticker reads v.speed live each tick — nothing more to do.
}

/** Seek to an absolute time and repaint everything that follows the clock. */
function onbVideoApplyElapsed(sec) {
  const v = onbVideo();
  v.elapsed = Math.max(0, Math.min(v.total, sec));
  if (v.finished && v.elapsed < v.total) v.finished = false;
  const idx = onbVideoIndexFor(v.elapsed, v.cues);
  const changed = idx !== v.index;
  v.index = idx;
  if (changed) { onbVideoPaintCaption(); onbVideoSpeak(); }
  onbVideoPaintProgress();
  onbVideoPaintPlayBtn();
  if (v.playing) v.lastTick = Date.now();
}

// ── Scrubbing ────────────────────────────────────────────────────────────────
// Geometry for the drag in progress, measured once at pointerdown. Reading it
// per pointermove forces a synchronous layout every frame, right after the bar's
// width was written — the classic read-after-write thrash.
let onbScrubRect = null;
let onbScrubWasPlaying = false;

function onbVideoScrubStart(e) {
  const track = document.getElementById("onb-video-progress");
  const v = onbVideo();
  if (!track) return;
  onbScrubWasPlaying = v.playing;
  if (v.playing) onbVideoPause();
  track.classList.add("scrubbing");   // drop the smoothing so the bar tracks the finger
  onbScrubRect = track.getBoundingClientRect();
  try { track.setPointerCapture(e.pointerId); } catch (err) {}
  track.onpointermove   = onbVideoScrubTo;
  track.onpointerup     = onbVideoScrubEnd;
  track.onpointercancel = onbVideoScrubEnd;
  onbVideoScrubTo(e);
}

function onbVideoScrubTo(e) {
  const v = onbVideo();
  if (!v.total) return;
  let r = onbScrubRect;
  if (!r) {
    const track = document.getElementById("onb-video-progress");
    if (!track) return;
    r = onbScrubRect = track.getBoundingClientRect();
  }
  if (!r.width) return;
  onbVideoApplyElapsed(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.total);
}

function onbVideoScrubEnd(e) {
  const track = document.getElementById("onb-video-progress");
  const v = onbVideo();
  if (track) {
    try { track.releasePointerCapture(e.pointerId); } catch (err) {}
    track.classList.remove("scrubbing");
    track.onpointermove = null; track.onpointerup = null; track.onpointercancel = null;
  }
  onbScrubRect = null;
  if (onbScrubWasPlaying && !v.finished) onbVideoPlay();
  onbScrubWasPlaying = false;
}

/** Arrow keys nudge the scrubber, so the control is reachable without a pointer. */
function onbVideoScrubKey(e) {
  const step = 5;
  if (e.key === "ArrowRight" || e.key === "ArrowUp")   { e.preventDefault(); onbVideoApplyElapsed(onbVideo().elapsed + step); }
  if (e.key === "ArrowLeft"  || e.key === "ArrowDown") { e.preventDefault(); onbVideoApplyElapsed(onbVideo().elapsed - step); }
}

function onbTrial(accepted) {
  state.trialAccepted = accepted;
  onbFinish();
}

function renderOnboardingAdmin() {
  const o = state.onboarding;
  return `
    <div class="admin-card">
      <p class="admin-card-title">Onboarding</p>
      ${!o ? `<p class="helper">Not running. SKIP_ONBOARDING = ${SKIP_ONBOARDING}.</p>` : `
        <div class="input-group">
          <label>Step ${o.step + 1}/${ONB_STEPS.length} — ${h(ONB_STEPS[o.step])}</label>
          <select onchange="state.onboarding.step=parseInt(this.value,10);state.onboarding.lwIndex=0;state.onboarding.buddyIndex=0;render()">
            ${ONB_STEPS.map((s, i) => `<option value="${i}" ${o.step === i ? "selected" : ""}>${i + 1}. ${h(s)}</option>`).join("")}
          </select>
        </div>
        <div class="input-group">
          <label>Overrides the persona (D09 — only these three)</label>
          <div class="helper" style="line-height:1.7;">
            zip → ${h(o.zip || "—")}<br>
            household → ${h(o.householdSize || "—")}<br>
            income band → ${h(o.incomeBand || "—")}
          </div>
        </div>
        <p class="helper" style="font-size:10px;">
          Everything else falls back to persona.json. Skipping never blocks.
        </p>
      `}
      <button class="button secondary full" type="button" onclick="onbStart();go('onboarding')">Restart onboarding</button>
    </div>
  `;
}
