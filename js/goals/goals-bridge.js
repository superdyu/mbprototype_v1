// ─── Goals V2 · Host-State Bridge ─────────────────────────────────────────────
// The ONLY read seam between the goals module and host app state. Every host
// value the module needs flows through a function here, each documenting exactly
// what it reads. The module NEVER writes to budget/debts — this file has no
// setters. Mirrors the wizard-bridge header-doc convention.
//
// Reads (host → module):
//   state.budget.categories         → savings allocation, category spend, essentials
//   state.budget.profile / earners  → monthly income (via budgetMonthlyIncome)
//   state.budget.debts              → debt snapshot for debt-paydown goals
//   state.lessons                   → learning-goal lesson pool
//
// All functions are defensive: they return safe numbers/empty shapes even when
// the budget is empty or a category is missing, so the module never throws.

// Find a budget category object by key (housing/food/transport/lifestyle/savings).
function goalsFindCategory(key) {
  var cats = (state.budget && state.budget.categories) || [];
  for (var i = 0; i < cats.length; i++) { if (cats[i].key === key) return cats[i]; }
  return null;
}

// Monthly money available to throw at goals.
//   savingsAllocated — what the budget already routes to the Savings & Goals bucket
//   unallocated      — income left over after the whole plan (never negative)
//   total            — the two combined (the capacity feasibility divides against)
function goalsMonthlyCapacity() {
  var savingsCat = goalsFindCategory("savings");
  var savingsAllocated = savingsCat ? budgetCategoryTotal(savingsCat) : 0;
  var income = (typeof budgetMonthlyIncome === "function") ? budgetMonthlyIncome() : 0;
  var plan   = (typeof budgetPlanTotal === "function") ? budgetPlanTotal() : 0;
  var unallocated = Math.max(0, Math.round(income - plan));
  return {
    savingsAllocated: Math.round(savingsAllocated),
    unallocated: unallocated,
    total: Math.round(savingsAllocated) + unallocated
  };
}

// Deep clone of the user's debt instruments — debt goals freeze a copy so later
// edits to state.budget.debts never rewrite a goal's baseline.
function goalsDebtsSnapshot() {
  var debts = (state.budget && state.budget.debts) || [];
  return debts.map(function(d) {
    return { id: d.id, name: d.name, type: d.type, balance: d.balance, apr: d.apr, minPayment: d.minPayment || 0 };
  });
}

// Current monthly spend + peer benchmark for one category (for categoryCut goals).
function goalsCategorySpend(catKey) {
  var cat = goalsFindCategory(catKey);
  return {
    spend:   cat ? Math.round(budgetCategoryTotal(cat)) : 0,
    peerAvg: (typeof budgetPeerAvg === "function") ? budgetPeerAvg(catKey) : 0
  };
}

// The monthly floor an emergency fund must cover: housing + transport + fixed
// overhead (the non-negotiable obligations), excluding discretionary lifestyle.
function goalsEssentialMonthlySpend() {
  var housing   = goalsFindCategory("housing");
  var transport = goalsFindCategory("transport");
  var h = housing   ? budgetCategoryTotal(housing)   : 0;
  var t = transport ? budgetCategoryTotal(transport) : 0;
  var fixed = (typeof budgetFixedOverheadTotal === "function") ? budgetFixedOverheadTotal() : 0;
  return Math.round(h + t + fixed);
}

// Lesson pool for learning goals → {total, completed, remaining}.
function goalsLessonPool() {
  var lessons = state.lessons || [];
  var completed = lessons.filter(function(l) { return l.status === "completed"; }).length;
  return { total: lessons.length, completed: completed, remaining: Math.max(0, lessons.length - completed) };
}
