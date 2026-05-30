// ─── Budget Utility Functions ─────────────────────────────────────────────────
// Shared math, formatting, and signal logic used across all budget-related
// screens. Must load before budget.js, budget-category.js, my-debts.js,
// and debt-analyzer.js.

// ─── Peer data constants ──────────────────────────────────────────────────────
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

// ─── Income & spending calculations ──────────────────────────────────────────
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

// Returns an actionable signal object { label, css } for a category tile,
// or null for fixed categories that have no discretionary signal.
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
