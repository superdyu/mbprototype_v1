// ─── Chat Router (keyword matching) ───────────────────────────────────────────
// The "brain" behind the Chat with Buddy screen (screens/chat.js).
//
// WHAT THIS IS *NOT*: this is not AI, an LLM, or an NLP system. It is a
// deliberately dumb word matcher. Its entire job is to illustrate, for user
// testing, how a chat surface could route someone to the right place in the app.
// Do not "upgrade" this into a real model — if real AI ever lands, it replaces
// chatRoute() wholesale and everything else here becomes the fallback path.
//
// HOW IT WORKS
//   1. The user's message is lowercased.
//   2. CHAT_ROUTES is scanned top to bottom; the FIRST route with a keyword
//      match wins. Order is therefore behavior — see the ordering notes below.
//   3. The winning route's respond() returns { text, link? }. A link renders as
//      a tappable button inside Buddy's message bubble; we never auto-navigate,
//      because the user should always read the reply before being moved.
//   4. No route matches → CHAT_NO_MATCH_REPLY.
//
// ORDERING RULES (why the array is in the order it is)
//   - Learn is FIRST. A learning verb ("learn", "how does", "explain") beats a
//     topic noun, so "I want to learn about budgeting" is a lesson request, not
//     a budget-tab request. This is the behavior spec'd for the prototype.
//   - Tracking-actuals sits ABOVE budget, so "track my spending" is heard as
//     tracking (a future feature) rather than budgeting (a current one).
//   - Then the action routes (budget, goals, debt, market, progress).
//   - lesson-topic sweeps up bare topic words with no verb ("my 401k") after
//     the action routes have had their say.
//   - Capability/greeting is last before the fallback: it's the widest net.
//
// KEYWORD MATCHING is word-boundary based, not raw substring — a raw substring
// match makes short keywords land inside unrelated words ("hi" inside "this",
// "plan" inside "explain"). Multi-word keywords are matched as phrases.

// Words too common to say anything about intent — dropped before lesson search.
const CHAT_STOPWORDS = ["the", "and", "for", "how", "what", "why", "does", "did",
  "can", "you", "your", "our", "with", "about", "want", "need", "get", "got",
  "have", "has", "this", "that", "there", "here", "into", "from", "out", "off",
  "are", "was", "were", "will", "would", "should", "could", "its", "it's",
  "tell", "show", "help", "please", "learn", "learning", "know", "understand"];

const CHAT_NO_MATCH_REPLY = "I'm not sure what you're asking me for. Try to phrase it a different way";

// True when any keyword appears in `message` as a whole word/phrase.
// `message` must already be lowercased.
function chatMatches(message, keywords) {
  return keywords.some(function (kw) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + escaped + "\\b").test(message);
  });
}

// Mirrors the Learn tab's search (screens/learn.js renderSearch), which matches
// lessons on title/description and badges on name — we fold the lesson's badge
// names into the same haystack so topic words land ("credit cards" is a badge
// name, not a word in any lesson title). Difference from that search: a chat
// message is a sentence, not a query, so we score by how many meaningful words
// hit and keep the best lesson. Returns a lesson object or null.
function chatFindLesson(message) {
  const words = message.toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(function (w) { return w.length > 2 && CHAT_STOPWORDS.indexOf(w) === -1; });
  if (!words.length) return null;

  let best = null;
  let bestScore = 0;
  state.lessons.forEach(function (lesson) {
    const haystack = (lesson.title + " " + lesson.description + " " +
                      lesson.badges.join(" ")).toLowerCase();
    let score = 0;
    words.forEach(function (w) { if (haystack.indexOf(w) !== -1) score++; });
    if (score > bestScore) { bestScore = score; best = lesson; }
  });
  return bestScore > 0 ? best : null;
}

// Buddy's reply when a lesson is the right answer. Shared by the learn route
// (explicit learning verbs) and the lesson-topic sweep (bare topic mentions).
function chatLessonReply(lesson) {
  return {
    text: "Good question — and a good sign you're asking it. \"" + lesson.title +
          "\" walks through this at an easy pace. No rush, and nothing to get wrong.",
    link: { label: "Start this lesson", action: "selectLesson('" + lesson.id + "')" }
  };
}

// Budget/planning routes state-aware: no budget yet → the Budget tab hub
// (same landing as tapping the tab); budget exists → straight to editing it.
// Screen id is `aboutMe` even though the tab reads "Budget" — see about-me.js.
function chatBudgetLink() {
  return state.budget.status === "empty"
    ? { label: "Take me to Budget", action: "go('aboutMe')" }
    : { label: "Open my budget",    action: "go('budgetSetup')" };
}

// Ordered: first keyword match wins. Each respond() returns { text, link? }.
const CHAT_ROUTES = [
  {
    id: "learn",
    keywords: ["learn", "teach", "explain", "lesson", "lessons", "study",
               "how does", "how do", "how did", "what is", "what are", "understand"],
    respond: function (message) {
      const lesson = chatFindLesson(message);
      if (lesson) return chatLessonReply(lesson);
      return {
        text: "I don't have a lesson that lines up with that one exactly, but the Learn tab " +
              "has the full library — plenty of places to start, and no wrong order to do them in.",
        link: { label: "Browse lessons", action: "go('learn')" }
      };
    }
  },

  // ── MONEY JOURNAL DEPENDENCY ────────────────────────────────────────────────
  // This route is a PLACEHOLDER for a feature that does not exist yet.
  //
  // MoneyBuddy separates two ideas that sound alike in plain English:
  //   - BUDGETING / PLANNING  → what you intend to spend  → exists today (Budget tab)
  //   - TRACKING ACTUALS      → what you actually spent    → the future Money Journal
  //
  // Until Money Journal ships, "track my spending" has nowhere real to go, so we
  // acknowledge the intent and say it's coming, with no link (a link to the
  // budget would blur the very distinction we're drawing).
  //
  // WHEN MONEY JOURNAL IS BUILT, THIS ROUTE MUST BE REWIRED:
  //   1. Replace the coming-soon copy with a real reply.
  //   2. Add a link to the Money Journal screen.
  //   3. Re-check ordering — journal keywords may overlap budget's.
  //   4. Add journal chips to CHAT_CHIPS in screens/chat.js.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "tracking-actuals",
    keywords: ["track", "tracking", "record", "log", "logged", "spent", "receipt",
               "journal", "actuals", "where did my money go"],
    respond: function () {
      return {
        text: "Recording what you actually spent is coming soon — that'll live in your " +
              "Money Journal. For now I can help you plan ahead rather than look back. " +
              "It's worth the wait, and you're not behind for asking early."
      };
    }
  },

  {
    id: "budget",
    keywords: ["budget", "budgeting", "plan", "planning", "spending plan", "afford",
               "income", "bills", "expenses"],
    respond: function () {
      const link = chatBudgetLink();
      const text = state.budget.status === "empty"
        ? "Let's build your budget together. It's a handful of simple questions — " +
          "no bank connection, no judgment, and you can change any answer later."
        : "Your budget's already set up, so this is just a tune-up. Change what's " +
          "shifted and leave the rest — nothing breaks if it's not perfect.";
      return { text: text, link: link };
    }
  },

  {
    id: "goals",
    keywords: ["goal", "goals", "save for", "saving for", "savings", "milestone",
               "emergency fund", "target"],
    respond: function () {
      return {
        text: "Goals are how we turn a big number into small steps you can actually " +
              "finish. Pick one thing that matters — we'll size it together and go " +
              "at whatever pace fits your life.",
        link: { label: "Set up a goal", action: "goGoalsEntry()" }
      };
    }
  },

  {
    id: "debt",
    keywords: ["debt", "debts", "pay off", "payoff", "owe", "loan", "loans",
               "credit card", "interest rate", "minimum payment"],
    respond: function () {
      return {
        text: "Debt feels heavier than it usually is once you can see it laid out. " +
              "The analyzer shows what an extra payment actually buys you in time saved — " +
              "small changes tend to matter more than people expect.",
        link: { label: "Open Debt Analyzer", action: "go('debtAnalyzer')" }
      };
    }
  },

  {
    id: "marketplace",
    keywords: ["offer", "offers", "deal", "deals", "recommend", "recommendation",
               "card", "account", "product", "marketplace"],
    respond: function () {
      return {
        text: "The Market tab lists options matched to the preferences you've set. " +
              "Nothing there is a commitment — it's fine to just look around.",
        link: { label: "Open Market", action: "go('marketplace')" }
      };
    }
  },

  {
    id: "progress",
    keywords: ["progress", "how am i doing", "streak", "badge", "badges", "level",
               "xp", "doing well", "on track"],
    respond: function () {
      return {
        text: "My Progress pulls together everything you've told me — where your money " +
              "sits, what you've learned, and how far along your goals are. " +
              "Look at the direction, not the number.",
        link: { label: "See my progress", action: "go('myProgress')" }
      };
    }
  },

  // Catches topic words with no verb attached ("help me with my 401k", "index
  // funds?"). Uses a matches() predicate instead of a keyword list because the
  // vocabulary IS the lesson library — it changes whenever lessons change, so
  // hardcoding it here would just rot. Sits below the action routes (an action
  // intent shouldn't be answered with homework) and above capability, so a real
  // topic beats the generic "here's what I do" blurb. Declines quietly when
  // nothing matches, and the message falls through.
  {
    id: "lesson-topic",
    note: "any word matching a lesson title, description, or badge",
    keywords: [],
    matches: function (message) { return !!chatFindLesson(message); },
    respond: function (message) { return chatLessonReply(chatFindLesson(message)); }
  },

  {
    id: "capability",
    keywords: ["hello", "hi", "hey", "help", "what can you do", "who are you",
               "what do you do", "options"],
    respond: function () {
      return {
        text: "I can point you to the right spot for most things: budgeting and planning, " +
              "setting a goal, paying down debt, learning a topic, or checking your progress. " +
              "Tell me what's on your mind and I'll take you there."
      };
    }
  }
];

// Runs a message through the routes. Returns { text, link? } — never null.
// A route matches on its keyword list, unless it defines its own matches().
function chatRoute(message) {
  const msg = (message || "").toLowerCase();
  for (let i = 0; i < CHAT_ROUTES.length; i++) {
    const route = CHAT_ROUTES[i];
    const hit = route.matches ? route.matches(msg) : chatMatches(msg, route.keywords);
    if (hit) return route.respond(msg);
  }
  return { text: CHAT_NO_MATCH_REPLY };
}

// Appends the user's message + Buddy's reply to the transcript, then re-renders.
// Chips and the type-in bar both land here, so a tapped chip and the same words
// typed by hand behave identically — one system, not two.
function chatRespond(text) {
  const clean = (text || "").trim();
  if (!clean) return;
  state.chat.messages.push({ from: "user", text: clean });
  const reply = chatRoute(clean);
  state.chat.messages.push({ from: "buddy", text: reply.text, link: reply.link || null });
  render();
}
