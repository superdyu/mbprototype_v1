// ─── Lifestyle Theme Selection ─────────────────────────────────────────────────
// TAB: About Me (sub-screen) | NAV BAR: Visible — About Me tab highlighted
//
// PURPOSE
// Shows 5 lifestyle theme cards. Each theme is a short question chain that helps
// Money Buddy translate "how you live" into budget sub-slider adjustments.
// Cards show completion state (last updated date or "Not started").
//
// NAVIGATION
//   Entry: About Me → Lifestyle card
//   Exit:  ← About Me; each theme card → lifestyleChain screen
//
// PRODUCTION NOTES
//   Completing a theme chain derives sub-slider values that update the parent
//   budget category. Impact is surfaced in My Progress → Assumptions Used.

const LIFESTYLE_THEMES = [
  { key: "food",          label: "Food & Dining",        icon: "🛒", desc: "How you eat shapes your biggest flexible expense." },
  { key: "entertainment", label: "Entertainment",         icon: "🎭", desc: "Subs, nights out, and hobbies add up fast." },
  { key: "travel",        label: "Travel",                icon: "🚗", desc: "Getting around and getting away." },
  { key: "shopping",      label: "Shopping & Purchases",  icon: "🛍", desc: "Clothing, impulse buys, and seasonal spending." },
  { key: "other",         label: "Other",                 icon: "✦",  desc: "Personal care, giving, and everything else." }
];

function renderLifestyle() {
  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="go('aboutMe')">← About Me</button>
      <h1 class="title" style="margin:0;font-size:20px;">Lifestyle</h1>
      <p class="subtitle" style="margin:4px 0 0;">Small answers. Better results.</p>
    </div>

    <p class="helper" style="margin-bottom:14px;">
      Answer 4 quick questions per theme and Money Buddy fine-tunes your budget
      estimate to fit how you actually live.
    </p>

    ${LIFESTYLE_THEMES.map(theme => {
      const la = state.lifestyleAnswers && state.lifestyleAnswers[theme.key];
      const answered = la && la.lastUpdated;
      const answerCount = la ? Object.keys(la.answers).length : 0;
      const statusText = answered
        ? `Updated ${la.lastUpdated} · ${answerCount} answers saved`
        : "Not started";

      return `
        <div class="item-card" style="cursor:pointer;margin-bottom:10px;"
             onclick="startLifestyleChain('${theme.key}')">
          <div>
            <div class="task-title">${theme.icon} ${h(theme.label)}</div>
            <p class="task-desc">${h(theme.desc)}</p>
            <p class="helper" style="font-size:11px;margin-top:4px;">${h(statusText)}</p>
          </div>
          <div class="helper" style="font-size:18px;">›</div>
        </div>
      `;
    }).join("")}
  `;
}

function startLifestyleChain(themeKey) {
  state.selectedLifestyleTheme = themeKey;
  if (!state.flowOrigin) state.flowOrigin = "aboutMe";
  go("lifestyleChain");
}
