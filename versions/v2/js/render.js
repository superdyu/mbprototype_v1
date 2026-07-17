// ─── Render Engine ────────────────────────────────────────────────────────────
// Owns the full render cycle. render() is the sole writer to screenRoot and
// navRoot — no other file should mutate those DOM nodes directly.
//
// Three routing functions:
//   renderScreen()  — maps state.screen → render function
//   renderAdmin()   — maps state.screen → admin panel content
//   adminSubtitle() — maps state.screen → admin header subtitle
//
// render() rebuilds both the screen and the admin panel on every call.
// This is intentional — the app is small enough that full re-renders are
// cheaper than fine-grained diffing and simpler to reason about.

function adminSubtitle() {
  if (state.screen === "streak")         return "Streak splash — static launch screen shown first on every refresh.";
  if (state.screen === "home")           return "Edit daily task cards and destinations.";
  if (state.screen === "learn")          return "Adjust XP config, lesson states, badge progress.";
  if (state.screen === "topic")          return "Override lesson statuses for this badge.";
  if (state.screen === "reward-preview") return "Lesson preview — read-only. Edit content in Learn admin.";
  if (state.screen === "lesson")         return "Toggle stage style, seek to sentence for testing.";
  if (state.screen === "aboutMe")        return "Budget tab — input hub for budget, lifestyle, goals, balances.";
  if (state.screen === "goals")          return "Goals editor — create, edit, delete goals.";
  if (state.screen === "budgetSetup")    return "Budget setup — income, housing, ZIP, major bills.";
  if (state.screen === "budgetCategory") return "Intentional toggle, target spend, sub-category amounts.";
  if (state.screen === "myProgress")     return "My Progress tab — output hub for profile, results, comparisons, goals.";
  if (state.screen === "lifestyle")      return "Lifestyle theme selection — 5 themes.";
  if (state.screen === "lifestyleChain") return "Lifestyle question chain — answers drive budget sub-sliders.";
  if (state.screen === "accountBalances") return "Account balance snapshots — point-in-time entries.";
  if (state.screen === "debtBalances")   return "Debt balance snapshots — point-in-time entries.";
  if (state.screen === "postResult")     return "Post-result reaction prompt.";
  if (state.screen === "nextAction")     return "Next action selection.";
  if (state.screen === "commitment")     return "Commitment creation.";
  if (state.screen === "marketplace")    return "Adjust marketplace preferences and offers.";
  if (state.screen === "reward")         return "Last reward output (read-only).";
  if (state.screen === "myDebts")        return "Manage debt instruments, add or remove entries.";
  if (state.screen === "debtAnalyzer")   return "Adjust extra payment, toggle debts in/out of simulation.";
  if (state.screen === "goalCreate")     return "Goals V2 — creation wizard. Clock + navigate in the panel below.";
  if (state.screen === "goalTracker")    return "Goals V2 — active tracker. Time-travel and simulate engagement.";
  if (state.screen === "goalVault")      return "Goals V2 — victory vault. Completed goals and earned medals.";
  if (state.screen === "chat")           return "Chat mock — keyword matching, not AI. Routes listed below.";
  if (state.screen === "budgetUpdateConfirm") return "Old → new budget comparison — gates every builder update.";
  if (state.screen === "lifestyleSurvey")    return "Lifestyle Survey builder — placeholder questions, real seam.";
  return "Manual controls for this wireframe screen.";
}

function renderScreen() {
  if (state.screen === "streak")            return renderStreak();
  if (state.screen === "home")              return renderHome();
  if (state.screen === "aboutMe")           return renderAboutMe();
  if (state.screen === "budgetSetup")       return renderBudgetSetup();
  if (state.screen === "budgetUpdateConfirm") return renderBudgetUpdateConfirm();
  if (state.screen === "lifestyleSurvey")    return renderLifestyleSurvey();
  if (state.screen === "babyBudget")        return renderBabyBudget();
  if (state.screen === "myProgress")        return renderMyProgress();
  if (state.screen === "lifestyle")         return renderLifestyle();
  if (state.screen === "lifestyleChain")    return renderLifestyleChain();
  if (state.screen === "accountBalances")   return renderAccountBalances();
  if (state.screen === "debtBalances")      return renderDebtBalances();
  if (state.screen === "postResult")        return renderPostResult();
  if (state.screen === "nextAction")        return renderNextAction();
  if (state.screen === "commitment")        return renderCommitment();
  if (state.screen === "finish")            return renderFinish();
  if (state.screen === "goals")             return renderGoals();      // Budget → Goals (input/edit)
  if (state.screen === "analysis")          return renderAboutMe();    // legacy redirect
  if (state.screen === "learn")             return renderLearn();
  if (state.screen === "topic")             return renderTopic();
  if (state.screen === "reward-preview")    return renderRewardPreview();
  if (state.screen === "lesson")            return renderLesson();
  if (state.screen === "quiz")              return renderQuiz();
  if (state.screen === "budgetCategory")    return renderBudgetCategory();
  if (state.screen === "simulation")        return renderSimulation();
  if (state.screen === "marketplace")       return renderMarketplace();
  if (state.screen === "marketplaceDetail") return renderMarketplaceDetail();
  if (state.screen === "reward")            return renderReward();
  if (state.screen === "settings")          return renderSettings();
  if (state.screen === "chat")              return renderChat();
  if (state.screen === "myDebts")           return renderMyDebts();
  if (state.screen === "debtAnalyzer")      return renderDebtAnalyzer();
  if (state.screen === "goalCreate")        return renderGoalCreate();
  if (state.screen === "goalTracker")       return renderGoalTracker();
  if (state.screen === "goalVault")         return renderGoalVault();
  console.warn("[MoneyBuddy] renderScreen: unknown screen →", state.screen);
  return renderHome();
}

function renderAdmin() {
  if (state.screen === "streak")        return renderStreakAdmin();
  if (state.screen === "home")          return renderHomeAdmin();
  if (state.screen === "goals")         return renderGoalsAdmin();
  if (state.screen === "learn")         return renderLearnAdmin();
  if (state.screen === "topic")         return renderTopicAdmin();
  if (state.screen === "myProgress")    return renderMyProgressAdmin();
  if (state.screen === "marketplace")   return renderMarketplaceAdmin();
  if (state.screen === "lesson")        return renderLessonAdmin();
  if (state.screen === "reward")        return renderRewardAdmin();
  if (state.screen === "aboutMe")       return renderAboutMeAdmin();
  if (state.screen === "analysis")      return renderAboutMeAdmin();   // legacy history redirect
  if (state.screen === "budgetSetup")   return renderBudgetAdmin();
  if (state.screen === "babyBudget")    return renderBabyBudgetAdmin();
  if (state.screen === "budgetCategory") return renderBudgetCategoryAdmin();
  if (state.screen === "myDebts")       return renderMyDebtsAdmin();
  if (state.screen === "debtAnalyzer")  return renderDebtAnalyzerAdmin();
  if (state.screen === "goalCreate")    return renderGoalCreateAdmin();
  if (state.screen === "goalTracker")   return renderGoalTrackerAdmin();
  if (state.screen === "goalVault")     return renderGoalVaultAdmin();
  if (state.screen === "chat")          return renderChatAdmin();
  if (state.screen === "lifestyleSurvey") return renderLifestyleSurveyAdmin();

  return `
    <div class="admin-card">
      <p class="admin-card-title">Screen Controls</p>
      <p class="helper">No detailed admin controls for this screen yet.</p>
      <div class="input-group">
        <label>Jump to screen</label>
        <select onchange="go(this.value)">
          ${["streak","home","aboutMe","budgetSetup","babyBudget","myProgress","lifestyle","lifestyleChain",
             "accountBalances","debtBalances","postResult","nextAction","commitment","finish",
             "goals","learn","topic","lesson","quiz","simulation","marketplace",
             "marketplaceDetail","reward","settings","myDebts","debtAnalyzer",
             "goalCreate","goalTracker","goalVault","chat","budgetUpdateConfirm","lifestyleSurvey"].map(s => `
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
  const lpWasPlaying = state.lessonPlayback.playing;
  lpStopPlayback();

  screenRoot.classList.toggle("baby-budget-mode", state.screen === "babyBudget");
  screenRoot.classList.toggle("lesson-mode",      state.screen === "lesson");
  screenRoot.classList.toggle("streak-mode",      state.screen === "streak");
  screenRoot.classList.toggle("chat-mode",        state.screen === "chat");
  document.querySelector(".screen").classList.toggle("dark-mode", state.settings.colorMode === "dark");
  screenRoot.innerHTML  = renderScreen();
  if (state.screen === "lesson") lpMountHook(lpWasPlaying);
  if (state.screen === "chat")   chatMountHook();   // pin the thread to the newest message
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

  // Update admin footer — nav log and last error (skip when admin is collapsed)
  if (!state.adminCollapsed) {
    const navLogEl = document.getElementById('adminNavLog');
    if (navLogEl) navLogEl.textContent = 'Nav: ' + (window.__navLog.length ? window.__navLog.join(' ← ') : 'none');
    const errEl = document.getElementById('adminErrorLog');
    if (errEl && !window.__lastError) errEl.textContent = 'Last error: none';
  }
}
