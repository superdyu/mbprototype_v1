// ─── Three-layer comparison (D24, 04-budget-benchmarks) ──────────────────────
// TAB: Budget (sub-screen) | NAV BAR: Visible
//
//   Plan          state.plan     "Your plan"        what you intended
//   Self-reported state.mtd      "What you told me" what you think happened
//   Automated     —              not in prototype   what actually happened
//
// "Never blur these. The gaps between them are the product."
//
// TWO DIFFERENT GAPS exist for the same category and neither may stand in for
// the other. 04-budget-benchmarks names this as a trap:
//
//   over your plan   $429 against a $320 budget  = 34%
//   over your peers  $429 against a $370 peer    = 16%
//
// So every row labels both, and the figures are computed — never the seed's
// baked strings, which go stale the moment a tester logs anything (L17).

// A gap is worth surfacing when it is proportionally large AND materially big.
// Percentage alone flags $6 on a $4 category; dollars alone flags Housing for
// being Housing.
const CMP_PCT_THRESHOLD = 15;
const CMP_ABS_THRESHOLD = 25;

function cmpRow(category) {
  const plan = catValue(state.plan, category);
  const user = catValue(state.mtd, category);
  const peer = benchPeerValue(category, benchOptsForUser());
  return {
    category: category,
    plan: plan,
    user: user,
    peer: peer,
    vsPlan: plan ? Math.round(((user - plan) / plan) * 100) : null,
    vsPeer: peer ? Math.round(((user - peer) / peer) * 100) : null
  };
}

function cmpAllRows() {
  return CATEGORIES.map(cmpRow);
}

function cmpWorthNoticing(r) {
  const notable = p => p != null && Math.abs(p) >= CMP_PCT_THRESHOLD;
  const material = Math.abs(r.user - r.plan) >= CMP_ABS_THRESHOLD ||
                   (r.peer != null && Math.abs(r.user - r.peer) >= CMP_ABS_THRESHOLD);
  return material && (notable(r.vsPlan) || notable(r.vsPeer));
}

// Impact = the larger of the two gaps, so the three we surface are the ones most
// worth acting on.
function cmpImpact(r) {
  return Math.max(Math.abs(r.vsPlan || 0), Math.abs(r.vsPeer || 0));
}

function renderComparison() {
  const rows = cmpAllRows();
  // Cap at 3 — a short list of the most material gaps, each with a path in.
  const flagged = rows.filter(cmpWorthNoticing)
    .sort((a, b) => cmpImpact(b) - cmpImpact(a))
    .slice(0, 3);

  return `
    <h1 class="title" style="margin:0 0 4px;font-size:20px;">Where it's going</h1>
    <p class="helper" style="margin:0 0 14px;">
      Three ways of looking at the same month. The differences are the
      interesting part.
    </p>

    <div class="card cmp-legend">
      <div><span class="cmp-key cmp-key-plan"></span>Your plan</div>
      <div><span class="cmp-key cmp-key-user"></span>What you told me</div>
      <div><span class="cmp-key cmp-key-peer"></span>Peers</div>
      <p class="helper" style="margin:10px 0 0;font-size:10px;">
        Peers are a calculated comparison, not real people — public spending
        data for households your size and income, adjusted for where you live.
      </p>
    </div>

    ${flagged.length ? `
      <div class="section-title" style="margin:18px 0 8px;">Worth a look</div>
      ${flagged.map(r => renderComparisonFlag(r)).join("")}
    ` : ""}

    <div class="section-title" style="margin:18px 0 8px;">All categories</div>
    ${rows.map(r => renderComparisonRow(r)).join("")}
  `;
}

// One category, three layers, both gaps — labelled distinctly.
function renderComparisonRow(r) {
  const max = Math.max(r.plan, r.user, r.peer || 0, 1);
  const bar = (v, cls) =>
    `<div class="cmp-bar"><span class="${cls}" style="width:${Math.max(2, (v / max) * 100)}%"></span></div>`;

  return `
    <div class="card cmp-row">
      <div class="row" style="align-items:baseline;margin-bottom:8px;">
        <span class="budget-row-name">${h(r.category)}</span>
        <span class="helper" style="font-size:11px;">${budgetFmt(r.user)} so far</span>
      </div>

      <div class="cmp-bars">
        <span class="cmp-label">Plan</span>${bar(r.plan, "cmp-key-plan")}<span class="cmp-val">${budgetFmt(r.plan)}</span>
        <span class="cmp-label">You</span>${bar(r.user, "cmp-key-user")}<span class="cmp-val">${budgetFmt(r.user)}</span>
        <span class="cmp-label">Peers</span>${bar(r.peer || 0, "cmp-key-peer")}<span class="cmp-val">${r.peer == null ? "—" : budgetFmt(r.peer)}</span>
      </div>

      <div class="cmp-gaps">
        ${cmpGapPill(r.vsPlan, "vs your plan")}
        ${cmpGapPill(r.vsPeer, "vs peers")}
      </div>
    </div>
  `;
}

// The label is half the point — an unlabelled percentage is the trap.
function cmpGapPill(pct, label) {
  if (pct == null) return "";
  const over = pct > 0;
  const cls = Math.abs(pct) < CMP_PCT_THRESHOLD ? "pill" : (over ? "pill pill-warn" : "pill pill-good");
  return `<span class="${cls}" style="font-size:9px;padding:2px 7px;">
            ${over ? "+" : ""}${pct}% ${h(label)}
          </span>`;
}

// Inline card for a category with a gap worth noticing. States the number and
// the gap; never prescribes an action (D26 — no financial advice, ever).
function renderComparisonFlag(r) {
  const worst = (r.vsPeer != null && Math.abs(r.vsPeer) > Math.abs(r.vsPlan || 0)) ? "peer" : "plan";
  const pct = worst === "peer" ? r.vsPeer : r.vsPlan;
  const ref = worst === "peer" ? r.peer : r.plan;

  return `
    <div class="card obs-card">
      <div class="row" style="align-items:baseline;margin-bottom:3px;">
        <p class="task-title" style="margin:0;">${h(r.category)}</p>
        <span class="obs-figure">${pct > 0 ? "+" : ""}${pct}%</span>
      </div>
      <p class="helper" style="margin:0 0 8px;">
        ${budgetFmt(r.user)} so far, against ${budgetFmt(ref)}
        ${worst === "peer" ? "for households like yours" : "in your plan"}.
      </p>
      <button class="button secondary full" style="font-size:12px;padding:8px 14px;"
              type="button" onclick="goToCategory('${h(r.category).replace(/'/g, "\\'")}')">
        Look into ${h(r.category)} ›
      </button>
    </div>
  `;
}

// ─── Compact strip for My Progress (07-progress-bills) ───────────────────────
// "Same data as the budget tab, framed for review rather than editing."
function renderComparisonCompact(limit) {
  const rows = cmpAllRows()
    .filter(r => r.user > 0)
    .sort((a, b) => Math.abs(b.vsPlan || 0) - Math.abs(a.vsPlan || 0))
    .slice(0, limit || 5);

  return `
    ${rows.map(r => `
      <div class="row cmp-compact">
        <span class="cmp-compact-name">${h(r.category)}</span>
        <span class="helper" style="font-size:11px;">
          ${budgetFmt(r.user)} / ${budgetFmt(r.plan)}
        </span>
        ${cmpGapPill(r.vsPlan, "vs plan")}
      </div>
    `).join("")}
    <button class="button secondary full" style="margin-top:10px;" type="button"
            onclick="go('comparison')">See all twelve</button>
  `;
}

function renderComparisonAdmin() {
  const rows = cmpAllRows();
  return `
    <div class="admin-card">
      <p class="admin-card-title">Three Layers</p>
      <p class="helper" style="margin-bottom:10px;">
        Flagged when |gap| ≥ ${CMP_PCT_THRESHOLD}% AND the difference is ≥
        ${budgetFmt(CMP_ABS_THRESHOLD)} — percentage alone flags trivial
        categories, dollars alone flags Housing for being Housing.
      </p>
      <div class="helper" style="line-height:1.9;">
        ${rows.map(r => `
          ${h(r.category)}: ${budgetFmt(r.plan)} / ${budgetFmt(r.user)} / ${r.peer == null ? "—" : budgetFmt(r.peer)}
          ${cmpWorthNoticing(r) ? "<strong>⚑</strong>" : ""}
        `).join("<br>")}
      </div>
    </div>
  `;
}
