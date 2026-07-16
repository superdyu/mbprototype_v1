# Goals V2 Module — Architecture Plan & Handoff Spec

> **⚠️ APPROVING THIS PLAN EXECUTES EXACTLY ONE ACTION: save this document as `docs/goals-module-plan.md`, commit, and push. NO code is built.** Implementation (commits 1–11 below) is a separate future session on Opus or another model, using this document as its spec. Written 2026-06-12 during the Fable 5 suspension window.

## Context

MoneyBuddy needs a goal system that solves long-horizon abandonment: large financial goals broken into hyper-achievable micro-sprints, a dual tracking system (frozen baseline timeline + simulated social cohort with motivational guardrails), and a positive-only "victory vault." The existing goals system (`screens/goals.js` — title + manual progress %) is too thin to extend; this is a new standalone module with **no front-end placement yet** (admin-only entry), designed deep enough to double as the handoff spec for the future iOS/Android rebuild. Plan written extra-deep deliberately — it must survive a model handoff.

**Execution scope for THIS session (Dyuman's call, 2026-06-12): Step 0 only — commit this document as `docs/goals-module-plan.md` and push.** Implementation (commits 1–11) happens in a later session, likely on Opus after the Fable suspension; the doc is written so that session needs no other context. Decisions already made by Dyuman: cohort is **explicitly labeled as simulated** in the UI; sprint completion is a **claim button**; full module scope (no phase cut).

> **Note (post-restructure):** this doc predates the `versions/<name>/` split. Every path below (`js/goals/...`, `screens/goal-*.js`, `index.html`, etc.) is relative to whichever version folder you're implementing in — currently `versions/v2/`, per the root `CLAUDE.md`.

## Architecture principles

1. **Derive, don't store.** A goal = frozen `baseline` + append-only `events[]`. Sprints, cohort standings, pace, achievements are all computed at render time by pure functions. One deliberate exception: debt-paydown goals store a sampled `payoffCurve` at creation, because re-deriving from live `state.budget.debts` would silently rewrite the frozen baseline when the user edits debts.
2. **Simulated clock is mandatory.** No backend, no persistence, multi-month goals — the only way to demo the engagement loop is time travel. `goalsTodayISO()` (real now + `state.goalsV2.clockOffsetDays`) is the sole time source inside the module; `todayISO()` is banned in `js/goals/` and goal screens (enforced by grep in the final commit). Rest of app keeps real time.
3. **Deterministic cohort.** Bots are pure functions of `(goal.cohortSeed, dayIndex)` via seeded PRNG (FNV-1a hash + mulberry32). Same goal → identical cohort on every render, forever. Guardrails clamp the **user's rank only**, never mutate bot scores — so historical standings are replayable for achievements without storing rank history.
4. **Thin, documented seams.** All host-state reads go through `goals-bridge.js` (wizard-bridge header-doc convention). All mocked automation (credit score, rates, tax bracket, borrowing power) lives in `goals-autofill.js` — the one file the production rebuild replaces with real APIs. Module never writes to budget/debts.
5. **Tunable like a game economy.** Every behavioral knob in one `GOALS_TUNING` const, hot-editable from the dev admin panel.

## File structure (14 new files)

```
js/goals/goals-tuning.js        GOALS_TUNING config (no functions; loaded first)
js/goals/goals-time.js          simulated clock
js/goals/goals-bridge.js        read-only seam into host state (header documents every read)
js/goals/goals-autofill.js      mocked automation layer — THE production-API replacement seam
js/goals/goals-catalog.js       5 categories, 13 goal types, per-type input schemas (pure content)
js/goals/goals-engine.js        feasibility, baseline freeze, milestones, events, pace
js/goals/goals-sprints.js       fixed sprint windows + rolling-forward targets
js/goals/goals-cohort.js        seeded bot simulation + guardrailed ranking
js/goals/goals-achievements.js  achievement/celebration derivation (pure scan of events)
js/goals/goals-admin.js         shared dev panel (time travel, tuning editor, simulators)
components/sprint-timeline.js   renderSprintTimeline() reusable visual
screens/goal-create.js          Phase 1 wizard: category → type → inputs → feasibility
screens/goal-tracker.js         Phase 2 Active Tracker
screens/goal-vault.js           Phase 3 Victory Vault
```

Modified: `index.html` (module tags after `components/thermometer.js`; screen tags at end of section 3), `js/state.js` (`goalsV2` block + `resetUserData()` + `destinations[]`), `js/render.js` (3 entries each in `renderScreen()` / `renderAdmin()` / `adminSubtitle()` + the hardcoded jump list in default `renderAdmin()` ~line 96), optional 2-line `navigation.js` snapshot tweak.

Runtime-only dependency (documented in engine header): `goals-engine.js` calls `runPayoffSimulation()` from `screens/debt-analyzer.js` for debt goals.

**Not touched:** existing `state.goals`/`commitment.js`/my-progress goals display stay live and untouched. Supersession (routing "Make a goal" → goalCreate, rendering V2 summaries in My Progress) is a future commit, documented in §Risks.

## State schema (added to js/state.js)

```js
goalsV2: {
  clockOffsetDays: 0,     // sim-time offset (admin time travel)
  goals: [],              // GoalV2[] — single list, all statuses (no separate completed[] array)
  draft: null,            // creation-wizard scratch; discarded on cancel
  selectedGoalId: null,   // tracker's current goal
  celebrationDismissedAt: null
}
```

```js
// GoalV2
{
  id: "gv2_<ts>_<rand>",            // generateId("gv2")
  createdAt: "2026-06-12",          // SIM date (goalsTodayISO())
  categoryKey: "expense"|"purchase"|"wealth"|"learning"|"credit",
  typeKey: string,                  // catalog key e.g. "debtPaydown", "homeDown"
  title: string,
  inputs: object,                   // frozen copy of draft inputs (audit trail)
  autofill: { fieldKey: { value, source, explanation, overridden } },  // context-card snapshot
  baseline: {                       // ★ FROZEN at creation — Phase-2 timeline tracking compares to THIS
    startDate, targetDate,
    startValue, targetValue,
    unit: "usd"|"score"|"lessons"|"steps",
    direction: "up"|"down",
    monthlyCommitment: number,
    feasibility: { verdict, ratio, requiredMonthly, capacityMonthly, notes[] },
    milestones: [{ id, kind:"1mo"|"3mo"|"6mo"|"1yr"|"final", label, dueDate, targetValue }],
    payoffCurve: null | [{month, balance}]   // debtPaydown only — the one stored derivation
  },
  events: [                         // ★ append-only; the ONLY mutable part post-creation
    // { id, at: simDate, type: "checkin"|"sprintDone"|"celebrated"|"complete", payload }
  ],
  status: "active"|"completed",
  cohortSeed: uint32                // hash(id), frozen for bot determinism
}
```

## GOALS_TUNING (key knobs)

```js
feasibility: { comfortableRatio: .50, tightRatio: .90, spendCutFloorPct: .70,
               lessonsPerWeekComfortable: 2, lessonsPerWeekTight: 4 }
sprints:     { weeklyIfUnderDays: 180, firstSprintEase: 0.6, roundTo: 5, upcomingShown: 3 }
cohort:      { size: 24, archetypeMix: {leader:.15, steady:.45, sporadic:.30, laggard:.10},
               dailyGain ranges per archetype,
               pointsPerAction: 30, sprintRateWeight: 200, onPaceBonus: 150,
               neutralPercentile: 50, firstActionFloorPct: 60, lapsedFloorPct: 55,
               engagement: { minSprintRate: .75, onPaceRatio: .90, lapseAfterDays: 10 },
               replayCapDays: 730 }
achievements:{ streakTiers: [2,4,8], completionTiers: {gold:.9, silver:.6}, rankTitles: {...} }
```

## Module APIs (function-level contracts)

**goals-time.js:** `goalsNow()`, `goalsTodayISO()`, `goalsAddDays(iso,n)`, `goalsDaysBetween(a,b)`, `goalsAdvanceClock(days)`, `goalsResetClock()`.

**goals-bridge.js:** `goalsMonthlyCapacity()` → `{savingsAllocated, unallocated, total}` (savings category total + max(0, income − plan)); `goalsDebtsSnapshot()` (deep clone); `goalsCategorySpend(catKey)` → `{spend, peerAvg}` via `budgetCategoryTotal`/`budgetPeerAvg`; `goalsEssentialMonthlySpend()` (housing + transport + fixed overhead, for emergency-fund sizing); `goalsLessonPool()`.

**goals-autofill.js:** `GOALS_MOCK` (credit profile, rates incl. savingsAPY/mortgage/auto/refi/marketReturn, credit-gain-per-month model, borrowing power DTI/multiplier); `goalsTaxBracketFor(income)`; `goalsAutofillFor(typeKey)` → sourced+explained field values for context cards.

**goals-catalog.js:** `GOALS_CATEGORIES` (5), `GOALS_TYPES` (13: expense → debtPaydown, categoryCut · purchase → vehicle, homeDown, vacation, wedding · wealth → emergencyFund, retirementBoost, collegeFund, passiveIncome · learning → courseCompletion · credit → targetScore, cardManagement, refinance). Each type: input FieldSpecs (`usd|date|int|pct|select|debtPicker`), `autofillKeys`, `feasibilityKind: savings|debt|categoryCut|learning|credit|checklist`. `goalsTypeMeta()`, `goalsTypesForCategory()`.

**goals-engine.js:** `goalsComputeFeasibility(typeKey, inputs, autofill)` → `{verdict, ratio, requiredMonthly, capacityMonthly, notes[], adjustments: {extendToDate, raiseToMonthly, lowerToTarget}}`; `goalsBuildBaseline(...)` (freeze, incl. milestones + payoffCurve); `goalsBaselineExpectedValue(goal, iso)` (linear interp / curve lookup); `goalsCurrentValue(goal)` (startValue ± Σ checkins); `goalsProgressPct`; `goalsPaceStatus` → `{expected, actual, deltaPct, status: ahead|onTrack|behind}`; `goalsCreateFromDraft`; mutators `recordGoalCreation(goal)`, `recordGoalEvent(goalId, type, payload)`; `goalsFmtValue(value, unit)` (per-unit formatter); `goalsActive()`, `goalsById(id)`.

**goals-sprints.js:** `goalsSprintCadence(goal)` (7d if horizon < 180d else 14d); `goalsSprintWindows(goal)` — **fixed grid** anchored at createdAt, keys `"s0","s1",…` never change; `goalsSprintPlan(goal)` → `{past, current: {key, target, done, window}, upcoming}` with rolling-forward **targets**; `goalsCompleteSprint(goalId, key)` (double-claim guard); `goalsCheckIn(goalId, value)`.

**goals-cohort.js:** `goalsHashString` (FNV-1a), `goalsMulberry32(seed)`, `goalsCohortBots(goal)` (pure from seed: name, archetype, dailyGain, jitterSeed), `goalsBotScore(bot, dayIndex)` (deterministic day-walk), `goalsUserEngagement(goal, asOf?)` → `{actions, sprintRate, onPace, daysSinceLastAction, tier: new|active|engaged|lapsed}`, `goalsCohortStanding(goal, asOf?)` → `{rank, percentile, tier, guardrailApplied, board}`.

**goals-achievements.js:** `goalsAchievements(goal)` (derived: streaks, milestone medals, rank firsts, completion trophy — deterministic ids so re-derivation is idempotent); `goalsAllAchievements()`; `goalsVaultEntries()` → `{completedGoals, milestoneMedals}` **positive-only** (includes medals from still-active goals; never pending/missed/remaining); `goalsPendingCelebration(goal)` (oldest achievement without a `celebrated` event); `goalsDismissCelebration()`.

**goals-admin.js:** `renderGoalsDevPanel()` (prepended to all three goal-screen admin panels): clock card (+1d/+1w/+1mo/reset), navigate card (the module's ONLY cross-screen nav — satisfies "no front-end placement"), simulators (`goalsSimulateEngagedWeek`, `goalsSimulateLapse`, `goalsAdminResetModule`), tuning card (`goalsAdminSetTuning(path, val)` + `debouncedRender()`, mirroring the Learn xpConfig pattern).

**components/sprint-timeline.js:** `renderSprintTimeline(goal, opts)` — per spec shows ONLY: achieved past major milestones (medals), current position with pace color, next `upcomingShown` micro-goals with upcoming-milestone flags. Missed past sprints are NOT rendered (engagement design).

**Screens:** goal-create (`gcSelectCategory/gcSelectType/gcSetInput/gcOverrideAutofill/gcToFeasibility/gcApplyAdjustment(extend|raise|lower)/gcConfirmCreate/gcCancel`); goal-tracker (`gtSelectGoal/gtCheckIn/gtCompleteSprint/gtClaimComplete/gtDismissCelebration`; pace card reuses `renderThermometer(actual, expected)`); goal-vault (read-only trophy cards + medal wall).

## Algorithms

### Feasibility (per feasibilityKind)
- **savings** (vehicle/homeDown/vacation/wedding/emergencyFund/collegeFund): resolve targetValue (homeDown: price × downPct; emergencyFund: months × `goalsEssentialMonthlySpend()` — each derivation emits a context card) → `requiredMonthly = (target − start) / months`; retirementBoost/passiveIncome use annuity formula with mocked 7% return (context card flags the assumption) → `ratio = required / goalsMonthlyCapacity().total` → verdict by tuning thresholds. Capacity ≤ 0 → "unrealistic + fix budget first" (host model allows negative savings). Three adjustment chips always computed: **extend** (date that makes it tight-feasible), **raise** (to requiredMonthly), **lower** (target affordable at tightRatio).
- **debt** (debtPaydown): reuse `runPayoffSimulation(selectedDebts, extra, "avalanche")` from debt-analyzer.js; verdict by projected-vs-desired months (≥15% slack = comfortable); raise-chip binary-searches extra payment (≤14 sims); baseline stores sampled payoffCurve; direction "down", target 0.
- **categoryCut**: target = monthlyReduction × duration (cumulative saved); unrealistic if cut goes below `peerAvg × spendCutFloorPct` (cites `budgetPeerAvg`).
- **learning**: required lessons/week vs tuning thresholds; capped by `goalsLessonPool().remaining`.
- **credit** (targetScore): months = (target − mocked score) / mocked gain-per-month; context card: "mocked bureau pull — replace with real API".
- **checklist** (cardManagement/refinance): target = static step count; refinance verdict is a gate (refiAPR < user's max debt APR AND score ≥ 660), not a ratio.
- **Milestones (all kinds):** anchors at +30/90/180/365d (drop any within 14d of targetDate) + final; each milestone's targetValue = `goalsBaselineExpectedValue` at its dueDate.

### Sprints: fixed windows, rolling targets
1. Window grid fixed at creation (cadence 7d or 14d); keys stable forever → `sprintDone` events never dangle after a re-plan.
2. At render: `remaining = |target − currentValue|`, `even = remaining / windowsLeft`.
3. **Current window target = even × firstSprintEase (60%), rounded** — always hyper-achievable; the shaved remainder spreads across future windows. Ahead → everything shrinks; behind → future grows but current stays eased (the engagement hook).
4. `remaining ≤ 0` → all targets 0, tracker switches to "claim completion" CTA.

### Cohort ranking with guardrails (clamps on user rank only)
1. Seeded bots: archetype mix (leader/steady/sporadic/laggard) with per-archetype daily-gain ranges + per-day deterministic jitter; `botScore = Σ days`.
2. User raw score = `actions × 30 + sprintRate × 200 + onPace bonus 150` — engagement-driven, not dollar-driven (big incomes don't auto-win).
3. Clamps, first match wins: **(a)** day 1 / zero events → exactly median (`neutral`); **(b)** tier "engaged" (sprintRate ≥ .75 AND onPace) → rank #1 (`top` — "see what great looks like"); **(c)** tier "lapsed" (>10d inactive) → pinned at 55th percentile, just behind the top-40% band, never bottom (`lapsedFloor`); **(d)** ≥1 action ever → floor at 60th percentile (`floor`, the top-40% unlock).
4. Board: top 5 + 3 rows around the highlighted user. Historical standing = same pure function with a past `asOf` date (replay, nothing stored).
5. **Presentation (decided):** the board is explicitly labeled simulated — header "Pace group — a simulated cohort of typical savers on your goal", bot rows styled subtly distinct from the user row. No real-people implication anywhere. Handoff note: if production ever moves to real cohorts, the guardrail clamps in step 3 must be removed or disclosed — clamped rankings + real people is the worst of both worlds.

### Achievements (pure scan; `celebrated` events are the only stored acknowledgment)
- Streaks: walk sprint windows, consecutive `done` runs cross tuning tiers [2,4,8].
- Milestone medals: for each baseline milestone past due, achieved iff checkins through dueDate meet its targetValue. Missed → nothing rendered anywhere (positive-only).
- Rank firsts: replay cohort standing day by day (skip until ≥1 event); first top-40% day → "Front Runner"; first #1 day → "Pacesetter".
- Completion: `complete` event → trophy + permanent rank title (gold/silver/bronze by milestones-hit ratio).
- Celebration queue: oldest un-celebrated achievement renders a full-card overlay in the tracker; dismissing appends `celebrated` → fires exactly once across time travel and re-renders.

## Build order (committed + pushed individually; `node --check` + admin error footer clean each step)

0. Commit this plan as `docs/goals-module-plan.md`.
1. **Scaffolding:** state.goalsV2 + reset + destinations; goals-tuning.js; goals-time.js; index.html tags. Verify in console: clock advances/resets.
2. **Bridge + autofill.** Verify: `goalsMonthlyCapacity()` matches Budget screen; safe zeros after `resetUserData()`.
3. **Catalog.** Verify: 5 categories, every typeKey + autofillKey resolves.
4. **Engine.** Verify in console: homeDown verdict flips comfortable→tight→unrealistic as date shortens; debt baseline freezes curve; 2-month goal drops 3mo/6mo anchors.
5. **Create wizard** + render.js wiring + goals-admin v1 (clock + nav). Verify by click: full category→type→inputs (context cards, one override)→feasibility (3 chips re-run verdict)→create.
6. **Sprints + timeline component.** Verify: current target ≈ 60% of even split; checkin shrinks future targets, keys unchanged.
7. **Tracker** + admin simulators. Verify: thermometer on-track at creation → ahead after checkin; sprint done → celebration fires once; +1 week → re-planned window; ≤3 upcoming shown.
8. **Cohort** + board. Verify: day-0 median; one action → ≥60th pctile; engaged week → #1; lapse → 55th, never bottom; 5 re-renders identical.
9. **Achievements + celebrations.** Verify: streak-2 fires once and stays dismissed; time-travel past 1mo on-pace → medal; "Front Runner" appears after first action.
10. **Vault** + claim-complete flow. Verify: completed goal → trophy with permanent title; zero remaining-work UI; active-goal medals appear.
11. **Tuning editor + handoff docs pass.** Verify: live `cohort.size` edit resizes board; `grep -rn "todayISO()" js/goals screens/goal-*.js` hits only `goalsTodayISO`.

## Risks / decisions

1. **Two clocks:** module sim-time vs host real-time, enforced by convention + grep. Rebuild should inject a clock.
2. **Stored payoffCurve** — deliberate, documented break from derive-everything.
3. **Cohort ethics — RESOLVED:** board is explicitly labeled simulated (see Cohort §5). No deception risk carries into the handoff.
4. **Sprint completion model — RESOLVED:** claim button. Auto-claim remains a documented one-line variant.
5. **Cohort replay cost:** O(days × 24 bots) per render, capped 730d — trivial here; rebuild should memoize.
6. **Supersession of old goals system** deliberately out of scope; future commit routes `nextAction → commitment` into goalCreate and renders V2 summaries in my-progress.js (~line 303). Old qualitative goals: keep as notes, don't migrate.
7. **Browser-back** onto tracker shows default goal unless the optional navigation.js snapshot tweak lands (low stakes, admin-entry only).

## Verification (end-to-end, after final commit)
Open index.html → admin jump → Goal Create → build a home-down-payment goal (watch context cards + feasibility chips) → tracker: check in, claim sprint, celebration → admin: +1 month → milestone medal → simulate engaged weeks → rank #1 → simulate lapse → 55th pctile → finish a short goal → Victory Vault shows trophy + permanent title. Confirm existing app screens (Budget, My Debts, My Progress) are pixel-identical — module is read-only toward host state.
