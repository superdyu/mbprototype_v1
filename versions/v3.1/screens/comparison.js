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

// The plan layer only exists once the user has actually built one. state.plan
// stays seeded with the persona's figures from bootV3 regardless, so without
// this gate every "vs your plan" figure grades the user against a budget they
// were told (on the budget tab) they do not have — and against a different
// household's numbers at that. One chokepoint: everything downstream reads
// hasPlan / vsPlan and degrades to peers-only on its own.
function cmpHasPlan() {
  return state.planStatus === "complete";
}

function cmpRow(category) {
  const hasPlan = cmpHasPlan();
  const plan = hasPlan ? catValue(state.plan, category) : 0;
  const user = catValue(state.mtd, category);
  const peer = benchPeerValue(category, benchOptsForUser());
  return {
    category: category,
    hasPlan: hasPlan,
    plan: plan,
    user: user,
    peer: peer,
    vsPlan: (hasPlan && plan) ? Math.round(((user - plan) / plan) * 100) : null,
    vsPeer: peer ? Math.round(((user - peer) / peer) * 100) : null
  };
}

function cmpAllRows() {
  return CATEGORIES.map(cmpRow);
}

function cmpWorthNoticing(r) {
  const notable = p => p != null && Math.abs(p) >= CMP_PCT_THRESHOLD;
  // Guard the plan arm on r.plan: with no plan it is 0, and |user - 0| would
  // make every category with any spend "material" on its own.
  const material = (r.plan ? Math.abs(r.user - r.plan) >= CMP_ABS_THRESHOLD : false) ||
                   (r.peer != null && Math.abs(r.user - r.peer) >= CMP_ABS_THRESHOLD);
  return material && (notable(r.vsPlan) || notable(r.vsPeer));
}

// Impact is measured in DOLLARS, not percent. A percentage ranking puts a $9
// swing on a $30 category above a $180 swing on Housing, which is the opposite
// of "the top dollar areas" — the gap worth surfacing is the one moving real
// money. The percentage thresholds above still decide what QUALIFIES; this only
// decides the order.
function cmpImpact(r) {
  return Math.max(r.plan ? Math.abs(r.user - r.plan) : 0,
                  r.peer != null ? Math.abs(r.user - r.peer) : 0);
}

function renderComparison() {
  return `
    <h1 class="title" style="margin:0 0 4px;font-size:20px;">Where it's going</h1>
    <p class="helper" style="margin:0 0 14px;">
      ${cmpHasPlan()
        ? "Three ways of looking at the same month. The differences are the interesting part."
        : "Two ways of looking at the same month. Build a budget and your plan joins the picture."}
    </p>
    ${renderComparisonBody()}
  `;
}

/**
 * Legend + "Worth a look" + all twelve. Shared, because the Budget tab IS this
 * view once a budget exists — the tab used to render twelve sliders, an editing
 * surface, where the review surface belongs. Sliders still live on the
 * per-category screen and in the wizard.
 */
function renderComparisonBody() {
  const rows = cmpAllRows();
  // Cap at 3 — a short list of the biggest dollar gaps, each with a path in.
  const flagged = rows.filter(cmpWorthNoticing)
    .sort((a, b) => cmpImpact(b) - cmpImpact(a))
    .slice(0, 3);

  return `
    <div class="card cmp-legend">
      ${cmpHasPlan() ? `<div><span class="cmp-key cmp-key-plan"></span>Your budget</div>` : ""}
      <div><span class="cmp-key cmp-key-peer"></span>Peers</div>
      <div><span class="cmp-key cmp-key-user"></span>What you told me</div>
      <p class="helper" style="margin:10px 0 0;font-size:10px;">
        Peers are a calculated comparison, not real people — public spending
        data for households your size and income, adjusted for where you live.
      </p>
    </div>

    ${flagged.length ? `
      <div class="section-title" style="margin:18px 0 4px;">Worth a look</div>
      <p class="helper" style="margin:0 0 8px;font-size:11px;">
        The categories where the biggest dollars are moving. Same three bars as
        below — your budget, peers, and what you've told me.
      </p>
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

      <!-- Order is budget → peers → you: the two references first, then what
           actually happened, so the eye lands on the user's own bar last. -->
      <div class="cmp-bars">
        ${r.hasPlan
          ? `<span class="cmp-label">Budget</span>${bar(r.plan, "cmp-key-plan")}<span class="cmp-val">${budgetFmt(r.plan)}</span>`
          : ""}
        <span class="cmp-label">Peers</span>${bar(r.peer || 0, "cmp-key-peer")}<span class="cmp-val">${r.peer == null ? "—" : budgetFmt(r.peer)}</span>
        <span class="cmp-label">You</span>${bar(r.user, "cmp-key-user")}<span class="cmp-val">${budgetFmt(r.user)}</span>
      </div>

      <div class="cmp-gaps">
        ${cmpGapPill(r.vsPlan, "vs your budget")}
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

// A category worth a look: the same three bars as the list below, so the two
// sections read identically, plus the dollar gap and a path in. States the
// number and the gap; never prescribes an action (D26 — no financial advice).
function renderComparisonFlag(r) {
  const overPeer = r.peer != null && r.user > r.peer;
  const gap = cmpImpact(r);
  return `
    <div class="card cmp-row cmp-flag">
      <div class="row" style="align-items:baseline;margin-bottom:8px;">
        <span class="budget-row-name">${h(r.category)}</span>
        <span class="obs-figure">${overPeer ? "+" : ""}${budgetFmt(gap)}</span>
      </div>

      <div class="cmp-bars">
        ${r.hasPlan
          ? `<span class="cmp-label">Budget</span>${cmpFlagBar(r, r.plan, "cmp-key-plan")}<span class="cmp-val">${budgetFmt(r.plan)}</span>`
          : ""}
        <span class="cmp-label">Peers</span>${cmpFlagBar(r, r.peer || 0, "cmp-key-peer")}<span class="cmp-val">${r.peer == null ? "—" : budgetFmt(r.peer)}</span>
        <span class="cmp-label">You</span>${cmpFlagBar(r, r.user, "cmp-key-user")}<span class="cmp-val">${budgetFmt(r.user)}</span>
      </div>

      <div class="cmp-gaps">
        ${cmpGapPill(r.vsPlan, "vs your budget")}
        ${cmpGapPill(r.vsPeer, "vs peers")}
      </div>

      <button class="button secondary full" style="font-size:12px;padding:8px 14px;margin-top:10px;"
              type="button" onclick="goToCategory('${h(r.category).replace(/'/g, "\\'")}')">
        Look into ${h(r.category)} ›
      </button>
    </div>
  `;
}

function cmpFlagBar(r, v, cls) {
  const max = Math.max(r.plan, r.user, r.peer || 0, 1);
  return `<div class="cmp-bar"><span class="${cls}" style="width:${Math.max(2, (v / max) * 100)}%"></span></div>`;
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
        ${cmpGapPill(r.vsPlan, "vs budget")}
      </div>
    `).join("")}
    <button class="button secondary full" style="margin-top:10px;" type="button"
            onclick="navGoTabRoot('aboutMe')">See all twelve</button>
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
