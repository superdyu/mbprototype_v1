// ─── Lifestyle Question Chain ──────────────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full focus on question flow
//
// PURPOSE
// Presents 4 questions for the selected lifestyle theme. Answers drive sub-slider
// calculations that update the parent budget category estimate. Completing a chain
// shows the derived sub-sliders for user review before saving.
//
// NAVIGATION
//   Entry: lifestyle.js → startLifestyleChain(themeKey)
//   Exit:  ← Lifestyle (cancel); Save sub-sliders → confirmation screen → My Progress
//
// STATES
//   Step 0-3: question display with 4 pill options + staging image + description
//   Step 4: sub-slider review + confirmation before saving
//
// PRODUCTION NOTES
//   Sub-slider scoring: each answer provides totalBias (multiplier on parent total)
//   and splitWeights (% distribution across sub-items). Combined via averaging.
//   Parent bucket grows when sub-slider sum exceeds original estimate.
//   If under-estimated, prompt to shift gap to Savings & Future.

// ─── Question data ─────────────────────────────────────────────────────────────
// Format: { text, options: [{label, desc, totalBias, splitWeights}] }
// splitWeights: relative allocation across sub-items (order matches LIFESTYLE_SUB_ITEMS)

const LIFESTYLE_SUB_ITEMS = {
  food:          ["Groceries", "Dining Out", "Coffee & Drinks", "Delivery", "Household Supplies"],
  entertainment: ["Entertainment", "Streaming & Subs", "Hobbies & Travel", "Personal Care"],
  travel:        ["Gas & Charging", "Rideshare & Parking", "Bus & Train", "Car Insurance (flexible)"],
  shopping:      ["Clothing & Shoes", "Gifts & Giving"],
  other:         ["Personal Care", "Pets & Misc"]
};

// Parent bucket key (from state.budget.categories) for each lifestyle theme
const LIFESTYLE_PARENT_BUCKET = {
  food:          "food",
  entertainment: "lifestyle",
  travel:        "transport",
  shopping:      "lifestyle",
  other:         "lifestyle"
};

const LIFESTYLE_QUESTIONS = {
  food: [
    {
      text: "How often do you cook at home for dinner?",
      options: [
        { label: "Never",     desc: "Nearly all meals out. Food typically $700–$1,100/mo.",       totalBias: 1.5,  splitWeights: [15, 40, 10, 30, 5] },
        { label: "Rarely",    desc: "Mostly eating out. Expect $450–$700/mo.",                    totalBias: 1.25, splitWeights: [25, 35, 10, 25, 5] },
        { label: "Sometimes", desc: "Mix of cooking and eating out. Typical $250–$450/mo.",       totalBias: 1.0,  splitWeights: [40, 30, 10, 15, 5] },
        { label: "Often",     desc: "Cook most meals. Lowest-cost approach, $150–$300/mo.",       totalBias: 0.8,  splitWeights: [55, 20,  8,  8, 9] }
      ]
    },
    {
      text: "How often do you order delivery or takeout?",
      options: [
        { label: "Never",     desc: "No delivery apps. You cook or pick up groceries.",           totalBias: 0.85, splitWeights: [60, 20, 12,  3, 5] },
        { label: "Rarely",    desc: "1–2x/month, ~$30–60.",                                       totalBias: 0.95, splitWeights: [50, 25, 12, 10, 3] },
        { label: "Sometimes", desc: "1–2x/week, ~$80–180 with fees.",                             totalBias: 1.1,  splitWeights: [38, 28, 12, 18, 4] },
        { label: "Often",     desc: "3–5+x/week, $200–$400/mo after fees and tips.",             totalBias: 1.3,  splitWeights: [25, 28, 10, 32, 5] }
      ]
    },
    {
      text: "How often do you dine at a sit-down restaurant?",
      options: [
        { label: "Never",     desc: "No full-service dining.",                                    totalBias: 0.9,  splitWeights: [55, 18, 15, 10, 2] },
        { label: "Rarely",    desc: "Once/mo, ~$40–80.",                                          totalBias: 1.0,  splitWeights: [48, 25, 12, 12, 3] },
        { label: "Sometimes", desc: "Few times/mo, ~$80–200.",                                   totalBias: 1.15, splitWeights: [38, 35, 10, 14, 3] },
        { label: "Often",     desc: "Multiple times/week, $300–600/mo.",                         totalBias: 1.35, splitWeights: [25, 48,  8, 16, 3] }
      ]
    },
    {
      text: "How many people do you typically buy or cook food for?",
      options: [
        { label: "Just me",   desc: "Baseline applies.",                                          totalBias: 1.0,  splitWeights: [45, 28, 12, 12, 3] },
        { label: "2 people",  desc: "+60–70% food costs.",                                        totalBias: 1.6,  splitWeights: [50, 25, 10, 12, 3] },
        { label: "3–4 people",desc: "Roughly 2× vs solo.",                                       totalBias: 2.1,  splitWeights: [55, 22,  8, 10, 5] },
        { label: "5 or more", desc: "Groceries are a top budget line.",                           totalBias: 2.8,  splitWeights: [60, 18,  7,  8, 7] }
      ]
    }
  ],
  entertainment: [
    {
      text: "How many active streaming or subscription services do you pay for?",
      options: [
        { label: "None",   desc: "$0 here.",                                                      totalBias: 0.6,  splitWeights: [50, 10, 30, 10] },
        { label: "1–2",    desc: "~$15–30/mo.",                                                   totalBias: 0.9,  splitWeights: [35, 30, 25, 10] },
        { label: "3–4",    desc: "~$35–70/mo.",                                                   totalBias: 1.1,  splitWeights: [30, 40, 20, 10] },
        { label: "5 or more", desc: "Easy $80–150/mo.",                                           totalBias: 1.4,  splitWeights: [25, 50, 15, 10] }
      ]
    },
    {
      text: "How often do you go out for events, shows, or nights out?",
      options: [
        { label: "Never",     desc: "No bars, concerts, clubs.",                                  totalBias: 0.7,  splitWeights: [30, 40, 20, 10] },
        { label: "Rarely",    desc: "~$30–60/mo when you do.",                                   totalBias: 0.9,  splitWeights: [35, 30, 25, 10] },
        { label: "Sometimes", desc: "~$80–200/mo.",                                               totalBias: 1.1,  splitWeights: [40, 25, 25, 10] },
        { label: "Often",     desc: "~$250–400/mo most weekends.",                               totalBias: 1.4,  splitWeights: [45, 20, 25, 10] }
      ]
    },
    {
      text: "How often do you spend on hobbies or recreational gear?",
      options: [
        { label: "Never",     desc: "No hobby spending.",                                         totalBias: 0.8,  splitWeights: [40, 30, 15, 15] },
        { label: "Rarely",    desc: "Under $30/mo averaged.",                                     totalBias: 0.9,  splitWeights: [35, 28, 25, 12] },
        { label: "Sometimes", desc: "~$50–150/mo.",                                               totalBias: 1.1,  splitWeights: [30, 25, 35, 10] },
        { label: "Often",     desc: "~$150–400/mo.",                                             totalBias: 1.3,  splitWeights: [25, 20, 45, 10] }
      ]
    },
    {
      text: "Overall, how would you describe your entertainment spending?",
      options: [
        { label: "Minimal",  desc: "Mostly free activities.",                                    totalBias: 0.7,  splitWeights: [35, 30, 25, 10] },
        { label: "Light",    desc: "Selective.",                                                   totalBias: 0.9,  splitWeights: [35, 30, 25, 10] },
        { label: "Moderate", desc: "Normal budget.",                                               totalBias: 1.1,  splitWeights: [35, 30, 25, 10] },
        { label: "Heavy",    desc: "Priority spend area.",                                        totalBias: 1.4,  splitWeights: [35, 30, 25, 10] }
      ]
    }
  ],
  travel: [
    {
      text: "How do you primarily get around for work and daily errands?",
      options: [
        { label: "Walk or transit",    desc: "~$50–120/mo passes.",                              totalBias: 0.5,  splitWeights: [ 5, 15, 75,  5] },
        { label: "Occasional rideshare",desc: "~$50–200/mo.",                                    totalBias: 0.8,  splitWeights: [ 5, 60, 30,  5] },
        { label: "Own one car",        desc: "+$300–600/mo gas, insurance, maintenance.",        totalBias: 1.1,  splitWeights: [40, 25, 10, 25] },
        { label: "Multiple vehicles",  desc: "$600–1,200+/mo combined.",                         totalBias: 1.6,  splitWeights: [45, 20,  5, 30] }
      ]
    },
    {
      text: "How often do you take overnight leisure trips?",
      options: [
        { label: "Never",     desc: "No trip spending.",                                          totalBias: 0.9,  splitWeights: [40, 20, 15, 25] },
        { label: "Rarely",    desc: "~$50–100/mo averaged.",                                     totalBias: 1.0,  splitWeights: [38, 25, 12, 25] },
        { label: "Sometimes", desc: "~$100–250/mo.",                                              totalBias: 1.15, splitWeights: [35, 32, 10, 23] },
        { label: "Often",     desc: "~$300–600+/mo.",                                            totalBias: 1.35, splitWeights: [30, 42,  8, 20] }
      ]
    },
    {
      text: "How often do you pay for parking or tolls?",
      options: [
        { label: "Never",       desc: "$0.",                                                      totalBias: 0.9,  splitWeights: [45, 20, 15, 20] },
        { label: "Occasionally",desc: "Under $20/mo.",                                            totalBias: 1.0,  splitWeights: [40, 25, 12, 23] },
        { label: "Regularly",   desc: "~$50–150/mo.",                                             totalBias: 1.1,  splitWeights: [35, 32, 10, 23] },
        { label: "Daily",       desc: "$150–400/mo.",                                            totalBias: 1.25, splitWeights: [30, 45,  5, 20] }
      ]
    },
    {
      text: "Overall, how would you describe your transportation and travel costs?",
      options: [
        { label: "Minimal",  desc: "Walk/bike/transit. Rarely travel.",                          totalBias: 0.7,  splitWeights: [20, 20, 50, 10] },
        { label: "Light",    desc: "One car and occasional trips.",                               totalBias: 0.9,  splitWeights: [38, 22, 15, 25] },
        { label: "Moderate", desc: "Active driver + traveler.",                                   totalBias: 1.1,  splitWeights: [40, 28, 10, 22] },
        { label: "Heavy",    desc: "Multiple vehicles + frequent travel.",                        totalBias: 1.4,  splitWeights: [42, 30,  5, 23] }
      ]
    }
  ],
  shopping: [
    {
      text: "How often do you shop for clothing, shoes, or accessories?",
      options: [
        { label: "Never",     desc: "<1x/year.",                                                  totalBias: 0.7,  splitWeights: [50, 50] },
        { label: "Rarely",    desc: "Seasonal basics, <$40/mo.",                                  totalBias: 0.85, splitWeights: [60, 40] },
        { label: "Sometimes", desc: "~$60–150/mo.",                                               totalBias: 1.1,  splitWeights: [65, 35] },
        { label: "Often",     desc: "~$200–400/mo.",                                             totalBias: 1.45, splitWeights: [70, 30] }
      ]
    },
    {
      text: "How often do you make unplanned purchases online?",
      options: [
        { label: "Never",     desc: "Every purchase intentional.",                               totalBias: 0.8,  splitWeights: [55, 45] },
        { label: "Rarely",    desc: "<$30/mo.",                                                   totalBias: 0.95, splitWeights: [55, 45] },
        { label: "Sometimes", desc: "~$60–150/mo.",                                               totalBias: 1.15, splitWeights: [55, 45] },
        { label: "Often",     desc: "~$200–400/mo.",                                             totalBias: 1.4,  splitWeights: [55, 45] }
      ]
    },
    {
      text: "How often do large seasonal purchases affect your budget?",
      options: [
        { label: "Never",           desc: "No seasonal impact.",                                 totalBias: 0.9,  splitWeights: [55, 45] },
        { label: "Once a year",     desc: "~$30–70/mo averaged.",                               totalBias: 1.0,  splitWeights: [50, 50] },
        { label: "A few times/year",desc: "~$80–200/mo averaged.",                              totalBias: 1.15, splitWeights: [45, 55] },
        { label: "Often",           desc: "$200+/mo averaged.",                                  totalBias: 1.3,  splitWeights: [40, 60] }
      ]
    },
    {
      text: "Overall, how would you describe your shopping approach?",
      options: [
        { label: "Needs only",      desc: "No discretionary buying.",                            totalBias: 0.7,  splitWeights: [55, 45] },
        { label: "Mix",             desc: "Intentional splurges.",                               totalBias: 1.0,  splitWeights: [55, 45] },
        { label: "Regular",         desc: "Normal weekly habit.",                                totalBias: 1.2,  splitWeights: [55, 45] },
        { label: "Heavy",           desc: "Major lifestyle spend.",                              totalBias: 1.5,  splitWeights: [55, 45] }
      ]
    }
  ],
  other: [
    {
      text: "Do you have regular personal care costs (gym, salon, grooming)?",
      options: [
        { label: "Never",     desc: "$0.",                                                        totalBias: 0.7,  splitWeights: [30, 70] },
        { label: "Rarely",    desc: "<$20/mo.",                                                   totalBias: 0.85, splitWeights: [40, 60] },
        { label: "Sometimes", desc: "~$50–120/mo.",                                               totalBias: 1.1,  splitWeights: [55, 45] },
        { label: "Often",     desc: "~$150–300/mo.",                                             totalBias: 1.35, splitWeights: [65, 35] }
      ]
    },
    {
      text: "Do you regularly give money to family, friends, or causes?",
      options: [
        { label: "Never",     desc: "No giving.",                                                 totalBias: 0.9,  splitWeights: [55, 45] },
        { label: "Rarely",    desc: "<$20/mo averaged.",                                          totalBias: 1.0,  splitWeights: [50, 50] },
        { label: "Sometimes", desc: "~$50–150/mo.",                                               totalBias: 1.1,  splitWeights: [40, 60] },
        { label: "Often",     desc: "Meaningful budget line.",                                   totalBias: 1.25, splitWeights: [35, 65] }
      ]
    },
    {
      text: "Do you have recurring costs for pets?",
      options: [
        { label: "None",             desc: "No pets.",                                           totalBias: 0.9,  splitWeights: [55, 45] },
        { label: "One, low cost",    desc: "~$50–100/mo.",                                       totalBias: 1.0,  splitWeights: [50, 50] },
        { label: "One, higher cost", desc: "~$100–250/mo.",                                      totalBias: 1.15, splitWeights: [45, 55] },
        { label: "Multiple pets",    desc: "$200–500+/mo.",                                      totalBias: 1.3,  splitWeights: [40, 60] }
      ]
    },
    {
      text: "Are there other areas where spending feels hard to control?",
      options: [
        { label: "None",         desc: "In control overall.",                                    totalBias: 0.9,  splitWeights: [50, 50] },
        { label: "One area",     desc: "One category creeps up.",                               totalBias: 1.0,  splitWeights: [50, 50] },
        { label: "A few areas",  desc: "A couple of areas.",                                    totalBias: 1.1,  splitWeights: [50, 50] },
        { label: "Many areas",   desc: "Feels unpredictable.",                                  totalBias: 1.25, splitWeights: [50, 50] }
      ]
    }
  ]
};

// ─── Render ───────────────────────────────────────────────────────────────────

function renderLifestyleChain() {
  const theme     = state.selectedLifestyleTheme || "food";
  const questions = LIFESTYLE_QUESTIONS[theme] || [];
  const step      = state.lifestyleChainStep   || 0;

  if (step >= questions.length) {
    return renderLifestyleChainReview(theme);
  }

  const q        = questions[step];
  const answers  = (state.lifestyleAnswers && state.lifestyleAnswers[theme] && state.lifestyleAnswers[theme].answers) || {};
  const selected = answers[step] != null ? answers[step] : null;
  const themeInfo = (LIFESTYLE_THEMES || []).find(t => t.key === theme) || { icon: "✦", label: theme };

  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="cancelLifestyleChain()">← Lifestyle</button>
      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">
        ${h(themeInfo.icon)} ${h(themeInfo.label)}
      </div>
      <div style="font-size:11px;color:var(--muted);">Question ${step + 1} of ${questions.length}</div>
    </div>

    <!-- Staging image box -->
    <div class="lifestyle-img-box" style="margin-bottom:16px;">
      <div class="lifestyle-img-section">${h(themeInfo.label)}</div>
      <div class="lifestyle-img-coords">${lifestyleProgressDisplay(answers, questions.length, step, selected)}</div>
      <div class="lifestyle-img-subprog">${step + 1} / ${questions.length}</div>
    </div>

    <!-- Question -->
    <div class="card" style="margin-bottom:14px;">
      <div class="task-title" style="font-size:15px;margin-bottom:14px;">${h(q.text)}</div>

      <!-- 4 pill options -->
      <div class="tier-pill-row">
        ${q.options.map((opt, i) => `
          <div class="tier-pill ${selected === i ? "active" : ""}"
               onclick="selectLifestyleAnswer(${i})">${h(opt.label)}</div>
        `).join("")}
      </div>

      <!-- Real-world description (shown when an option is selected) -->
      ${selected != null ? `
        <div class="tier-selected-desc" style="margin-top:12px;">
          ${h(q.options[selected].desc)}
        </div>
      ` : `
        <div class="tier-selected-desc" style="margin-top:12px;color:var(--muted);font-style:italic;">
          Select an option to see what it means for your budget.
        </div>
      `}
    </div>

    <!-- Navigation -->
    <div class="row" style="gap:10px;">
      ${step > 0
        ? `<button class="button secondary" type="button" onclick="prevLifestyleQuestion()">← Back</button>`
        : `<div></div>`}
      <button class="button ${selected != null ? "primary" : "secondary"}"
              type="button" onclick="nextLifestyleQuestion()">
        ${step < questions.length - 1 ? "Next →" : "Review"}
      </button>
    </div>
    <div style="text-align:center;margin-top:12px;">
      <button class="button secondary" style="font-size:11px;padding:6px 12px;"
              type="button" onclick="skipLifestyleQuestion()">Skip this question</button>
    </div>
  `;
}

function renderLifestyleChainReview(theme) {
  const derived   = deriveSubSliders(theme);
  const subItems  = LIFESTYLE_SUB_ITEMS[theme] || [];
  const themeInfo = (LIFESTYLE_THEMES || []).find(t => t.key === theme) || { icon: "✦", label: theme };
  const bucketKey = LIFESTYLE_PARENT_BUCKET[theme];
  const cat       = bucketKey && state.budget.categories
    ? state.budget.categories.find(c => c.key === bucketKey)
    : null;
  const originalTotal = cat ? cat.amount : 0;
  const newTotal      = derived.total;
  const diff          = newTotal - originalTotal;

  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="cancelLifestyleChain()">← Lifestyle</button>
      <h1 class="title" style="margin:0;font-size:20px;">Review ${h(themeInfo.label)}</h1>
      <p class="subtitle" style="margin:4px 0 0;">Based on your answers, here's what we estimate.</p>
    </div>

    ${originalTotal > 0 && Math.abs(diff) > 10 ? `
      <div class="card" style="margin-bottom:12px;background:${diff > 0 ? "var(--warn-soft, var(--soft))" : "var(--accent-soft)"};">
        <p class="helper" style="margin:0;font-weight:700;">
          ${h(themeInfo.label)} estimate ${diff > 0 ? "increased" : "decreased"} by ${budgetFmt(Math.abs(diff))}/mo
        </p>
        <p class="helper" style="margin:4px 0 0;">
          ${diff > 0
            ? "Your lifestyle patterns suggest higher spending than the initial estimate."
            : diff < -50
              ? `You have ${budgetFmt(Math.abs(diff))} unallocated. Consider adding it to Savings.`
              : "Spending patterns suggest this area is lower than initially estimated."}
        </p>
      </div>
    ` : ""}

    <div class="card" style="margin-bottom:14px;">
      <div class="section-title" style="margin-bottom:10px;">Sub-category breakdown</div>
      <p class="helper" style="margin-bottom:12px;">Adjust these if they don't feel right.</p>

      ${subItems.map((item, i) => {
        const currentVal = derived.amounts[i] || 0;
        return `
          <div style="margin-bottom:12px;">
            <div class="row" style="margin-bottom:4px;">
              <span class="helper" style="font-weight:700;">${h(item)}</span>
              <span style="font-weight:700;">${budgetFmt(currentVal)}</span>
            </div>
            <input type="range" min="0" max="${Math.max(500, newTotal)}" step="10"
                   value="${currentVal}"
                   oninput="updateSubSlider('${h(theme)}', ${i}, parseInt(this.value))"
                   style="width:100%;">
          </div>
        `;
      }).join("")}

      <div class="row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line);">
        <span style="font-weight:850;">Total</span>
        <span id="subSliderTotal" style="font-weight:850;">${budgetFmt(newTotal)}</span>
      </div>
    </div>

    <button class="button primary full" type="button" onclick="saveLifestyleChain()">
      Save — Update Budget
    </button>
    <button class="button secondary full" style="margin-top:8px;" type="button"
            onclick="cancelLifestyleChain()">Cancel</button>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lifestyleProgressDisplay(answers, total, currentStep, currentSel) {
  const answered = Object.keys(answers).length + (currentSel != null ? 0 : 0);
  const icons    = ["○", "○", "○", "○"];
  for (let i = 0; i < total; i++) {
    if (answers[i] != null) icons[i] = "●";
  }
  return icons.join(" ");
}

function deriveSubSliders(theme) {
  const questions = LIFESTYLE_QUESTIONS[theme] || [];
  const answers   = (state.lifestyleAnswers && state.lifestyleAnswers[theme] && state.lifestyleAnswers[theme].answers) || {};
  const subItems  = LIFESTYLE_SUB_ITEMS[theme] || [];
  const bucketKey = LIFESTYLE_PARENT_BUCKET[theme];
  const cat       = bucketKey && state.budget.categories
    ? state.budget.categories.find(c => c.key === bucketKey)
    : null;
  const parentAmount = cat ? cat.amount : 200;

  let totalBiasSum   = 0;
  let totalBiasCount = 0;
  let splitSums      = new Array(subItems.length).fill(0);
  let splitCount     = 0;

  questions.forEach(function(q, qi) {
    const ai = answers[qi];
    if (ai == null) return;
    const opt = q.options[ai];
    totalBiasSum   += opt.totalBias;
    totalBiasCount += 1;
    opt.splitWeights.forEach(function(w, wi) {
      if (wi < subItems.length) splitSums[wi] += w;
    });
    splitCount += 1;
  });

  if (totalBiasCount === 0) {
    const even = Math.round(parentAmount / subItems.length / 10) * 10;
    return { total: parentAmount, amounts: subItems.map(() => even) };
  }

  const finalMultiplier = totalBiasSum / totalBiasCount;
  const finalTotal      = Math.max(10, Math.round(parentAmount * finalMultiplier / 10) * 10);
  const splitAvg        = splitSums.map(function(s) { return s / splitCount; });
  const splitSum        = splitAvg.reduce(function(a, b) { return a + b; }, 0);

  const amounts = splitAvg.map(function(w, i) {
    if (i < splitAvg.length - 1) {
      return Math.max(0, Math.round(finalTotal * (w / splitSum) / 10) * 10);
    }
    return 0;
  });
  const allocated = amounts.reduce(function(a, b) { return a + b; }, 0);
  amounts[amounts.length - 1] = Math.max(0, finalTotal - allocated);

  return { total: finalTotal, amounts };
}

function updateSubSlider(theme, index, value) {
  if (!state.lifestyleSubSliders) state.lifestyleSubSliders = {};
  if (!state.lifestyleSubSliders[theme]) state.lifestyleSubSliders[theme] = {};
  const subItems = LIFESTYLE_SUB_ITEMS[theme] || [];
  const key      = subItems[index];
  if (key) state.lifestyleSubSliders[theme][key] = value;
  // Update total display without full re-render
  const totalEl = document.getElementById("subSliderTotal");
  if (totalEl) {
    const total = Object.values(state.lifestyleSubSliders[theme]).reduce((a, b) => a + b, 0);
    totalEl.textContent = budgetFmt(total);
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function selectLifestyleAnswer(answerIndex) {
  const theme = state.selectedLifestyleTheme || "food";
  const step  = state.lifestyleChainStep     || 0;
  if (!state.lifestyleAnswers) state.lifestyleAnswers = {};
  if (!state.lifestyleAnswers[theme]) state.lifestyleAnswers[theme] = { answers: {}, lastUpdated: null };
  state.lifestyleAnswers[theme].answers[step] = answerIndex;
  render();
}

function nextLifestyleQuestion() {
  const theme     = state.selectedLifestyleTheme || "food";
  const questions = LIFESTYLE_QUESTIONS[theme] || [];
  const step      = state.lifestyleChainStep     || 0;
  if (step < questions.length) {
    state.lifestyleChainStep = step + 1;
    render();
  }
}

function prevLifestyleQuestion() {
  const step = state.lifestyleChainStep || 0;
  if (step > 0) { state.lifestyleChainStep = step - 1; render(); }
}

function skipLifestyleQuestion() {
  nextLifestyleQuestion();
}

function cancelLifestyleChain() {
  state.lifestyleChainStep = 0;
  go("lifestyle");
}

function saveLifestyleChain() {
  const theme    = state.selectedLifestyleTheme || "food";
  const derived  = deriveSubSliders(theme);
  const subItems = LIFESTYLE_SUB_ITEMS[theme] || [];

  // Write sub-slider amounts
  if (!state.lifestyleSubSliders) state.lifestyleSubSliders = {};
  if (!state.lifestyleSubSliders[theme]) state.lifestyleSubSliders[theme] = {};
  subItems.forEach(function(item, i) {
    state.lifestyleSubSliders[theme][item] = derived.amounts[i] || 0;
  });

  // Update parent budget category total
  const bucketKey    = LIFESTYLE_PARENT_BUCKET[theme];
  const cat          = bucketKey && state.budget.categories
    ? state.budget.categories.find(function(c) { return c.key === bucketKey; })
    : null;

  if (cat) {
    // For lifestyle bucket, sum ALL lifestyle themes' sub-sliders
    if (bucketKey === "lifestyle") {
      const lifestyleThemes = ["entertainment", "shopping", "other"];
      const total = lifestyleThemes.reduce(function(sum, t) {
        const subs = state.lifestyleSubSliders[t] || {};
        return sum + Object.values(subs).reduce(function(a, b) { return a + b; }, 0);
      }, 0);
      cat.amount = total || cat.amount;
    } else {
      cat.amount = derived.total;
    }
  }

  // Mark theme as updated
  if (!state.lifestyleAnswers) state.lifestyleAnswers = {};
  if (!state.lifestyleAnswers[theme]) state.lifestyleAnswers[theme] = { answers: {}, lastUpdated: null };
  state.lifestyleAnswers[theme].lastUpdated = todayISO();

  state.lifestyleChainStep = 0;
  go("myProgress");
}
