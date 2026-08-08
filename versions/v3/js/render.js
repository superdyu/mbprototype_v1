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
  if (state.screen === "journalEntry")   return "Money Journal — 4 structured questions by priority, then free text (discarded).";
  if (state.screen === "journalConfirm") return "Confirmation — entries derived from structured answers only.";
  if (state.screen === "journalDone")    return "Post-submit — month-to-date updated, observations recomputed.";
  if (state.screen === "home")           return "Edit daily task cards and destinations.";
  if (state.screen === "learn")          return "Adjust XP config, lesson states, badge progress.";
  if (state.screen === "topic")          return "Override lesson statuses for this badge.";
  if (state.screen === "reward-preview") return "Lesson preview — read-only. Edit content in Learn admin.";
  if (state.screen === "lesson")         return "Toggle stage style, seek to sentence for testing.";
  if (state.screen === "aboutMe")        return "Budget — 12 flat categories, plan vs what the journal says.";
  if (state.screen === "lifestyleWizard") return "Lifestyle wizard — 6 questions feeding the peer model.";
  if (state.screen === "lifestyleWizardReview") return "Starting budget from the peer model; sliders adjust before saving.";
  if (state.screen === "budgetDone")     return "Budget saved through the seam.";
  if (state.screen === "goals")          return "Goals editor — create, edit, delete goals.";
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
  if (state.screen === "chat")           return "Chat mock — keyword matching, not AI. Routes listed below.";
  if (state.screen === "budgetUpdateConfirm") return "Old → new budget comparison — gates every builder update.";
  return "Manual controls for this wireframe screen.";
}

function renderScreen() {
  if (state.screen === "streak")            return renderStreak();
  if (state.screen === "journalEntry")      return renderJournalEntry();
  if (state.screen === "journalConfirm")    return renderJournalConfirm();
  if (state.screen === "journalDone")       return renderJournalDone();
  if (state.screen === "home")              return renderHome();
  if (state.screen === "aboutMe")           return renderBudgetV3();
  if (state.screen === "lifestyleWizard")   return renderLifestyleWizard();
  if (state.screen === "lifestyleWizardReview") return renderLifestyleWizardReview();
  if (state.screen === "budgetDone")        return renderBudgetDone();
  if (state.screen === "budgetUpdateConfirm") return renderBudgetUpdateConfirm();
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
  if (state.screen === "learn")             return renderLearn();
  if (state.screen === "topic")             return renderTopic();
  if (state.screen === "reward-preview")    return renderRewardPreview();
  if (state.screen === "lesson")            return renderLesson();
  if (state.screen === "quiz")              return renderQuiz();
  if (state.screen === "simulation")        return renderSimulation();
  if (state.screen === "marketplace")       return renderMarketplace();
  if (state.screen === "marketplaceDetail") return renderMarketplaceDetail();
  if (state.screen === "reward")            return renderReward();
  if (state.screen === "settings")          return renderSettings();
  if (state.screen === "chat")              return renderChat();
  if (state.screen === "myDebts")           return renderMyDebts();
  if (state.screen === "debtAnalyzer")      return renderDebtAnalyzer();
  console.warn("[MoneyBuddy] renderScreen: unknown screen →", state.screen);
  return renderHome();
}

function renderAdmin() {
  if (state.screen === "streak")        return renderStreakAdmin();
  if (state.screen === "journalEntry")  return renderJournalEntryAdmin();
  if (state.screen === "journalConfirm") return renderJournalConfirmAdmin();
  if (state.screen === "journalDone")   return renderJournalDoneAdmin();
  if (state.screen === "home")          return renderHomeAdmin();
  if (state.screen === "goals")         return renderGoalsAdmin();
  if (state.screen === "learn")         return renderLearnAdmin();
  if (state.screen === "topic")         return renderTopicAdmin();
  if (state.screen === "myProgress")    return renderMyProgressAdmin();
  if (state.screen === "marketplace")   return renderMarketplaceAdmin();
  if (state.screen === "lesson")        return renderLessonAdmin();
  if (state.screen === "reward")        return renderRewardAdmin();
  if (state.screen === "aboutMe")       return renderBudgetV3Admin();
  if (state.screen === "lifestyleWizard") return renderLifestyleWizardAdmin();
  if (state.screen === "lifestyleWizardReview") return renderLifestyleWizardAdmin();
  if (state.screen === "myDebts")       return renderMyDebtsAdmin();
  if (state.screen === "debtAnalyzer")  return renderDebtAnalyzerAdmin();
  if (state.screen === "chat")          return renderChatAdmin();

  return `
    <div class="admin-card">
      <p class="admin-card-title">Screen Controls</p>
      <p class="helper">No detailed admin controls for this screen yet.</p>
      <div class="input-group">
        <label>Jump to screen</label>
        <select onchange="navAdminJump(this.value)">
          ${["streak","home","journalEntry","journalConfirm","journalDone","aboutMe","lifestyleWizard","lifestyleWizardReview","budgetDone","myProgress","lifestyle","lifestyleChain",
             "accountBalances","debtBalances","postResult","nextAction","commitment","finish",
             "goals","learn","topic","lesson","quiz","simulation","marketplace",
             "marketplaceDetail","reward","settings","myDebts","debtAnalyzer",
             "chat","budgetUpdateConfirm"].map(s => `
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
  const topbarRoot = document.getElementById("topbarRoot");

  // Clear lesson player timer before destroying the DOM it references.
  // Capture play state first so lpMountHook can resume if a re-render interrupted mid-play.
  const lpWasPlaying = state.lessonPlayback.playing;
  lpStopPlayback();

  screenRoot.classList.toggle("lesson-mode",      state.screen === "lesson");
  screenRoot.classList.toggle("journal-mode",     ["journalEntry","journalConfirm","journalDone","lifestyleWizard","lifestyleWizardReview","budgetDone"].includes(state.screen));
  screenRoot.classList.toggle("streak-mode",      state.screen === "streak");
  screenRoot.classList.toggle("chat-mode",        state.screen === "chat");
  document.querySelector(".screen").classList.toggle("dark-mode", state.settings.colorMode === "dark");
  screenRoot.innerHTML  = renderScreen();
  if (state.screen === "lesson") lpMountHook(lpWasPlaying);
  if (state.screen === "chat")   chatMountHook();   // pin the thread to the newest message
  topbarRoot.innerHTML  = renderTopBar();
  navRoot.innerHTML     = renderNav();
  const hasNav = !!navRoot.innerHTML;
  const hasTopbar = !!topbarRoot.innerHTML;
  // Offsets are driven by classes only — no inline px. The heights live in
  // --topbar-h / --nav-h (css/variables.css) so the reservation is stated once
  // instead of the three places v2 kept it in.
  navRoot.style.display = hasNav ? "" : "none";
  screenRoot.classList.toggle("no-nav", !hasNav);
  screenRoot.classList.toggle("no-topbar", !hasTopbar);

  document.getElementById("adminRoot").innerHTML         = renderAdmin();
  document.getElementById("adminSubtitle").textContent   = adminSubtitle();

  // Color mode button label — shows the mode you'd switch TO
  const cmBtn = document.getElementById("colorModeBtn");
  if (cmBtn) cmBtn.textContent = state.settings.colorMode === "dark" ? "Light Mode" : "Dark Mode";

  // Admin collapse — toggle class on page root, show/hide expand tab
  document.querySelector(".page").classList.toggle("admin-collapsed", !!state.adminCollapsed);
  const expandTab = document.getElementById("adminExpandTab");
  if (expandTab) expandTab.style.display = state.adminCollapsed ? "flex" : "none";

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
