function adminSubtitle() {
  if (state.screen === "home")           return "Edit daily task cards and destinations.";
  if (state.screen === "learn")          return "Adjust XP config, lesson states, badge progress.";
  if (state.screen === "topic")          return "Override lesson statuses for this badge.";
  if (state.screen === "reward-preview") return "Lesson preview — read-only. Edit content in Learn admin.";
  if (state.screen === "lesson")         return "Toggle stage style, seek to sentence for testing.";
  if (state.screen === "analysis")        return "Analysis tab — budget dashboard + debt analysis panel.";
  if (state.screen === "budgetCategory")  return "Intentional toggle, target spend, sub-category amounts.";
  if (state.screen === "goals")          return "Adjust sample goal and milestone progress.";
  if (state.screen === "marketplace")    return "Adjust marketplace preferences and offers.";
  if (state.screen === "reward")         return "Last reward output (read-only).";
  if (state.screen === "myDebts")        return "Manage debt instruments, add or remove entries.";
  if (state.screen === "debtAnalyzer")   return "Adjust extra payment, toggle debts in/out of simulation.";
  return "Manual controls for this wireframe screen.";
}

function renderScreen() {
  if (state.screen === "home")              return renderHome();
  if (state.screen === "analysis")          return renderAnalysis();
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
  if (state.screen === "myDebts")           return renderMyDebts();
  if (state.screen === "debtAnalyzer")      return renderDebtAnalyzer();
  console.warn("[MoneyBuddy] renderScreen: unknown screen →", state.screen);
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
  if (state.screen === "analysis")         return renderBudgetAdmin();
  if (state.screen === "babyBudget")       return renderBabyBudgetAdmin();
  if (state.screen === "budgetCategory")   return renderBudgetCategoryAdmin();
  if (state.screen === "myDebts")          return renderMyDebtsAdmin();
  if (state.screen === "debtAnalyzer")     return renderDebtAnalyzerAdmin();

  return `
    <div class="admin-card">
      <p class="admin-card-title">Screen Controls</p>
      <p class="helper">No detailed admin controls for this screen yet.</p>
      <div class="input-group">
        <label>Jump to screen</label>
        <select onchange="go(this.value)">
          ${["home","analysis","babyBudget","goals","learn","topic","lesson","quiz",
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
  document.querySelector(".screen").classList.toggle("dark-mode", state.settings.colorMode === "dark");
  screenRoot.innerHTML  = renderScreen();
  if (state.screen === "lesson") lpMountHook(lpWasPlaying);
  navRoot.innerHTML     = renderNav();
  const hasNav = !!navRoot.innerHTML;
  // Hide navRoot and clear the 78px bottom reservation when no nav is shown.
  // screenRoot's CSS default is bottom:78px; lesson-mode and baby-budget-mode
  // override it via class; all other no-nav screens need the inline reset.
  navRoot.style.display  = hasNav ? "" : "none";
  screenRoot.style.bottom = hasNav ? "" : "0";

  document.getElementById("adminRoot").innerHTML         = renderAdmin();
  document.getElementById("adminSubtitle").textContent   = adminSubtitle();

  // Color mode button label — shows the mode you'd switch TO
  const cmBtn = document.getElementById("colorModeBtn");
  if (cmBtn) cmBtn.textContent = state.settings.colorMode === "dark" ? "Light Mode" : "Dark Mode";

  // Admin collapse — toggle class on page root, show/hide expand tab
  document.querySelector(".page").classList.toggle("admin-collapsed", !!state.adminCollapsed);
  const expandTab = document.getElementById("adminExpandTab");
  if (expandTab) expandTab.style.display = state.adminCollapsed ? "flex" : "none";

  if (state.screen === "babyBudget") mountBabyBudget();

  // Send current theme to BB iframe on every render (live toggle while wizard is open)
  const bbLive = document.getElementById("babyBudgetFrame");
  if (bbLive && bbLive.dataset.loaded === "true") {
    try { bbLive.contentWindow.postMessage({ type: "bb-theme", colorMode: state.settings.colorMode }, "*"); } catch(e) {}
  }
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

  // Update admin footer — nav log and last error
  const navLogEl = document.getElementById('adminNavLog');
  if (navLogEl) navLogEl.textContent = 'Nav: ' + (window.__navLog.length ? window.__navLog.join(' ← ') : 'none');
  const errEl = document.getElementById('adminErrorLog');
  if (errEl && !window.__lastError) errEl.textContent = 'Last error: none';
}
