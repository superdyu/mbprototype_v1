// ─── Post-Result Reaction Prompt ──────────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full focus on reaction
//
// PURPOSE
// First screen of the post-input loop. After completing any major About Me input
// (Baby Budget, lifestyle chain, monthly update), shows a context summary of what
// just changed, then asks "How does this feel?" before the user decides next steps.
//
// NAVIGATION
//   Entry: Triggered after completing Baby Budget, lifestyle chain, or monthly update
//   Exit:  Any reaction → nextAction screen
//
// PRODUCTION NOTES
//   state.postResultContext: "budget" | "lifestyle" | "monthlyUpdate" | "goal"
//   state.postResultTheme: lifestyle theme key when context is "lifestyle"
//   state.flowOrigin: set before entering this screen; preserved through finish

function renderPostResult() {
  const context = state.postResultContext;
  const theme   = state.postResultTheme;

  const headlines = {
    budget:       { title: "Budget updated",           sub: "Your spending plan has been saved." },
    lifestyle:    { title: "Lifestyle answers saved",  sub: lifestyleThemeLabel(theme) + " has been recorded." },
    monthlyUpdate:{ title: "Monthly check-in done",    sub: "Your account and debt balances are logged." },
    goal:         { title: "Goal saved",               sub: "Your new goal has been added to My Progress." }
  };
  const headline = headlines[context] || { title: "Changes saved", sub: "Your updates have been recorded." };

  const reactions = [
    { value: "right",       label: "Looks right" },
    { value: "too-high",    label: "Too high" },
    { value: "too-low",     label: "Too low" },
    { value: "stressful",   label: "Stressful" },
    { value: "motivating",  label: "Motivating" },
    { value: "not-sure",    label: "Not sure" }
  ];

  return `
    <div style="padding:24px 0 16px;">
      <div class="card" style="margin-bottom:20px;text-align:center;padding:18px 16px;">
        <div style="font-size:28px;margin-bottom:8px;">✓</div>
        <div style="font-weight:850;font-size:16px;margin-bottom:4px;">${h(headline.title)}</div>
        <p class="helper" style="margin:0;">${h(headline.sub)}</p>
      </div>

      <h1 class="title" style="font-size:20px;margin-bottom:6px;">How does this feel?</h1>
      <p class="helper" style="margin-bottom:20px;">Take a second before deciding what to do next.</p>

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${reactions.map(r => `
          <button class="button secondary full" type="button"
                  style="text-align:left;padding:14px 16px;font-size:14px;"
                  onclick="selectReaction('${h(r.value)}')">
            ${h(r.label)}
          </button>
        `).join("")}
      </div>

      <div style="text-align:center;margin-top:16px;">
        <button class="button secondary" style="font-size:12px;padding:8px 14px;" type="button"
                onclick="skipPostResult()">Skip for now</button>
      </div>
    </div>
  `;
}

function lifestyleThemeLabel(themeKey) {
  const labels = {
    food:          "Food & Dining",
    entertainment: "Entertainment",
    travel:        "Travel",
    shopping:      "Shopping & Purchases",
    other:         "Other"
  };
  return labels[themeKey] || "Lifestyle";
}

function selectReaction(value) {
  state.postResultReaction = value;
  go("nextAction");
}

function skipPostResult() {
  state.postResultReaction = null;
  state.nextAction         = null;
  go("myProgress");
}
