// ─── Buddy (L15) ──────────────────────────────────────────────────────────────
// No AI-generated art and no hand-drawn SVG. The stage renders a LABELLED
// PLACEHOLDER that describes, in text, what the user would be seeing given
// their choices.
//
// Why this and not a coloured square: it proves the customization plumbing
// works end to end. A tester picks a breed and the stage visibly reflects it —
// the choice registers and is legible, which is what onboarding step 7 exists
// to test. A swatch would test nothing.
//
// D39/D40 are void in practice. Flat cream sheets, CSS background-position
// cropping, six fixed sheets and the dropped eye/nose colours were all
// consequences of raster art being unable to recolour. There is no sheet to
// crop, so DO NOT build the cropping machinery — see the "Don't" list in
// versions/v3/CLAUDE.md.

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

/** The stage. `opts.compact` shrinks it for surfaces that are not Home. */
function renderBuddyStage(opts) {
  const compact = !!(opts && opts.compact);
  return `
    <div class="buddy-stage ${compact ? "buddy-stage-compact" : ""}">
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
  return `
    <p class="buddy-name">${h(b.name || "Your buddy")}</p>
    <p class="buddy-desc">${h(breed)}${b.furColor ? " · " + h(b.furColor) + " fur" : ""}</p>
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
    ["breed", ["golden_retriever", "corgi", "beagle"]],
    ["furColor", ["cream", "golden", "chocolate", "grey", "tan and white", "tricolor"]],
    ["eyeColor", ["brown", "amber", "blue", "green"]],
    ["noseColor", ["black", "brown", "pink"]],
    ["size", ["small", "medium", "large"]]
  ];
  return `
    <div class="admin-card">
      <p class="admin-card-title">Buddy (placeholder, L15)</p>
      <p class="helper" style="margin-bottom:10px;">
        All five attributes are live — D40 dropped eyes/nose only because raster
        sheets cannot recolour, and there are no sheets.
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
