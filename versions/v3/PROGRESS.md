# v3 Build Progress

**Current state:** **Phase 0b complete.** Both builders + Goals V2 retired
(4,733 lines out; 61 JS files → 41). App boots clean in a DOM harness, all 29
screens render. `lifestyle-chain.js` was **kept** — it is not a builder (see
divergence). Next action: **Phase 0c, data.** — *updated 2026-08-07*

> **Read before touching anything:**
> 1. `plan.md` §0 — locked decisions **L1–L19**. Do not re-litigate them.
> 2. `versions/v3/docs/architecture.md` — cross-cutting contracts.
> 3. `plan.md` §13 — the session-start protocol.
>
> Spec lives at `v3 Files/spec/` (already unpacked, read-only).
> `docs/DECISIONS.md` beats every other spec doc; `plan.md` §0 beats that where
> they conflict.

**Conventions**
- Check items off as they land. Update `Current state:` every session.
- Where the implementation diverged, add a one-line `↳ note:` under the item.
- A screen is not done until its **5-point admin wiring** is complete
  (architecture §11). Half-wired screens are what a cold session misreads as
  finished.
- `node --check` every touched file — no browser here, it's the only gate.
- Commit + push at every phase boundary, with the PROGRESS.md update in the
  same commit.

---

## Phase 0a — Fork

- [x] v2 confirmed present (D37) — `versions/v2/`, 61 JS files. Stop and report if absent
- [x] `cp -R versions/v2/. versions/v3/` — **trailing dot**; `versions/v3/` already exists (holds `docs/`)
      ↳ verified: `diff -rq versions/v2 versions/v3` reports only the v3-extras. All 69 files byte-identical
- [x] `gate/gate.js` — add `{ id: "v3", label: "v3 (alpha)", path: "versions/v3/index.html" }` to `VERSIONS`
- [x] Root `CLAUDE.md` — update the version prose (it names v1/v2 explicitly and says to)
      ↳ done in the planning commit d958826, ahead of this phase
- [x] `versions/v3/CLAUDE.md` — new, auto-loads in this folder; carries architecture §12 standing rules
- [x] **Checkpoint:** gate → v3 opens and renders identically to v2, before anything is stripped
      ↳ verified structurally: 62/62 JS files parse, all 60 `<script src>` tags resolve, `versions/v3/index.html` present, v3 still byte-identical to v2. **Visual confirmation is the owner's** — no browser here
- [x] **Unplanned:** `scripts/check-syntax.sh` added — see divergence log

## Phase 0b — Strip

- [x] Retire 2 Minute Budget (L6): `bb_template.html`, `build_bb.py`, `js/wizard-bridge.js`, `screens/baby-budget.js`, the `bb-complete`/`bb-back` listener in `navigation.js`, `.baby-budget-mode` CSS
- [x] Retire Lifestyle Survey (L6): `screens/lifestyle-survey.js`, `js/lifestyle-survey-bridge.js`, `js/lifestyle-survey-content.js`, `explorer/` + `survey-explorer.html`
      ↳ **`screens/lifestyle-chain.js` NOT deleted** — see divergence below
- [x] Remove Goals V2 (L3): `js/goals/` (10 files), `screens/goal-create.js`, `goal-tracker.js`, `goal-vault.js`, `components/sprint-timeline.js`, `state.goalsV2`, goals admin routing
- [x] **Keep** `js/budget-baseline.js` — the `submitBudgetBaseline()` seam survives; the new wizard becomes its only adapter
      ↳ `BUDGET_BUILDER_LABELS` emptied — both source ids were dead. Phase 2 adds the wizard's
- [x] Marketplace → visibly greyed out, inert (D33). `marketplaceDetail` stays admin-only (L14)
      ↳ the *tab* is disabled (`.tab-disabled`), not the screen — admin jump still reaches it
- [~] The ~18 unmentioned v2 screens (L14): left in place and in `destinations[]`, but removed from tab and daily-task routing
      ↳ **partially deferred.** Kept and reachable, but the Budget hub still links several of them. Removing those links now would break the app before Phase 2 builds the replacement — lands in 0e (nav) and 2 (budget)
- [x] **Rewire `screens/about-me.js`** — `goGoalsEntry()` now routes to the surviving simple `goals` editor until Phase 5 builds the v3 goals model
- [x] **Collapse `screens/budget-setup.js`** — two-card picker → one "Build my budget" CTA calling `startBudgetBuilder()`, which Phase 2 repoints at the wizard
      ↳ the plan named only `renderBudgetChoice()`; the sweep found **3 more live `launchBabyBudget()` handlers and a `startLifestyleSurvey()` link**
- [x] Prune `index.html` `<script>` tags and `render.js` switches for everything removed
- [x] Sweep the reference maps: Goals V2 is touched by 6 files outside `js/goals/`; the builders by 11 outside their own
- [x] **Checkpoint:** app opens, no console errors, admin jump list still reaches every surviving screen
      ↳ verified: 41/41 JS parse · 41/41 script tags resolve · every `renderScreen()` target defined · every `destinations[]` and jump-list screen routes · **DOM-stubbed boot harness loaded all 41 scripts and rendered all 29 screens with 0 throws** (harness deleted, not committed)

## Phase 0c — Data (L13)

- [ ] Copy `v3 Files/spec/data/*.json` → `versions/v3/data/` (7 files, verbatim, never hand-edited)
- [ ] `scripts/wrap-data.sh` — regenerates `.js` wrappers from `.json`
- [ ] Generate `data/*.js` → globals `PERSONA` · `SEED_STATE` · `JOURNAL_QUESTIONS` · `PEER_BENCHMARKS` · `DAILY_SCRIPTS` · `BUDDY_RESPONSES` · `LESSONS_V3`
- [ ] `<script>` tags in `index.html`, data block loading **before** everything that reads it
- [ ] `js/config.js` — `SKIP_ONBOARDING`, loaded first
- [ ] `boot()` maps data → state per architecture §2
- [ ] **Verify: no `fetch`/XHR anywhere.** `file://` blocks them and there is no dev server (architecture §1)

## Phase 0d — Taxonomy (do before Phase 1)

- [ ] `CATEGORIES` const — 12, ordered, keys used **verbatim** including `"Dining out"`. No slugifying
- [ ] Rewrite `state.budget` to the flat 12; v2's 5×3 nested buckets removed. **No Savings category** — saving is a goal
- [ ] Port `budget.js`, `budget-category.js`, `budget-utils.js` to the flat 12
- [ ] Benchmark model per architecture §5. **The spec's one-liner is wrong in all three terms** — do not implement from it:
      - [ ] `base[cat][band]` is a **4-element array indexed by `householdSize − 1`** (hh2 → index 1; `4+` clamps to index 3)
      - [ ] Cost of living is **two steps**: `zipPrefixes[zip3]` → tier *name* → `tiers[name][cat]`
      - [ ] Lifestyle is a **product across 6 dimensions** (only Dining out and Groceries ever get more than one)
- [ ] Answer-key traps: `paysRent` keys are the **strings** `"true"`/`"false"`, not booleans; `commute` key for "mostly walk" is **`none`**. A missed key silently contributes 1.0
- [ ] `incomeBand` from annual income: b1 ≤35k · b2 35–60k · b3 60–90k · b4 90–140k · b5 140k+
- [ ] Unlisted ZIP prefix → `moderate` fallback, never a failure
- [ ] **Self-test passes:** Dining out, b3, household 2, ZIP 900, foodie moderate + cooks sometimes → 275 × 1.34 × 1.0 = **370**
- [ ] All category iteration driven from `CATEGORIES`, never `Object.keys(data)` — `_note` keys are present in 4 objects

## Phase 0e — Shell

- [ ] Shared top bar component (**new** — v2 has none; every screen renders its own header today)
- [ ] Top bar content: kibble · streak · buddy level · hamburger (right)
- [ ] Top-left contextual slot: home icon at stack root · back when deeper · hidden on full-bleed · nothing on Home
- [ ] Bottom nav → **5 tabs**, D34 order: Goals · Budget · My Progress · Education · Marketplace
- [ ] `state.nav` with per-stack model; `go()` / `taskGo()` / `back()` per architecture §7
- [ ] `history.pushState` / `popstate` kept in sync so browser back still works
- [ ] Admin "Jump to screen" **resets** the target stack to `[screen]`
- [ ] Replace the triplicated 78px offset with `--nav-h` / `--topbar-h` custom properties
- [ ] Audit every full-bleed mode class — must zero *both* top and bottom
- [ ] `SKIP_ONBOARDING` seam: `false` → onboarding → 1-day streak · `true` → home → 6-day streak. Flipping it touches nothing else

---

## Phase 1 — Money Journal (deepest build, D05)

- [ ] Journal entry screen, structured question sequence
- [ ] Question types: `multi_select`, `fill_number`, `single_select`. **No dropdown** — the prose says it, the data has none
- [ ] Selection: 4 by priority from the 6 scoreable questions, skipping cooldown
- [ ] `q_free_text` always last, **outside** the count of 4 — accepts input, silently discarded, never on the confirmation screen, never acknowledged (D12)
- [ ] Attachment affordances (image · camera · voice) present and tappable, nothing processed
- [ ] `q_breakfast_habit` fires on `triggeredBy: pattern_detected`, not by score. `setsRecurring` is **tri-state** (`true` / `"weekdays"` / `false`)
- [ ] `q_watched` is `signalOnly` — engagement signal, no financial entry
- [ ] Task deep-link **bypasses cooldown** (Hulu task → `q_watched`, which has a 2-day cooldown) (L12)
- [ ] `q_balance` emits a goal-progress event — consumed in Phase 5, but emitted now
- [ ] `q_balance` pre-fills from `PERSONA.connectedAccounts.selfReportedBalance` (1840) — otherwise that seed data has no consumer
- [ ] Confirmation screen: category · estimate from persona · adjustment slider
- [ ] Cash-flow only: ate-at-home entries are **$0** with an "already in your groceries" note (D15)
- [ ] Submit → entries written to session state
- [ ] **Submitted entries add to month-to-date; observations recompute** (L17)
- [ ] Observation copy is **templated, not static** — seeded strings have baked figures that go stale on first entry
- [ ] Visible entry point for an additional same-day entry (D13)

## Phase 2 — Budget and benchmarks

- [ ] Lifestyle wizard, 6 questions → `foodie` · `cooksAtHome` · `hobbySpend` · `paysRent` · `commute` · `travelFrequency`
- [ ] Wizard writes through `submitBudgetBaseline()` (the kept seam), gated by the old→new confirm screen
- [ ] Wizard output produces a starting budget across all 12 categories
- [ ] Budget screen with category sliders
- [ ] Three-layer comparison: plan (`budget.monthly`) · journal (`monthToDateActuals`) · peer
- [ ] **Two gaps labelled distinctly** — 34% over plan (429 vs 320) and 16% over peers (429 vs 370). Neither substitutes for the other
- [ ] Observation #1 reframed to the plan comparison, with a separate peer card (L11)
- [ ] Inline observation cards on categories with a gap worth noticing
- [ ] All four seeded observations visible

## Phase 2.5 — Repaint (D36, L19)

Scheduled here deliberately: the taxonomy and budget screens have settled, so
L2's churn concern is spent — and Phases 3–4 author the most visual surfaces
(buddy stage, login scene, daily update), which should be built in the final
palette rather than converted.

- [ ] `css/variables.css` — app-surface tokens to the design-system palette:
      `--cream #FBF7F0` · `--sage #A8C4A2` · `--sky #9BBFD4` · `--apricot #E8B48A`
      · `--clay #C98B7E` · `--ink #3D3A36` · `--ink-soft #7A736B`
- [ ] **No pure black, no pure white, no red.** A flagged bill uses clay, not danger colouring — nothing here is an emergency
- [ ] Dark-mode scope: invent equivalents (the spec specifies none, but v2 ships dark mode and D37 says carry it forward)
- [ ] Phone bezel and admin panel keep their own neutral tokens — dev chrome stays visually separate from the product under test
- [ ] Admin error log keeps a real red; "no red" governs app surfaces, not tooling
- [ ] Radius: 16px cards · 24px primary buttons · full round on pills and the buddy stage
- [ ] Shadows `0 4px 24px rgba(61,58,54,0.06)`. No hard edges
- [ ] Type: rounded geometric display (Nunito/Quicksand feel) + legible body. Numbers one weight heavier than their label and always larger
- [ ] Motion: ease-out 240ms throughout
- [ ] Verify both light and dark still work on every screen built so far

## Phase 3 — Daily loop

### Onboarding (8 steps, D06)
- [ ] Name · ZIP · household size · income band (5 ranges, never a precise figure) · lifestyle wizard · strategic goal (4 + custom) · buddy creation · trial popup
- [ ] Only ZIP, household size, income override the persona (D09). A skipped field keeps the persona value — never block progress
- [ ] Buddy creation: **all five attributes** — breed, fur, eyes, nose, size (L18). Selections write to `state.buddy` and visibly change the placeholder description
- [ ] Trial popup fires immediately after buddy creation. Accept or decline → identical experience afterward (D32)
- [ ] Lands on home with a 1-day streak and the tester's own ZIP reflected in peer numbers

### Login and home
- [ ] Login scene, day or night by local time, described placeholder (L15). Animated greeting
- [ ] Daily update prompt: yes / no + "remember my choice". If checked on first use, say once it's changeable; never mention again
- [ ] Home top bar (kibble · streak · buddy level · hamburger)
- [ ] Tip banner — **hard 90-character limit**, puppy icon alongside
- [ ] Buddy stage: labelled placeholder frame describing breed · fur · eyes · nose · size · current pose (L15)
- [ ] Idle pose cycle across poses 1, 3, 4, 5 on a 4–6s cadence. Poses 2 and 6 event-driven (chat open, reward). **Stops under `prefers-reduced-motion`**
- [ ] Four daily tasks, each routing somewhere real and paying kibble
- [ ] Route map: `money_journal` · `subscription_confirm` → journal @ `q_watched` · `budget` → `aboutMe` · `lesson:<id>`
- [ ] Hulu task enters the journal **visibly differently** (pre-focused) or it reads as a duplicate of the journal task
- [ ] Chat with Buddy — keep v2's `chat-router.js` matcher, swap in `BUDDY_RESPONSES`
- [ ] Opening bubbles + `followUp` chains; bubbles are the primary input path
- [ ] Two responses have `bubble: null` — treat as keyword-only, no bubble
- [ ] Hamburger → half-screen overlay
- [ ] Streak registers after a completed entry, at the end of the share flow

### Assets — no generation (L15)
- [ ] Buddy, login backgrounds (day/night), kibble bowl all ship as described placeholders
- [ ] **Do not** build `background-position` sprite cropping — there are no sheets. D39/D40 are void under L15

## Phase 4 — Daily update and share

- [ ] `scripts/gen-audio.sh` — `say` → `afconvert` → `afinfo`, **one file per segment**
- [ ] Generate audio for all 3 variants
- [ ] Extract durations, write timings back into `daily-scripts.json`
- [ ] Playback: `<audio>` element is the clock. **Static timings are primary** — boundary events don't fire for recorded audio (L10)
- [ ] Segment text and timings never share an object; timings keyed by segment id
- [ ] Visual cues reference **segment ids, never timestamps**
- [ ] Missing timing → estimate from word count at **165 wpm**
- [ ] 8 cue types. Check reuse first: `goal_ring` → `badge-ring.js`, `streak_flame` → `streak-counter.js`, `bar_compare` → `thermometer.js`
      ↳ note: `number_reveal` is declared but unused by all 3 shipped scripts. Build it; don't hunt for its trigger
- [ ] Scripts stay generalized; **visuals carry the numbers** (D30)
- [ ] All 3 engagement variants selectable
- [ ] Completion summary — observations stacked, plain language
- [ ] Share sheet: copy link + inert platform buttons. **Anonymization on by default**
- [ ] Anonymization preview — expandable, shows exactly what would post, every figure anonymized. This is the trust mechanic; build it properly (A11)
- [ ] Done → streak registers → home

## Phase 5 — Goals, Progress, Education

### Goals — v3 model (L3, rebuilt not ported)
- [ ] `state.goals`: one strategic + several tactical
- [ ] **Two goal types with inverted math**: savings accumulates toward a target (>100% good); spend-limit is a monthly ceiling (>100% bad). Seed uses `behind` vs `over`
- [ ] Pace display — ahead / on track / behind. Pace over raw figures
- [ ] Contextual suggestions after a meaningful action: 1–3, scoped to what's on screen, "create your own" always last
- [ ] Becomes "update your goals" once enough goals are in flight
- [ ] Event-based updates consuming the `q_balance` event — never ask for a number directly
- [ ] Seeded emergency fund reads as behind but recoverable (D17)

### My Progress — 6 sections in A3 order
- [ ] Spend trend chart, hand-rolled SVG (no recharts under L1) + month-to-date summary above
- [ ] Three-layer comparison, framed for review not editing
- [ ] Bills calendar — car insurance $187, due in 4 days, flagged as unbudgeted
- [ ] Subscription usage flags — Hulu, 3 weeks unmentioned, $18.99. Framed as a question, never "cancel Hulu"
- [ ] Badge and buddy level
- [ ] Kibble balance (display-only, L16)

### Education
- [ ] v2 lesson player inherited unchanged — **do not rebuild** (D38)
- [ ] `state.lpStageStyle` default → `"clean"`; waveform stays as the non-default admin option (L10)
- [ ] Pre-lesson framing decision tree, 3–5 questions. "I don't know" is a first-class answer with its own branch
- [ ] Answer-tag collection + script variant matching (highest tag overlap, tie → first listed, zero → fallback)
- [ ] **The key is `tag`, singular — not `tags`.** Reading `.tags` yields an empty set and plays the fallback every time, silently
- [ ] **`next` resolves at two levels**: option-level → question-level → terminal. Every lesson's `f3` is terminal with no `next` anywhere
- [ ] Unmatched tags (`unsure_apr`, `unknown_*`, `f3` confidence tags) route to the fallback **by design** — do not add variants to cover them
- [ ] `nocard` is in `apr_v5.matchTags` but never emitted; `apr_v5` is reachable via `no_debt`. Leave it
- [ ] **Author all 15 script variant bodies** (L8) — none ship in `lessons.json`
- [ ] Reuse v2's `interest-builds` narration as one APR variant
- [ ] Generate audio for the remaining variants
- [ ] Badge model: `lessons.json` 5 tiers + 500 XP/tier, kept admin-tunable via v2's `xpConfig` panel (L9)
- [ ] Quiz — `lessons.json` ships 1 question per lesson; draw from v2's 48-question pool to reach `quizQuestionsRequired`
- [ ] One simulation per lesson: `balance_calculator` · `savings_pace_calculator` · `subscription_tally`. Sandbox only, never the user's real figures
- [ ] Reward screen: XP, badge progression, kibble
- [ ] Return routing: came from home → home; came from Education → Education

## Phase 6 — Pass

Verified by clicking through, not by inspection.

- [ ] Every seeded observation reachable from ≥2 screens — via the registry (architecture §6), not by hunting
- [ ] **No screen renders empty in any state** (D19)
- [ ] Mobile viewport verified at 390px
- [ ] `prefers-reduced-motion` respected — idle stops, transitions instant, daily update plays as timed static frames
- [ ] Keyboard focus visible throughout
- [ ] Tap targets ≥44px
- [ ] **Copy sweep: no financial advice anywhere** (D26) — buddy replies, observations, lesson scripts, empty states
- [ ] No exclamation marks in financial observations (A13)
- [ ] Vocabulary consistent: Buddy · Money Journal · Kibble · Streak · Peers · Observation. Never "expense tracker", never "average users"
- [ ] 5-point admin wiring complete for every screen (architecture §11)
- [ ] `node --check` clean across all JS

---

## Divergence log

One line per item that landed differently than specified, with the why.

**0b — `lifestyle-chain.js` is not a budget builder; it was kept.** The 0b item
listed it under "Retire Lifestyle Survey (L6)". Reading it first showed that is
wrong: its entry point is `lifestyle.js → startLifestyleChain(themeKey)`, it
writes to `state.lifestyleSubSliders`, and it never touches
`submitBudgetBaseline()`. It is the lifestyle *theme-refinement* flow — a
separate v2 feature, so **L14 keeps it**, not L6 deletes it. `plan.md` §6 hedged
with "likely `screens/lifestyle-chain.js`"; the hedge was right to be there and
the answer is no. Retired total is therefore 4,733 lines, not the ~2,400 the plan
estimated — the Goals V2 module was bigger than the builders.

**0b — the strip had more live call sites than the plan found.** `budget-setup.js`
held three further `launchBabyBudget()` onclick handlers and a
`startLifestyleSurvey()` rebuild link beyond the `renderBudgetChoice()` picker
the plan named. All four would have thrown at runtime. Found by sweeping for
dangling references *after* deleting, not by reading the plan.

**0a — `node` does not exist on this machine.** Both `CLAUDE.md` files instructed
`node --check` as "the only automated gate," but there is no node on PATH, no
`~/.nvm`, and no homebrew install. Added `scripts/check-syntax.sh` using macOS's
built-in JavaScriptCore (`jsc checkSyntax`), validated against a positive *and* a
negative control before being trusted. Both `CLAUDE.md` files updated, including
the Testing section's `vm.runInContext` note, which is also node-specific.
*Why it matters:* a broken verification instruction in an auto-loading file would
have cost every future session the same rediscovery.
