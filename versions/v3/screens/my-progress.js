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
  const hasBudget = state.planStatus === "complete";

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
  const profile = { zip: state.profile.zip, householdSize: state.profile.householdSize };
  const up      = state.userProfile;
  const name    = up && up.name ? up.name : null;
  const zip     = profile && profile.zip ? profile.zip : null;
  const size    = profile && profile.householdSize ? profile.householdSize : null;
  const income  = state.monthlyIncomeNet;
  const updated = profile && profile.lastUpdated ? profile.lastUpdated : null;
  // 2b: v2's five lifestyle THEMES were retired with their screens. The v3
  // wizard's six dimensions are the equivalent signal.
  const themes = LW_QUESTIONS;
  const answeredThemes = themes.filter(q => state.lifestyle && state.lifestyle[q.dim]);

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
      ${!zip && !income ? `<p class="helper">No profile data yet. <button class="button secondary small" style="margin-left:6px;" type="button" onclick="navGoTab('aboutMe')">Build Budget</button></p>` : ""}

      <details style="margin-top:8px;">
        <summary class="helper" style="cursor:pointer;font-weight:700;">Assumptions used</summary>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);">
          ${zip ? `<p class="helper" style="margin-bottom:6px;">ZIP ${h(zip)} cost-of-living modifier applied</p>` : ""}
          ${size ? `<p class="helper" style="margin-bottom:6px;">${size}-person household multiplier applied</p>` : ""}
          ${answeredThemes.length > 0 ? `
            <p class="helper" style="font-weight:700;margin-bottom:4px;">Lifestyle signals</p>
            ${answeredThemes.map(t => `<p class="helper" style="margin-bottom:2px;">${h(t.prompt)} <strong>${h(state.lifestyle[t.dim])}</strong></p>`).join("")}
          ` : `<p class="helper">No lifestyle data yet.</p>`}
          ${answeredThemes.length === 0 ? `
            <button class="button secondary small" style="margin-top:6px;border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                    type="button" onclick="lwStart()">Answer lifestyle questions</button>
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
        <div class="section-title" style="margin:0 0 6px;">Budget Results</div>
        <p class="helper" style="margin:0;">No budget yet.
          <button class="button secondary small" style="margin-left:6px;" type="button"
                  onclick="navGoTab('aboutMe')">Build Budget</button>
        </p>
      </div>`;
  }

  // PORTED IN 2b — was v2's 5 nested buckets + its crude peer helper. Now the
  // flat 12 (A2) and the real benchmark model.
  const income    = state.monthlyIncomeNet;
  const planTotal = catTotal(state.plan);
  const actual    = catTotal(state.mtd);
  const leftover  = income - planTotal;

  // Non-discretionary vs discretionary, expressed in taxonomy terms.
  const FIXED = ["Housing", "Utilities", "Health", "Debt payments"];
  const fixedAmt = FIXED.reduce((sum, c) => sum + catValue(state.plan, c), 0);
  const discAmt  = planTotal - fixedAmt;
  const pct = n => income > 0 ? Math.round((n / income) * 100) : 0;

  return `
    <div class="card mb-md">
      <div class="row" style="margin-bottom:12px;">
        <div class="section-title" style="margin:0;">Budget Results</div>
        <button class="button secondary small" style="border:1.5px solid var(--accent);color:var(--accent);font-weight:700;"
                type="button" onclick="navGoTab('aboutMe')">Update Budget</button>
      </div>

      <div class="row" style="align-items:baseline;">
        <span class="helper">Planned</span>
        <span style="font-weight:850;">${budgetFmt(planTotal)}</span>
      </div>
      <div class="row" style="align-items:baseline;margin-top:4px;">
        <span class="helper">What you told me, so far</span>
        <span style="font-weight:850;">${budgetFmt(actual)}</span>
      </div>
      <div class="row" style="align-items:baseline;margin-top:4px;">
        <span class="helper">Take-home</span>
        <span class="helper">${budgetFmt(income)}</span>
      </div>

      <div class="budget-bar" aria-hidden="true">
        <span style="width:${Math.min(100, pct(planTotal))}%"></span>
      </div>

      <p class="helper" style="margin:10px 0 0;">
        ${leftover >= 0
          ? budgetFmt(leftover) + " left over each month (" + pct(leftover) + "% of take-home)."
          : budgetFmt(Math.abs(leftover)) + " more than you bring in."}
      </p>
      <p class="helper" style="margin:6px 0 0;font-size:11px;">
        Fixed ${budgetFmt(fixedAmt)} · everything else ${budgetFmt(discAmt)}
      </p>
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
                onclick="navGoTab('aboutMe')">Update Budget</button>
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
        <div class="section-title" style="margin:0 0 6px;">Comparisons</div>
        <p class="helper" style="margin:0;">Build a budget to see how the layers line up.</p>
      </div>`;
  }
  // Same data as the Budget tab, framed for review rather than editing
  // (07-progress-bills). The full twelve live on the comparison screen.
  return `
    <div class="card mb-md">
      <div class="section-title" style="margin:0 0 10px;">Comparisons</div>
      ${renderComparisonCompact(5)}
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

// 2b: the Budget tab is a single screen now, so this is just a tab switch.
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
