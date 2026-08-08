// ─── Onboarding (01-onboarding, D06) ─────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full-bleed flow
//
// Eight steps. A single config constant bypasses the whole thing (D07) — see
// js/config.js. Flipping it must not require unwinding anything here.
//
//   1 name   2 ZIP   3 household   4 income band
//   5 lifestyle wizard (the same six questions as the budget builder)
//   6 strategic goal   7 buddy creation   8 trial popup
//
// PERSONA OVERRIDE (D09): steps 2, 3 and 4 override the hardcoded persona.
// Everything else falls back to persona.json. If a tester skips a field, the
// persona value stands — NEVER block progress to collect data.

const ONB_STEPS = ["name", "zip", "household", "income", "lifestyle", "goal", "buddy", "trial"];

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

// "What are you actually here for?" — four options plus custom (01-onboarding).
const ONB_GOALS = [
  "Stop living paycheck to paycheck",
  "Build up some savings",
  "Get on top of what I owe",
  "Just understand where it goes"
];

const ONB_BUDDY_FIELDS = [
  { key: "breed",     label: "Breed",  options: ["golden_retriever", "corgi", "beagle"] },
  { key: "furColor",  label: "Fur",    options: ["cream", "golden", "chocolate", "grey"] },
  { key: "eyeColor",  label: "Eyes",   options: ["brown", "amber", "blue", "green"] },
  { key: "noseColor", label: "Nose",   options: ["black", "brown", "pink"] },
  { key: "size",      label: "Size",   options: ["small", "medium", "large"] }
];

function onbStart() {
  state.onboarding = {
    step: 0,
    lwIndex: 0,
    name: "",
    zip: "",
    householdSize: null,
    incomeBand: null,
    lifestyle: Object.assign({}, PERSONA.lifestyle),   // persona is the fallback
    strategicGoal: null,
    customGoal: "",
    buddy: Object.assign({}, PERSONA.buddy)
  };
  return state.onboarding;
}

function onbNext() {
  const o = state.onboarding;
  // Step 5 is the six-question wizard — advance within it before moving on.
  if (ONB_STEPS[o.step] === "lifestyle" && o.lwIndex < LW_QUESTIONS.length - 1) {
    o.lwIndex++; render(); return;
  }
  if (o.step < ONB_STEPS.length - 1) { o.step++; render(); return; }
  onbFinish();
}

function onbBack() {
  const o = state.onboarding;
  if (ONB_STEPS[o.step] === "lifestyle" && o.lwIndex > 0) { o.lwIndex--; render(); return; }
  if (o.step > 0) { o.step--; render(); return; }
}

/**
 * Apply everything and land on home with a 1-day streak.
 * Only ZIP, household size and income touch the persona (D09).
 */
function onbFinish() {
  const o = state.onboarding;

  if (o.name) state.profile.name = o.name;
  if (o.zip) state.profile.zip = o.zip;
  if (o.householdSize) state.profile.householdSize = o.householdSize;
  if (o.incomeBand) {
    const band = ONB_INCOME_BANDS.find(b => b.id === o.incomeBand);
    if (band) state.profile.incomeAnnual = band.annual;
  }

  state.lifestyle = Object.assign({}, o.lifestyle);
  state.buddy = Object.assign({}, o.buddy);

  state.strategicGoal = {
    id: "g_strategic_1",
    label: o.strategicGoal === "__custom" ? (o.customGoal || "Get on top of my money") : o.strategicGoal,
    setDuringOnboarding: true
  };

  // The wizard's answers produce the starting budget, same as the standalone
  // builder — straight through the seam, never into state.plan directly (L6).
  state.planStatus = "empty";
  submitBudgetBaseline({
    source: "lifestyleWizard",
    profile: {
      zip: state.profile.zip,
      householdSize: state.profile.householdSize,
      incomeAnnual: state.profile.incomeAnnual
    },
    lifestyle: Object.assign({}, o.lifestyle),
    monthly: benchAllPeerValues({
      annualIncome: state.profile.incomeAnnual,
      householdSize: state.profile.householdSize,
      zip: state.profile.zip,
      lifestyle: o.lifestyle
    })
  });

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

  return `
    <div class="journal-shell">
      <div class="journal-head">
        <p class="helper" style="margin:0 0 4px;">Step ${o.step + 1} of ${total}</p>
        <div class="journal-progress" aria-hidden="true">
          ${ONB_STEPS.map((_, i) => `<span class="journal-pip ${i <= o.step ? "on" : ""}"></span>`).join("")}
        </div>
      </div>
      <div class="journal-body">${onbStepBody(key, o)}</div>
      <div class="journal-foot">
        ${o.step > 0 || o.lwIndex > 0
          ? `<button class="button secondary" type="button" onclick="onbBack()">Back</button>`
          : `<span></span>`}
        ${key === "trial" ? "" : `
          <button class="button" type="button" onclick="onbNext()">
            ${onbAnswered(key, o) ? "Next" : "Skip"}
          </button>`}
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
  if (key === "goal")      return !!o.strategicGoal;
  return true;
}

function onbStepBody(key, o) {
  if (key === "name") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">First — what should I call you?</h1>
    <p class="helper" style="margin:0 0 14px;">Whatever you like. It's only used to say hello.</p>
    <div class="input-group">
      <input placeholder="Your name" value="${h(o.name)}"
             onchange="state.onboarding.name=this.value">
    </div>`;

  if (key === "zip") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Where do you live?</h1>
    <p class="helper" style="margin:0 0 14px;">
      A ZIP code is enough. It sets what things cost near you — nothing is shared.
    </p>
    <div class="input-group">
      <input inputmode="numeric" maxlength="5" placeholder="ZIP code" value="${h(o.zip)}"
             onchange="state.onboarding.zip=this.value">
    </div>`;

  if (key === "household") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">How many people live with you?</h1>
    <p class="helper" style="margin:0 0 14px;">Counting yourself.</p>
    <div class="journal-options">
      ${[1, 2, 3, 4].map(n => `
        <button class="journal-opt ${o.householdSize === n ? "picked" : ""}" type="button"
                onclick="state.onboarding.householdSize=${n};onbNext()">
          <span class="journal-opt-label">${n === 4 ? "4 or more" : n}</span>
        </button>`).join("")}
    </div>`;

  if (key === "income") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Roughly what do you earn a year?</h1>
    <p class="helper" style="margin:0 0 14px;">A range is fine — I never need the exact figure.</p>
    <div class="journal-options">
      ${ONB_INCOME_BANDS.map(b => `
        <button class="journal-opt ${o.incomeBand === b.id ? "picked" : ""}" type="button"
                onclick="state.onboarding.incomeBand='${b.id}';onbNext()">
          <span class="journal-opt-label">${h(b.label)}</span>
        </button>`).join("")}
    </div>`;

  // The same six questions as the standalone budget builder — one wizard, two
  // entry points, so the answers mean the same thing either way.
  if (key === "lifestyle") {
    const q = LW_QUESTIONS[o.lwIndex];
    return `
      <p class="helper" style="margin:0 0 4px;">A few about how you live (${o.lwIndex + 1}/${LW_QUESTIONS.length})</p>
      <h1 class="title" style="font-size:21px;margin:0 0 6px;">${h(q.prompt)}</h1>
      ${q.help ? `<p class="helper" style="margin:0 0 14px;">${h(q.help)}</p>` : ""}
      <div class="journal-options">
        ${q.options.map(opt => `
          <button class="journal-opt ${o.lifestyle[q.dim] === opt.value ? "picked" : ""}" type="button"
                  onclick="state.onboarding.lifestyle['${q.dim}']='${opt.value}';onbNext()">
            <span class="journal-opt-label">${h(opt.label)}</span>
          </button>`).join("")}
      </div>`;
  }

  if (key === "goal") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">What are you actually here for?</h1>
    <p class="helper" style="margin:0 0 14px;">You can change this later.</p>
    <div class="journal-options">
      ${ONB_GOALS.map(g => `
        <button class="journal-opt ${o.strategicGoal === g ? "picked" : ""}" type="button"
                onclick="state.onboarding.strategicGoal='${h(g).replace(/'/g, "\\'")}';render()">
          <span class="journal-opt-label">${h(g)}</span>
        </button>`).join("")}
      <button class="journal-opt ${o.strategicGoal === "__custom" ? "picked" : ""}" type="button"
              onclick="state.onboarding.strategicGoal='__custom';render()">
        <span class="journal-opt-label">Something else</span>
      </button>
    </div>
    ${o.strategicGoal === "__custom" ? `
      <div class="input-group" style="margin-top:10px;">
        <input placeholder="In your own words" value="${h(o.customGoal)}"
               onchange="state.onboarding.customGoal=this.value">
      </div>` : ""}`;

  if (key === "buddy") return `
    <h1 class="title" style="font-size:21px;margin:0 0 6px;">Make your buddy</h1>
    <p class="helper" style="margin:0 0 14px;">
      They'll be the one asking about your day.
    </p>
    ${renderBuddyStage({ compact: true })}
    <div class="input-group">
      <label>Name</label>
      <input value="${h(o.buddy.name || "")}"
             onchange="state.onboarding.buddy.name=this.value;state.buddy.name=this.value;render()">
    </div>
    ${ONB_BUDDY_FIELDS.map(f => `
      <div class="input-group">
        <label>${h(f.label)}</label>
        <div class="onb-swatches">
          ${f.options.map(opt => `
            <button class="onb-swatch ${o.buddy[f.key] === opt ? "picked" : ""}" type="button"
                    onclick="onbSetBuddy('${f.key}','${opt}')">
              ${h(String(opt).replace(/_/g, " "))}
            </button>`).join("")}
        </div>
      </div>`).join("")}`;

  // D32 — the trial popup still appears. Accept or decline, the experience
  // afterward is identical. No paywalls, no gated features anywhere (D31).
  return `
    <div class="card">
      <p class="pill" style="display:inline-block;font-size:9px;padding:3px 9px;margin-bottom:10px;">7 days free</p>
      <h1 class="title" style="font-size:21px;margin:0 0 6px;">Try Money Buddy Platinum</h1>
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
          <select onchange="state.onboarding.step=parseInt(this.value,10);state.onboarding.lwIndex=0;render()">
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
