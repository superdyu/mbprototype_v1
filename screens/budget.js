// ─── Budget Dashboard ─────────────────────────────────────────────────────────
// Main Budget tab. Renders one of five states driven by state.budget.status:
//   empty       → ghosted promise view + CTA to start Baby Budget
//   in-progress → partial view + banner to finish setup
//   complete    → full dashboard (category tiles, peer comparison, reconciliation)
//   refresh     → complete view + stale-data banner (future full implementation)
//   checkup     → complete view + check-in banner (future full implementation)
//
// Peer averages are computed at render time from profile + hardcoded BLS baselines.
// No sliders — category amounts edited via tap-to-edit + ± steppers on detail screen.

// ─── Peer data constants ─────────────────────────────────────────────────────
// Base peer averages: national median at $75K household income, 2-person household.
// Source: BLS Consumer Expenditure Survey (prototype approximation).
const BUDGET_PEER_BASE = {
  housing:   1800,
  food:       650,
  transport:  820,
  lifestyle:  480,
  savings:    600
};

// Per-additional-person multiplier (above the 1-person baseline)
// e.g. householdSize=2 → food peerAvg *= 1 + (1 * 0.75) = 1.75
const BUDGET_HOUSEHOLD_MULT = {
  housing:   0.20,
  food:      0.75,
  transport: 0.50,
  lifestyle: 0.60,
  savings:   0.80
};

// ZIP cost-of-living index. Fallback = 1.0 (national average).
const BUDGET_ZIP_INDEX = {
  "95126": 1.45, "95014": 1.70, "95054": 1.55,
  "10001": 1.65, "10002": 1.65, "90210": 1.80,
  "77001": 0.95, "60601": 1.20, "30301": 0.90
};

// ─── Helper functions ─────────────────────────────────────────────────────────
function budgetMonthlyIncome() {
  const p = state.budget.profile;
  if (p.incomeType === "variable") {
    const months = p.variableIncomeMonths;
    return Math.round(months.reduce((a, b) => a + b, 0) / months.length);
  }
  if (p.incomeType === "mixed") {
    const salaryTotal = p.earners.filter(e => e.type === "salary").reduce((s, e) => s + e.monthlyNet, 0);
    const months = p.variableIncomeMonths;
    const varAvg = Math.round(months.reduce((a, b) => a + b, 0) / months.length);
    return salaryTotal + varAvg;
  }
  // salary
  return p.earners.reduce((s, e) => s + e.monthlyNet, 0);
}

function budgetMonthlyNetSpend() {
  const b = state.budget;
  const income = budgetMonthlyIncome();
  return Math.round((b.balanceStart - b.balanceEnd + income * 3 - b.debtDrawn + b.assetsSold) / 3);
}

function budgetCategoryTotal(cat) {
  return cat.subcategories.reduce((s, sc) => s + sc.amount, 0);
}

function budgetFixedOverheadTotal() {
  return state.budget.fixedOverhead.reduce((s, f) => s + f.amount, 0);
}

function budgetPlanTotal() {
  return state.budget.categories.reduce((s, c) => s + budgetCategoryTotal(c), 0)
    + budgetFixedOverheadTotal();
}

function budgetPeerAvg(catKey) {
  const p = state.budget.profile;
  const income = budgetMonthlyIncome();
  const base   = BUDGET_PEER_BASE[catKey] || 0;
  const hmult  = BUDGET_HOUSEHOLD_MULT[catKey] || 0.5;
  const hhSize = Math.max(1, p.householdSize || 1);
  const hFactor = 1 + (hhSize - 1) * hmult;
  const zipIdx  = BUDGET_ZIP_INDEX[p.zip] || 1.0;
  const incomeRatio = income / 75000;
  return Math.round(base * incomeRatio * hFactor * zipIdx);
}

// Signal logic for a category tile
// Returns: { label, cssClass }
function budgetSignal(cat) {
  const spend   = budgetCategoryTotal(cat);
  const peer    = budgetPeerAvg(cat.key);
  const isSavings = cat.key === "savings";

  // Savings: signal when BELOW peer avg (want to save MORE, not less)
  if (isSavings) {
    if (spend >= peer)         return { label: "On track",  css: "on-track" };
    if (cat.intentional)       return { label: "Intentional ✓", css: "intentional" };
    return { label: "Consider more", css: "worth-a-look" };
  }

  // Fixed categories: no actionable signal, just context
  if (cat.fixed) return null;

  // Discretionary
  if (spend <= peer)            return { label: "On track",       css: "on-track" };
  if (cat.intentional)          return { label: "Intentional ✓",  css: "intentional" };
  if (spend > peer * 1.5)       return { label: "Worth a look ↑", css: "worth-a-look strong" };
  return { label: "Worth a look", css: "worth-a-look" };
}

function budgetFmt(n) {
  return "$" + Math.abs(Math.round(n)).toLocaleString();
}

function budgetDelta(spend, peer) {
  const d = spend - peer;
  return (d >= 0 ? "+" : "−") + "$" + Math.abs(Math.round(d)).toLocaleString();
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
function renderBudget() {
  const status = state.budget.status;

  if (status === "empty")       return renderBudgetEmpty();
  if (status === "in-progress") return renderBudgetInProgress();
  return renderBudgetComplete(status); // complete, refresh, checkup
}

// ── Empty state ───────────────────────────────────────────────────────────────
function renderBudgetEmpty() {
  const cats = state.budget.categories;
  return `
    <div class="card" style="margin-bottom:14px;">
      <h1 class="title" style="margin-bottom:4px;">Budget</h1>
      <p class="subtitle">Your personalized spending picture, compared to people like you.</p>
    </div>

    <!-- Promise view: ghosted tiles -->
    <div class="budget-ghost-wrap">
      <div class="budget-ghost-overlay">
        <div class="budget-ghost-card">
          <p class="section-title" style="margin:0 0 6px;">Build your budget first</p>
          <p class="helper" style="margin-bottom:14px;">
            Answer a few questions and we'll show how your spending compares to
            households with similar income, location, and size.
          </p>
          <button class="button full" type="button" onclick="go('babyBudget')">Build Your Budget</button>
        </div>
      </div>

      <div class="budget-tile-grid" style="opacity:.22;pointer-events:none;filter:blur(2px);">
        ${cats.map(cat => renderBudgetTileGhost(cat)).join("")}
      </div>
    </div>
  `;
}

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

// ── In-progress state ─────────────────────────────────────────────────────────
function renderBudgetInProgress() {
  const pct = Math.min(100, Math.max(0, state.budget.inProgressPct || 0));
  const cats = state.budget.categories;
  return `
    <div class="card" style="background:var(--accent-soft);border-color:#c7d4ff;margin-bottom:14px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="font-size:20px;flex-shrink:0;">📋</div>
        <div style="flex:1;">
          <p style="font-size:13px;font-weight:850;margin:0 0 3px;">You're ${pct}% through setup</p>
          <p class="helper" style="margin:0 0 12px;">Finish your budget to unlock your full spending picture and peer comparison.</p>
          <button class="button full" type="button" onclick="go('babyBudget')">Continue Setup</button>
        </div>
      </div>
    </div>

    <div class="budget-tile-grid" style="opacity:.35;pointer-events:none;">
      ${cats.map(cat => renderBudgetTileGhost(cat)).join("")}
    </div>
  `;
}

// ── Complete / refresh / checkup state ────────────────────────────────────────
function renderBudgetComplete(status) {
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
      <div class="card" style="background:#fff7ed;border-color:#fed7aa;margin-bottom:14px;">
        <p style="font-size:13px;font-weight:850;margin:0 0 3px;">Your budget may be outdated</p>
        <p class="helper" style="margin:0 0 10px;">Last updated ${h(b.profile.lastUpdated || "a while ago")}. Enter updated balances to refresh your picture.</p>
        <button class="button secondary" type="button" onclick="go('babyBudget')">Update Now</button>
      </div>
    ` : ""}
    ${status === "checkup" ? `
      <div class="card" style="background:var(--accent-soft);border-color:#c7d4ff;margin-bottom:14px;">
        <p style="font-size:13px;font-weight:850;margin:0 0 3px;">Time for a spending check-in</p>
        <p class="helper" style="margin:0 0 10px;">Compare your actual spending to your budget plan — takes 2 minutes.</p>
        <button class="button secondary" type="button" onclick="go('babyBudget')">Start Check-in</button>
      </div>
    ` : ""}

    <!-- Header -->
    <div class="card" style="margin-bottom:14px;">
      <div class="row" style="margin-bottom:2px;">
        <h1 class="title" style="margin:0;font-size:20px;">Monthly Budget</h1>
        <span class="helper">${h(b.profile.zip)} · ${b.profile.householdSize} person${b.profile.householdSize > 1 ? "s" : ""}</span>
      </div>

      <!-- Plan vs Trend -->
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
          <div class="progress-fill" style="width:${Math.min(100, plan/income*100).toFixed(1)}%;background:${plan > income ? "var(--danger)" : "var(--accent)"};border-radius:99px;height:100%;transition:width .3s ease;"></div>
        </div>
        <div class="helper" style="margin-top:4px;text-align:right;">${(plan/income*100).toFixed(0)}% of income allocated</div>
      </div>

      <!-- Reconciliation signal -->
      ${gapPct > 0.10 ? `
        <div style="margin-top:10px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;font-size:12px;">
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

    <!-- Footer -->
    <div style="padding-bottom:8px;">
      <button class="button secondary full" type="button" onclick="go('babyBudget')">Edit Budget</button>
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

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function renderBudgetAdmin() {
  const b = state.budget;
  const p = b.profile;
  const income = budgetMonthlyIncome();
  const trend  = budgetMonthlyNetSpend();

  return `
    <!-- Status -->
    <div class="admin-card">
      <p class="admin-card-title">Budget Status</p>
      <div class="input-group">
        <label>Status</label>
        <select onchange="state.budget.status=this.value;render()">
          ${["empty","in-progress","complete","refresh","checkup"].map(s =>
            `<option value="${s}" ${b.status === s ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </div>
      ${b.status === "in-progress" ? `
        <div class="input-group">
          <label>In-progress % (0–100)</label>
          <input type="number" min="0" max="100" value="${b.inProgressPct}"
                 oninput="state.budget.inProgressPct=parseInt(this.value)||0;debouncedRender()">
        </div>
      ` : ""}
    </div>

    <!-- Profile -->
    <div class="admin-card">
      <p class="admin-card-title">Profile</p>
      <div class="grid-two">
        <div class="input-group" style="margin:0;">
          <label>ZIP code</label>
          <input value="${h(p.zip)}" oninput="state.budget.profile.zip=this.value;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Household size</label>
          <input type="number" min="1" value="${p.householdSize}"
                 oninput="state.budget.profile.householdSize=parseInt(this.value)||1;debouncedRender()">
        </div>
      </div>
    </div>

    <!-- Income model -->
    <div class="admin-card">
      <p class="admin-card-title">Income Model</p>
      <div class="input-group">
        <label>Income type</label>
        <select onchange="state.budget.profile.incomeType=this.value;render()">
          ${["salary","variable","mixed"].map(t =>
            `<option value="${t}" ${p.incomeType === t ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </div>

      ${(p.incomeType === "salary" || p.incomeType === "mixed") ? `
        <p class="helper" style="margin-bottom:8px;">Salary earners</p>
        ${p.earners.map((e, i) => `
          <div class="grid-two" style="margin-bottom:8px;align-items:end;">
            <div class="input-group" style="margin:0;">
              <label>Label</label>
              <input value="${h(e.label)}"
                     oninput="state.budget.profile.earners[${i}].label=this.value;debouncedRender()">
            </div>
            <div class="input-group" style="margin:0;">
              <label>Monthly net ($)</label>
              <input type="number" min="0" value="${e.monthlyNet}"
                     oninput="state.budget.profile.earners[${i}].monthlyNet=parseInt(this.value)||0;debouncedRender()">
            </div>
          </div>
        `).join("")}
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button class="button secondary" style="flex:1;font-size:11px;" type="button"
                  onclick="state.budget.profile.earners.push({label:'Earner '+(state.budget.profile.earners.length+1),monthlyNet:0,type:'salary'});render()">
            + Add Earner
          </button>
          ${p.earners.length > 1 ? `
            <button class="button secondary" style="font-size:11px;" type="button"
                    onclick="state.budget.profile.earners.pop();render()">
              − Remove
            </button>
          ` : ""}
        </div>
      ` : ""}

      ${(p.incomeType === "variable" || p.incomeType === "mixed") ? `
        <p class="helper" style="margin-bottom:8px;">Variable income — last 3 months (oldest → recent)</p>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          ${p.variableIncomeMonths.map((v, i) => `
            <div class="input-group" style="margin:0;flex:1;">
              <label>${i === 0 ? "3 mo ago" : i === 1 ? "2 mo ago" : "Last mo"}</label>
              <input type="number" min="0" value="${v}"
                     oninput="state.budget.profile.variableIncomeMonths[${i}]=parseInt(this.value)||0;debouncedRender()">
            </div>
          `).join("")}
        </div>
      ` : ""}

      <div class="helper" style="margin-top:4px;">
        Computed monthly income: <strong>${budgetFmt(income)}</strong>
      </div>
    </div>

    <!-- Bottom-line math -->
    <div class="admin-card">
      <p class="admin-card-title">3-Month Balance Inputs</p>
      <p class="helper" style="margin-bottom:10px;">
        monthlyNetSpend = (start − end + income×3 − debt + assets) ÷ 3
      </p>
      <div class="grid-two">
        <div class="input-group" style="margin:0;">
          <label>Balance start ($)</label>
          <input type="number" value="${b.balanceStart}"
                 oninput="state.budget.balanceStart=parseInt(this.value)||0;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Balance end ($)</label>
          <input type="number" value="${b.balanceEnd}"
                 oninput="state.budget.balanceEnd=parseInt(this.value)||0;debouncedRender()">
        </div>
      </div>
      <div class="grid-two" style="margin-top:8px;">
        <div class="input-group" style="margin:0;">
          <label>Debt drawn ($)</label>
          <input type="number" value="${b.debtDrawn}"
                 oninput="state.budget.debtDrawn=parseInt(this.value)||0;debouncedRender()">
        </div>
        <div class="input-group" style="margin:0;">
          <label>Assets sold ($)</label>
          <input type="number" value="${b.assetsSold}"
                 oninput="state.budget.assetsSold=parseInt(this.value)||0;debouncedRender()">
        </div>
      </div>
      <div class="helper" style="margin-top:8px;">
        Computed spend trend: <strong>${budgetFmt(trend)}/mo</strong>
      </div>
    </div>

    <!-- Category spend overrides -->
    <div class="admin-card">
      <p class="admin-card-title">Category Amounts</p>
      ${b.categories.map((cat, ci) => `
        <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line);">
          <div style="font-size:12px;font-weight:850;margin-bottom:6px;">${cat.icon} ${h(cat.name)}</div>
          ${cat.subcategories.map((sc, si) => `
            <div class="input-group" style="margin-bottom:6px;">
              <label>${h(sc.name)}</label>
              <input type="number" min="0" value="${sc.amount}"
                     oninput="state.budget.categories[${ci}].subcategories[${si}].amount=parseInt(this.value)||0;debouncedRender()">
            </div>
          `).join("")}
          <div class="helper">Total: ${budgetFmt(budgetCategoryTotal(cat))} · Peer avg: ${budgetFmt(budgetPeerAvg(cat.key))}</div>
        </div>
      `).join("")}
    </div>
  `;
}
