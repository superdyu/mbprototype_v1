// --- Buddy (L15, revised by L22) ---------------------------------------------
// Nothing here is generated. L22 allows OWNER-SUPPLIED static illustrations,
// selected by buddy state; D10's prohibition is on Claude generating art and it
// still holds.
//
// -- THE IMAGE IS PREFERRED, THE DESCRIPTION IS THE FALLBACK ------------------
// The labelled description below is NOT dead code now that art exists. No image
// set covers every breed x coat x pattern x eyes x nose x size x pose, and D19
// forbids a screen rendering empty — so a state with no matching image must
// degrade to the description rather than to a gap. Deleting it would turn a
// missing file into a blank stage.
//
// Why the description was worth building in the first place: it proves the
// customization plumbing works end to end. A tester picks a breed and the stage
// visibly reflects it — the choice registers and is legible, which is what
// onboarding step 7 exists to test. A swatch would have tested nothing. That
// same plumbing is what makes the art swap cheap now.
//
// -- STILL NO SHEETS ----------------------------------------------------------
// D39/D40 are void in practice. Flat cream sheets, CSS background-position
// cropping, six fixed sheets and the dropped eye/nose colours were all
// consequences of raster art being unable to recolour. The owner's art is
// SEPARATE FILES chosen by state, not one sheet addressed by offset, so there
// is still nothing to crop — DO NOT build the cropping machinery. See the
// "Don't" list in versions/v3/CLAUDE.md.
//
// The pickers are also NOT reduced to match whatever the art covers (L18): the
// image varies along whichever stats the owner's plan names, and the
// description carries the attributes it does not.

// The six poses from 10-ai-assets.md, in its cell order. Poses 1/3/4/5 are the
// ambient idle cycle; 2 and 6 are event-driven (chat open, reward/streak).
const BUDDY_POSES = [
  { id: 1, name: "sitting, facing forward, calm",     idle: true  },
  { id: 2, name: "head tilted, looking up at you",    idle: false },
  { id: 3, name: "drinking from a bowl, head down",   idle: true  },
  { id: 4, name: "nose to the ground, sniffing",      idle: true  },
  { id: 5, name: "lying down, paws forward, relaxed", idle: true  },
  { id: 6, name: "sitting upright, paws raised, joyful", idle: false }
];

const BUDDY_IDLE_POSES = BUDDY_POSES.filter(p => p.idle).map(p => p.id);

// ─── Customization options (single source — creator + admin both read these) ──
// These drive the description and the picker controls, and they are the
// vocabulary any image filename has to agree with (L22).
// Values may carry underscores/spaces; the stage renders them with _ → space.
const BUDDY_BREEDS = [
  "golden_retriever", "corgi", "beagle", "labrador",
  "poodle", "dachshund", "husky", "shiba_inu"
];
const BUDDY_FUR_PATTERNS = ["solid", "patches", "spots", "brindle", "merle", "tuxedo"];
const BUDDY_FUR_COLORS = ["cream", "golden", "chocolate", "grey", "tan and white", "tricolor"];
const BUDDY_EYE_COLORS = ["brown", "amber", "blue", "green"];

// value → CSS background for the circular swatches. Multi-tone coats use a
// gradient so the swatch still reads as that coat.
const BUDDY_FUR_COLOR_CSS = {
  "cream":         "#EFE3C6",
  "golden":        "#D9A441",
  "chocolate":     "#5A3A22",
  "grey":          "#9BA1A6",
  "tan and white": "linear-gradient(90deg,#D9A441 50%,#F2ECDD 50%)",
  "tricolor":      "linear-gradient(90deg,#3A2A20 33%,#D9A441 33% 66%,#F2ECDD 66%)"
};
const BUDDY_EYE_COLOR_CSS = {
  "brown": "#6B4423", "amber": "#D99B2B", "blue": "#4A90D9", "green": "#4A9D5B"
};

// 09-design-system: "a small movement every four to six seconds, never
// constant." Randomised inside that window so the cadence never feels metronomic.
const BUDDY_IDLE_MIN_MS = 4000;
const BUDDY_IDLE_MAX_MS = 6000;

function buddyCurrentPose() {
  const id = state.buddyPose || 1;
  return BUDDY_POSES.find(p => p.id === id) || BUDDY_POSES[0];
}

function buddySetPose(id) {
  state.buddyPose = id;
  render();
}

/**
 * Start the ambient idle cycle. Stops under prefers-reduced-motion — the design
 * system's floor requires it, and a placeholder that flickers text is worse
 * than a still one.
 */
function buddyStartIdle() {
  buddyStopIdle();
  if (v3PrefersReducedMotion()) return;
  const step = () => {
    const others = BUDDY_IDLE_POSES.filter(id => id !== state.buddyPose);
    state.buddyPose = others[Math.floor(Math.random() * others.length)];
    const el = document.getElementById("buddyStage");
    if (el) el.innerHTML = renderBuddyInner();      // repaint in place, no full render()
    state.buddyIdleTimer = setTimeout(step,
      BUDDY_IDLE_MIN_MS + Math.random() * (BUDDY_IDLE_MAX_MS - BUDDY_IDLE_MIN_MS));
  };
  state.buddyIdleTimer = setTimeout(step,
    BUDDY_IDLE_MIN_MS + Math.random() * (BUDDY_IDLE_MAX_MS - BUDDY_IDLE_MIN_MS));
}

function buddyStopIdle() {
  if (state.buddyIdleTimer) { clearTimeout(state.buddyIdleTimer); state.buddyIdleTimer = null; }
}

function v3PrefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { return false; }
}

/**
 * The stage. `opts.compact` shrinks it; `opts.square` makes it a 1:1 tile (used
 * by the character creator).
 */
function renderBuddyStage(opts) {
  const compact = !!(opts && opts.compact);
  const square  = !!(opts && opts.square);
  return `
    <div class="buddy-stage ${compact ? "buddy-stage-compact" : ""} ${square ? "buddy-stage-square" : ""}">
      <div id="buddyStage" class="buddy-inner">${renderBuddyInner()}</div>
    </div>
  `;
}

// Kept separate so the idle tick can repaint just this, rather than calling
// render() every 4–6 seconds and blowing away focus across the whole screen.
function renderBuddyInner() {
  const b = state.buddy || {};
  const pose = buddyCurrentPose();
  const breed = String(b.breed || "").replace(/_/g, " ");
  const coat = [b.furColor && h(b.furColor), b.furPattern && h(b.furPattern)].filter(Boolean).join(" ");
  return `
    <p class="buddy-name">${h(b.name || "Your buddy")}</p>
    <p class="buddy-desc">${h(breed)}${coat ? " · " + coat + " fur" : ""}</p>
    <p class="buddy-desc">${b.eyeColor ? h(b.eyeColor) + " eyes · " : ""}${b.noseColor ? h(b.noseColor) + " nose" : ""}</p>
    <p class="buddy-desc">${h(b.size || "medium")}</p>
    <p class="buddy-pose">${h(pose.name)}</p>
    <p class="buddy-note">illustration placeholder</p>
  `;
}

/** One-line description — for surfaces too small for the stage. */
function buddyDescription() {
  const b = state.buddy || {};
  return [String(b.breed || "").replace(/_/g, " "), b.furColor && b.furColor + " fur", b.size]
    .filter(Boolean).join(" · ");
}

function renderBuddyAdmin() {
  const b = state.buddy || {};
  const fields = [
    ["breed", BUDDY_BREEDS],
    ["furColor", BUDDY_FUR_COLORS],
    ["furPattern", BUDDY_FUR_PATTERNS],
    ["eyeColor", BUDDY_EYE_COLORS],
    ["noseColor", ["black", "brown", "pink"]],
    ["size", ["small", "medium", "large"]]
  ];
  return `
    <div class="admin-card">
      <p class="admin-card-title">Buddy (L15 → L22)</p>
      <p class="helper" style="margin-bottom:10px;">
        All attributes are live — D40 dropped eyes/nose only because raster
        sheets cannot recolour, and there are no sheets. The creator sets breed,
        fur colour, pattern, eyes and name; nose and size live here.
      </p>
      <div class="input-group">
        <label>Name</label>
        <input value="${h(b.name || "")}" onchange="state.buddy.name=this.value;render()">
      </div>
      ${fields.map(([key, opts]) => `
        <div class="input-group">
          <label>${h(key)}</label>
          <select onchange="state.buddy.${key}=this.value;render()">
            ${opts.map(o => `<option value="${h(o)}" ${b[key] === o ? "selected" : ""}>${h(o)}</option>`).join("")}
          </select>
        </div>
      `).join("")}
      <div class="input-group">
        <label>Pose</label>
        <select onchange="buddySetPose(parseInt(this.value,10))">
          ${BUDDY_POSES.map(p => `
            <option value="${p.id}" ${state.buddyPose === p.id ? "selected" : ""}>
              ${p.id}. ${h(p.name)}${p.idle ? " (idle)" : ""}
            </option>`).join("")}
        </select>
      </div>
      <p class="helper" style="font-size:10px;">
        Idle cycles poses ${BUDDY_IDLE_POSES.join(", ")} every 4–6s.
        Reduced motion: ${v3PrefersReducedMotion() ? "ON — idle stopped" : "off"}.
      </p>
    </div>
  `;
}
