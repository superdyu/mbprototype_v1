function adminSubtitle() {
  if (state.screen === "home")           return "Edit daily task cards and destinations.";
  if (state.screen === "learn")          return "Adjust XP config, lesson states, badge progress.";
  if (state.screen === "topic")          return "Override lesson statuses for this badge.";
  if (state.screen === "reward-preview") return "Lesson preview — read-only. Edit content in Learn admin.";
  if (state.screen === "lesson")         return "Toggle stage style, seek to sentence for testing.";
  if (state.screen === "budget")          return "Budget status, income model, balance inputs, category amounts.";
  if (state.screen === "budgetCategory")  return "Intentional toggle, target spend, sub-category amounts.";
  if (state.screen === "goals")          return "Adjust sample goal and milestone progress.";
  if (state.screen === "marketplace")    return "Adjust marketplace preferences and offers.";
  if (state.screen === "reward")         return "Last reward output (read-only).";
  return "Manual controls for this wireframe screen.";
}

function renderScreen() {
  if (state.screen === "home")              return renderHome();
  if (state.screen === "budget")            return renderBudget();
  if (state.screen === "babyBudget")        return renderBabyBudget();
  if (state.screen === "goals")             return renderGoals();
  if (state.screen === "learn")             return renderLearn();
  if (state.screen === "topic")             return renderTopic();
  if (state.screen === "reward-preview")     return renderRewardPreview();
  if (state.screen === "lesson")             return renderLesson();
  if (state.screen === "quiz")              return renderQuiz();
  if (state.screen === "budgetCategory")     return renderBudgetCategory();
  if (state.screen === "simulation")        return renderSimulation();
  if (state.screen === "marketplace")       return renderMarketplace();
  if (state.screen === "marketplaceDetail") return renderMarketplaceDetail();
  if (state.screen === "reward")            return renderReward();
  if (state.screen === "settings")          return renderSettings();
  return renderHome();
}

function renderAdmin() {
  if (state.screen === "home")        return renderHomeAdmin();
  if (state.screen === "learn")       return renderLearnAdmin();
  if (state.screen === "topic")       return renderTopicAdmin();
  if (state.screen === "goals")       return renderGoalsAdmin();
  if (state.screen === "marketplace") return renderMarketplaceAdmin();
  if (state.screen === "lesson")       return renderLessonAdmin();
  if (state.screen === "reward")      return renderRewardAdmin();
  if (state.screen === "budget")           return renderBudgetAdmin();
  if (state.screen === "babyBudget")       return renderBabyBudgetAdmin();
  if (state.screen === "budgetCategory")   return renderBudgetCategoryAdmin();

  return `
    <div class="admin-card">
      <p class="admin-card-title">Screen Controls</p>
      <p class="helper">No detailed admin controls for this screen yet.</p>
      <div class="input-group">
        <label>Jump to screen</label>
        <select onchange="go(this.value)">
          ${["home","budget","babyBudget","goals","learn","topic","lesson","quiz",
             "simulation","marketplace","reward","settings"].map(s => `
            <option value="${s}" ${state.screen === s ? "selected" : ""}>${s}</option>
          `).join("")}
        </select>
      </div>
    </div>
  `;
}

function render() {
  const screenRoot = document.getElementById("screenRoot");
  const navRoot    = document.getElementById("navRoot");

  // Clear lesson player timer before destroying the DOM it references.
  // Capture play state first so lpMountHook can resume if a re-render interrupted mid-play.
  const lpWasPlaying = _lpPlaying;
  if (_lpTimer) { clearInterval(_lpTimer); _lpTimer = null; _lpPlaying = false; }

  screenRoot.classList.toggle("baby-budget-mode", state.screen === "babyBudget");
  screenRoot.classList.toggle("lesson-mode",      state.screen === "lesson");
  screenRoot.innerHTML  = renderScreen();
  if (state.screen === "lesson") lpMountHook(lpWasPlaying);
  navRoot.innerHTML     = renderNav();
  // Lesson screen is full-height — no tab bar
  navRoot.style.display = (state.screen === "lesson" || state.screen === "babyBudget") ? "none" : "";

  document.getElementById("adminRoot").innerHTML         = renderAdmin();
  document.getElementById("adminSubtitle").textContent   = adminSubtitle();

  // Admin collapse — toggle class on page root, show/hide expand tab
  document.querySelector(".page").classList.toggle("admin-collapsed", !!state.adminCollapsed);
  const expandTab = document.getElementById("adminExpandTab");
  if (expandTab) expandTab.style.display = state.adminCollapsed ? "flex" : "none";

  if (state.screen === "babyBudget") mountBabyBudget();
  if (state.screen === "reward")     initRewardAnimations();

  // Restore search input focus after render so typing mid-search doesn't lose cursor.
  // Only triggers when the learn tab is active and there's an active query.
  if (state.screen === "learn" && state.searchQuery) {
    const inp = document.getElementById("learnSearch");
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
    // Repopulate results that renderLearn() couldn't inject (renderSearch is DOM-dependent)
    renderSearch();
  }

  scrollTop();
}
