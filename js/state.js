// ─── App State ────────────────────────────────────────────────────────────────
// Owns the entire app state object. All seed data resets on page refresh —
// this is intentional for a prototype; no persistence layer exists yet.
//
// Key sections in the state object:
//   screen          — active screen key; always changed via go() in navigation.js
//   budget.*        — budget profile, categories, fixed overhead, debts, status
//   lessons/badges  — education content (seed data for the Learn tab)
//   tasks           — home screen daily task cards
//   userProfile     — user-entered name, income, housing (cleared by resetUserData)
//
// resetUserData() clears all user-entered fields (budget, debts, profile) while
// leaving seed/demo content (lessons, badges, tasks) intact.
//
// destinations[] drives two surfaces: the admin "Jump to screen" dropdown and
// the per-task destination picker in the home admin panel.

const destinations = [
  ["aboutMe",        "About Me"],
  ["budgetSetup",    "Budget Setup"],
  ["babyBudget",     "Baby Budget"],
  ["myProgress",     "My Progress"],
  ["lifestyle",      "Lifestyle"],
  ["learn",          "Learn"],
  ["topic",          "Topic Page"],
  ["reward-preview", "Reward Preview"],
  ["lesson",         "Lesson Player"],
  ["quiz",           "Quiz"],
  ["simulation",     "Simulation"],
  ["marketplace",    "Marketplace"],
  ["reward",         "Reward"]
];

const state = {
  // Navigation
  screen: "home",

  // Admin panel collapse — persists across screens
  adminCollapsed: false,

  // Lesson player stage style — toggled from admin panel
  // "waveform": animated bars above title | "clean": title only
  lpStageStyle: "waveform",

  // Color mode — toggled from admin panel, resets to light on page refresh
  settings: { colorMode: "light" },

  // UI interaction state
  babyStep: 0,
  selectedBadge: "Credit Cards",
  selectedOffer: "Cashback Credit Card",

  // Reward screen — written dynamically by completeLesson(), not hardcoded

  // ─── Seed data ────────────────────────────────────────────────────────────

  tasks: [
    {
      title: "Build your starter budget",
      description: "Create a rough first budget without connecting accounts.",
      cta: "Start",
      tab: "aboutMe",
      destination: "babyBudget",
      completed: false
    },
    {
      title: "Learn how interest builds",
      description: "A short lesson on why balances can grow faster than expected.",
      cta: "Learn",
      tab: "learn",
      lessonId: "interest-builds",
      completed: false
    },
    {
      title: "Review your emergency fund goal",
      description: "Track how close you are to your first savings milestone.",
      cta: "Review",
      tab: "other",
      destination: "myProgress",
      completed: true
    }
  ],

  // badges: persistent mastery objects per finance topic.
  // tier + level + progress drive the ring display.
  // Whether a badge has bonus content is now derived from lessons[].dailyTask,
  // not stored as a static flag — keeping the two in sync automatically.
  badges: [
    { name: "Emergency Fund",   tier: "Copper", level: 4, progress: 36 },
    { name: "Credit Cards",     tier: "Copper", level: 7, progress: 55 },
    { name: "Car Buying",       tier: "Copper", level: 3, progress: 24 },
    { name: "Home Buying",      tier: "Copper", level: 5, progress: 42 },
    { name: "Retirement",       tier: "Copper", level: 2, progress: 18 },
    { name: "Student Loans",    tier: "Copper", level: 6, progress: 61 },
    { name: "Health Insurance",  tier: "Copper", level: 1, progress: 12 },
    { name: "Investments",      tier: "Copper", level: 3, progress: 29 }
  ],

  goals: [
    { id: "g_seed_1", title: "Understand Home Buying", description: "Build confidence around the home buying process.", progress: 42, priority: 2 },
    { id: "g_seed_2", title: "Reduce Money Anxiety",   description: "Use repeated learning and budgeting practice to feel more grounded.", progress: 66, priority: 1 }
  ],

  // Tracks which goal is being edited in the goals screen
  // null = none; "new" = add form shown; else = goal.id being edited
  editingGoalId: null,

  milestones: [
    { title: "Emergency Fund",    current: "$1,240",          target: "$5,000",              progress: 25 },
    { title: "Credit Card Payoff",current: "$2,100 remaining",target: "$5,000 starting balance", progress: 58 }
  ],

  preferences: ["Low Fees", "Cashback", "Low APR", "Travel", "AI Tools"],

  offers: [
    { name: "Cashback Credit Card", category: "Credit Cards",  description: "Cashback card matching low-fee preferences.",                        match: "Matches Cashback and Low Fees" },
    { name: "High Yield Savings",   category: "Bank Accounts", description: "Savings account with simple fee structure.",                         match: "Matches Low Fees"             },
    { name: "Auto Refi Option",     category: "Refi",          description: "Refinance exploration for lower monthly pressure.",                  match: "Matches Low APR"              },
    { name: "Budgeting Software",   category: "Software",      description: "Tooling for tracking habits and recurring expenses.",                 match: "Matches Software"             },
    { name: "AI Finance Assistant", category: "AI Systems",    description: "AI system for personal finance learning and summaries.",             match: "Matches AI Tools"             },
    { name: "Auto Insurance Quote", category: "Insurance",     description: "Insurance comparison placeholder.",                                  match: "Matches price sensitivity"    }
  ],

  // ─── User profile ─────────────────────────────────────────────────────────
  // Fields populated by user input across screens. Flows between all screens
  // via this shared object. Resets on page refresh (desired behavior).
  // Use resetUserData() from admin panel to wipe without refreshing.
  userProfile: {
    name: "",
    monthlyIncome: "",
    housingCost: "",
    notes: ""
  },

  // ─── Education content ────────────────────────────────────────────────────
  // Lessons are the source of truth for the topic page. Each lesson knows:
  //   - which badges it contributes to (cross-badge XP design from PRD)
  //   - what type it is (drives visual treatment — lesson vs refresher)
  //   - whether it's tied to the daily task bonus path
  //   - its current completion status for this session
  lessons: [
    {
      id: "interest-builds",
      title: "How Interest Builds",
      description: "Why interest grows faster than you think — and how to stay ahead of it.",
      type: "lesson",        // "lesson" | "refresher" — drives content-type-tag styling
      badges: ["Credit Cards", "Car Buying", "Home Buying"], // 3 badges for prototype cross-badge reward demo
      xp: 40,                // base XP applied per badge on completion (before multipliers)
      dailyTask: true,       // true = bonusMultiplier applies; shown as bonus callout in UI
      status: "not-started"  // "not-started" | "in-progress" | "completed"
    },
    {
      id: "interest-refresher",
      title: "Interest Rates Refresher",
      description: "Quick recap of compound interest. Shorter, faster.",
      type: "refresher",     // visually distinct from lesson — different tag, different button color
      badges: ["Credit Cards", "Car Buying", "Home Buying", "Student Loans"],
      xp: 15,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "budget-basics",
      title: "Budget Basics",
      description: "Foundation of personal budgeting.",
      type: "lesson",
      badges: ["Emergency Fund", "Credit Cards", "Retirement"],
      xp: 35,
      dailyTask: false,
      status: "completed"    // pre-seeded completed so testers can see what that state looks like
    },

    // ── Credit Cards ──
    {
      id: "minimum-payments-trap",
      title: "The Minimum Payments Trap",
      description: "Why paying the minimum keeps you in debt far longer than you think.",
      type: "lesson",
      badges: ["Credit Cards", "Student Loans", "Car Buying"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },

    // ── Emergency Fund ──
    {
      id: "three-month-rule",
      title: "The 3-Month Rule",
      description: "How to size your emergency fund and why three months is the baseline.",
      type: "lesson",
      badges: ["Emergency Fund", "Home Buying", "Retirement"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "where-to-keep-it",
      title: "Where to Keep It",
      description: "High-yield savings vs checking — why separation matters.",
      type: "refresher",
      badges: ["Emergency Fund", "Investments"],
      xp: 15,
      dailyTask: false,
      status: "not-started"
    },

    // ── Car Buying ──
    {
      id: "total-cost-of-ownership",
      title: "Total Cost of Ownership",
      description: "Sticker price vs insurance, maintenance, and depreciation.",
      type: "lesson",
      badges: ["Car Buying", "Home Buying"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "loan-vs-lease",
      title: "Loan vs Lease",
      description: "When each makes sense and the key trade-off.",
      type: "lesson",
      badges: ["Car Buying"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },

    // ── Home Buying ──
    {
      id: "what-you-can-afford",
      title: "What You Can Actually Afford",
      description: "The 28% rule, DTI, and why pre-approval matters.",
      type: "lesson",
      badges: ["Home Buying", "Credit Cards", "Student Loans", "Car Buying"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "hidden-costs-buying",
      title: "Hidden Costs of Buying",
      description: "Closing costs, property tax, HOA, and maintenance reserves.",
      type: "lesson",
      badges: ["Home Buying", "Car Buying", "Emergency Fund"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    },

    // ── Retirement ──
    {
      id: "why-start-now",
      title: "Why Start Now",
      description: "The compound growth advantage of starting in your 20s vs 30s.",
      type: "lesson",
      badges: ["Retirement", "Investments"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "401k-and-the-match",
      title: "401k and the Match",
      description: "What employer matching is and why not taking it is leaving money behind.",
      type: "lesson",
      badges: ["Retirement", "Investments"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    },

    // ── Student Loans ──
    {
      id: "federal-vs-private",
      title: "Federal vs Private Loans",
      description: "Protections, flexibility, and why federal loans are the safer starting point.",
      type: "lesson",
      badges: ["Student Loans", "Home Buying"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "income-driven-repayment",
      title: "Income-Driven Repayment",
      description: "What IDR is and when it makes sense for federal borrowers.",
      type: "refresher",
      badges: ["Student Loans", "Home Buying", "Retirement"],
      xp: 15,
      dailyTask: false,
      status: "not-started"
    },

    // ── Health Insurance ──
    {
      id: "deductible-vs-premium",
      title: "Deductible vs Premium",
      description: "The trade-off between monthly cost and out-of-pocket risk.",
      type: "lesson",
      badges: ["Health Insurance", "Emergency Fund"],
      xp: 30,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "hsa-basics",
      title: "HSA Basics",
      description: "What a Health Savings Account is and its triple tax advantage.",
      type: "refresher",
      badges: ["Health Insurance", "Investments", "Retirement"],
      xp: 15,
      dailyTask: false,
      status: "not-started"
    },

    // ── Investments ──
    {
      id: "index-funds-explained",
      title: "Index Funds Explained",
      description: "What they are and why low-cost beats stock picking for most people.",
      type: "lesson",
      badges: ["Investments", "Retirement"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    },
    {
      id: "risk-and-time-horizon",
      title: "Risk and Time Horizon",
      description: "How your timeline changes what you should own.",
      type: "lesson",
      badges: ["Investments", "Retirement", "Emergency Fund"],
      xp: 35,
      dailyTask: false,
      status: "not-started"
    }
  ],

  // ─── Quiz questions ───────────────────────────────────────────────────────
  // Each question is keyed to a lesson ID — not a free-floating pool.
  // In production, questions scale in difficulty and the pool grows per lesson.
  // For prototype: 3 questions per lesson (matches default quizQuestionsRequired).
  // correct: index into choices[] array (0-based).
  quizQuestions: [
    {
      id: "q1", lessonId: "interest-builds",
      question: "Which balance grows faster if left unpaid?",
      choices: ["10% APR", "24% APR", "APR does not matter"],
      correct: 1
    },
    {
      id: "q2", lessonId: "interest-builds",
      question: "What does APR stand for?",
      choices: ["Annual Payment Rate", "Annual Percentage Rate", "Applied Profit Ratio"],
      correct: 1
    },
    {
      id: "q3", lessonId: "interest-builds",
      question: "Which of these would cost the most over 5 years?",
      choices: ["$10,000 at 5% APR", "$10,000 at 22% APR", "$10,000 at 0% APR"],
      correct: 1
    },

    // ── minimum-payments-trap ──
    { id: "q4", lessonId: "minimum-payments-trap",
      question: "What happens to most of your minimum payment on a credit card?",
      choices: ["It reduces your balance", "It covers interest charges", "It increases your credit limit"],
      correct: 1 },
    { id: "q5", lessonId: "minimum-payments-trap",
      question: "How does paying more than the minimum help you?",
      choices: ["Instantly raises your credit score", "Reduces time and interest paid overall", "Waives your next payment"],
      correct: 1 },
    { id: "q6", lessonId: "minimum-payments-trap",
      question: "Who benefits most when you pay only the minimum?",
      choices: ["You, by preserving cash", "The bank, through extended interest charges", "Your credit score"],
      correct: 1 },

    // ── three-month-rule ──
    { id: "q7", lessonId: "three-month-rule",
      question: "What is the standard emergency fund target?",
      choices: ["1 month of expenses", "3–6 months of expenses", "12 months of income"],
      correct: 1 },
    { id: "q8", lessonId: "three-month-rule",
      question: "What risk does an emergency fund help you avoid?",
      choices: ["Missing investment gains", "Taking on credit card debt for unexpected costs", "Paying too much in taxes"],
      correct: 1 },
    { id: "q9", lessonId: "three-month-rule",
      question: "Where should you NOT put your emergency fund?",
      choices: ["High-yield savings account", "Invested in the stock market", "Separate savings account"],
      correct: 1 },

    // ── where-to-keep-it ──
    { id: "q10", lessonId: "where-to-keep-it",
      question: "What is the main advantage of a high-yield savings account for an emergency fund?",
      choices: ["Higher risk for higher returns", "Earns interest while staying accessible", "It's only FDIC insured"],
      correct: 1 },
    { id: "q11", lessonId: "where-to-keep-it",
      question: "Why should your emergency fund be separate from your checking account?",
      choices: ["To earn higher interest", "To avoid spending it on non-emergencies", "To reduce your tax liability"],
      correct: 1 },
    { id: "q12", lessonId: "where-to-keep-it",
      question: "Why is investing your emergency fund a bad idea?",
      choices: ["Markets rarely grow", "You may need to sell at a loss during an emergency", "Investments have no liquidity"],
      correct: 1 },

    // ── total-cost-of-ownership ──
    { id: "q13", lessonId: "total-cost-of-ownership",
      question: "Which cost is often overlooked when buying a car?",
      choices: ["Sticker price", "Depreciation in the first year", "Monthly loan payment"],
      correct: 1 },
    { id: "q14", lessonId: "total-cost-of-ownership",
      question: "What does 'total cost of ownership' include beyond the purchase price?",
      choices: ["Only fuel costs", "Insurance, maintenance, fuel, and depreciation", "Only insurance"],
      correct: 1 },
    { id: "q15", lessonId: "total-cost-of-ownership",
      question: "What is the best number to compare when choosing between two cars?",
      choices: ["Monthly payment", "Total cost of ownership", "Sticker price"],
      correct: 1 },

    // ── loan-vs-lease ──
    { id: "q16", lessonId: "loan-vs-lease",
      question: "What is the main advantage of leasing a car?",
      choices: ["You build equity over time", "Lower monthly payments", "No mileage restrictions"],
      correct: 1 },
    { id: "q17", lessonId: "loan-vs-lease",
      question: "When does buying a car make more financial sense than leasing?",
      choices: ["When you want a new car every 2 years", "When you plan to keep it long-term", "When you drive very little"],
      correct: 1 },
    { id: "q18", lessonId: "loan-vs-lease",
      question: "What happens at the end of a car lease?",
      choices: ["You own the car outright", "You return the car or buy it at residual value", "You automatically renew"],
      correct: 1 },

    // ── what-you-can-afford ──
    { id: "q19", lessonId: "what-you-can-afford",
      question: "What is the common housing affordability rule of thumb?",
      choices: ["50% of gross income", "28% of gross income", "15% of net income"],
      correct: 1 },
    { id: "q20", lessonId: "what-you-can-afford",
      question: "What does getting pre-approved for a mortgage tell you?",
      choices: ["The exact home you should buy", "Your actual borrowing limit based on income and debt", "That you're guaranteed the loan"],
      correct: 1 },
    { id: "q21", lessonId: "what-you-can-afford",
      question: "What does DTI stand for in home buying?",
      choices: ["Down to Income", "Debt-to-Income ratio", "Deposit Transfer Index"],
      correct: 1 },

    // ── hidden-costs-buying ──
    { id: "q22", lessonId: "hidden-costs-buying",
      question: "What are closing costs typically as a percentage of purchase price?",
      choices: ["0.5–1%", "2–5%", "10–15%"],
      correct: 1 },
    { id: "q23", lessonId: "hidden-costs-buying",
      question: "What is a standard annual home maintenance reserve?",
      choices: ["5% of home value", "1% of home value", "10% of mortgage payment"],
      correct: 1 },
    { id: "q24", lessonId: "hidden-costs-buying",
      question: "Which recurring cost is specific to condos and planned communities?",
      choices: ["Closing costs", "HOA fees", "Down payment"],
      correct: 1 },

    // ── why-start-now ──
    { id: "q25", lessonId: "why-start-now",
      question: "What makes starting retirement savings early so powerful?",
      choices: ["Higher contribution limits", "Compound growth over time", "Tax-free withdrawals"],
      correct: 1 },
    { id: "q26", lessonId: "why-start-now",
      question: "If two people save different amounts but one starts 10 years earlier, who likely ends up with more?",
      choices: ["The one who saves more per month", "The one who starts earlier", "They end up the same"],
      correct: 1 },
    { id: "q27", lessonId: "why-start-now",
      question: "What does compound growth mean?",
      choices: ["Your returns are taxed each year", "Your returns generate their own returns over time", "You earn a fixed interest rate"],
      correct: 1 },

    // ── 401k-and-the-match ──
    { id: "q28", lessonId: "401k-and-the-match",
      question: "What is an employer match in a 401k?",
      choices: ["A bonus paid at retirement", "Free money added when you contribute", "A mandatory contribution"],
      correct: 1 },
    { id: "q29", lessonId: "401k-and-the-match",
      question: "What happens to your taxable income when you contribute to a traditional 401k?",
      choices: ["It increases", "It decreases", "It stays the same"],
      correct: 1 },
    { id: "q30", lessonId: "401k-and-the-match",
      question: "What is the smartest first move with a 401k?",
      choices: ["Invest in individual stocks", "Contribute enough to get the full employer match", "Wait until you earn more"],
      correct: 1 },

    // ── federal-vs-private ──
    { id: "q31", lessonId: "federal-vs-private",
      question: "What is one key advantage of federal student loans over private loans?",
      choices: ["Always lower total cost", "Access to income-driven repayment plans", "No interest charged"],
      correct: 1 },
    { id: "q32", lessonId: "federal-vs-private",
      question: "What type of interest rate do most federal student loans have?",
      choices: ["Variable", "Fixed", "Adjustable"],
      correct: 1 },
    { id: "q33", lessonId: "federal-vs-private",
      question: "When should you consider private student loans?",
      choices: ["Before federal loans", "After exhausting federal options", "When you want lower monthly payments"],
      correct: 1 },

    // ── income-driven-repayment ──
    { id: "q34", lessonId: "income-driven-repayment",
      question: "What does income-driven repayment base your payment on?",
      choices: ["Your loan balance", "Your discretionary income", "Your credit score"],
      correct: 1 },
    { id: "q35", lessonId: "income-driven-repayment",
      question: "What can happen to remaining federal loan balances after 20–25 years on IDR?",
      choices: ["They disappear with no tax consequences", "They may be forgiven (and possibly taxed)", "They convert to private loans"],
      correct: 1 },
    { id: "q36", lessonId: "income-driven-repayment",
      question: "Does interest stop accruing on IDR plans?",
      choices: ["Yes, that's the main benefit", "No, interest still accrues", "Only if your payment is zero"],
      correct: 1 },

    // ── deductible-vs-premium ──
    { id: "q37", lessonId: "deductible-vs-premium",
      question: "What is a health insurance premium?",
      choices: ["What you pay when you visit a doctor", "Your monthly cost for coverage", "Your out-of-pocket maximum"],
      correct: 1 },
    { id: "q38", lessonId: "deductible-vs-premium",
      question: "What is a health insurance deductible?",
      choices: ["What you pay monthly regardless of use", "What you pay before insurance kicks in", "The maximum you'll ever pay"],
      correct: 1 },
    { id: "q39", lessonId: "deductible-vs-premium",
      question: "Who benefits most from a high-deductible health plan?",
      choices: ["People with frequent medical needs", "Healthy people who rarely use healthcare", "Retirees only"],
      correct: 1 },

    // ── hsa-basics ──
    { id: "q40", lessonId: "hsa-basics",
      question: "What makes an HSA a 'triple tax advantage'?",
      choices: ["Three different accounts", "Tax-free contributions, growth, and qualified withdrawals", "It triples your savings"],
      correct: 1 },
    { id: "q41", lessonId: "hsa-basics",
      question: "What type of health plan do you need to qualify for an HSA?",
      choices: ["Any employer plan", "A high-deductible health plan", "A government plan only"],
      correct: 1 },
    { id: "q42", lessonId: "hsa-basics",
      question: "What happens to unused HSA funds at the end of the year?",
      choices: ["They are forfeited", "They roll over to the next year", "They convert to cash"],
      correct: 1 },

    // ── index-funds-explained ──
    { id: "q43", lessonId: "index-funds-explained",
      question: "What does an index fund track?",
      choices: ["Individual stock picks", "A market index like the S&P 500", "Real estate prices"],
      correct: 1 },
    { id: "q44", lessonId: "index-funds-explained",
      question: "Why do index funds typically have lower fees than actively managed funds?",
      choices: ["They take more risk", "They don't require active management", "They're only for institutions"],
      correct: 1 },
    { id: "q45", lessonId: "index-funds-explained",
      question: "What advantage do index funds provide that individual stocks don't?",
      choices: ["Guaranteed returns", "Instant diversification across many companies", "Tax-free growth"],
      correct: 1 },

    // ── risk-and-time-horizon ──
    { id: "q46", lessonId: "risk-and-time-horizon",
      question: "What is 'time horizon' in investing?",
      choices: ["The limit on how much you can invest", "How long before you need the money", "The maximum return you expect"],
      correct: 1 },
    { id: "q47", lessonId: "risk-and-time-horizon",
      question: "If you need money in 2 years, what kind of investments are most appropriate?",
      choices: ["High-risk stocks for maximum growth", "Lower-risk investments to avoid losses", "Cryptocurrency for quick gains"],
      correct: 1 },
    { id: "q48", lessonId: "risk-and-time-horizon",
      question: "What is the general rule for someone with a 30-year investment horizon?",
      choices: ["Mostly bonds for safety", "More stocks since time corrects short-term drops", "Keep everything in cash"],
      correct: 1 }
  ],

  // ─── XP configuration (admin-editable) ───────────────────────────────────
  // These are the PRD's core tuning levers. All three are surfaced in the
  // Learn admin panel so they can be adjusted during user testing without
  // touching code.
  //   bonusMultiplier:       daily task lessons earn this multiple of base XP (PRD placeholder: 5x)
  //   discountedRate:        manual learning after daily bonus consumed (PRD placeholder: 0.5x)
  //   quizQuestionsRequired: questions answered correctly before quiz ends (default: 3)
  xpConfig: {
    bonusMultiplier: 5,
    discountedRate: 0.5,
    quizQuestionsRequired: 3
  },

  // ─── Tier definitions ─────────────────────────────────────────────────────
  // MVP tiers: Copper → Silver → Gold. The color drives the ring fill color
  // in renderBadgeRing(). maxLevel controls when the badge tier advances.
  // Progression: level increments per XP threshold; at maxLevel, tier advances
  // and level resets to 1. Final tier (Gold) caps at maxLevel with no advance.
  tiers: [
    { name: "Copper", color: "#b87333", maxLevel: 10 },
    { name: "Silver", color: "#a8a9ad", maxLevel: 10 },
    { name: "Gold",   color: "#ffd700", maxLevel: 10 }
  ],

  // ─── Active lesson session ────────────────────────────────────────────────
  // currentLesson: set to a lesson object when user enters a lesson screen.
  // quiz and lesson screens both read from this — keeps them in sync without
  // passing arguments through onclick strings.
  currentLesson: null,

  // activeQuizIndex: which question the user is currently on (0-based).
  // activeQuizChoice: index of the correct answer once chosen, or null.
  // activeQuizWrongChoices: all choice indices the user has tried and got wrong
  //   for the current question — these stay red and disabled permanently for
  //   that question. Cleared on next question or exit.
  activeQuizIndex: 0,
  activeQuizChoice: null,
  activeQuizWrongChoices: [],

  // ─── Recently active ──────────────────────────────────────────────────────
  // Ordered list of badge names by last access. Updated by selectLesson().
  // Drives the "Recently Active" section — this is resume behavior (where
  // the user left off), not a static flag on the badge object.
  recentlyActive: ["Credit Cards", "Emergency Fund"],

  // ─── Search ───────────────────────────────────────────────────────────────
  // searchQuery: the current value of the Learn tab search input.
  // Persisted in state so renderSearch() can re-filter on partial renders
  // without losing the input's value. Cleared when user navigates away.
  searchQuery: "",

  // ─── Reward session data ──────────────────────────────────────────────────
  // Written by completeLesson() before navigating to the reward screen.
  // The reward screen reads entirely from this — no hardcoded values.
  // Each entry: { name, tier, level, oldProgress, newProgress, xpBase, xpBonus, leveledUp, newTier, newLevel }
  rewardBadgeGains: [],
  rewardXp: 0,             // total XP across all badges (base + bonus combined)
  rewardLessonTitle: "",   // lesson title shown in reward screen header

  // ─── Budget ───────────────────────────────────────────────────────────────
  // Main budget dashboard state. Status drives which experience renders.
  // status values: "empty" | "in-progress" | "complete" | "refresh" | "checkup"
  selectedBudgetCategory: null,
  selectedDebt: null,
  debtAnalyzerExtraPayment: 200,
  debtAnalyzerIncluded: {},
  budget: {
    status: "empty",
    inProgressPct: 60,
    wizardInputs: null,

    profile: {
      zip: "95126",
      householdSize: 1,
      lastUpdated: "2026-02-15",
      // Income model — supports salary, variable (gig), or mixed households
      incomeType: "salary",   // "salary" | "variable" | "mixed"
      earners: [
        { label: "Primary", monthlyNet: 7500, type: "salary" }
      ],
      variableIncomeMonths: [6800, 7200, 7500]  // 3 months, oldest → most recent
    },

    // Bottom-line math (3-month checking balance trend)
    // monthlyNetSpend = (balanceStart - balanceEnd + income*3 - debtRepaid + assetsSold) / 3
    // debtRepaid: extra debt principal paid from checking (reduces apparent spend;
    //             it left checking but is not discretionary lifestyle spending)
    balanceStart:  12000,
    balanceEnd:    14400,
    debtRepaid:    0,
    assetsSold:    0,

    // Fixed overhead — shown as a summary line below category tiles, not as a tile
    fixedOverhead: [
      { name: "Medical / Insurance",  amount: 250 },
      { name: "Debt Minimum Payments", amount: 150 }
    ],

    // Category buckets (5 wide tiles)
    // fixed: true → suppress "Worth a look" signal even if above peer avg
    // intentional: user-set on Category Detail screen
    // targetSpend: set via "Set a Spending Target" — null if not set
    categories: [
      {
        key: "housing", name: "Housing", icon: "🏠", fixed: true,
        intentional: false, targetSpend: null,
        subcategories: [
          { key: "rent",      name: "Rent / Mortgage", amount: 2600 },
          { key: "utilities", name: "Utilities",        amount: 250  },
          { key: "hoa",       name: "HOA / PMI",         amount: 0    }
        ]
      },
      {
        key: "food", name: "Food & Daily", icon: "🍔", fixed: false,
        intentional: false, targetSpend: null,
        subcategories: [
          { key: "groceries", name: "Groceries",         amount: 450 },
          { key: "dining",    name: "Dining Out",         amount: 250 },
          { key: "daily",     name: "Daily Convenience",  amount: 80  }
        ]
      },
      {
        key: "transport", name: "Transport", icon: "🚗", fixed: true,
        intentional: false, targetSpend: null,
        subcategories: [
          { key: "car_fixed", name: "Car / Fixed Costs",    amount: 450 },
          { key: "gas",       name: "Gas & Variable",        amount: 200 },
          { key: "transit",   name: "Transit / Rideshare",   amount: 100 }
        ]
      },
      {
        key: "lifestyle", name: "Lifestyle", icon: "🎭", fixed: false,
        intentional: false, targetSpend: null,
        subcategories: [
          { key: "shopping",  name: "Shopping",              amount: 280 },
          { key: "entertain", name: "Entertainment",          amount: 220 },
          { key: "subs",      name: "Subscriptions & Phone",  amount: 350 }
        ]
      },
      {
        key: "savings", name: "Savings & Goals", icon: "💰", fixed: false,
        intentional: false, targetSpend: null,
        subcategories: [
          { key: "emergency",  name: "Emergency Fund",    amount: 100 },
          { key: "retirement", name: "Retirement",         amount: 150 },
          { key: "debt_extra", name: "Extra Debt Payoff",  amount: 50  }
        ]
      }
    ],

    // Debt instruments — cashflow debt only (credit cards, loans, etc.; not mortgage).
    // Populated by Baby Budget wizard via postMessage bridge or admin panel.
    debts: [
      {
        id: "d_1", type: "creditCard", name: "Chase Sapphire",
        balance: 4200, apr: 22.99, minPayment: 95,
        remainingMonths: 0, payoffBehavior: "sometimes",
        repaymentType: "standard", pslfPaymentsMade: 0,
        contactName: "", customSubtype: "", revolving: true,
        expanded: false
      },
      {
        id: "d_2", type: "autoLoan", name: "Honda Civic Loan",
        balance: 11800, apr: 6.9, minPayment: 287,
        remainingMonths: 44,
        repaymentType: "standard", pslfPaymentsMade: 0,
        contactName: "", customSubtype: "", revolving: false,
        expanded: false
      },
      {
        id: "d_3", type: "studentLoan", name: "Federal Student Loan",
        balance: 28500, apr: 5.05, minPayment: 295,
        remainingMonths: 108,
        repaymentType: "standard", pslfPaymentsMade: 0,
        contactName: "", customSubtype: "", revolving: false,
        expanded: false
      }
    ]
  },

  // ── Lifestyle answers and derived sub-sliders ─────────────────────────────
  // answers: per theme, keyed by questionIndex → answerIndex (0–3)
  // lastUpdated: ISO date string or null
  lifestyleAnswers: {
    food:          { answers: {}, lastUpdated: null },
    entertainment: { answers: {}, lastUpdated: null },
    travel:        { answers: {}, lastUpdated: null },
    shopping:      { answers: {}, lastUpdated: null },
    other:         { answers: {}, lastUpdated: null }
  },

  // Sub-slider amounts per theme, derived from lifestyle answers + user-adjustable.
  // Food drives Food & Daily bucket; entertainment+shopping+other drive Lifestyle bucket;
  // travel drives Getting Around bucket.
  lifestyleSubSliders: {
    food: {}, entertainment: {}, travel: {}, shopping: {}, other: {}
  },

  // ── Point-in-time balance snapshots (for monthly tracking) ────────────────
  accountBalances: [],  // [{id, account, amount, date}]

  // ── Flow origin tracking (for post-flow return navigation) ────────────────
  // Set to the screen key where a multi-step input flow began.
  // Cleared when the flow completes (finish screen returns user here).
  flowOrigin: null,

  // ── Post-result loop context ──────────────────────────────────────────────
  // Describes what was just completed. Drives the context headline on post-result
  // screen and the impact-landing destination on the finish screen.
  // "budget" | "lifestyle" | "monthlyUpdate" | "goal" | null
  postResultContext: null,
  postResultTheme: null,   // lifestyle theme key when context === "lifestyle"

  // ── Commitments from post-result loop ────────────────────────────────────
  commitments: []  // [{id, text, createdAt, goalId}]
};

// Wipes user-entered profile data and re-renders. Called from admin panel.
function resetUserData() {
  state.userProfile = { name: "", monthlyIncome: "", housingCost: "", notes: "" };
  state.budget.status        = "empty";
  state.budget.wizardInputs  = null;
  state.budget.profile.lastUpdated = null;
  state.budget.debts         = [];
  state.selectedDebt         = null;
  state.debtAnalyzerIncluded = {};
  state.selectedOffer        = null;
  state.rewardBadgeGains     = null;
  state.rewardXp             = 0;
  state.rewardLessonTitle    = "";
  state.lifestyleAnswers     = { food: { answers: {}, lastUpdated: null }, entertainment: { answers: {}, lastUpdated: null }, travel: { answers: {}, lastUpdated: null }, shopping: { answers: {}, lastUpdated: null }, other: { answers: {}, lastUpdated: null } };
  state.lifestyleSubSliders  = { food: {}, entertainment: {}, travel: {}, shopping: {}, other: {} };
  state.accountBalances      = [];
  state.commitments          = [];
  state.flowOrigin           = null;
  state.postResultContext    = null;
  state.postResultTheme      = null;
  state.postResultReaction   = null;
  state.nextAction           = null;
  state.monthlyUpdateGap     = null;
  state.editingGoalId        = null;
  render();
}
