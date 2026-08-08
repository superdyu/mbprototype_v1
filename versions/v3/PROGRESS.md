# v3 Build Progress

**Current state:** **Phase 2a COMPLETE** (Phase 2 was split — it is XL).
2a = the builder path: 6-question lifestyle wizard → peer-model starting budget
→ seam → confirm gate → 12-slider Budget tab. v2's about-me / budget-setup /
budget-category / budget.js retired. 40 assertions pass.
**Next action: Phase 2b** — three-layer comparison (plan · journal · peer), the
two gaps labelled distinctly, and porting `my-progress` off v2's `state.budget`.
— *updated 2026-08-07*

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

- [x] Copy `v3 Files/spec/data/*.json` → `versions/v3/data/` (7 files, verbatim, never hand-edited)
      ↳ `diff -rq` against the spec: byte-identical
- [x] `scripts/wrap-data.sh` — regenerates `.js` wrappers from `.json`
      ↳ deterministic: re-running changes nothing. Each wrapper's embedded JSON verified byte-identical to its `.json`
- [x] Generate `data/*.js` → globals `PERSONA` · `SEED_STATE` · `JOURNAL_QUESTIONS` · `PEER_BENCHMARKS` · `DAILY_SCRIPTS` · `BUDDY_RESPONSES` · `LESSONS_V3`
- [x] `<script>` tags in `index.html`, data block loading **before** everything that reads it
      ↳ 41 → 50 tags, all resolve. Load sections renumbered 1–6
- [x] `js/config.js` — `SKIP_ONBOARDING`, loaded first
      ↳ flip verified: `false` → streak 1, `true` → streak 6, nothing else changes
- [x] `boot()` maps data → state per architecture §2
      ↳ `bootV3()` in `js/boot.js`, called from `navigation.js` before the first render. `resetUserData()` re-seeds through it so reset returns to the seeded state, not an empty one
      ↳ **3 slots deliberately deferred** — see divergence
- [x] **Verify: no `fetch`/XHR anywhere.** `file://` blocks them and there is no dev server (architecture §1)
      ↳ clean — the only `fetch` matches are comments explaining why it can't be used

## Phase 0d — Taxonomy (do before Phase 1)

- [x] `CATEGORIES` const — 12, ordered, keys used **verbatim** including `"Dining out"`. No slugifying
      ↳ `js/taxonomy.js`, with `catTotal` / `catValue` / `catRows` / `isCategory` so nobody has to remember the `_note` trap
- [x] Seed the flat-12 plan layer. **No Savings category** — saving is a goal
      ↳ **as `state.plan`, not `state.budget`** — see divergence. Total 4060 = spec `totalMonthly`
- [~] Port `budget.js`, `budget-category.js`, `budget-utils.js` to the flat 12
      ↳ **deferred to Phase 2**, which owns the budget screens. See divergence
- [x] Benchmark model per architecture §5. **The spec's one-liner is wrong in all three terms** — do not implement from it:
      - [x] `base[cat][band]` is a **4-element array indexed by `householdSize − 1`** (hh2 → index 1; `4+` clamps to index 3)
      - [x] Cost of living is **two steps**: `zipPrefixes[zip3]` → tier *name* → `tiers[name][cat]`
      - [x] Lifestyle is a **product across 6 dimensions** (only Dining out and Groceries ever get more than one)
- [x] Answer-key traps: `paysRent` keys are the **strings** `"true"`/`"false"`, not booleans; `commute` key for "mostly walk" is **`none`**. A missed key silently contributes 1.0
      ↳ `benchLifestyleKey()` normalises both, plus `yes`/`no` and `walk`
- [x] `incomeBand` from annual income: b1 ≤35k · b2 35–60k · b3 60–90k · b4 90–140k · b5 140k+
- [x] Unlisted ZIP prefix → `moderate` fallback, never a failure
      ↳ also guards the `_note` key inside `zipPrefixes`, and null/empty ZIPs
- [x] **Self-test passes:** Dining out, b3, household 2, ZIP 900, foodie moderate + cooks sometimes → 275 × 1.34 × 1.0 = **370**
      ↳ `benchSelfTest()`. But see its own caveat: the persona is hh2 with all modifiers at 1.0, so several WRONG readings also yield 370. The harness asserts the *shape* separately
- [x] All category iteration driven from `CATEGORIES`, never `Object.keys(data)` — `_note` keys are present in 4 objects

## Phase 0e — Shell

- [x] Shared top bar component (**new** — v2 has none; every screen renders its own header today)
      ↳ `components/topbar.js` + `#topbarRoot`. Home icon is inline SVG — no icon library under L1
- [x] Top bar content: kibble · streak · buddy level · hamburger (right)
      ↳ hamburger opens a half-screen overlay; its *contents* are Phase 3's job
- [x] Top-left contextual slot: home icon at stack root · back when deeper · hidden on full-bleed · nothing on Home
      ↳ **10 per-screen back buttons removed.** They were hardcoded `go('X')` forward-jumps dressed as back, which is wrong once a screen can be reached from two places
- [x] Bottom nav → **5 tabs**, D34 order: Goals · Budget · My Progress · Education · Marketplace
      ↳ labels `Goals | Budget | Progress | Learn | Market`; Market inert (D33). `goals` gets its own stack — it lived under Budget in v2
- [x] `state.nav` with per-stack model; `go()` / `taskGo()` / `navBack()` per architecture §7
      ↳ `go()` pushes · `navGoTab()` switches without pushing · `navBack()` pops · `taskGo()` switches to the home stack first
- [x] `history.pushState` / `popstate` kept in sync so browser back still works
      ↳ `getNavSnapshot()` now carries a deep copy of `state.nav`
- [x] Admin "Jump to screen" **resets** the target stack to `[screen]`
- [x] Replace the triplicated 78px offset with `--nav-h` / `--topbar-h` custom properties
      ↳ zero hardcoded offsets remain outside `variables.css`; `render()` toggles `.no-nav` / `.no-topbar` instead of setting inline px
- [x] Audit every full-bleed mode class — must zero *both* top and bottom
- [x] `SKIP_ONBOARDING` seam: `false` → onboarding → 1-day streak · `true` → home → 6-day streak. Flipping it touches nothing else
      ↳ `v3EntryScreen()`. Both paths land on home until Phase 3 builds the onboarding screen; the branch is wired now so it is not retrofitted

---

## Phase 1 — Money Journal (deepest build, D05)

- [x] Journal entry screen, structured question sequence
      ↳ `screens/journal-entry.js`, full-bleed one-question-at-a-time with a progress rail
- [x] Question types: `multi_select`, `fill_number`, `single_select`. **No dropdown** — the prose says it, the data has none
      ↳ **correction to plan.md §9.6:** there is no dropdown *type*, but `q_anything_big` carries `categoryDropdown: true` — a category picker paired with the number input. That is what the prose meant. Implemented
- [x] Selection: 4 by priority from the 6 scoreable questions, skipping cooldown
      ↳ triggered questions join the pool when their pattern fires and then compete on priority; `q_breakfast_habit` (p70) outranks `q_getting_around` (p65)
- [x] `q_free_text` always last, **outside** the count of 4 — accepts input, silently discarded, never on the confirmation screen, never acknowledged (D12)
      ↳ asserted: the text appears nowhere in `state` after submit
- [x] Attachment affordances (image · camera · voice) present and tappable, nothing processed
- [x] `q_breakfast_habit` fires on `triggeredBy: pattern_detected`, not by score. `setsRecurring` is **tri-state** (`true` / `"weekdays"` / `false`)
      ↳ coffee appears on all 6 seeded days, so the pattern genuinely fires. Tri-state asserted not coerced
- [x] `q_watched` is `signalOnly` — engagement signal, no financial entry
      ↳ mentioning Hulu flips its `status` to `active_used` and clears the flag
- [x] Task deep-link **bypasses cooldown** (Hulu task → `q_watched`, which has a 2-day cooldown) (L12)
      ↳ `navRouteTask()` in navigation.js; the question is also pinned first so the task's intent reads
- [x] `q_balance` emits a goal-progress event — consumed in Phase 5, but emitted now
      ↳ a balance is not spending: asserted it does **not** move month-to-date
- [x] `q_balance` pre-fills from `PERSONA.connectedAccounts.selfReportedBalance` (1840)
- [x] Confirmation screen: category · estimate from persona · adjustment slider
- [x] Cash-flow only: ate-at-home entries are **$0** with an "already in your groceries" note (D15)
- [x] Submit → entries written to session state
- [x] **Submitted entries add to month-to-date; observations recompute** (L17)
      ↳ end-to-end: 429 → 470, gap 34% → 47%, and the sentence followed the number
- [x] Observation copy is **templated, not static** — seeded strings have baked figures that go stale on first entry
      ↳ `js/observations.js` — the registry (`observationsFor`) plus computed copy
- [x] Visible entry point for an additional same-day entry (D13)
      ↳ and it asks a genuinely different set, because submitting set cooldowns

## Phase 2a — Budget builder

- [x] Lifestyle wizard, 6 questions → `foodie` · `cooksAtHome` · `hobbySpend` · `paysRent` · `commute` · `travelFrequency`
      ↳ options store the DATA key, not the label — `paysRent` is `"true"`/`"false"`, "Mostly walk" is `none`
- [x] Wizard writes through `submitBudgetBaseline()` (the kept seam), gated by the old→new confirm screen
      ↳ seam **ported to the flat 12**: v2's HOUSING_SPLIT/BILLS_SPLIT conversion is gone, a baseline now carries one figure per category
- [x] Wizard output produces a starting budget across all 12 categories
      ↳ the starting budget **is** the peer model run on their own answers — which is why no question asks for a figure
- [x] Budget screen with category sliders
      ↳ `screens/budget-v3.js` is the Budget tab. v2's `about-me` / `budget-setup` / `budget-category` / `budget.js` retired
- [x] Retire the v2 budget screens (deferred here from 0d)
      ↳ `budget-utils.js` survives — `budgetFmt` is used in 15 files. `state.budget` stays vestigial for `my-progress` until 2b

## Phase 2b — Three-layer comparison

- [ ] Three-layer comparison: plan (`state.plan`) · journal (`state.mtd`) · peer (`benchAllPeerValues`)
- [ ] **Two gaps labelled distinctly** — over plan and over peers. Neither substitutes for the other
- [ ] Observation #1 reframed to the plan comparison, with a separate peer card (L11)
      ↳ `observationPeerCounterpart()` already exists and is asserted; 2b surfaces it
- [ ] Inline observation cards on categories with a gap worth noticing
- [ ] All four seeded observations visible
- [ ] Port `my-progress` off v2's `state.budget`, then delete the vestigial model

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

**0d — the flat 12 landed as `state.plan`, not by rewriting `state.budget`.**
The item said "rewrite `state.budget` to the flat 12; v2's 5×3 nested buckets
removed". Surveying first showed that is a Phase 2 job, not an 0d job: v2's
nested model has consumers in **11 v3 files**, with `lifestyle-chain.js` and
`budget-category.js` referencing it 17 times each. Replacing the shape under
them would break screens Phase 2 is going to delete anyway.

Nothing downstream needs v2's budget gone. Phase 1's journal writes against
`CATEGORIES` + `state.plan` + `state.mtd`, none of which touch it. So the two
models coexist deliberately and briefly:

| model | backs | retired |
|---|---|---|
| `state.plan` (12 flat) | v3 — journal, comparison, benchmarks | — it is the survivor |
| `state.budget` (5×3 nested) | v2's budget screens, `lifestyle-chain` | **Phase 2**, with those screens |

Porting `budget.js` / `budget-category.js` / `budget-utils.js` moves to Phase 2
for the same reason. **0d's real deliverable was the benchmark engine**, which is
complete and asserted.

**0c — three state slots were deliberately not seeded.** architecture §2 maps
`state.budget`, `state.tasks` and `state.goals` from the data, but all three
names are already owned by live v2 code: v2's 5-bucket budget model, v2's task
cards (`title`/`description`/`cta`), and v2's simple goals array. Overwriting
them in 0c would break `home.js` and the budget screens before their
replacements exist — and "never leave a session with a broken app" is the rule.

The v3-shaped data is loaded now under non-colliding names so it is available
and inspectable; the phase that rewires the consumer also swaps the slot:

| v3 data | parked as | consumer rewired in |
|---|---|---|
| `SEED_STATE.budget.monthly` | *(not loaded)* | **0d** — taxonomy rewrite owns it |
| `SEED_STATE.dailyTasks.today` | `state.dailyTasks` | **3** — home screen |
| `PERSONA.goals` | `state.strategicGoal` + `state.tacticalGoals` | **5** — v3 goals model |

All 14 other slots were verified free of collisions before writing.

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
