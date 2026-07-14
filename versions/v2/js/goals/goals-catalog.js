// ─── Goals V2 · Catalog ───────────────────────────────────────────────────────
// Pure content: the 5 goal categories and the goal types beneath them. Each type
// declares its input FieldSpecs, the autofill keys it surfaces as context cards,
// and its feasibilityKind (which branch of the engine evaluates it). No logic
// here beyond lookup helpers — the engine and create wizard consume this.
//
// FieldSpec.type: "usd" | "date" | "int" | "pct" | "select" | "debtPicker"
//   date fields carry defaultMonths — the wizard resolves it against the sim
//   clock (goalsAddDays(today, months×30)) since the catalog is clock-free.
// feasibilityKind: "savings" | "debt" | "categoryCut" | "learning" | "credit" | "checklist"
// unit: "usd" | "score" | "lessons" | "steps"   direction: "up" | "down"

const GOALS_CATEGORIES = [
  { key: "expense",  label: "Tackle an Expense",  icon: "💳", blurb: "Knock down debt or trim a spending category." },
  { key: "purchase", label: "Save for a Purchase", icon: "🛒", blurb: "Bank toward a big planned buy." },
  { key: "wealth",   label: "Build Wealth",        icon: "📈", blurb: "Emergency cushion, retirement, long-term growth." },
  { key: "learning", label: "Learn & Grow",        icon: "📚", blurb: "Finish a learning path on your own schedule." },
  { key: "credit",   label: "Improve Credit",      icon: "⭐", blurb: "Raise your score or get cards under control." }
];

const GOALS_TYPES = [

  // ── Expense ────────────────────────────────────────────────────────────────
  {
    key: "debtPaydown", categoryKey: "expense", title: "Pay Off Debt", icon: "💳",
    unit: "usd", direction: "down", feasibilityKind: "debt",
    blurb: "Pick the debts and a target date — we'll find the extra payment it takes.",
    fields: [
      { key: "debtIds", label: "Which debts", type: "debtPicker" },
      { key: "targetDate", label: "Target payoff date", type: "date", defaultMonths: 18 }
    ],
    autofillKeys: []
  },
  {
    key: "categoryCut", categoryKey: "expense", title: "Cut a Spending Category", icon: "✂️",
    unit: "usd", direction: "up", feasibilityKind: "categoryCut",
    blurb: "Trim a category each month and bank the difference.",
    fields: [
      { key: "category", label: "Category", type: "select", options: [
        { value: "food", label: "Food & Daily" },
        { value: "lifestyle", label: "Lifestyle" },
        { value: "transport", label: "Transport" }
      ]},
      { key: "monthlyReduction", label: "Cut per month", type: "usd", default: 150, min: 25, step: 25 },
      { key: "durationMonths", label: "For how many months", type: "int", default: 6, min: 1, max: 36 }
    ],
    autofillKeys: []
  },

  // ── Purchase ───────────────────────────────────────────────────────────────
  {
    key: "vehicle", categoryKey: "purchase", title: "Buy a Vehicle", icon: "🚗",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Save the down payment on your next car.",
    fields: [
      { key: "price", label: "Vehicle price", type: "usd", default: 28000, min: 1000, step: 500 },
      { key: "downPct", label: "Down payment %", type: "pct", default: 20, min: 5, max: 100 },
      { key: "targetDate", label: "Buy by", type: "date", defaultMonths: 12 }
    ],
    autofillKeys: ["autoRate", "creditScore"]
  },
  {
    key: "homeDown", categoryKey: "purchase", title: "Save a Home Down Payment", icon: "🏠",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Bank the down payment on a home.",
    fields: [
      { key: "homePrice", label: "Home price", type: "usd", default: 450000, min: 50000, step: 5000 },
      { key: "downPct", label: "Down payment %", type: "pct", default: 20, min: 3, max: 100 },
      { key: "targetDate", label: "Buy by", type: "date", defaultMonths: 36 }
    ],
    autofillKeys: ["mortgageRate", "creditScore", "borrowingPower", "savingsAPY"]
  },
  {
    key: "vacation", categoryKey: "purchase", title: "Save for a Vacation", icon: "🏖️",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Fund the trip without the post-vacation debt.",
    fields: [
      { key: "cost", label: "Trip cost", type: "usd", default: 4000, min: 200, step: 100 },
      { key: "targetDate", label: "Leave by", type: "date", defaultMonths: 8 }
    ],
    autofillKeys: ["savingsAPY"]
  },
  {
    key: "wedding", categoryKey: "purchase", title: "Save for a Wedding", icon: "💍",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Bank toward the big day.",
    fields: [
      { key: "budget", label: "Wedding budget", type: "usd", default: 25000, min: 1000, step: 1000 },
      { key: "targetDate", label: "Wedding by", type: "date", defaultMonths: 18 }
    ],
    autofillKeys: ["savingsAPY"]
  },

  // ── Wealth ─────────────────────────────────────────────────────────────────
  {
    key: "emergencyFund", categoryKey: "wealth", title: "Build an Emergency Fund", icon: "🛟",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "A cushion sized to your real monthly essentials.",
    fields: [
      { key: "months", label: "Months of expenses", type: "int", default: 3, min: 1, max: 12 },
      { key: "targetDate", label: "Fully funded by", type: "date", defaultMonths: 12 }
    ],
    autofillKeys: ["essentialMonthlySpend", "savingsAPY"]
  },
  {
    key: "retirementBoost", categoryKey: "wealth", title: "Boost Retirement Savings", icon: "🌴",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Hit a retirement balance, growth assumed.",
    fields: [
      { key: "currentBalance", label: "Current balance", type: "usd", default: 0, min: 0, step: 1000 },
      { key: "targetBalance", label: "Target balance", type: "usd", default: 50000, min: 1000, step: 1000 },
      { key: "targetDate", label: "By", type: "date", defaultMonths: 36 }
    ],
    autofillKeys: ["marketReturn", "taxBracket"]
  },
  {
    key: "collegeFund", categoryKey: "wealth", title: "Start a College Fund", icon: "🎓",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Set aside for education, growth assumed.",
    fields: [
      { key: "targetAmount", label: "Target amount", type: "usd", default: 30000, min: 1000, step: 1000 },
      { key: "targetDate", label: "Needed by", type: "date", defaultMonths: 48 }
    ],
    autofillKeys: ["savingsAPY", "marketReturn"]
  },
  {
    key: "passiveIncome", categoryKey: "wealth", title: "Build Passive Income", icon: "💵",
    unit: "usd", direction: "up", feasibilityKind: "savings",
    blurb: "Bank the capital that throws off a monthly check.",
    fields: [
      { key: "monthlyIncomeGoal", label: "Monthly income goal", type: "usd", default: 500, min: 50, step: 50 },
      { key: "targetDate", label: "By", type: "date", defaultMonths: 60 }
    ],
    autofillKeys: ["marketReturn"]
  },

  // ── Learning ─────────────────────────────────────────────────────────────
  {
    key: "courseCompletion", categoryKey: "learning", title: "Complete a Learning Path", icon: "📚",
    unit: "lessons", direction: "up", feasibilityKind: "learning",
    blurb: "Finish a set of lessons at a sustainable pace.",
    fields: [
      { key: "lessonCount", label: "Lessons to finish", type: "int", default: 6, min: 1, max: 40 },
      { key: "targetDate", label: "Finish by", type: "date", defaultMonths: 3 }
    ],
    autofillKeys: []
  },

  // ── Credit ─────────────────────────────────────────────────────────────────
  {
    key: "targetScore", categoryKey: "credit", title: "Reach a Credit Score", icon: "⭐",
    unit: "score", direction: "up", feasibilityKind: "credit",
    blurb: "Climb to a target score with on-time, low-utilization habits.",
    fields: [
      { key: "targetScore", label: "Target score", type: "int", default: 750, min: 350, max: 850 },
      { key: "targetDate", label: "By", type: "date", defaultMonths: 12 }
    ],
    autofillKeys: ["creditScore", "creditGainPerMonth"]
  },
  {
    key: "cardManagement", categoryKey: "credit", title: "Get Cards Under Control", icon: "🧾",
    unit: "steps", direction: "up", feasibilityKind: "checklist",
    blurb: "A short checklist to tame credit-card utilization.",
    fields: [
      { key: "targetDate", label: "Wrap up by", type: "date", defaultMonths: 4 }
    ],
    autofillKeys: ["creditScore"]
  },
  {
    key: "refinance", categoryKey: "credit", title: "Refinance a Loan", icon: "🔁",
    unit: "steps", direction: "up", feasibilityKind: "checklist",
    blurb: "Walk the steps to refinance to a lower rate.",
    fields: [
      { key: "debtIds", label: "Which loan", type: "debtPicker" },
      { key: "targetDate", label: "Close by", type: "date", defaultMonths: 3 }
    ],
    autofillKeys: ["refiRate", "creditScore"]
  }
];

// ── Lookups ────────────────────────────────────────────────────────────────
function goalsCategoryMeta(catKey) {
  return GOALS_CATEGORIES.find(function(c) { return c.key === catKey; }) || null;
}
function goalsTypeMeta(typeKey) {
  return GOALS_TYPES.find(function(t) { return t.key === typeKey; }) || null;
}
function goalsTypesForCategory(catKey) {
  return GOALS_TYPES.filter(function(t) { return t.categoryKey === catKey; });
}
