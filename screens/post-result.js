// ─── Post-Result Reaction Prompt ──────────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — full focus on reaction
//
// PURPOSE
// First screen of the post-input loop. After completing any major About Me input
// (Baby Budget, lifestyle chain, monthly update), asks "How does this feel?"
// User picks a reaction before deciding what to do next.
//
// NAVIGATION
//   Entry: Triggered after completing any About Me input that has budget impact
//   Exit:  Any reaction → nextAction screen
//
// PRODUCTION NOTES
//   state.flowOrigin tracks where the user came from (used at the very end to
//   return them to the right place after the full loop completes).

function renderPostResult() {
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
      <h1 class="title" style="font-size:22px;margin-bottom:8px;">How does this feel?</h1>
      <p class="helper" style="margin-bottom:24px;">Take a second before deciding what to do next.</p>

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${reactions.map(r => `
          <button class="button secondary full" type="button"
                  style="text-align:left;padding:14px 16px;font-size:14px;"
                  onclick="selectReaction('${h(r.value)}')">
            ${h(r.label)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function selectReaction(value) {
  state.postResultReaction = value;
  go("nextAction");
}
