// ─── Budget Utility Functions ─────────────────────────────────────────────────
// Shared math, formatting, and signal logic used across all budget-related
// screens. Must load before budget.js, budget-category.js, my-debts.js,
// and debt-analyzer.js.

// ─── Peer data constants ──────────────────────────────────────────────────────
// Base peer averages: national median at $6,250/mo net (= $75K / 12 annual), 1-person.
// Source: BLS Consumer Expenditure Survey (prototype approximation).
const PEER_INCOME_BASE = 6250; // monthly equivalent of $75K annual

const BUDGET_PEER_BASE = {
  housing:   1550,  // ~25% of $6,250/mo
  food:       490,  // ~8%
  transport:  590,  // ~9.5%
  lifestyle:  370,  // ~6%
  savings:    620   // ~10%
};

// Per-additional-person multiplier (above the 1-person baseline)
const BUDGET_HOUSEHOLD_MULT = {
  housing:   0.22,  // +22% per additional person
  food:      0.50,  // +50%
  transport: 0.22,  // +22% (shared car)
  lifestyle: 0.40,  // +40%
  savings:   0.55   // +55%
};

// ZIP cost-of-living indices — exact-match table (national 100 = 1.0)
const ZIP_DIRECT = {
  "95126": 1.45, "95014": 1.70, "95054": 1.55,
  "10001": 1.65, "10002": 1.65, "90210": 1.80,
  "77001": 0.95, "60601": 1.20, "30301": 0.90,
  "72712": 0.88, "72716": 0.88, "72718": 0.88,
  "72756": 0.88, "72758": 0.88, "72759": 0.88
};

// MSA-level cost-of-living by ZIP prefix (first 3 digits)
const ZIP_PREFIX = {
  "100": 1.65, "101": 1.65, "102": 1.65,  // NYC Manhattan
  "111": 1.50, "112": 1.48,                // Brooklyn/Queens
  "900": 1.35, "901": 1.35, "902": 1.30,   // LA metro
  "906": 1.55,                             // Santa Monica/Malibu
  "950": 1.45, "951": 1.48, "952": 1.35,   // San Jose/Santa Clara
  "953": 1.55, "954": 1.50,                // Palo Alto/Peninsula
  "606": 1.20, "607": 1.15,                // Chicago
  "770": 0.95, "773": 0.95,                // Houston
  "303": 0.90, "306": 0.90,                // Atlanta
  "981": 1.35, "980": 1.30,                // Seattle/Bellevue
  "787": 1.10, "786": 1.05,                // Austin
  "750": 0.95, "751": 0.95, "752": 0.95,   // Dallas/Fort Worth
  "852": 1.00, "853": 1.00,                // Phoenix
  "321": 1.05, "322": 1.05,                // Orlando
  "441": 1.05, "442": 1.05,                // Cleveland
  "481": 1.05, "482": 1.05,                // Detroit
  "727": 0.88, "728": 0.88                 // NW Arkansas (Bentonville/Rogers)
};

// ─── Income & spending calculations ──────────────────────────────────────────
/** @returns {number} Gross monthly income in dollars (rounded integer) */
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
  return p.earners.reduce((s, e) => s + e.monthlyNet, 0);
}

function budgetMonthlyNetSpend() {
  const b = state.budget;
  const income = budgetMonthlyIncome();
  return Math.round((b.balanceStart - b.balanceEnd + income * 3 - b.debtRepaid + b.assetsSold) / 3);
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

function getZipIndex(zip) {
  const direct = ZIP_DIRECT[zip];
  if (direct) return direct;
  const prefix = (zip || "").slice(0, 3);
  return ZIP_PREFIX[prefix] || 1.0;
}

/** @param {string} catKey - must match a key in state.budget.categories (e.g. "food", "housing") */
function budgetPeerAvg(catKey) {
  const p = state.budget.profile;
  const income = budgetMonthlyIncome();
  const base   = BUDGET_PEER_BASE[catKey] || 0;
  const hmult  = BUDGET_HOUSEHOLD_MULT[catKey] || 0.5;
  const hhSize = Math.max(1, p.householdSize || 1);
  const hFactor = 1 + (hhSize - 1) * hmult;
  const zipIdx  = getZipIndex(p.zip);
  const incomeRatio = income / PEER_INCOME_BASE;
  return Math.round(base * incomeRatio * hFactor * zipIdx);
}

/** @param {object} cat - budget category object; @returns {{label:string, css:string}|null} */
function budgetSignal(cat) {
  const spend   = budgetCategoryTotal(cat);
  const peer    = budgetPeerAvg(cat.key);
  const isSavings = cat.key === "savings";

  if (isSavings) {
    if (spend >= peer)       return { label: "On track",       css: "on-track" };
    if (cat.intentional)     return { label: "Intentional ✓",  css: "intentional" };
    return { label: "Consider more", css: "worth-a-look" };
  }

  if (cat.fixed) return null;

  if (spend <= peer)         return { label: "On track",       css: "on-track" };
  if (cat.intentional)       return { label: "Intentional ✓",  css: "intentional" };
  if (spend > peer * 1.5)    return { label: "Worth a look ↑", css: "worth-a-look strong" };
  return { label: "Worth a look", css: "worth-a-look" };
}

// ─── Formatting ───────────────────────────────────────────────────────────────
/** @param {number} n @returns {string} e.g. "$1,234" (absolute value, rounded) */
function budgetFmt(n) {
  return "$" + Math.abs(Math.round(n)).toLocaleString();
}

function budgetDelta(spend, peer) {
  const d = spend - peer;
  return (d >= 0 ? "+" : "−") + "$" + Math.abs(Math.round(d)).toLocaleString();
}

// ─── Debt totals ──────────────────────────────────────────────────────────────
function debtTotalBalance() {
  return state.budget.debts.reduce((s, d) => s + d.balance, 0);
}

function debtTotalMinPayment() {
  return state.budget.debts.reduce((s, d) => s + (d.minPayment || 0), 0);
}
