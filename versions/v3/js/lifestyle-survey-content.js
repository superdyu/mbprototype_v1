// ─── Lifestyle Survey — Content & Tuning Table ────────────────────────────────
// THE editable surface for the Lifestyle Wizard (pattern: GOALS_TUNING). All
// copy, percentages, prerequisites, and knobs live HERE; js/lifestyle-survey-
// bridge.js is pure mechanism and screens/lifestyle-survey.js is pure
// rendering. Tune this file as the numbers teach us — nothing else needs to
// change. The Survey Explorer (survey-explorer.html, linked from the admin
// panel) renders everything in this file at scale.
//
// SCALE DESIGN (Dyuman's call): 4 notches, NO CENTER — the user always leans
// above or below "normal". pct is the lean vs the peer baseline for that
// category. Follow-ups can PIVOT a lean back toward normal via negative `adj`
// when their answer shows the lean overstated reality (e.g. "food well above"
// explained by a full-house grocery run isn't overspending). A SKIPPED
// question sits exactly on the peer baseline (pct 0).
//
// ⚠ SHARED-KNOWLEDGE TWINS (must stay in sync with bb_template.html, which
// can't reach host files from inside its iframe):
//   LS_SEG          ↔ SEG          (BLS %-of-net by income quintile)
//   LS_ZIP_SENSITIVITY ↔ ZIP_SENSITIVITY
//   LS_TAX_BRACKETS ↔ STATE_TAX_RATES["CA"] (+ the $4,700/dependent deduction)

// BLS CE Survey — % of AFTER-TAX income by income quintile. Rows sum to 100.
const LS_SEG = [
  { max: 2500,     housing: 42, bills: 14, food: 16, transport: 10, health: 6, lifestyle:  5, debt: 5, savings:  2 },
  { max: 4000,     housing: 38, bills: 13, food: 15, transport: 10, health: 7, lifestyle:  6, debt: 6, savings:  5 },
  { max: 6500,     housing: 34, bills: 12, food: 13, transport:  9, health: 8, lifestyle:  8, debt: 7, savings:  9 },
  { max: 10000,    housing: 30, bills: 11, food: 12, transport:  9, health: 8, lifestyle:  9, debt: 7, savings: 14 },
  { max: Infinity, housing: 26, bills: 10, food: 11, transport:  8, health: 7, lifestyle: 10, debt: 6, savings: 22 }
];

// How strongly each category's baseline tracks the ZIP cost-of-living index.
const LS_ZIP_SENSITIVITY = { housing: 1.0, bills: 0.5, food: 0.5, transport: 0.5,
                             health: 0, lifestyle: 0, debt: 0 };

// Combined federal+state effective brackets (annual gross → rate), CA-flavored
// like the 2MB's. Each dependent deducts $4,700 × rate.
const LS_TAX_BRACKETS = [
  { annual: 20000,   rate: 0.12 },
  { annual: 40000,   rate: 0.18 },
  { annual: 60000,   rate: 0.24 },
  { annual: 80000,   rate: 0.30 },
  { annual: 120000,  rate: 0.36 },
  { annual: 200000,  rate: 0.413 },
  { annual: Infinity, rate: 0.503 }
];
const LS_DEPENDENT_DEDUCTION = 4700;

const LS_TUNING = {
  rangeWidthPct: 0.10,      // dollar range shown per notch: amount ± 10%
  urbanZipMult: 1.2,        // zip multiplier at/above which "urban" prereqs arm
  maxQuestions: 20          // hard cap (base 7 + follow-ups must stay under)
};

// ── Base questions ────────────────────────────────────────────────────────────
// One per spending category, ordered by budget magnitude (biggest levers
// first). notches[i].pct = lean vs peer baseline; desc ≈ 200–280 chars.
const LS_BASE_QUESTIONS = [
  {
    cat: "housing", title: "Your place, honestly",
    stageLabel: "Lifestyle Stage",
    sub: "Compared to people around you, how much of your money goes to where you live?",
    notches: [
      { label: "Well below", pct: -0.35,
        desc: "You've kept the roof cheap on purpose — roommates, family, a rent-controlled find, or a paid-down place. Friends are shocked at what you pay. It's the single biggest budget advantage a person can have, and you're holding it." },
      { label: "Slightly below", pct: -0.12,
        desc: "You pay a bit less than most people in your area — maybe a smaller spot, a longer commute traded for cheaper rent, or a deal you locked in a while ago. Housing pinches some months, but it isn't the thing running your budget." },
      { label: "Slightly above", pct: 0.15,
        desc: "You stretched a little for the place — better location, more space, newer building. Rent or mortgage day is noticeable. It's a real choice about quality of life, and it means the rest of the month needs a bit more discipline." },
      { label: "Well above", pct: 0.45,
        desc: "The place is the splurge: prime location, space you love, or a mortgage you climbed for. A big share of every paycheck goes to the roof before anything else moves. Most months, housing decides what the rest of the budget gets." }
    ]
  },
  {
    cat: "food", title: "Food & groceries",
    stageLabel: "Lifestyle Stage",
    sub: "Groceries, dining out, coffee, delivery — the whole food picture.",
    notches: [
      { label: "Well below", pct: -0.30,
        desc: "You cook, you plan, you shop the deals — and eating out is an occasion, not a default. People wonder how your food bill is so low. It takes real effort week after week, and it quietly frees up money most people never see." },
      { label: "Slightly below", pct: -0.10,
        desc: "Mostly home cooking with a takeout night here and there. You look at prices, keep a rough list, and skip the impulse snacks more often than not. Food costs less than it does for most people around you, without feeling like a diet." },
      { label: "Slightly above", pct: 0.15,
        desc: "Food is one of your pleasures — a few dinners out, decent groceries, coffee that isn't from the office pot. You're not reckless, but you rarely say no over a few dollars. It adds up a little faster than you'd guess." },
      { label: "Well above", pct: 0.45,
        desc: "Delivery apps know your order, restaurants know your face, and the grocery cart skews premium. Food is where your money celebrates. It's a genuine lifestyle choice — and usually the fastest category to trim when a goal shows up." }
    ]
  },
  {
    cat: "transport", title: "Getting around",
    stageLabel: "Lifestyle Stage",
    sub: "Gas, rideshare, transit, maintenance — moving through your week.",
    notches: [
      { label: "Well below", pct: -0.40,
        desc: "You walk, bike, ride transit, or barely drive — maybe no car at all. Getting around costs you a fraction of what it costs most people. Whatever the reason — city living, remote work, or choice — it's a major quiet saving." },
      { label: "Slightly below", pct: -0.15,
        desc: "You keep transport modest: an efficient or paid-off car, some transit, errands batched into one trip. There's a cost every month, but it behaves. You spend a little less moving around than most people in your situation." },
      { label: "Slightly above", pct: 0.15,
        desc: "Between commuting, rideshares when it's late, and a car that likes premium attention, getting around costs a bit more than average. Convenience wins over cost more often than not — you pay a little extra to not think about it." },
      { label: "Well above", pct: 0.50,
        desc: "A car payment with real presence, rideshares as a habit, long commutes, or all three. Transportation is one of your biggest lines and you feel it. Some of it is circumstance, some is comfort — either way it's a heavyweight." }
    ]
  },
  {
    cat: "lifestyle", title: "Fun, stuff & subscriptions",
    stageLabel: "Lifestyle Stage",
    sub: "Entertainment, clothes, hobbies, travel, the subscription stack.",
    notches: [
      { label: "Well below", pct: -0.45,
        desc: "Your fun is mostly free or cheap — library cards, trails, one streaming service, clothes that last. Spending on wants is rare and deliberate. People call you disciplined; you'd call it not needing much to have a good time." },
      { label: "Slightly below", pct: -0.15,
        desc: "You enjoy things, but on a leash: a couple of subscriptions, occasional shopping, a modest trip when it matters. Most wants go on a mental waiting list first, and plenty never make it off. Spending stays below the local normal." },
      { label: "Slightly above", pct: 0.20,
        desc: "Life's for living — concerts, new fits, a hobby with gear, a subscription stack you've lost exact count of. Nothing wild on its own, but together the fun budget runs a bit hot. It's usually the easiest place to find money back." },
      { label: "Well above", pct: 0.60,
        desc: "Experiences, shopping, travel, gadgets — you say yes a lot, and your camera roll proves it. Discretionary spending is a defining feature of your budget, not a rounding error. Great for the soul; heavy for the savings rate." }
    ]
  },
  {
    cat: "bills", title: "The fixed bills",
    stageLabel: "Lifestyle Stage",
    sub: "Insurance, phone, internet, and the other must-pays.",
    notches: [
      { label: "Well below", pct: -0.25,
        desc: "You've squeezed the boring bills hard — negotiated plans, minimal coverage where that's sane, no lingering services you forgot about. The must-pays take a smaller bite for you than for almost anyone you know." },
      { label: "Slightly below", pct: -0.08,
        desc: "You check the bills once in a while and cut what's not earning its keep. Coverage is sensible, plans are mid-tier, nothing gold-plated. The fixed costs run just under what most households around you quietly pay." },
      { label: "Slightly above", pct: 0.10,
        desc: "Your must-pays lean premium: better insurance tiers, the fast internet, the big phone plan, maybe a service or two riding along unexamined. Not dramatic — just a steady few percent more than typical, every single month." },
      { label: "Well above", pct: 0.30,
        desc: "Between top-tier coverage, family plans, and bills that arrived one at a time and never left, your fixed costs run heavy. It's the sneakiest kind of spending: automatic, invisible, and worth an audit once a year at least." }
    ]
  },
  {
    cat: "debt", title: "Debt payments",
    stageLabel: "Lifestyle Stage",
    sub: "Credit cards, student loans, car notes — what goes to debt monthly.",
    notches: [
      { label: "Well below", pct: -0.60,
        desc: "Little to no debt service — cards paid in full, loans gone or nearly gone. Money that would be interest stays yours. It's the position everyone's trying to reach, and it changes what every other category can afford to be." },
      { label: "Slightly below", pct: -0.25,
        desc: "Some debt, handled: a manageable loan or a card balance that's shrinking on schedule. Payments are present but not loud. You're below the typical debt load for your income, and the trend line points the right way." },
      { label: "Slightly above", pct: 0.25,
        desc: "Debt has a real seat at the table — a couple of balances, minimums plus a bit more, progress slower than you'd like. It's above what most people at your income carry, and it's quietly taxing every other category." },
      { label: "Well above", pct: 0.80,
        desc: "Debt payments are one of your biggest monthly lines — multiple balances, high minimums, maybe interest outrunning progress. It's heavy and you know it. Naming it honestly here is what lets the plan actually attack it." }
    ]
  },
  {
    cat: "health", title: "Health & education",
    stageLabel: "Lifestyle Stage",
    sub: "Copays, prescriptions, gym, courses — investing in yourself.",
    notches: [
      { label: "Well below", pct: -0.35,
        desc: "Healthy, covered, and low-maintenance — or careful to keep it cheap: employer coverage doing the work, generic prescriptions, free workouts. You spend clearly less here than most, and mostly by good fortune plus good habits." },
      { label: "Slightly below", pct: -0.12,
        desc: "The occasional copay, a modest gym or class, nothing chronic or fancy. Health and learning cost you something most months, but a little less than typical. You handle what comes up and skip the premium versions." },
      { label: "Slightly above", pct: 0.15,
        desc: "You invest in yourself on purpose — a real gym or studio, therapy or regular care, a course or certification in flight. It costs more than average and you consider it money well spent. It still deserves a line item." },
      { label: "Well above", pct: 0.50,
        desc: "Health or education is a major commitment right now: ongoing treatment, family medical needs, tuition, or serious training. It's well above typical spending and largely non-negotiable — the budget bends around it, not the reverse." }
    ]
  }
];

// ── Follow-up questions (the decision tree) ───────────────────────────────────
// FIXED prerequisite triggers, authored so that firing ≈ guaranteed impact —
// each carries its written impactRationale, and the Explorer's sweep view
// flags any follow-up that stops earning its tap after tuning.
//
// prereq: { cat, notches: [which base answers arm it],
//           quintiles?: [1-5 income quintiles], minZipMult?: number }
// options[].adj is a multiplier DELTA added to the base notch pct. Negative
// adj on an "above" lean = the pivot-back-to-normal mechanism.
const LS_FOLLOWUPS = [
  {
    id: "housing-structure", cat: "housing", type: "choice3",
    prereq: { cat: "housing", notches: [1, 4] },
    impactRationale: "Housing is the largest line in every budget; at the extreme answers the structure (shared vs owned) routinely swings the estimate by 10%+ of the category — hundreds of dollars — so one tap here beats any other refinement.",
    title: "What's the housing setup?",
    options: [
      { label: "Sharing — roommates or family", adj: -0.10,
        desc: "Split rent or living with family. Costs run lower than the headline number for your area suggests." },
      { label: "Renting my own place", adj: 0,
        desc: "Solo lease at market rates — the baseline case for your area." },
      { label: "Own it, paying a mortgage", adj: 0.08,
        desc: "Mortgage plus taxes, insurance, and upkeep — ownership usually runs a bit above equivalent rent." }
    ]
  },
  {
    id: "debt-type", cat: "debt", type: "choice3",
    prereq: { cat: "debt", notches: [3, 4] },
    impactRationale: "Heavy debt answers span the widest multiplier range of any category (−60% to +80%). Whether it's revolving cards vs structured loans changes the realistic monthly payment by 10–15% of a large number — material to the bottom line.",
    title: "What kind of debt is it, mostly?",
    options: [
      { label: "Mostly credit cards", adj: 0.10,
        desc: "Revolving balances — higher rates and minimums that stretch payoff unless payments run above the floor." },
      { label: "Loans — student, auto, personal", adj: 0,
        desc: "Structured payments with an end date. Predictable, and usually cheaper per dollar owed than cards." },
      { label: "A mix of both", adj: 0.05,
        desc: "Cards riding alongside loans — the payment stack sits between the two worlds." }
    ]
  },
  {
    id: "food-driver", cat: "food", type: "choice3",
    prereq: { cat: "food", notches: [3, 4], quintiles: [1, 2, 3] },
    impactRationale: "At low-to-middle incomes food is a top-3 line, and 'spending a lot on food' has two very different causes: habits (real overspend) vs feeding a full house (already normal). Distinguishing them moves the estimate ~15% of a big category; at high incomes food is a small share, so this question would waste a tap there.",
    title: "What's driving the food spend?",
    options: [
      { label: "Dining out & delivery", adj: 0.10,
        desc: "Restaurants and apps — the classic overspend driver, and also the easiest one to dial back later." },
      { label: "Groceries for a full house", adj: -0.15,
        desc: "Feeding several people costs more, full stop — that's household math, not overspending. We pull the estimate back toward normal." },
      { label: "Neither — food's just pricey here", adj: 0,
        desc: "Local prices doing the damage. The area adjustment already covers most of this." }
    ]
  },
  {
    id: "lifestyle-driver", cat: "lifestyle", type: "choice3",
    prereq: { cat: "lifestyle", notches: [4], quintiles: [4, 5] },
    impactRationale: "At upper incomes, discretionary spend is where budgets actually diverge — a 'well above' lean spans vacations-twice-a-year to weekly-shopping-habit, easily 20% of a large category. At lower incomes lifestyle is a small line and the base answer is enough.",
    title: "Where does the fun money mostly go?",
    options: [
      { label: "Travel & experiences", adj: 0.15,
        desc: "Trips, events, and the spending that clusters around them — the priciest version of a high-lifestyle answer." },
      { label: "Shopping & subscriptions", adj: 0,
        desc: "Steady, spread-out discretionary spend — the baseline reading of 'well above'." },
      { label: "A few one-off events lately", adj: -0.20,
        desc: "A wedding season or a big purchase — a spike, not a habit. We pull the ongoing estimate back toward normal." }
    ]
  },
  {
    id: "transport-mode", cat: "transport", type: "choice3",
    prereq: { cat: "transport", notches: [3, 4], minZipMult: 1.2 },
    impactRationale: "In high-cost metro areas the car-vs-transit split is the single biggest transport variable — a car (payment, insurance, parking) vs mostly-transit differs by 20%+ of the category. Outside metros nearly everyone drives, so the question only earns its tap in urban ZIPs.",
    title: "How do you mostly get around?",
    options: [
      { label: "My own car", adj: 0.05,
        desc: "Payment, insurance, gas, parking — the full stack of urban car ownership runs above the blended average." },
      { label: "Mostly transit", adj: -0.20,
        desc: "Passes and the odd ride — city transit is far cheaper than the area's car-heavy average, so we pull back toward normal." },
      { label: "Rideshare, a lot", adj: 0.10,
        desc: "Convenience by the trip — frequent rideshare quietly outruns even car ownership in many cities." }
    ]
  }
];
