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
    video: { index: 0, playing: false, finished: false, timer: null },
    skipPrompt: false,     // name-step "skip this / skip all" confirmation
    name: "",
    zip: "",
    householdSize: null,
    incomeBand: null,
    lifestyle: Object.assign({}, PERSONA.lifestyle),   // persona is the fallback
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
          ? `<button class="button" type="button" onclick="onbNext()"
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
  if (key === "video")     return true;   // watch or skip — Continue always proceeds
  // Attribute sub-steps always have a default; only naming the buddy is required.
  if (key === "buddy")     return ONB_BUDDY_STEPS[o.buddyIndex] !== "name"
                                  || !!(o.buddy.name && o.buddy.name.trim());
  return true;
}

// Cost-of-living comparison shown on the ZIP step once a usable prefix is typed.
// Nation is the 100% baseline; the ZIP's index sits next to it. Descriptive
// only, never prescriptive (D26); "peers", never "average users" (D23).
function onbColChart(zip) {
  const digits = String(zip == null ? "" : zip).replace(/\D/g, "");
  if (digits.length < 3) return "";

  const col = benchColIndex(zip);

  // Only CA/AR/NY/VA prefixes are modeled in the test build (A12). Everything
  // else falls back to the national average — say so plainly rather than drawing
  // a chart that implies we have local data.
  if (!col.supported) {
    return `
    <div class="note" style="margin-top:16px;">
      This area isn't in the test data yet, so I'll use the national average for now. Your peer numbers still work — they're just not tuned to local costs.
    </div>`;
  }

  const zipPct    = 100 + col.pct;
  const nationPct = 100;
  const scaleMax  = Math.max(nationPct, zipPct);
  const nationW   = nationPct / scaleMax * 100;
  const zipW      = zipPct / scaleMax * 100;
  const markerX   = Math.max(6, Math.min(94, nationPct / scaleMax * 100));

  let text;
  if (col.pct > 0) {
    text = `Compared to the national average, your cost of living is <strong>${col.pct}% higher</strong>. This helps put your spending in context next to your peers.`;
  } else if (col.pct < 0) {
    text = `Compared to the national average, your cost of living is <strong>${Math.abs(col.pct)}% lower</strong>. This helps put your spending in context next to your peers.`;
  } else {
    text = `Your cost of living is <strong>about the same</strong> as the national average. This helps put your spending in context next to your peers.`;
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
      <span class="onb-col-baseline-label" style="left:${markerX}%;">national average</span>
      <p class="onb-col-axis">Cost of living · national average = 100%</p>
    </div>
    <p class="helper onb-col-text">${text}</p>`;
}

function onbStepBody(key, o) {
  if (key === "name") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Hi! I'm Buddy, your money learning companion.</h1>
    <p class="helper" style="margin:0 0 14px;">
      Nice to meet you! Sorry it's a bit awkward — but what should I call you?
    </p>
    <div class="input-group">
      <input placeholder="Your name" value="${h(o.name)}"
             onchange="state.onboarding.name=this.value;render()">
    </div>`;

  if (key === "zip") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Where are you these days?</h1>
    <p class="helper" style="margin:0 0 14px;">
      A ZIP is plenty — it just helps me learn what things cost near you. Nothing gets shared.
    </p>
    <div class="input-group">
      <input inputmode="numeric" maxlength="5" placeholder="ZIP code" value="${h(o.zip)}"
             onchange="state.onboarding.zip=this.value;render()">
    </div>
    ${onbColChart(o.zip)}`;

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
                  onclick="state.onboarding.lifestyle['${q.dim}']='${opt.value}';render()">
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
        <li>Daily updates read aloud</li>
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
               onchange="state.onboarding.buddy.name=this.value;state.buddy.name=this.value;render()">
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

// ─── Intro video (live Web Speech, captions synced on utterance end) ─────────
function onbVideoBody(o) {
  if (!o.video) o.video = { index: 0, playing: false, finished: false, timer: null };
  const segs = ONB_VIDEO_SEGMENTS;
  const v = o.video;
  const seg = segs[v.index] || segs[segs.length - 1];
  const pct = Math.round(((v.index + (v.finished ? 1 : 0)) / segs.length) * 100);
  const playLabel = v.playing ? "Pause" : (v.finished ? "Replay" : (v.index === 0 ? "Play" : "Resume"));
  return `
    <p class="helper" style="margin:0 0 4px;">How Money Buddy works</p>
    <h1 class="title" style="font-size:20px;margin:0 0 12px;">A quick hello before we start</h1>
    <div class="onb-video">
      ${renderBuddyStage({ square: true })}
      <p class="onb-video-caption">${h(seg)}</p>
      <div class="onb-video-progress" aria-hidden="true"><span style="width:${pct}%;"></span></div>
      <div class="onb-video-controls">
        <button class="button secondary" type="button" onclick="onbVideoRestart()">Restart</button>
        <button class="button" type="button" onclick="${v.playing ? "onbVideoPause()" : "onbVideoPlay()"}">${playLabel}</button>
      </div>
    </div>`;
}

function onbVideoSegMs(seg) {
  const words = String(seg || "").trim().split(/\s+/).length;
  // Same narration pace as the daily update (DU_WPM, architecture §10) so
  // retuning it moves both surfaces. Floor 1.6s so a two-word line still reads.
  const wpm = (typeof DU_WPM !== "undefined" && DU_WPM) || 165;
  return Math.max(1600, Math.round((words / wpm) * 60000));
}

function onbVideoClearTimer() {
  const o = state.onboarding;
  if (o && o.video && o.video.timer) { clearTimeout(o.video.timer); o.video.timer = null; }
}

// Cancel any narration and the fallback timer — on pause or on leaving the step.
function onbVideoStop() {
  const o = state.onboarding;
  // Was THIS surface using the shared narration seam? render() calls this on
  // every render that is not the onboarding video step, and the lesson player
  // starts its own speech a few lines EARLIER in that same render — so
  // cancelling unconditionally killed the lesson's voice before it could speak.
  const wasNarrating = !!(o && o.video && o.video.playing);
  if (o && o.video) {
    o.video.playing = false;
    // A media `ended`/`error` handler or a pending timer can still be queued
    // when we stop. If a restart re-arms `playing` in the same synchronous
    // turn, that stale callback lands afterwards, passes the `playing` guard,
    // and starts a second loop driving the same segments. Bumping the
    // generation invalidates anything already in flight — belt and braces
    // alongside detaching the handlers in onbVideoReleaseAudio().
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
 * Play the current segment, then advance when it finishes.
 *
 * Under L10, Web Speech is a BUILD-TIME generator and never a runtime player —
 * runtime plays the .wav that scripts/gen-audio.sh produced, exactly like the
 * daily update and the lesson player. Calling speechSynthesis here (as this did)
 * meant the first narration a tester heard was a different voice at a different
 * pace from every other surface, or silence on a browser with no voice.
 *
 * The .wav is absent until gen-audio.sh has been run (macOS only), so a load or
 * autoplay failure falls back to the word-count clock — the same "no asset →
 * virtual clock" shape the lesson player already uses. Captions advance either
 * way; only the voice is missing.
 */
function onbVideoSpeak() {
  const o = state.onboarding;
  if (!o || !o.video || !o.video.playing) return;
  onbVideoClearTimer();
  const seg = ONB_VIDEO_SEGMENTS[o.video.index];
  if (!seg) { onbVideoFinish(); return; }
  const ms = onbVideoSegMs(seg);
  const gen = o.video.gen || 0;   // callbacks below are void if this changes
  const fallback = function () {
    onbVideoClearTimer();
    o.video.timer = setTimeout(function () { onbVideoAdvance(gen); }, ms);
  };

  // Tier 3: silent clock. Tier 2: runtime speech. Tier 1: the generated .wav.
  const speakFallback = function () {
    if (narrationSpeak(seg, { onEnd: function () { onbVideoAdvance(gen); },
                              onError: fallback })) {
      // Speech drives the advance; keep a generous backstop in case neither
      // onend nor onerror ever fires, so the captions can't strand on one line.
      onbVideoClearTimer();
      o.video.timer = setTimeout(function () { onbVideoAdvance(gen); }, ms + 6000);
      return;
    }
    fallback();
  };

  onbVideoReleaseAudio();
  narrationCancel();
  if (typeof Audio === "undefined") { speakFallback(); return; }

  try {
    const a = new Audio(onbVideoAudioSrc(o.video.index));
    onbAudioEl = a;
    a.onended = function () { onbVideoAdvance(gen); };
    a.onerror = speakFallback;                 // not generated yet → speak it live
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(speakFallback);  // autoplay blocked
    // Belt and braces: if the file never fires either event, don't strand the
    // captions on segment 1 — a generous timer still moves things along.
    o.video.timer = setTimeout(function () { onbVideoAdvance(gen); }, ms + 4000);
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

function onbVideoAdvance(gen) {
  const o = state.onboarding;
  if (!o || !o.video || !o.video.playing) return;
  // A callback queued before the last stop/restart is stale — ignore it.
  if (gen != null && gen !== (o.video.gen || 0)) return;
  if (o.video.index >= ONB_VIDEO_SEGMENTS.length - 1) { onbVideoFinish(); return; }
  o.video.index++;
  render();
  onbVideoSpeak();
}

function onbVideoFinish() {
  const o = state.onboarding;
  onbVideoStop();
  if (o && o.video) o.video.finished = true;
  render();
}

function onbVideoPlay() {
  const o = state.onboarding;
  if (!o.video) o.video = { index: 0, playing: false, finished: false, timer: null };
  if (o.video.finished) { o.video.index = 0; o.video.finished = false; }
  o.video.playing = true;
  render();
  onbVideoSpeak();
}

function onbVideoPause() {
  onbVideoStop();
  render();
}

function onbVideoRestart() {
  const o = state.onboarding;
  onbVideoStop();
  // Carry the generation forward — a fresh object would reset it to 0 and a
  // stale callback could match again.
  o.video = { index: 0, playing: false, finished: false, timer: null,
              gen: (o.video && o.video.gen) || 0 };
  onbVideoPlay();
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
