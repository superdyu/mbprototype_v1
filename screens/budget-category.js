// ─── Budget Category Detail ────────────────────────────────────────────────────
// Shows sub-category breakdown for one budget category.
// Tap-to-edit amounts + ±$25 steppers. No sliders.
// Intentional toggle + "Set a Spending Target" CTA on actionable categories.

// Approximate sub-category BLS split percentages (share of category peer total)
const BUDGET_SUB_SPLIT = {
  housing:   { rent: 0.80, utilities: 0.15, hoa: 0.05 },
  food:      { groceries: 0.55, dining: 0.30, daily: 0.15 },
  transport: { car_fixed: 0.58, gas: 0.27, transit: 0.15 },
  lifestyle: { shopping: 0.33, entertain: 0.27, subs: 0.40 },
  savings:   { emergency: 0.33, retirement: 0.50, debt_extra: 0.17 }
};

function budgetCatCurrentCat() {
  return state.budget.categories.find(c => c.key === state.selectedBudgetCategory)
    || state.budget.categories[0];
}

function budgetSubPeerAvg(catKey, subKey) {
  const catPeer = budgetPeerAvg(catKey);
  const split   = (BUDGET_SUB_SPLIT[catKey] || {})[subKey] || 0;
  return Math.round(catPeer * split);
}

function budgetCatSetIntentional(val) {
  budgetCatCurrentCat().intentional = val;
  render();
}

function budgetCatSetTarget() {
  const cat   = budgetCatCurrentCat();
  const spend = budgetCategoryTotal(cat);
  const raw   = prompt(
    `Set a monthly target for ${cat.name}:\nCurrent spend: ${budgetFmt(spend)}`,
    cat.targetSpend ?? spend
  );
  if (raw === null) return;
  const val = parseInt(raw);
  if (!isNaN(val) && val >= 0) { cat.targetSpend = val; render(); }
}

function budgetCatAdjust(catIdx, subIdx, delta) {
  const sub = state.budget.categories[catIdx].subcategories[subIdx];
  sub.amount = Math.max(0, sub.amount + delta);
  render();
}

function budgetCatSetAmount(catIdx, subIdx, val) {
  state.budget.categories[catIdx].subcategories[subIdx].amount = Math.max(0, parseInt(val) || 0);
  debouncedRender();
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
function renderBudgetCategory() {
  const cat    = budgetCatCurrentCat();
  const catIdx = state.budget.categories.indexOf(cat);
  const income = budgetMonthlyIncome();
  const total  = budgetCategoryTotal(cat);
  const peer   = budgetPeerAvg(cat.key);
  const signal = budgetSignal(cat);
  const delta  = budgetDelta(total, peer);
  const isSavings   = cat.key === "savings";
  const showTarget  = signal && (signal.css.includes("worth-a-look") || signal.label === "Consider more");
  const aboveForCat = isSavings ? total < peer : total > peer;

  return `
    <!-- Back nav + category header -->
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="go('aboutMe')">← About Me</button>

      <div class="row" style="align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:16px;margin-bottom:6px;">${cat.icon} <strong>${h(cat.name)}</strong></div>
          <div style="font-size:26px;font-weight:850;line-height:1;">${budgetFmt(total)}<span style="font-size:13px;font-weight:600;color:var(--muted);"> /mo</span></div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div class="helper" style="margin-bottom:2px;">Peer avg</div>
          <div style="font-size:16px;font-weight:850;">${budgetFmt(peer)}</div>
          <div style="font-size:11px;font-weight:850;color:${aboveForCat ? "var(--warn)" : "var(--good)"};">${delta}</div>
        </div>
      </div>
    </div>

    <!-- Signal + Intentional toggle -->
    <div class="card" style="margin-bottom:14px;">
      ${signal
        ? `<div class="budget-signal-pill ${signal.css}" style="margin-bottom:12px;">${h(signal.label)}</div>`
        : `<div class="budget-signal-pill context-only" style="margin-bottom:12px;">Fixed expense</div>`}

      <div class="row" style="margin-bottom:0;gap:12px;">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:850;margin-bottom:3px;">Mark as Intentional</div>
          <div class="helper" style="line-height:1.4;">${cat.intentional
            ? "You've decided this spend reflects your priorities."
            : (signal && !cat.fixed
                ? "Use this when you're aware of the spend and OK with it."
                : "Flag this as a conscious spending choice.")}</div>
        </div>
        <button class="budget-intentional-toggle${cat.intentional ? " active" : ""}"
                type="button" onclick="budgetCatSetIntentional(${!cat.intentional})">
          ${cat.intentional ? "On" : "Off"}
        </button>
      </div>

      ${showTarget ? `
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);">
          ${cat.targetSpend != null ? `
            <div class="row" style="margin-bottom:0;">
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:850;margin-bottom:2px;">
                  Target: ${budgetFmt(cat.targetSpend)}/mo
                </div>
                <div class="helper">${budgetFmt(Math.abs(total - cat.targetSpend))} ${total > cat.targetSpend ? "above" : "below"} target</div>
              </div>
              <button class="button secondary" style="font-size:12px;padding:8px 12px;"
                      type="button" onclick="budgetCatSetTarget()">Edit →</button>
            </div>
          ` : `
            <button class="button secondary full" type="button" onclick="budgetCatSetTarget()">
              Set a Spending Target →
            </button>
            <p class="helper" style="text-align:center;margin-top:6px;">
              Commit to a monthly amount to work toward
            </p>
          `}
        </div>
      ` : ""}
    </div>

    <!-- Sub-category breakdown -->
    <div class="card" style="margin-bottom:14px;">
      <div class="section-title" style="margin-bottom:14px;">Sub-categories</div>

      ${cat.subcategories.map((sc, si) => {
        const subPeer   = budgetSubPeerAvg(cat.key, sc.key);
        const subDelta  = sc.amount - subPeer;
        const aboveSub  = isSavings ? sc.amount < subPeer : sc.amount > subPeer;
        const pctIncome = income > 0 ? Math.min(100, sc.amount / income * 100) : 0;
        const peerPct   = income > 0 ? Math.min(100, subPeer  / income * 100) : 0;
        const isLast    = si === cat.subcategories.length - 1;

        return `
          <div style="${!isLast ? "margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--line);" : ""}">
            <!-- Name + peer ref -->
            <div class="row" style="margin-bottom:8px;">
              <span style="font-size:13px;font-weight:850;flex:1;">${h(sc.name)}</span>
              <span style="font-size:11px;font-weight:850;color:${aboveSub ? "var(--warn)" : "var(--good)"};">
                Peer ${budgetFmt(subPeer)} ${subDelta >= 0 ? "▲" : "▼"}${budgetFmt(Math.abs(subDelta))}
              </span>
            </div>

            <!-- Stepper -->
            <div class="budget-stepper">
              <button class="budget-stepper-btn" type="button"
                      onclick="budgetCatAdjust(${catIdx},${si},-25)">−</button>
              <input  class="budget-stepper-input" type="number" min="0"
                      value="${sc.amount}"
                      oninput="budgetCatSetAmount(${catIdx},${si},this.value)">
              <button class="budget-stepper-btn" type="button"
                      onclick="budgetCatAdjust(${catIdx},${si},25)">+</button>
            </div>

            <!-- Income-relative bar with peer marker -->
            <div>
              <div class="budget-sub-bar">
                <div class="budget-sub-bar-fill" style="width:${pctIncome.toFixed(1)}%;"></div>
                ${subPeer > 0
                  ? `<div class="budget-sub-bar-peer" style="left:${peerPct.toFixed(1)}%;"></div>`
                  : ""}
              </div>
              <div class="helper" style="margin-top:3px;font-size:10px;">
                ${pctIncome.toFixed(1)}% of income &nbsp;·&nbsp; peer ${peerPct.toFixed(1)}%
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <!-- Peer methodology footnote -->
    <div class="card" style="margin-bottom:14px;">
      <div class="section-title" style="margin-bottom:8px;">How peer data works</div>
      <p class="helper" style="margin:0;line-height:1.5;">
        Peer averages are based on BLS Consumer Expenditure Survey data, adjusted for your
        income (${budgetFmt(budgetMonthlyIncome())}/mo), household size
        (${state.budget.profile.householdSize} person${state.budget.profile.householdSize > 1 ? "s" : ""}),
        and cost-of-living index for ZIP ${h(state.budget.profile.zip)}
        (${(BUDGET_ZIP_INDEX[state.budget.profile.zip] || 1.0).toFixed(2)}×).
        Sub-category splits are approximate national averages within each bucket.
      </p>
    </div>
  `;
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function renderBudgetCategoryAdmin() {
  const cat    = budgetCatCurrentCat();
  const catIdx = state.budget.categories.indexOf(cat);

  return `
    <div class="admin-card">
      <p class="admin-card-title">${h(cat.name)} — Overrides</p>
      <div class="input-group">
        <label>Intentional toggle</label>
        <select onchange="state.budget.categories[${catIdx}].intentional=this.value==='true';render()">
          <option value="false" ${!cat.intentional ? "selected" : ""}>Off</option>
          <option value="true"  ${cat.intentional  ? "selected" : ""}>On</option>
        </select>
      </div>
      <div class="input-group">
        <label>Target spend (blank = none)</label>
        <input type="number" min="0" value="${cat.targetSpend ?? ""}"
               oninput="state.budget.categories[${catIdx}].targetSpend=this.value?parseInt(this.value):null;debouncedRender()">
      </div>
    </div>

    <div class="admin-card">
      <p class="admin-card-title">Sub-category amounts</p>
      ${cat.subcategories.map((sc, si) => `
        <div class="input-group">
          <label>${h(sc.name)}</label>
          <input type="number" min="0" value="${sc.amount}"
                 oninput="state.budget.categories[${catIdx}].subcategories[${si}].amount=parseInt(this.value)||0;debouncedRender()">
        </div>
      `).join("")}
      <div class="helper">Category total: ${budgetFmt(budgetCategoryTotal(cat))} · Peer avg: ${budgetFmt(budgetPeerAvg(cat.key))}</div>
    </div>
  `;
}
