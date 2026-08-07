// ─── My Progress ──────────────────────────────────────────────────────────────
// TAB: My Progress | NAV BAR: Visible
//
// PURPOSE
// Primary output hub. Shows the user's money picture based on all their Budget
// inputs — budget results, comparisons, goals progress, and the assumptions
// that drove those estimates. Read-first; every section links back to Budget
// for editing.
//
// NAVIGATION
//   Entry: My Progress tab tap; completing any Budget input flow
//   Exit:  Edit links → Budget sub-screens; back to Budget after editing
//
// STATES
//   Sections render with placeholder/seed data when no real data is present.
//   Budget Results: mirrors category totals + fixed overhead from budget state.
//   monthlyUpdateGap: when non-null, Budget Results shows a check-in banner prompting refresh.
//   Assumptions Used: shows lifestyle answers + budget profile inputs.
//   Goals: shows progress bars for state.goals[].
//   Active Commitments: shows state.commitments[].
//
// PRODUCTION NOTES
//   Section order (confirmed): Profile → Budget Results → Assumptions Used →
//   Comparisons → Goals → Active Commitments.
//   Edit links navigate to Budget sub-screens and should restore My Progress
//   as the return destination (state.flowOrigin = "myProgress").
//   Assumptions math (ZIP modifier, peer comparisons) reuses existing
//   budget-utils.js functions.

function renderMyProgress() {
  const hasBudget = state.budget.status !== "empty";

  return `
    <div class="home-header">
      <div>
        <h1 class="title">My Progress</h1>
        <p class="subtitle">Your money picture, in motion.</p>
      </div>
    </div>

    <!-- 1. Your Money Profile -->
    ${renderMPProfile()}

    <!-- 2. Budget Results -->
    ${renderMPBudgetResults(hasBudget)}

    <!-- 3. Comparisons -->
    ${renderMPComparisons(hasBudget)}

    <!-- 4. Goals -->
    ${renderMPGoals()}

    <!-- 5. Active Commitments -->
    ${renderMPCommitments()}
  `;
}

function renderMPProfile() {
  const profile = state.budget.profile;
  const up      = state.userProfile;
  const name    = up && up.name ? up.name : null;
  const zip     = profile && profile.zip ? profile.zip : null;
  const size    = profile && profile.householdSize ? profile.householdSize : null;
  const income  = budgetMonthlyIncome();
  const updated = profile && profile.lastUpdated ? profile.lastUpdated : null;
  const themes = LIFESTYLE_THEMES || [];
  const answeredThemes = themes.filter(t => {
    const la = state.lifestyleAnswers && state.lifestyleAnswers[t.key];
    return la && la.lastUpdated;
  });

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Your Money Profile</div>
        <button class="button secondary small" style="border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                type="button" onclick="editInAboutMe('aboutMe')">Edit</button>
      </div>
      ${name ? `<p class="helper" style="margin-bottom:4px;">${h(name)}</p>` : ""}
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;">
        ${zip ? h(zip) : ""}${zip && size ? " – " : ""}${size ? size + " Person" + (size !== 1 ? "s" : "") : ""}${(zip || size) && income > 0 ? " – " : ""}${income > 0 ? budgetFmt(income) + "/mo" : ""}
      </div>
      ${updated ? `<p class="helper" style="margin:0 0 8px;">Last updated ${h(updated)}</p>` : ""}
      ${!zip && !income ? `<p class="helper">No profile data yet. <button class="button secondary small" style="margin-left:6px;" type="button" onclick="go('budgetSetup')">Build Budget</button></p>` : ""}

      <details style="margin-top:8px;">
        <summary class="helper" style="cursor:pointer;font-weight:700;">Assumptions used</summary>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);">
          ${zip ? `<p class="helper" style="margin-bottom:6px;">ZIP ${h(zip)} cost-of-living modifier applied</p>` : ""}
          ${size ? `<p class="helper" style="margin-bottom:6px;">${size}-person household multiplier applied</p>` : ""}
          ${answeredThemes.length > 0 ? `
            <p class="helper" style="font-weight:700;margin-bottom:4px;">Lifestyle signals</p>
            ${answeredThemes.map(t => `<p class="helper" style="margin-bottom:2px;">${h(t.label)} · Updated ${h(state.lifestyleAnswers[t.key].lastUpdated)}</p>`).join("")}
          ` : `<p class="helper">No lifestyle data yet.</p>`}
          ${answeredThemes.length === 0 ? `
            <button class="button secondary small" style="margin-top:6px;border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                    type="button" onclick="editInAboutMe('lifestyle')">Update Lifestyle</button>
          ` : ""}
        </div>
      </details>
    </div>
  `;
}

function renderMPBudgetResults(hasBudget) {
  if (!hasBudget) {
    return `
      <div class="card mb-md">
        <div class="row" style="margin-bottom:8px;">
          <div class="section-title" style="margin:0;">Budget Results</div>
        </div>
        <p class="helper">No budget yet. <button class="button secondary small" style="margin-left:6px;" type="button" onclick="go('budgetSetup')">Build Budget</button></p>
      </div>
    `;
  }

  const income    = budgetMonthlyIncome();
  const planTotal = budgetPlanTotal();
  const savings   = income - planTotal;

  // Non-discretionary: housing + fixed overhead
  const housingCat = state.budget.categories.find(c => c.key === "housing");
  const housingAmt = housingCat ? budgetCategoryTotal(housingCat) : 0;
  const fixedTotal = budgetFixedOverheadTotal();
  const nonDiscAmt = housingAmt + fixedTotal;

  // Discretionary: food, transport, lifestyle
  const discCats = ["food", "transport", "lifestyle"];
  const discAmt = discCats.reduce((s, key) => {
    const cat = state.budget.categories.find(c => c.key === key);
    return s + (cat ? budgetCategoryTotal(cat) : 0);
  }, 0);

  // Peer savings
  const peerSavings = budgetPeerAvg("savings");
  const savingsPct = income > 0 ? Math.round((Math.max(0, savings) / income) * 100) : 0;
  const peerSavingsPct = income > 0 ? Math.round((peerSavings / income) * 100) : 0;

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:12px;">
        <div class="section-title" style="margin:0;">Budget Results</div>
        <button class="button secondary small" style="border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                type="button" onclick="editInAboutMe('budgetSetup')">Update Budget</button>
      </div>

      ${renderMPGapBanner()}

      <div class="summary-grid" style="margin-bottom:14px;">
        <div>
          <div class="label" style="margin-bottom:2px;">Income</div>
          <div style="font-size:18px;font-weight:850;">${budgetFmt(income)}</div>
        </div>
        <div>
          <div class="label" style="margin-bottom:2px;">Plan</div>
          <div style="font-size:18px;font-weight:850;">${budgetFmt(planTotal)}</div>
        </div>
      </div>

      <!-- P&L layout -->
      <div style="border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:8px;">
        <div class="helper" style="font-weight:700;margin-bottom:6px;">Non-Discretionary</div>
        <div class="row" style="margin-bottom:4px;font-size:13px;">
          <span class="helper">${housingCat ? (housingCat.icon || "🏠") + " " + housingCat.name : "Housing"}</span>
          <span style="font-weight:700;">${budgetFmt(housingAmt)}</span>
        </div>
        ${state.budget.fixedOverhead.length > 0 ? `
          <div class="row" style="margin-bottom:4px;font-size:13px;">
            <span class="helper">Required Costs</span>
            <span style="font-weight:700;">${budgetFmt(fixedTotal)}</span>
          </div>
        ` : ""}
        <div class="row" style="border-top:1px solid var(--line);padding-top:4px;font-size:12px;font-weight:700;margin-bottom:8px;">
          <span>Subtotal</span>
          <span>${budgetFmt(nonDiscAmt)}</span>
        </div>
      </div>

      <div style="border-bottom:2px solid var(--line);padding-bottom:8px;margin-bottom:8px;">
        <div class="helper" style="font-weight:700;margin-bottom:6px;">Discretionary</div>
        ${["food", "transport", "lifestyle"].map(key => {
          const cat = state.budget.categories.find(c => c.key === key);
          return cat ? `
            <div class="row" style="margin-bottom:4px;font-size:13px;">
              <span class="helper">${h(cat.icon || "")} ${h(cat.name)}</span>
              <span style="font-weight:700;">${budgetFmt(budgetCategoryTotal(cat))}</span>
            </div>
          ` : "";
        }).join("")}
        <div class="row" style="border-top:1px solid var(--line);padding-top:4px;font-size:12px;font-weight:700;margin-bottom:8px;">
          <span>Subtotal</span>
          <span>${budgetFmt(discAmt)}</span>
        </div>
      </div>

      <!-- Summary row -->
      <div class="row" style="margin-bottom:6px;border-bottom:1px solid var(--line);padding-bottom:6px;">
        <span class="helper" style="font-weight:700;">Total Spending</span>
        <span style="font-weight:850;font-size:13px;">${budgetFmt(planTotal)}</span>
      </div>

      <div class="row" style="margin-bottom:8px;">
        <span class="helper">Income</span>
        <span style="font-weight:850;font-size:13px;">${budgetFmt(income)}</span>
      </div>

      <div class="row" style="margin-bottom:12px;">
        <span class="helper" style="font-weight:700;">Savings</span>
        <span style="font-weight:850;font-size:14px;color:${savings >= 0 ? "var(--accent)" : "var(--danger)"};">${budgetFmt(savings)}</span>
      </div>

      <!-- Savings thermometer -->
      ${renderThermometer(Math.max(0, savings), peerSavings, {
        higherIsBetter: true,
        userLabel: "You " + savingsPct + "%",
        peerLabel: "Peers " + peerSavingsPct + "%"
      })}

      <div class="row" style="margin-top:12px;gap:8px;">
        <button class="button secondary small" style="border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                type="button" onclick="goDebtAnalyzer()">Debt Analysis</button>
        <button class="button secondary small" style="border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                type="button" onclick="goMyDebts(null)">Manage Debts</button>
      </div>
    </div>
  `;
}

function renderMPGapBanner() {
  const gap = state.monthlyUpdateGap;
  if (!gap) return "";
  if (gap.direction === "over") {
    return `
      <div class="card" style="margin-bottom:12px;background:var(--warn-soft, var(--soft));">
        <div class="row" style="margin-bottom:4px;">
          <span style="font-weight:700;">Monthly check-in ⚠️</span>
          <span class="helper">+${h(gap.gapPct)}% over plan</span>
        </div>
        <p class="helper" style="margin-bottom:8px;">
          Actual spend: ${budgetFmt(gap.actualMonthlySpend)}/mo · Plan: ${budgetFmt(gap.planMonthlySpend)}/mo
        </p>
        <p class="helper" style="margin-bottom:10px;">Your budget may need a refresh — major life changes often drive this gap.</p>
        <button class="button primary" style="font-size:12px;" type="button"
                onclick="editInAboutMe('budgetSetup')">Update Budget</button>
        <button class="button secondary" style="font-size:12px;margin-left:8px;" type="button"
                onclick="state.monthlyUpdateGap=null;render()">Looks right</button>
      </div>
    `;
  }
  return `
    <div class="card" style="margin-bottom:12px;background:var(--accent-soft);">
      <div class="row" style="margin-bottom:4px;">
        <span style="font-weight:700;">Monthly check-in ✓</span>
        <span class="helper">−${h(gap.gapPct)}% under plan</span>
      </div>
      <p class="helper" style="margin-bottom:8px;">
        Actual spend: ${budgetFmt(gap.actualMonthlySpend)}/mo · Plan: ${budgetFmt(gap.planMonthlySpend)}/mo
      </p>
      <p class="helper" style="margin-bottom:10px;">You're spending less than planned.</p>
      <button class="button secondary" style="font-size:12px;" type="button"
              onclick="state.monthlyUpdateGap=null;render()">Dismiss</button>
    </div>
  `;
}

function renderMPComparisons(hasBudget) {
  if (!hasBudget) {
    return `
      <div class="card mb-md">
        <div class="section-title" style="margin-bottom:8px;">Comparisons</div>
        <p class="helper">Build your budget to see how you compare.</p>
      </div>
    `;
  }

  const cats = state.budget.categories;
  return `
    <div class="card mb-md">
      <div class="section-title" style="margin-bottom:12px;">Comparisons</div>
      <p class="helper" style="margin-bottom:12px;">How your spending compares to similar households.</p>
      ${cats.map(cat => {
        const spend   = budgetCategoryTotal(cat);
        const peer    = budgetPeerAvg(cat.key);
        const pct     = peer > 0 ? Math.round((spend - peer) / peer * 100) : 0;
        const sign    = pct >= 0 ? "+" : "";
        const color   = pct > 20  ? "var(--warn)"
                      : pct < -20 ? "var(--accent)"
                      : "var(--muted)";
        return `
          <div class="row" style="margin-bottom:8px;">
            <span class="helper">${h(cat.icon || "")} ${h(cat.name)}</span>
            <div style="text-align:right;">
              <div style="font-size:12px;font-weight:700;color:${color};">${sign}${pct}% vs peers</div>
              <div style="font-size:10px;color:var(--muted);">You ${budgetFmt(spend)} · Peers ${budgetFmt(peer)}</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderMPGoals() {
  const goals      = state.goals      || [];
  const milestones = state.milestones || [];

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Goals</div>
        <button class="button secondary small"
                type="button" onclick="editInAboutMe('goals')">Edit Goals</button>
      </div>

      ${goals.length === 0 ? `
        <p class="helper">No goals yet. <button class="button secondary small" style="margin-left:6px;" type="button" onclick="editInAboutMe('goals')">Add Goal</button></p>
      ` : goals.map(g => `
        <div style="margin-bottom:12px;">
          <div class="task-title" style="font-size:13px;">${h(g.title)}</div>
          <div class="progress" style="margin:6px 0 4px;">
            <div class="progress-fill" style="width:${g.progress}%;"></div>
          </div>
          <div class="helper" style="font-size:11px;">${g.progress}% complete</div>
        </div>
      `).join("")}

      ${milestones.length > 0 ? `
        <div class="helper" style="font-weight:700;margin:12px 0 8px;">Milestones</div>
        ${milestones.map(m => `
          <div style="margin-bottom:10px;">
            <div class="row" style="margin-bottom:4px;">
              <span class="task-title" style="font-size:13px;">${h(m.title)}</span>
              <span class="helper" style="font-size:11px;">${h(m.current)} / ${h(m.target)}</span>
            </div>
            <div class="progress">
              <div class="progress-fill" style="width:${m.progress}%;"></div>
            </div>
          </div>
        `).join("")}
      ` : ""}
    </div>
  `;
}

function renderMPCommitments() {
  const commitments = state.commitments || [];

  return `
    <div class="card mb-md">
      <div class="section-title" style="margin-bottom:8px;">Active Commitments</div>
      ${commitments.length === 0 ? `
        <p class="helper">No active commitments yet. Complete a budget review to create one.</p>
      ` : commitments.map(c => `
        <div class="item-card" style="margin-bottom:8px;">
          <div>
            <div class="task-title" style="font-size:13px;">${h(c.text)}</div>
            <p class="task-desc">Added ${h(c.createdAt)}${c.goalId ? " · " + h(goalTitleById(c.goalId)) : ""}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function goalTitleById(goalId) {
  const g = (state.goals || []).find(g => g.id === goalId);
  return g ? g.title : "Goal";
}

function editInAboutMe(screen) {
  state.flowOrigin = "myProgress";
  go(screen);
}

function renderMyProgressAdmin() {
  const gap = state.monthlyUpdateGap;
  return `
    <div class="admin-card">
      <p class="admin-card-title">My Progress</p>
      <p class="helper">Output hub — data flows from Budget inputs.</p>
      <p class="admin-card-title" style="margin-top:10px;">Monthly Gap Simulator</p>
      <button class="button secondary full" style="margin-top:6px;" type="button"
              onclick="state.monthlyUpdateGap={actualMonthlySpend:3800,planMonthlySpend:3200,gapPct:19,direction:'over',loggedAcct:12000,loggedDebt:8000};render()">
        Simulate gap (over plan)
      </button>
      <button class="button secondary full" style="margin-top:6px;" type="button"
              onclick="state.monthlyUpdateGap={actualMonthlySpend:2900,planMonthlySpend:3200,gapPct:9,direction:'under',loggedAcct:15000,loggedDebt:8000};render()">
        Simulate gap (under plan)
      </button>
      ${gap ? `
        <button class="button secondary full" style="margin-top:6px;" type="button"
                onclick="state.monthlyUpdateGap=null;render()">Clear gap banner</button>
      ` : ""}
    </div>
  `;
}
