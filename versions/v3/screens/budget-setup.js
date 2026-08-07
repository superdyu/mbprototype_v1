// ─── Budget Setup ─────────────────────────────────────────────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible — Budget tab highlighted
//
// PURPOSE
// Budget input sub-screen within the Budget tab (screen id `aboutMe`). Two jobs,
// split by budget status:
//   - No budget yet  → the SETUP CHOICE: Lifestyle Survey vs 2 Minute Budget.
//     This is the single front door for first-time setup; every entry point
//     (Budget tab overlay, home task card) routes here rather than jumping
//     straight into the wizard, so the choice can't be skipped.
//   - Budget exists   → current parameters (income, ZIP, household, major bills)
//     plus Edit Budget, See Results, and the category drill-down.
//
// NAVIGATION
//   Entry: Budget tab → Budget card; Budget tab empty-state overlay;
//          home task card "Build your starter budget"
//          Chat: budget/planning keyword route when a budget already exists
//   Exit:  ← Budget; "Build my budget" → startBudgetBuilder() (Phase 2 wizard);
//          See Results → myProgress; Update now → monthly update flow
//
// STATES
//   empty/in-progress: the side-by-side setup choice (renderBudgetChoice)
//   complete/refresh/checkup: current budget parameters + Edit Budget CTA
//
// PRODUCTION NOTES
//   Budget categories are drillable via selectBudgetCategory().
//   Update This Month captures account + debt balance snapshots (monthly tracking).
//   When monthly update detects >10% gap vs budget estimate, prompts to revisit
//   the wizard's sliders for a full budget refresh.

function renderBudgetSetup() {
  const status    = state.budget.status;
  const isEmpty   = status === "empty";

  if (!isEmpty) return renderBudgetDashboard(status);

  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="goBackFromBudgetSetup()">← ${state.flowOrigin === 'myProgress' ? 'My Progress' : 'Budget'}</button>
      <h1 class="title" style="margin:0;font-size:20px;">Budget</h1>
      <p class="subtitle" style="margin:4px 0 0;">Build it once. Update it when life changes.</p>
    </div>

    ${renderBudgetChoice()}
  `;
}

// ─── Monthly Budget dashboard (budget exists) ─────────────────────────────────
// Restored from the original pre-cleanup dashboard (git b00db64 screens/
// budget.js renderBudgetComplete/renderBudgetTile): header metrics, allocation
// bar, plan-vs-trend gap signal, category tile grid with peer-comparison
// signal pills, Savings & Goals with milestone mini-rows. Adapted to the
// current flows: builtWith stamp, startBudgetBuilder(), and the monthly-update
// entry; hex colors → theme tokens.
function renderBudgetDashboard(status, opts) {
  const asTab  = !!(opts && opts.asTab);   // hosted as the Budget tab → no back button
  const b      = state.budget;
  const income = budgetMonthlyIncome();
  const trend  = budgetMonthlyNetSpend();
  const plan   = budgetPlanTotal();
  const remain = income - plan;
  const gap    = Math.abs(trend - plan);
  const gapPct = plan > 0 ? gap / plan : 0;
  const fixedTotal = budgetFixedOverheadTotal();

  return `
    ${status === "refresh" ? `
      <div class="card" style="background:var(--warn-bg);border-color:var(--warn-border);margin-bottom:14px;">
        <p style="font-size:13px;font-weight:850;margin:0 0 3px;">Your budget may be outdated</p>
        <p class="helper" style="margin:0 0 10px;">Last updated ${h(b.profile.lastUpdated || "a while ago")}. Enter updated balances to refresh your picture.</p>
        <button class="button secondary" type="button" onclick="startBudgetBuilder()">Update Now</button>
      </div>
    ` : ""}
    ${status === "checkup" ? `
      <div class="card" style="background:var(--accent-soft);border-color:var(--accent-border);margin-bottom:14px;">
        <p style="font-size:13px;font-weight:850;margin:0 0 3px;">Time for a spending check-in</p>
        <p class="helper" style="margin:0 0 10px;">Compare your actual spending to your budget plan — takes 2 minutes.</p>
        <button class="button secondary" type="button" onclick="startBudgetBuilder()">Start Check-in</button>
      </div>
    ` : ""}

    <!-- Header -->
    <div class="card" style="margin-bottom:14px;">
      ${asTab ? "" : `<button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:12px;"
              type="button" onclick="goBackFromBudgetSetup()">← ${state.flowOrigin === 'myProgress' ? 'My Progress' : 'Budget'}</button>`}
      <div class="row" style="margin-bottom:2px;align-items:center;">
        <h1 class="title" style="margin:0;font-size:20px;">Monthly Budget</h1>
        <!-- Rebuild the whole budget from scratch (gated by the update-confirm flow). -->
        <button class="button secondary" style="font-size:11px;padding:6px 12px;" type="button"
                onclick="startBudgetBuilder()">Edit&nbsp;✎</button>
      </div>
      <p class="helper" style="margin:2px 0 0;font-size:11px;">
        ${h(b.profile.zip)} · ${b.profile.householdSize} person${b.profile.householdSize > 1 ? "s" : ""}${b.builtWith ? ` · Built with ${h(BUDGET_BUILDER_LABELS[b.builtWith] || b.builtWith)}${b.builtDate ? ` (${h(b.builtDate)})` : ""}` : ""}
      </p>

      <!-- Income / Plan / Remaining -->
      <div class="budget-header-grid">
        <div class="budget-header-metric">
          <div class="budget-header-label">Income</div>
          <div class="budget-header-value">${budgetFmt(income)}</div>
          <div class="budget-header-sub">/month</div>
        </div>
        <div class="budget-header-metric">
          <div class="budget-header-label">Plan</div>
          <div class="budget-header-value">${budgetFmt(plan)}</div>
          <div class="budget-header-sub">budgeted</div>
        </div>
        <div class="budget-header-metric" style="${remain < 0 ? "color:var(--danger)" : ""}">
          <div class="budget-header-label">Remaining</div>
          <div class="budget-header-value">${remain < 0 ? "−" : "+"}${budgetFmt(Math.abs(remain))}</div>
          <div class="budget-header-sub">vs income</div>
        </div>
      </div>

      <!-- Income allocation bar -->
      <div style="margin-top:10px;">
        <div class="progress" style="height:8px;border-radius:99px;overflow:hidden;background:var(--bar);">
          <div class="progress-fill" style="width:${income > 0 ? Math.min(100, plan/income*100).toFixed(1) : 0}%;background:${plan > income ? "var(--danger)" : "var(--accent)"};border-radius:99px;height:100%;transition:width .3s ease;"></div>
        </div>
        <div class="helper" style="margin-top:4px;text-align:right;">${income > 0 ? (plan/income*100).toFixed(0) : 0}% of income allocated</div>
      </div>

      <!-- Reconciliation signal -->
      ${gapPct > 0.10 ? `
        <div style="margin-top:10px;padding:10px 12px;background:var(--warn-bg);border:1px solid var(--warn-border);border-radius:12px;font-size:12px;">
          <span style="font-weight:850;">Plan: ${budgetFmt(plan)}</span>
          &nbsp;·&nbsp;
          <span style="font-weight:850;">Trend: ${budgetFmt(trend)}</span>
          &nbsp;·&nbsp;
          <span style="color:var(--warn);">⚠ ${budgetFmt(gap)} gap — some spending may be untracked</span>
        </div>
      ` : `
        <div style="margin-top:10px;font-size:12px;color:var(--muted);">
          Spend trend: ${budgetFmt(trend)}/mo &nbsp;·&nbsp; Plan and trend are within 10% ✓
        </div>
      `}
    </div>

    <!-- Category tiles -->
    <div class="budget-tile-grid">
      ${b.categories.map(cat => renderBudgetTile(cat, income)).join("")}
    </div>

    ${b.fixedOverhead.length > 0 ? `
    <!-- Fixed overhead summary -->
    <div class="card" style="margin-bottom:14px;">
      <div class="row">
        <div>
          <div style="font-size:12px;font-weight:850;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Required Payments</div>
          <div style="font-size:15px;font-weight:850;">${budgetFmt(fixedTotal)}/mo</div>
        </div>
        <button class="button secondary" style="font-size:11px;padding:8px 12px;" type="button"
                onclick="this.closest('.card').querySelector('.budget-overhead-detail').classList.toggle('hidden')">
          Details
        </button>
      </div>
      <div class="budget-overhead-detail hidden" style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px;">
        ${b.fixedOverhead.map(f => `
          <div class="row" style="padding:4px 0;">
            <span style="font-size:13px;">${h(f.name)}</span>
            <span style="font-size:13px;font-weight:850;">${budgetFmt(f.amount)}</span>
          </div>
        `).join("")}
        <p class="helper" style="margin-top:6px;">Fixed required payments are excluded from peer comparison signals — they're harder to change than discretionary categories.</p>
      </div>
    </div>
    ` : ""}

    <!-- Footer actions (whole-budget Edit lives in the header; these are the
         adjacent flows: results, monthly logging, alt rebuild, lifestyle). -->
    <div style="padding-bottom:8px;">
      <div class="row" style="gap:10px;margin-bottom:10px;">
        <button class="button primary" type="button" onclick="go('myProgress')">See Results</button>
        <button class="button secondary" type="button" onclick="startMonthlyUpdate()">Update Now</button>
      </div>
      <p class="helper" style="margin:0;font-size:11px;">
        <button type="button" style="background:none;border:none;color:var(--accent);font-size:11px;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;"
                onclick="go('lifestyle')">Lifestyle profile</button>
        — small answers sharpen your budget (${lifestyleCompletedCount()}/5).
      </p>
    </div>
  `;
}

// Ghosted header for the empty-budget "promise" view — the same income / plan /
// remaining layout as the live dashboard, but unpopulated ($—, empty bar).
function renderBudgetGhostHeader() {
  const metrics = [["Income", "/month"], ["Plan", "budgeted"], ["Remaining", "vs income"]];
  return `
    <div class="card" style="margin-bottom:14px;">
      <div class="row" style="margin-bottom:2px;">
        <h1 class="title" style="margin:0;font-size:20px;">Monthly Budget</h1>
      </div>
      <div class="budget-header-grid">
        ${metrics.map(([label, sub]) => `
        <div class="budget-header-metric">
          <div class="budget-header-label">${label}</div>
          <div class="budget-header-value">$—</div>
          <div class="budget-header-sub">${sub}</div>
        </div>`).join("")}
      </div>
      <div style="margin-top:10px;">
        <div class="progress" style="height:8px;border-radius:99px;overflow:hidden;background:var(--bar);">
          <div class="progress-fill" style="width:0%;background:var(--accent);border-radius:99px;height:100%;"></div>
        </div>
        <div class="helper" style="margin-top:4px;text-align:right;">— of income allocated</div>
      </div>
    </div>
  `;
}

function renderBudgetTile(cat, income) {
  const spend  = budgetCategoryTotal(cat);
  const peer   = budgetPeerAvg(cat.key);
  const delta  = budgetDelta(spend, peer);
  const signal = budgetSignal(cat);
  const isFull = cat.key === "savings";
  const pct    = income > 0 ? (spend / income * 100).toFixed(0) : 0;

  // Savings & Goals: show milestone connection
  const goalsMini = cat.key === "savings" ? renderBudgetGoalsMini() : "";

  return `
    <div class="budget-tile${isFull ? " budget-tile-full" : ""}"
         onclick="selectBudgetCategory('${h(cat.key)}')">
      <div class="budget-tile-top">
        <span class="budget-tile-icon">${cat.icon}</span>
        <span class="budget-tile-name">${h(cat.name)}</span>
      </div>
      <div class="budget-tile-amount">${budgetFmt(spend)}</div>
      ${signal ? `<div class="budget-signal-pill ${signal.css}">${h(signal.label)}</div>` : `<div class="budget-signal-pill context-only">Fixed expense</div>`}
      <div class="budget-tile-delta">${delta} vs peers · ${pct}% income</div>
      ${cat.targetSpend ? `<div class="budget-tile-target">Target: ${budgetFmt(cat.targetSpend)}</div>` : ""}
      ${goalsMini}
    </div>
  `;
}

// Non-interactive placeholder tile for the empty-budget "promise" grid — the
// square-grid layout, no real numbers yet. Reused by the Budget tab empty state.
function renderBudgetTileGhost(cat) {
  const isFull = cat.key === "savings";
  return `
    <div class="budget-tile${isFull ? " budget-tile-full" : ""}">
      <div class="budget-tile-top">
        <span class="budget-tile-icon">${cat.icon}</span>
        <span class="budget-tile-name">${h(cat.name)}</span>
      </div>
      <div class="budget-tile-amount">$—</div>
      <div class="budget-signal-pill on-track">On track</div>
      <div class="budget-tile-delta muted">vs peers</div>
    </div>
  `;
}

function renderBudgetGoalsMini() {
  const milestones = (state.milestones || []).slice(0, 2);
  if (!milestones.length) return "";
  return `
    <div class="budget-goals-mini">
      ${milestones.map(m => `
        <div class="budget-goals-row" onclick="event.stopPropagation();go('goals')">
          <span>${h(m.title)}</span>
          <span style="font-weight:850;">${m.progress}%</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ─── First-time setup: start the budget ──────────────────────────────────────
// Was a two-card fork (2 Minute Budget vs Lifestyle Survey). L6 retired both in
// favour of one 6-question lifestyle wizard, so there is no longer a choice to
// present — a picker with one option is just a button. Phase 2 builds the wizard
// and points startBudgetBuilder() at it; until then this opens the manual setup
// below, which still produces a budget.
function renderBudgetChoice() {
  return `
    <div class="section-title" style="margin:0 0 6px;">Let's build your budget</div>
    <p class="helper" style="margin-bottom:12px;">A few questions about how you live. No figures to guess at.</p>

    <div class="card" style="margin-bottom:0;display:flex;flex-direction:column;cursor:pointer;border-color:var(--accent);"
         onclick="startBudgetBuilder()">
      <div class="pill" style="align-self:flex-start;font-size:9px;padding:2px 7px;margin-bottom:8px;background:var(--accent);color:#fff;border-color:var(--accent);">Guided</div>
      <div class="task-title" style="margin-bottom:6px;">Build my budget</div>
      <p class="task-desc" style="flex:1;">
        Answer questions about how you live. We turn them into the numbers, so
        you never have to guess at a figure.
      </p>
      <p class="helper" style="font-size:10px;margin:10px 0 0;">~2 minutes &bull; No figures needed</p>
    </div>
  `;
}

function goBackFromBudgetSetup() {
  const origin = state.flowOrigin;
  if (origin && origin !== "aboutMe") {
    state.flowOrigin = null;
    go(origin);
  } else {
    go("aboutMe");
  }
}

// Phase 2 repoints this at the 6-question lifestyle wizard (L6). It must keep
// writing through submitBudgetBaseline() — the seam survives, only the builder
// behind it changed.
function startBudgetBuilder() {
  state.flowOrigin        = state.flowOrigin || "aboutMe";
  state.postResultContext = "budget";
  go("budgetSetup");
}

function startMonthlyUpdate() {
  if (state.budget.status === "empty") return;
  state.flowOrigin        = state.flowOrigin || "aboutMe";
  state.postResultContext = "monthlyUpdate";
  go("accountBalances");
}
