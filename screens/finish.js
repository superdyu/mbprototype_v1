// ─── Finish Screen ─────────────────────────────────────────────────────────────
// TAB: None | NAV BAR: Hidden — completion moment
//
// PURPOSE
// Endpoint for any completed About Me input flow. Confirms the action and
// returns the user to their origin screen (Home, About Me, or My Progress).
//
// NAVIGATION
//   Entry: Post-result loop completion; monthly update completion; lifestyle chain save
//   Exit:  Primary button → state.flowOrigin (or About Me if unknown)
//
// PRODUCTION NOTES
//   state.flowOrigin is cleared after use so the next flow starts fresh.
//   Outcome detail is derived from what was last completed (budget, lifestyle, goal, update).

function renderFinish() {
  const action    = state.nextAction || null;
  const reaction  = state.postResultReaction || null;
  const origin    = state.flowOrigin || "aboutMe";
  const goals     = state.goals || [];
  const lastGoal  = goals.length > 0 ? goals[0] : null;

  let detail = "Your changes have been saved.";
  if (action === "make-goal" && lastGoal) {
    detail = `Goal added: "${lastGoal.title}"`;
  } else if (action === "accept") {
    detail = "Budget accepted. Keep an eye on your progress.";
  } else if (action === "review-later") {
    detail = "Noted. Come back whenever you're ready.";
  } else if (action === "adjust") {
    detail = "Budget updated. Your results are in My Progress.";
  }

  const originLabel = origin === "home"       ? "Home"
                    : origin === "myProgress" ? "My Progress"
                    : "About Me";

  return `
    <div style="padding:40px 0 24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">✓</div>
      <h1 class="title" style="font-size:26px;margin-bottom:8px;">Done</h1>
      <p class="subtitle" style="margin-bottom:8px;">Your plan was updated.</p>
      <p class="helper" style="margin-bottom:32px;">${h(detail)}</p>

      <button class="button primary full" type="button" onclick="finishAndReturn()">
        Back to ${h(originLabel)}
      </button>
      <button class="button secondary full" style="margin-top:10px;" type="button"
              onclick="go('myProgress')">View My Progress</button>
    </div>
  `;
}

function finishAndReturn() {
  const origin = state.flowOrigin || "aboutMe";
  state.flowOrigin          = null;
  state.postResultReaction  = null;
  state.nextAction          = null;
  go(origin);
}
