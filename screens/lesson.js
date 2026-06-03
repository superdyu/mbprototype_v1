// ─── Lesson Screen (Audiobook Player) ────────────────────────────────────────
// Full-height, no-scroll, three-section layout. Nav hidden by render.js.
//   Top:    staging area (accent bg, waveform, title, back button)
//   Middle: subtitle strip (prev / current / next sentence)
//   Bottom: audio controls (skip, play/pause/replay, speed, progress, Next)
//
// LP_SCRIPTS keyed by lesson ID — swap only the script to replace content.

const LP_SCRIPTS = {
  "interest-builds": [
    "Interest is the cost of borrowing money — or the reward for saving it.",
    "When you carry a balance on a credit card, interest is charged on what you owe.",
    "The tricky part: interest is calculated on your current balance, including interest already added.",
    "This is called compound interest, and it can work against you faster than you'd expect.",
    "A $1,000 balance at 24% APR grows by about $20 every month — even if you stop spending.",
    "After a year of minimum payments, you could owe more than you started with.",
    "The earlier you pay down a balance, the less interest gets a chance to compound.",
    "Understanding this is the first step to staying ahead of your debt, not behind it."
  ],
  "interest-refresher": [
    "Quick recap: interest compounds on your outstanding balance, not just the original amount.",
    "Higher APR means faster growth — 24% is roughly twice as costly as 12%.",
    "Paying more than the minimum each month cuts the compounding cycle short.",
    "Even small extra payments early make a significant difference over time."
  ],
  "budget-basics": [
    "A budget is a plan for your money before you spend it.",
    "The simplest approach: list your monthly income, then list your fixed expenses.",
    "What's left after essentials is your discretionary spending — the part you control.",
    "Even a rough budget is better than no budget — it makes invisible spending visible.",
    "Review it monthly. Your budget should reflect your life, not someone else's template."
  ],

  // ── Credit Cards ──
  "minimum-payments-trap": [
    "The minimum payment keeps your account in good standing — but barely.",
    "Most of your payment goes to interest, not the balance itself.",
    "At 24% APR, a $3,000 balance on minimums takes over 10 years to clear.",
    "The bank profits when you pay slowly — minimum payments are designed that way.",
    "Even $50 extra per month cuts years off your payoff timeline."
  ],

  // ── Emergency Fund ──
  "three-month-rule": [
    "An emergency fund is money set aside for the unexpected — job loss, medical bills, car repairs.",
    "The standard target: three to six months of essential expenses.",
    "Three months covers most short-term disruptions without requiring you to borrow.",
    "Without it, a single unexpected expense can push you into credit card debt.",
    "Start small — even $500 creates a buffer that breaks the debt cycle."
  ],
  "where-to-keep-it": [
    "Your emergency fund should be easy to access but not easy to spend.",
    "A high-yield savings account earns interest while keeping the money separate from daily spending.",
    "Avoid investing your emergency fund — markets drop exactly when emergencies happen.",
    "Separation from your checking account is the feature, not a bug."
  ],

  // ── Car Buying ──
  "total-cost-of-ownership": [
    "The sticker price is only one part of what a car actually costs.",
    "Insurance, fuel, maintenance, and registration add thousands per year.",
    "Depreciation is the hidden cost — most cars lose 15–20% of value in year one.",
    "A cheaper car with lower insurance and better fuel economy often wins over time.",
    "Total cost of ownership is the real number to compare, not monthly payment."
  ],
  "loan-vs-lease": [
    "Leasing means lower monthly payments, but you never own the car.",
    "Loans cost more monthly, but once paid off, you own an asset outright.",
    "Leasing makes sense if you want a new car every few years and drive low mileage.",
    "Buying makes sense if you plan to keep the car long-term and avoid mileage limits.",
    "Neither is universally better — it depends on how you use the car."
  ],

  // ── Home Buying ──
  "what-you-can-afford": [
    "A common rule: spend no more than 28% of your gross income on housing.",
    "Lenders look at your debt-to-income ratio — total monthly debt vs monthly income.",
    "Getting pre-approved tells you your actual budget, not just what you hope to spend.",
    "Stretching your budget for a home leaves no room for repairs, taxes, or life.",
    "Affordable means comfortable at your income today, not assuming a future raise."
  ],
  "hidden-costs-buying": [
    "Closing costs typically add 2–5% of the purchase price on top of your down payment.",
    "Property taxes vary by location and recalculate when you buy — budget carefully.",
    "HOA fees in condos or planned communities can run hundreds per month.",
    "A 1% annual maintenance reserve is a standard rule — $5,000 per year on a $500K home.",
    "First-time buyers often underestimate the gap between mortgage payment and total housing cost."
  ],

  // ── Retirement ──
  "why-start-now": [
    "Compound growth rewards people who start early more than people who save more later.",
    "Someone investing $200/month at 25 can end up with more than someone investing $400/month starting at 35.",
    "The math works because returns generate their own returns over time.",
    "Every year you wait costs more to make up for — the catch-up is not linear.",
    "Even a small amount invested now beats a larger amount invested later."
  ],
  "401k-and-the-match": [
    "A 401k is a retirement account your employer typically offers through your job.",
    "Many employers match a percentage of what you contribute — free money added to your account.",
    "Not contributing enough to get the full match is leaving part of your compensation on the table.",
    "Contributions reduce your taxable income now — you pay taxes when you withdraw in retirement.",
    "The match is the highest guaranteed return you'll find — always take it first."
  ],

  // ── Student Loans ──
  "federal-vs-private": [
    "Federal student loans come from the government; private loans come from banks and lenders.",
    "Federal loans offer income-driven repayment plans that private loans rarely provide.",
    "Federal loans can be paused during hardship — private loans usually can't.",
    "Interest rates on federal loans are fixed; private loan rates can be variable.",
    "Exhaust federal options before turning to private lenders — the protections are worth it."
  ],
  "income-driven-repayment": [
    "Income-driven repayment caps your federal loan payment as a percentage of your discretionary income.",
    "If your income is low, your payment can be as low as zero dollars per month.",
    "Balances remaining after 20–25 years may be forgiven, depending on the plan.",
    "IDR is not free — interest still accrues, and forgiven amounts may be taxed."
  ],

  // ── Health Insurance ──
  "deductible-vs-premium": [
    "Your premium is what you pay monthly to have insurance, whether you use it or not.",
    "Your deductible is what you pay out-of-pocket before insurance starts covering costs.",
    "High-deductible plans have lower premiums but leave you exposed to larger bills.",
    "Low-deductible plans cost more monthly but protect you if something major happens.",
    "The right choice depends on how often you use healthcare and how much risk you can absorb."
  ],
  "hsa-basics": [
    "A Health Savings Account lets you save pre-tax money for medical expenses.",
    "Contributions, growth, and withdrawals for medical costs are all tax-free — a triple benefit.",
    "HSAs are only available if you have a high-deductible health plan.",
    "Unused funds roll over every year — this is not a use-it-or-lose-it account."
  ],

  // ── Investments ──
  "index-funds-explained": [
    "An index fund tracks a market index — like the S&P 500 — instead of picking individual stocks.",
    "Because they don't require active management, fees are extremely low.",
    "Decades of data show most actively managed funds underperform low-cost index funds over time.",
    "You get instant diversification across hundreds of companies with a single fund.",
    "Index funds are not exciting — that's precisely why they work for most investors."
  ],
  "risk-and-time-horizon": [
    "Risk in investing means the chance your investment loses value — sometimes dramatically.",
    "Time horizon is how long before you need the money.",
    "If you have 30 years, short-term market drops don't matter much — time corrects them.",
    "If you need the money in 2 years, a market drop at the wrong moment is a real problem.",
    "Match your risk to your timeline: longer horizon, more stocks; shorter, more bonds."
  ]
};

// ─── Playback state ───────────────────────────────────────────────────────────
// All playback variables live in state.lessonPlayback (state.js).
// Consolidated there so navigation resets them cleanly and render.js doesn't
// need to read globals from lesson.js.

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lpFmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function lpHighlight(index) {
  const prev = document.getElementById("lp-prev");
  const curr = document.getElementById("lp-curr");
  const next = document.getElementById("lp-next");
  if (prev) prev.textContent = state.lessonPlayback.sentences[index - 1] || "";
  if (curr) curr.textContent = state.lessonPlayback.sentences[index]     || "";
  if (next) next.textContent = state.lessonPlayback.sentences[index + 1] || "";
}

function lpUpdateProgress() {
  // Normalize so index 0 = 0% and last index = 100%
  const last = Math.max(1, state.lessonPlayback.sentences.length - 1);
  const pct  = (state.lessonPlayback.index / last) * 100;
  const bar  = document.getElementById("lp-bar");
  if (bar) bar.style.width = Math.min(100, pct).toFixed(1) + "%";

  const total   = state.lessonPlayback.sentences.length * 3; // total seconds at 1×
  const elapsed = Math.round((state.lessonPlayback.index / last) * total);
  const timeEl  = document.getElementById("lp-time");
  if (timeEl) timeEl.textContent = lpFmtTime(elapsed);
}

function lpUpdatePlayBtn() {
  const btn  = document.getElementById("lp-playbtn");
  if (btn) btn.textContent = state.lessonPlayback.ended ? "↻" : (state.lessonPlayback.playing ? "⏸" : "▶");
  const wave = document.getElementById("lp-wave");
  if (wave) wave.classList.toggle("playing", state.lessonPlayback.playing && !state.lessonPlayback.ended);
}

function lpUnlockNext() {
  state.lessonPlayback.completed = true;
  const btn = document.getElementById("lp-next-btn");
  if (btn) btn.disabled = false;
}

function lpLockNext() {
  if (state.lessonPlayback.completed) return; // user already finished — keep Next available
  const btn = document.getElementById("lp-next-btn");
  if (btn) btn.disabled = true;
}

// ─── Playback controls ────────────────────────────────────────────────────────
function lpAdvance() {
  if (state.lessonPlayback.index < state.lessonPlayback.sentences.length - 1) {
    state.lessonPlayback.index++;
    lpHighlight(state.lessonPlayback.index);
    lpUpdateProgress();
  } else {
    // Reached end: snap to 100%, unlock Next, switch to replay icon
    state.lessonPlayback.ended = true;
    lpPause();
    const bar = document.getElementById("lp-bar");
    if (bar) bar.style.width = "100%";
    const timeEl = document.getElementById("lp-time");
    if (timeEl) timeEl.textContent = lpFmtTime(Math.round(state.lessonPlayback.sentences.length * 3 / state.lessonPlayback.speed));
    lpUnlockNext();
    lpUpdatePlayBtn();
  }
}

function lpPlay() {
  if (state.lessonPlayback.playing || state.lessonPlayback.ended) return;
  state.lessonPlayback.playing = true;
  state.lessonPlayback.timer = setInterval(lpAdvance, Math.round(3000 / state.lessonPlayback.speed));
  lpUpdatePlayBtn();
}

function lpPause() {
  state.lessonPlayback.playing = false;
  if (state.lessonPlayback.timer) { clearInterval(state.lessonPlayback.timer); state.lessonPlayback.timer = null; }
  lpUpdatePlayBtn();
}

// Stops playback and clears the interval. Called by render.js before destroying
// the lesson DOM so the timer doesn't fire against stale element references.
function lpStopPlayback() {
  state.lessonPlayback.playing = false;
  if (state.lessonPlayback.timer) { clearInterval(state.lessonPlayback.timer); state.lessonPlayback.timer = null; }
}

function lpTogglePlay() {
  if (state.lessonPlayback.playing) lpPause(); else lpPlay();
}

// Unified play button action — toggles play/pause or restarts if ended
function lpPlayAction() {
  if (state.lessonPlayback.ended) lpRestart(); else lpTogglePlay();
}

function lpRestart() {
  state.lessonPlayback.index  = 0;
  state.lessonPlayback.ended  = false;
  lpLockNext();
  lpHighlight(0);
  lpUpdateProgress();
  lpPlay();
}

// ±2 sentences per skip (~7s at 1×)
function lpSkip(delta) {
  if (state.lessonPlayback.ended && delta < 0) {
    // Allow seeking backward after end — clears ended state
    state.lessonPlayback.ended = false;
    lpLockNext();
  }
  state.lessonPlayback.index = Math.max(0, Math.min(state.lessonPlayback.sentences.length - 1, state.lessonPlayback.index + delta));
  lpHighlight(state.lessonPlayback.index);
  lpUpdateProgress();
  lpUpdatePlayBtn();
  if (state.lessonPlayback.playing) {
    clearInterval(state.lessonPlayback.timer);
    state.lessonPlayback.timer = setInterval(lpAdvance, Math.round(3000 / state.lessonPlayback.speed));
  }
}

function lpSetSpeed(s) {
  state.lessonPlayback.speed = s;
  const btn = document.getElementById("lp-speed");
  if (btn) btn.textContent = s + "×";
  if (state.lessonPlayback.playing) {
    clearInterval(state.lessonPlayback.timer);
    state.lessonPlayback.timer = setInterval(lpAdvance, Math.round(3000 / state.lessonPlayback.speed));
  }
}

function lpCycleSpeed() {
  const speeds = [1, 1.5, 2];
  lpSetSpeed(speeds[(speeds.indexOf(state.lessonPlayback.speed) + 1) % speeds.length]);
}

// Called by render.js after lesson screen HTML is written to DOM.
// Auto-starts fresh loads; resumes playback interrupted by a mid-play re-render.
function lpMountHook(wasPlaying) {
  if (state.lessonPlayback.pendingAutoPlay) { state.lessonPlayback.pendingAutoPlay = false; lpPlay(); }
  else if (wasPlaying)    { lpPlay(); }
}

function lpSeekTo(index) {
  state.lessonPlayback.index = Math.max(0, Math.min(state.lessonPlayback.sentences.length - 1, parseInt(index) || 0));
  state.lessonPlayback.ended = false;
  lpLockNext();
  lpHighlight(state.lessonPlayback.index);
  lpUpdateProgress();
  lpUpdatePlayBtn();
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
function renderLesson() {
  const lesson = state.currentLesson;

  if (!lesson) {
    return `
      <div class="card">
        <h1 class="title">Lesson</h1>
        <p class="subtitle">No lesson selected. Open a lesson from a topic page.</p>
      </div>
      <div class="flow-footer">
        <button class="button secondary" type="button" onclick="go('learn')">Back to Learn</button>
      </div>
    `;
  }

  // Reset state only when a different lesson is opened. Same-lesson re-renders
  // (e.g. admin stage-style toggle, debouncedRender) preserve playback position.
  if (state.lessonPlayback.currentLessonId !== lesson.id) {
    state.lessonPlayback.currentLessonId = lesson.id;
    state.lessonPlayback.sentences       = LP_SCRIPTS[lesson.id] || [
      "This lesson's content will be added soon.",
      "Tap Next to proceed to the quiz."
    ];
    state.lessonPlayback.index           = 0;
    state.lessonPlayback.playing         = false;
    state.lessonPlayback.ended           = false;
    state.lessonPlayback.completed       = false;
    state.lessonPlayback.speed           = 1;
    state.lessonPlayback.pendingAutoPlay = true;
    if (state.lessonPlayback.timer) { clearInterval(state.lessonPlayback.timer); state.lessonPlayback.timer = null; }
  }

  const isWaveform  = state.lpStageStyle !== "clean";
  const totalTime   = lpFmtTime(Math.round(state.lessonPlayback.sentences.length * 3));
  const last        = Math.max(1, state.lessonPlayback.sentences.length - 1);
  const barPct      = (state.lessonPlayback.index / last * 100).toFixed(1);
  const elapsed     = lpFmtTime(Math.round((state.lessonPlayback.index / last) * state.lessonPlayback.sentences.length * 3));
  const playLabel   = state.lessonPlayback.ended ? "↻" : (state.lessonPlayback.playing ? "⏸" : "▶");
  const waveClass   = `lp-wave${isWaveform ? "" : " lp-wave-hidden"}${state.lessonPlayback.playing && !state.lessonPlayback.ended ? " playing" : ""}`;

  return `
    <div class="lp-layout">

      <!-- TOP: staging area — accent bg, waveform, title, back button -->
      <div class="lp-stage">
        <button class="lp-back-btn" type="button" onclick="go('reward-preview')">‹</button>
        <div class="${waveClass}" id="lp-wave">
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
          <div class="lp-bar"></div>
        </div>
        <h1 class="lp-stage-title">${h(lesson.title)}</h1>
      </div>

      <!-- MIDDLE: subtitle strip — shows prev / current / next sentence -->
      <div class="lp-subtitle">
        <p class="lp-sub-prev" id="lp-prev">${h(state.lessonPlayback.sentences[state.lessonPlayback.index - 1] || "")}</p>
        <p class="lp-sub-curr" id="lp-curr">${h(state.lessonPlayback.sentences[state.lessonPlayback.index]     || "")}</p>
        <p class="lp-sub-next" id="lp-next">${h(state.lessonPlayback.sentences[state.lessonPlayback.index + 1] || "")}</p>
      </div>

      <!-- BOTTOM: audio controls -->
      <div class="lp-controls">
        <div class="lp-ctrl-row">
          <button class="button secondary lp-ctrl-btn" type="button" onclick="lpSkip(-2)">◀ 7s</button>
          <button class="button lp-ctrl-btn" id="lp-playbtn" type="button" onclick="lpPlayAction()">${playLabel}</button>
          <button class="button secondary lp-ctrl-btn" type="button" onclick="lpSkip(2)">7s ▶</button>
          <button class="button secondary lp-speed-btn" id="lp-speed" type="button" onclick="lpCycleSpeed()">${state.lessonPlayback.speed}×</button>
        </div>
        <div class="lp-progress-row">
          <span id="lp-time" class="lp-time-label">${elapsed}</span>
          <div class="lp-progress">
            <div class="lp-progress-fill" id="lp-bar" style="width:${barPct}%;"></div>
          </div>
          <span class="lp-time-label">${totalTime}</span>
        </div>
        <button class="button full" id="lp-next-btn" type="button" onclick="go('quiz')" ${(state.lessonPlayback.ended || state.lessonPlayback.completed) ? "" : "disabled"}>Next</button>
      </div>

    </div>
  `;
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function renderLessonAdmin() {
  return `
    <div class="admin-card">
      <p class="admin-card-title">Lesson Player</p>
      <div class="input-group">
        <label>Stage style</label>
        <select onchange="state.lpStageStyle=this.value;render()">
          <option value="waveform" ${state.lpStageStyle !== "clean" ? "selected" : ""}>Waveform</option>
          <option value="clean"    ${state.lpStageStyle === "clean"  ? "selected" : ""}>Clean (title only)</option>
        </select>
      </div>
      <div class="input-group">
        <label>Jump to sentence (0–${state.lessonPlayback.sentences.length - 1})</label>
        <input type="number" min="0" max="${state.lessonPlayback.sentences.length - 1}" value="${state.lessonPlayback.index}"
               oninput="lpSeekTo(this.value)">
      </div>
      <p class="helper" style="margin-top:6px;">
        ${state.lessonPlayback.sentences.length} sentences · ~${lpFmtTime(Math.round(state.lessonPlayback.sentences.length * 3))} at 1×
      </p>
    </div>
  `;
}
