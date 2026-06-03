// ─── My Progress ──────────────────────────────────────────────────────────────
// TAB: My Progress | NAV BAR: Visible
//
// PURPOSE
// Primary output hub. Shows the user's money picture based on all their About Me
// inputs — budget results, comparisons, goals progress, and the assumptions
// that drove those estimates. Read-first; every section links back to About Me
// for editing.
//
// NAVIGATION
//   Entry: My Progress tab tap; completing any About Me input flow
//   Exit:  Edit links → About Me sub-screens; back to About Me after editing
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
//   Edit links navigate to About Me sub-screens and should restore My Progress
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

    <!-- 3. Assumptions Used -->
    ${renderMPAssumptions()}

    <!-- 4. Comparisons -->
    ${renderMPComparisons(hasBudget)}

    <!-- 5. Goals -->
    ${renderMPGoals()}

    <!-- 6. Active Commitments -->
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

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Your Money Profile</div>
        <button class="button secondary small"
                type="button" onclick="editInAboutMe('aboutMe')">Edit in About Me</button>
      </div>
      ${name ? `<p class="helper" style="margin-bottom:4px;">${h(name)}</p>` : ""}
      ${zip  ? `<p class="helper" style="margin-bottom:4px;">ZIP ${h(zip)}${size ? " · " + size + " " + (size === 1 ? "person" : "people") : ""}</p>` : ""}
      ${income > 0 ? `<p class="helper" style="margin-bottom:4px;">${budgetFmt(income)}/mo income</p>` : ""}
      ${updated ? `<p class="helper" style="margin-bottom:0;">Last updated ${h(updated)}</p>` : ""}
      ${!zip && !income ? `<p class="helper">No profile data yet. <button class="button secondary small" style="margin-left:6px;" type="button" onclick="go('budgetSetup')">Build Budget</button></p>` : ""}
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
  const remaining = income - planTotal;

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:12px;">
        <div class="section-title" style="margin:0;">Budget Results</div>
        <button class="button secondary small"
                type="button" onclick="editInAboutMe('budgetSetup')">Update Budget</button>
      </div>

      <div class="summary-grid" style="margin-bottom:14px;">
        <div>
          <div class="label" style="margin-bottom:2px;">Income</div>
          <div style="font-size:18px;font-weight:850;">${budgetFmt(income)}</div>
        </div>
        <div>
          <div class="label" style="margin-bottom:2px;">Plan</div>
          <div style="font-size:18px;font-weight:850;">${budgetFmt(planTotal)}</div>
        </div>
        <div>
          <div class="label" style="margin-bottom:2px;">Left</div>
          <div style="font-size:18px;font-weight:850;color:${remaining >= 0 ? "var(--accent)" : "var(--danger)"};">${budgetFmt(remaining)}</div>
        </div>
      </div>

      ${renderMPGapBanner()}

      ${state.budget.categories.map(cat => `
        <div class="row" style="margin-bottom:6px;">
          <span class="helper">${h(cat.icon || "")} ${h(cat.name)}</span>
          <span class="stat-val">${budgetFmt(budgetCategoryTotal(cat))}</span>
        </div>
      `).join("")}

      ${state.budget.fixedOverhead.length > 0 ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line);">
          <div class="helper" style="font-weight:700;margin-bottom:6px;">Required Costs</div>
          ${state.budget.fixedOverhead.map(f => `
            <div class="row" style="margin-bottom:4px;">
              <span class="helper">${h(f.name)}</span>
              <span style="font-size:12px;font-weight:700;">${budgetFmt(f.amount)}</span>
            </div>
          `).join("")}
          <div class="row" style="margin-top:4px;">
            <span class="helper" style="font-weight:700;">Total Required</span>
            <span style="font-size:12px;font-weight:850;">${budgetFmt(budgetFixedOverheadTotal())}</span>
          </div>
        </div>
      ` : ""}

      <div class="row" style="margin-top:12px;">
        <button class="button secondary small"
                type="button" onclick="goDebtAnalyzer()">Debt Analysis</button>
        <button class="button secondary small"
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

function renderMPAssumptions() {
  const themes = LIFESTYLE_THEMES || [];

  const answeredThemes = themes.filter(t => {
    const la = state.lifestyleAnswers && state.lifestyleAnswers[t.key];
    return la && la.lastUpdated;
  });

  const profile = state.budget.profile;
  const hasProfile = profile && (profile.zip || profile.householdSize);

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:8px;">
        <div class="section-title" style="margin:0;">Assumptions Used</div>
        <button class="button secondary small"
                type="button" onclick="editInAboutMe('lifestyle')">Update Lifestyle</button>
      </div>

      ${hasProfile ? `
        <div style="margin-bottom:10px;">
          <p class="helper" style="font-weight:700;margin-bottom:4px;">Budget inputs</p>
          ${profile.zip ? `<p class="helper" style="margin-bottom:2px;">ZIP ${h(profile.zip)} cost-of-living modifier applied</p>` : ""}
          ${profile.householdSize ? `<p class="helper" style="margin-bottom:2px;">${profile.householdSize}-person household multiplier applied</p>` : ""}
        </div>
      ` : ""}

      ${answeredThemes.length > 0 ? `
        <p class="helper" style="font-weight:700;margin-bottom:6px;">Lifestyle signals</p>
        ${answeredThemes.map(t => `
          <div class="row" style="margin-bottom:4px;">
            <span class="helper">${h(t.label)}</span>
            <span class="helper">Updated ${h(state.lifestyleAnswers[t.key].lastUpdated)}</span>
          </div>
        `).join("")}
      ` : `
        <p class="helper">No lifestyle data yet.
          <button class="button secondary small" style="margin-left:6px;"
                  type="button" onclick="editInAboutMe('lifestyle')">Add Lifestyle</button>
        </p>
      `}
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
      <p class="helper">Output hub — data flows from About Me inputs.</p>
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
