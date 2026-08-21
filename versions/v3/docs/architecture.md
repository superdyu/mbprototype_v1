# v3 Architecture — cross-cutting contracts

**Status: draft for review. Nothing has been built yet.**

This file covers only what *many* screens depend on — the contracts that are
expensive to change once code exists. Per-screen layout, copy, and interaction
detail live in per-phase docs written just before that phase is built.

Read alongside:
- `plan.md` §0 — the twenty-one locked decisions (L1–L21). Authoritative.
- `v3 Files/spec/docs/DECISIONS.md` — D01–D40. Beats every other spec doc.
- `v3 Files/spec/docs/ASSUMPTIONS.md` — A1–A13. A1 is overridden by L1.

---

## 1. The runtime constraint — read this first

v3 is vanilla JS with no build step (L1), and the app is opened as a **`file://`
page**: the gate navigates directly to `versions/v3/index.html`.

**Consequence: `fetch()` and `XMLHttpRequest` cannot read local files.** Chrome
and Firefox both treat `file://` as an opaque origin and block them. There is no
dev server to fall back on — the spec assumed Vite (A1), and we overrode that.

v2 never hit this because it has **zero runtime data loading** — all data is
inline in `js/state.js` (verified: no `fetch`, no XHR, no `.json` anywhere in
v2). v3 ships seven JSON files, so this is new and it has to be solved once, up
front.

### The contract: data ships as script-wrapped JSON

Each spec JSON gets a sibling `.js` that assigns it to a global, loaded by a
plain `<script>` tag like everything else:

```js
// versions/v3/data/peer-benchmarks.js
// GENERATED from peer-benchmarks.json — do not hand-edit. See scripts/wrap-data.sh
const PEER_BENCHMARKS =
{ ...exact JSON, byte-for-byte... }
;
```

Both files are kept:

| File | Role |
|---|---|
| `data/*.json` | Verbatim copy of the spec. **Never edited.** Diffable against `v3 Files/spec/data/`. |
| `data/zip-cost-of-living.json` | The one exception — authored here, with no spec twin to diff against. Derived from public datasets; the derivation is recorded in its own `method._note`. |
| `data/*.js` | Generated wrapper. What the app actually loads. |

`scripts/wrap-data.sh` regenerates the `.js` from the `.json`. It is run by hand
when data changes — that's not a build step in the npm sense, and nothing about
opening `index.html` depends on it having been run recently.

<!-- Why keep both rather than only the .js: the .json stays byte-identical to
     the spec, so "did we drift from the spec's numbers?" is one diff away.
     Collapsing to .js only saves seven files and loses that check. -->

**Globals** (load order: data before everything that reads it):

| Global | Source |
|---|---|
| `PERSONA` | `persona.json` |
| `SEED_STATE` | `seed-state.json` |
| `JOURNAL_QUESTIONS` | `journal-questions.json` |
| `PEER_BENCHMARKS` | `peer-benchmarks.json` |
| `DAILY_SCRIPTS` | `daily-scripts.json` |
| `BUDDY_RESPONSES` | `buddy-responses.json` |
| `LESSONS_V3` | `lessons.json` |
| `ZIP_COST_OF_LIVING` | `zip-cost-of-living.json` — **authored here, not a spec copy** |

<!-- LESSONS_V3, not LESSONS — v2's state.lessons still exists and holds the
     48-question quiz pool we're keeping (L9). Two different things; distinct
     names, per the repo's "everything is global, keep names unique" rule. -->

### Repo integration — three edits outside `versions/v3/`

Easy to forget because they're not in the folder being built:

1. **`gate/gate.js`** — add `{ id: "v3", label: "v3 (alpha)", path: "versions/v3/index.html" }`
   to the `VERSIONS` array. Currently v1 and v2 only. Without this v3 is
   unreachable from the gate.
2. **Root `CLAUDE.md`** — it names specific folders ("currently `versions/v1/`
   and `versions/v2/`", "newest version folder (currently `versions/v2/`)") and
   instructs that this prose be updated when a version is added. Goes stale
   otherwise, and it is the file every session loads first.
3. **`versions/v3/CLAUDE.md`** — new, auto-loads when working in v3. Carries the
   v3-specific hard rules (§12) so they bind without depending on anyone having
   read this file.

---

## 2. Data → state

`state` remains the single source of truth and is still rebuilt by `render()`
after every mutation. The seven globals are **read-only source data**; they are
never mutated. Boot copies what it needs into `state`.

```
boot()
  ├─ state.profile     ← PERSONA.identity, overridden by onboarding (D09)
  ├─ state.budget      ← SEED_STATE.budget.monthly          (plan layer)
  ├─ state.journal     ← SEED_STATE.journalHistory          (journal layer)
  ├─ state.mtd         ← SEED_STATE.monthToDateActuals      (fabricated depth, D19)
  ├─ state.goals       ← PERSONA.goals                      (strategic + tactical)
  ├─ state.bills       ← PERSONA.bills.upcoming
  ├─ state.subs        ← PERSONA.subscriptions.known
  ├─ state.observations← SEED_STATE.observations.seeded     (see §6)
  ├─ state.tasks       ← SEED_STATE.dailyTasks.today
  └─ state.kibble/streak/buddyLevel ← PERSONA.state
```

**Only ZIP, household size, and income are overridable by onboarding** (D09).
Everything else falls back to the persona. A skipped field keeps the persona
value — never block progress to collect data.

**In-memory only** (D03). No localStorage, no backend. v2's refresh-returns-to-
gate behavior carries forward unchanged.

---

## 3. Time model

The persona is **six days in**. Journal history runs `day: 1` (labelled "6 days
ago") through `day: 6` (yesterday). The entry a tester makes is about
*yesterday* — journal questions are previous-day recall (D11).

```
day 1 ... day 6   = seeded history (SEED_STATE.journalHistory)
today             = the tester's session; their entry covers yesterday
```

- `SKIP_ONBOARDING = false` → onboarding runs → streak shows **1** (`streakDaysIfOnboarded`)
- `SKIP_ONBOARDING = true`  → straight to home → streak shows **6** (`streakDays`)

Bills are **relative**: `dueInDays: 4` for the car insurance. Resolve against
real today at render time so "due in four days" stays true whenever it's opened.

<!-- v2's goals module had a simulated clock (clockOffsetDays) driving
     goalsTodayISO(). That module is not carried to v3 (L3). If admin time
     travel is wanted later, add ONE offset helper here and route all date math
     through it from the start — retrofitting it is what made v2 need a grep
     gate against todayISO(). -->

`SKIP_ONBOARDING` lives in `js/config.js`, loaded first. Flipping it must not
require touching anything else (01-onboarding is explicit: "if you find yourself
unwinding logic to make skip work, the wiring is wrong").

---

## 4. The 12-category taxonomy

The single most load-bearing contract in the build. Frozen, ordered, and the
join key across four independent data surfaces.

```js
const CATEGORIES = ["Housing", "Groceries", "Dining out", "Transport",
  "Utilities", "Subscriptions", "Health", "Personal care", "Entertainment",
  "Shopping", "Debt payments", "Other"];
```

Joins: `PEER_BENCHMARKS.base[cat]` · `SEED_STATE.budget.monthly[cat]` ·
`SEED_STATE.monthToDateActuals[cat]` · `JOURNAL_QUESTIONS[].options[].category`.

**There is no Savings category.** Saving is a goal, not a budget line. v2's
`savings` bucket does not survive the port.

v2's 5×3 nested model is replaced entirely, not remapped — it folds Utilities
under Housing and has no Health / Personal care / Other. Category strings are
used as object keys verbatim, including the space and lowercase in `"Dining
out"`. Do not slugify; the data files key on the display string.

<!-- Do this in Phase 0, before the journal writes entries against it. Every
     later phase reads this shape. -->

---

## 5. Three layers, never blurred

| Layer | Source | UI label |
|---|---|---|
| Plan | `SEED_STATE.budget.monthly` | "Your plan" |
| Self-reported | `SEED_STATE.monthToDateActuals` | "What you told me" |
| Automated | bank connection | **not in prototype** |

**The self-reported layer is `monthToDateActuals`, not the sum of
`journalHistory`.** This is easy to get backwards and the numbers don't survive
it: six days of journal entries total roughly $150 of dining out, but the
observation is built on **$429**. 07-progress-bills states the relationship —
*"six days of journal detail sits inside fabricated month-to-date totals"*
(D19).

```
monthToDateActuals[cat]   → the comparison figure ("what you told me")
journalHistory[day]       → the drill-down detail behind it
```

Comparisons, observations, and the daily update all read the month-to-date
figure. The six days are what you show when someone taps into a category.

**A submitted entry adds to month-to-date, and observations recompute** (L17).
This is the loop the prototype exists to test — input with no visible
consequence teaches testers the app is a mock.

Two consequences:

1. **Observation copy must be templated, not static.** `seed-state.json` ships
   authored strings with baked figures (*"34% above what households like yours
   spend"*). Once numbers move, those go stale on first entry. Store the
   template, compute the figure at render.
2. **The layer is correctable, and confirmation is the guard.** The
   self-reported layer has two writers with deliberately different semantics:

   | Writer | Semantics | Why |
   |---|---|---|
   | `journalSubmit` (`js/journal.js`) | **adds** — `mtd[cat] += amount` | each entry is one more thing that happened |
   | `estimatorSubmit` (`screens/spend-estimator.js`) | **replaces** — `mtd[cat] = est` | it is a fresh estimate of the whole month; adding would double on a re-run |

   So a figure *can* go down, and the seeded gap *can* close — a correction is a
   legitimate thing for a user to make, not a bug to design out. What keeps that
   from happening by accident is that **neither writer commits silently**: both
   pass through a confirmation step that states the resulting figure before it
   lands (`screens/journal-confirm.js`; the estimator's result step, which shows
   the current figure alongside the new one when it is replacing something).

   **Any future writer of `state.mtd` needs the same confirmation step.** In a
   full build the journal is ongoing rather than one-shot, and the confirmation
   summarises the day's entries before they commit — same rule, more entries.

The gaps between layers are the product. Two *different* gaps exist for the same
category and must never substitute for one another:

- **vs plan** — $429 against a $320 budget = **34% over**
- **vs peers** — $429 against a $370 benchmark = **16% over**

Per L11, the seeded dining observation is the **plan** comparison, and the peer
comparison gets its own distinct card.

### Peer benchmark formula

The spec states it as a one-liner. **The one-liner is misleading** — verified
against the actual data, *all three* terms differ from how it reads:

```
peerValue = base[category][incomeBand][householdSize - 1]        // ARRAY INDEX
          × colTiers.tiers[ colTiers.zipPrefixes[zip3] ][category]   // TWO steps
          × Π lifestyleModifiers[dim][answer][category]              // PRODUCT of 6
          → round to nearest 5
```

1. **Household size is an array index, off by one.** `base[cat][band]` is a
   **4-element array**, not an object keyed by household size:
   `"b3": [180, 275, 330, 385]` for Dining out. Household 1 → index 0,
   2 → index 1, 3 → index 2, **4+ → index 3 (clamp)**. Reading it as
   `[householdSize]` returns the wrong household's figure and still looks
   plausible — the classic silent-wrong-number bug.
2. **Cost of living is a two-step lookup.** `zipPrefixes` maps a 3-digit prefix
   to a tier *name* (`"900" → "very_high"`); `tiers[name][category]` is the
   multiplier. There is no `colTier[zipPrefix][category]`. **Never call this
   directly** — go through `benchColMultipliers(zip)`, which tries the ZIP's own
   county first and falls back to this ("Cost of living: county first, prefix
   second" below).
3. **Lifestyle is a product across all six dimensions**, not one lookup. A
   category can be touched by several — Dining out is modified by *both*
   `foodie` and `cooksAtHome`. Dimensions that don't name a category contribute
   1.0.

Unlisted ZIP prefixes fall back to the `moderate` tier rather than failing.
Modeled areas are every Arkansas ZIP and every county bordering it at five-digit
precision, plus A12's CA/NY/VA prefixes.

### Two answer-key traps in `lifestyleModifiers`

The wizard's answer labels do **not** all match the data keys:

| Dimension | Data keys | Wizard asks | Trap |
|---|---|---|---|
| `paysRent` | `"true"` / `"false"` | "Do you pay rent or a mortgage? (yes/no)" | Keys are **strings**, not booleans. A boolean `true` misses the table |
| `commute` | `car` / `transit` / **`none`** | "(car / transit / **mostly walk**)" | "mostly walk" → `none`. The label appears nowhere in the data |
| `foodie`, `cooksAtHome`, `hobbySpend`, `travelFrequency` | match their labels | — | fine |

A missed key silently contributes 1.0 instead of the real multiplier, so the
number stays plausible and the bug never surfaces.

### Which categories lifestyle actually reaches

Only **7 of the 12**. The other five always get 1.0:

```
foodie          → Dining out, Groceries        hobbySpend      → Entertainment, Shopping
cooksAtHome     → Dining out, Groceries        paysRent        → Housing
commute         → Transport                    travelFrequency → Other

never modified: Utilities · Subscriptions · Health · Personal care · Debt payments
```

So the "product of six" only ever multiplies more than one term for **Dining out
and Groceries**. Still implement it as a product — but that's the blast radius.

<!-- The worked_example confirms the product reading: foodie=moderate gives
     Dining out 1.0 and cooksAtHome=sometimes gives Dining out 1.0, so the
     product is 1.0 and the example's stated lifestyleMultiplier is 1.0. A
     single-lookup reading would coincidentally agree HERE and diverge for any
     persona whose modifiers aren't all 1.0. Same for the household index: the
     persona is household 2, and [1] vs a naive [2] both return a number.
     These are exactly the bugs that ship silently. -->
<!-- VERIFIED 2026-08-07 by full recompute from the raw JSON:
     base=275 (b3, index 1) × col=1.34 (900→very_high) × life=1.0
     = 368.5 → 370. Matches worked_example exactly. -->

### Cost of living: county first, prefix second

`benchColMultipliers(zip)` is the single chokepoint. Two resolutions, in order:

1. **The ZIP's own county** — `data/zip-cost-of-living.json` lists all 589
   Arkansas ZIPs and the 283 in every county bordering it, at five-digit
   precision. The county's typical home value over the national median gives a
   ratio; the ratio is interpolated between the *same four tiers* the prefix
   table uses (`benchInterpolateTiers`), clamping outside them.
2. **The 3-digit prefix tier** — everywhere else, unchanged.

This adds precision to the existing model rather than introducing a second one:
nothing invents a new category shape, a county just lands *between* rungs
instead of on one.

**Why it exists.** All fourteen Arkansas prefixes (716–729) were already in
`zipPrefixes`. But Little Rock, Fayetteville, Springdale and Bentonville all
resolved to `moderate`, which is literally 1.0 across all twelve categories — so
the onboarding chart drew two identical bars and Arkansas read as missing. It
was not missing; it was flat. Benton County now lands at +11% and Phillips at
−8%, a nineteen-point spread four rungs could not express.

Six ZIPs are claimed by counties in two different states (Junction City,
Lead Hill, Protem, Dugginsville and two Mississippi County entries on a
Tennessee prefix). **Arkansas wins the tie** — that is what the file is for —
and every conflict is recorded under `bleedOver.sharedZips` rather than silently
resolved.

`benchColSupported` / `benchZipSupported` answer "did we model this, or is the
national baseline standing in?" — a genuinely-average area and an unmodeled one
compute the same multiplier, so the figure alone cannot tell them apart.

### The wizard walks the product, it does not recompute it

`benchAllPeerValues` is the right answer for a one-shot calculation. The
lifestyle wizard is not one — the tester can drag a slider on Q1 and then answer
Q2, and recomputing would silently throw the drag away.

So the wizard holds a **running** preview and applies each answer as a ratio
against whatever is already folded in:

```
new = current × mods[dim][newAnswer][cat] / mods[dim][answerAlreadyApplied][cat]
```

An unanswered dimension contributes 1.0, so the first answer is just the
multiplier; re-answering via Back divides the old one out with no special case;
and with no drags at all it lands on the same figures `benchAllPeerValues` would
have produced, because it is the same six multipliers in the same order. The
running state lives in `state.lifestyleWizard.{preview, applied}`
(`screens/lifestyle-wizard.js`).

**`state.lifestyleAnswered`** is the companion to this. `state.lifestyle` is
fully populated from the persona at boot, so it cannot tell "you told me this"
from "a stranger's default" — and the wizard needs to, or every question opens
pre-selected. Onboarding step 5 marks the two dimensions it asks
(`ONB_LIFESTYLE_DIMS`); the wizard pre-selects only those.

### Deriving `incomeBand`

Bands are `b1`–`b5` with `min`/`max` on **annual** income:
`b1` ≤35k · `b2` 35–60k · `b3` 60–90k · `b4` 90–140k · `b5` 140k+.
Onboarding collects a *band*, never a precise figure (01-onboarding step 4), so
map the chosen range straight to its id. The persona's $68,000 → `b3`.

### Iterate `CATEGORIES`, never `Object.keys(data)`

Several data objects carry a `_note` key alongside their real entries:

| Object | Keys | `_note`? |
|---|---|---|
| `SEED_STATE.budget.monthly` | 12 | no |
| `SEED_STATE.monthToDateActuals` | 13 | **yes** |
| `PEER_BENCHMARKS.base` | 13 | **yes** |
| `PEER_BENCHMARKS.colTiers.zipPrefixes` | 151 | **yes** |
| `PEER_BENCHMARKS.lifestyleModifiers` | 7 | **yes** |

`Object.keys(monthToDateActuals)` yields a `_note` "category" that will render
as a tile, blow up a total, or fail a benchmark lookup. **Always drive
iteration from `CATEGORIES`** (§4) and index into the data, never the reverse.
Same for ZIP prefix lookups — `_note` is a key there too.

**Self-test on build** — `PEER_BENCHMARKS.worked_example`: Dining out, band b3,
household 2, ZIP 90066 (prefix 900 = very_high), foodie moderate → 275 × 1.34 ×
1.0 = 368.5 → **370**. If that doesn't reproduce, the wiring is wrong. Free
regression test the spec handed us.

---

## 6. Observation registry

Four seeded observations (D18), each carrying a `surfaces[]` array naming where
it must appear. D18 and Phase 6 both require every observation reachable from
**at least two screens**.

| id | type | surfaces |
|---|---|---|
| `obs_dining_over_peers` | `peer_gap` | home_tip, budget_comparison, daily_update, progress |
| `obs_hulu_unused` | `subscription_flag` | home_task, progress, daily_update |
| `obs_emergency_behind` | `goal_pace` | goals, daily_update, progress |
| `obs_insurance_unbudgeted` | `bill_flag` | home_task, progress_bills, budget_comparison |

**Contract:** screens ask the registry what to show; they never hardcode an
observation.

```js
observationsFor("progress")   // → array of observations naming that surface
```

This is what makes the Phase 6 reachability check mechanical rather than a
hunt — and it means adding a surface is a data edit, not a code edit.

**Seven surface names are in use.** They are not screen ids; map them once:

| Surface | Screen / region |
|---|---|
| `home_tip` | Home — tip banner |
| `home_task` | Home — daily task list |
| `budget_comparison` | Budget — three-layer comparison (only the confirm gate now; the tab itself renders "Worth a look" instead) |
| `progress` | My Progress — main body |
| `progress_bills` | My Progress — bills calendar |
| `goals` | Goals tab |
| `daily_update` | Daily update sequence |

<!-- Note `progress` and `progress_bills` are two surfaces on ONE screen. The
     map is surface → region, not surface → screen, so a screen may query more
     than one key. -->
<!-- Reachability arithmetic: dining 4 surfaces, hulu 3, emergency 3,
     insurance 3 — every observation clears the ≥2 bar with room to spare, so
     Phase 6 should pass by construction. If it doesn't, a surface key got
     typo'd rather than a screen being missed. -->

<!-- L11 applies here: obs_dining_over_peers ships typed `peer_gap` with the
     PLAN numbers (429 vs 320). Reframe its headline to "over your plan" and
     add a separate peer card at 429 vs 370. Fix it in state at boot, not by
     editing data/*.json — that file stays a verbatim spec copy (§1). -->

---

## 7. Navigation contract

Five tabs (D34) plus Home as a top-left icon (L5).

```js
state.nav = {
  activeStack: "home",
  stacks: {
    home:     ["home"],
    goals:    ["goals"],
    budget:   ["aboutMe"],       // v2's screen id, kept deliberately
    progress: ["myProgress"],
    learn:    ["learn"],
    market:   ["marketplace"]
  }
}
```

| Action | Effect |
|---|---|
| Tab tap | switch `activeStack`. **Does not push.** Stack resumes where you left it |
| Home icon tap | switch `activeStack` to `home`. Same mechanism, different affordance |
| `go(screen)` | push onto the active stack |
| `taskGo(screen)` | set `activeStack = "home"`, then push — this is what makes a task-launched screen back to Home |
| `back()` | pop the active stack |
| `navGoTabRoot(key)` | switch `activeStack` **and reset it to `[key]`** — "this flow is over" |
| Admin "Jump to screen" | **reset** that stack to `[screen]` — a jump has no history |

`navGoTabRoot` exists because `navGoTab` commits that stack's **top**, which is
right for a tab tap and wrong for ending a flow — the screen you just finished
is still on it. Open the budget wizard from the Budget tab and the stack ends as
`["aboutMe","lifestyleWizard","lifestyleWizardReview","budgetDone"]`, so
"See my budget" called `navGoTab('aboutMe')` and re-committed `budgetDone`: the
screen it was already on. It is the any-tab counterpart to `navGoHome()`, and
the same distinction. **Every "Done" at the end of a flow wants one of those
two, never `navGoTab`.**

Per-tab stacks are what let the *same* screen back to two different places: a
lesson opened from a Home task backs to Home, the same lesson opened from
Education backs to Education. No special-casing.

`history.pushState` / `popstate` stay in sync so browser back keeps working
(v2 already does this via `getNavSnapshot` / `restoreNavSnapshot`).

**All screen changes go through `go()` or `taskGo()`.** Direct `state.screen`
assignment bypasses the stack and the nav log — this was already v2's rule and
it matters more now.

<!-- activeTabFor() inverts: the stack now owns which tab is active. Keep
     activeTabFor as a fallback for admin jumps only, or delete it. Do not let
     two things claim to know the active tab. -->
<!-- state.flowOrigin is a one-slot version of this idea. Retire it once stacks
     land — check the finish-screen path first. -->

---

## 8. Shared top bar

**v2 has no shared top bar** — every screen renders its own header. v3 needs
one, because 03-home puts kibble, streak, buddy level, and a hamburger overlay
up there, and L5 puts the home/back control there too.

```
┌──────────────────────────────────────────┐
│ [◄ or ⌂]   kibble · streak · level   [☰] │
└──────────────────────────────────────────┘
```

Left slot is contextual:

| Condition | Left slot |
|---|---|
| Stack depth > 1 | **Back** |
| Stack depth = 1 (tab root) | **Home icon** |
| Full-screen / nav hidden | **Back only** — home icon hidden |
| On Home | nothing |

Home icon: inline SVG, ≤44px tap target, not larger. No icon library under L1.

### The offset trap

`.screen-scroll` currently reserves `bottom: 78px` for the nav, and that value is
duplicated in **three** places — the CSS default, the four full-bleed mode
classes, and an inline fallback in `render()`. The top bar adds a matching
`top:` offset with the **same three-places problem**.

Full-bleed screens (login scene, onboarding, journal flow, lesson, daily update)
must zero *both*. Every new full-bleed screen needs a mode class or it renders
with a dead band top and bottom.

<!-- Worth collapsing to a single CSS custom property (--topbar-h / --nav-h) set
     once and referenced everywhere, rather than carrying v2's triplication into
     a build that doubles it. Small refactor, done in Phase 0, pays for itself. -->

---

## 9. Routes and the journal question contract

### Route map

`SEED_STATE.dailyTasks.today` uses its own route vocabulary, matching no screen
id. Routes can carry a parameter (`lesson:apr`).

| Route | Resolves to |
|---|---|
| `money_journal` | journal entry flow |
| `subscription_confirm` | **journal entry, focused on `q_watched`** (L12 — no dedicated screen) |
| `budget` | `aboutMe` |
| `lesson:<id>` | lesson player for that lesson id |

<!-- Two of the four daily tasks now land in the journal (t_journal, t_hulu).
     The Hulu task must enter visibly differently — pre-focused on the watched
     question — or it reads as a broken duplicate.
     Frame it as a question, never an instruction: "Haven't heard about Hulu in
     a while", not "cancel Hulu" (07-progress-bills is explicit). -->

**`q_watched` is `signalOnly: true`** — its options carry a `signal` name, not a
category or estimate, so it produces **no financial entry**. That's correct for
the Hulu task: the payoff is the flag clearing, not a dollar amount.

It also carries `cooldownDays: 2`, so normal priority selection may skip it.
**A task-initiated deep link must bypass cooldown**, or the Hulu task can route
to an entry that doesn't contain the question it exists to ask.

### Question selection

`config`: `questionsPerEntry: 4`, `freeTextAlwaysLast: true`, `freeTextParsed: false`.

Nine questions ship, but they are **not one flat pool** — three carry flags that
take them out of ordinary priority scoring:

| Question | Flag | Behavior |
|---|---|---|
| `q_free_text` | `alwaysLast: true`, `parsed: false` | Always appended, outside the count of 4. Silently discarded (D12) — never on the confirmation screen, never acknowledged. Carries `attachments: [image, camera, voice]`, all inert |
| `q_breakfast_habit` | `triggeredBy: "pattern_detected"` | Fires on a detected repeat, not by score. `cooldownDays: 30` |
| `q_watched` | `signalOnly: true` | Produces a signal, not a financial entry |

So ordinary selection draws **4 by priority from the 6 scoreable questions**,
skipping anything on cooldown, then appends free text.

### The journal is where goal progress comes from

`q_balance` — *"Roughly what's in your checking account right now?"* — carries
**`updatesGoalProgress: true`**. This is not a goals-tab feature that happens to
live in the journal; it is 05-goals' entire event-based update mechanism,
implemented as a journal question.

```
Phase 1 (journal)  →  emits a goal-progress event
Phase 5 (goals)    →  consumes it
```

**Consequence for sequencing:** Phase 1 must emit that event even though nothing
consumes it until Phase 5. Cheap to include now, expensive to retrofit — the
alternative is reopening the journal submit path months later.

Also note `setsRecurring` on `q_breakfast_habit` is **tri-state**, not boolean:
`true` · `"weekdays"` · `false`. A truthiness check gets `"weekdays"` wrong.

---

## 10. Audio pipeline

Under L10, **Web Speech is a build-time generator, not a runtime player.**
Runtime plays `.wav`, same as v2's lesson player.

```
script text → say -v Samantha -o seg.aiff → afconvert → seg.wav
           → afinfo duration → written back into the timings block
```

macOS `say` is offline, keyless, and the same voice family Safari's Web Speech
exposes — so D04's *intent* holds even though its "no build-time audio assets"
clause does not.

**One file per segment.** Each file's duration *is* that segment's timing, and a
single segment can be re-cut without redoing the script.

### Timing model is inverted from the spec

`speechSynthesis` `boundary` events don't fire for recorded audio. So:

- Static timings in `daily-scripts.json` become **primary**, not fallback.
- Timings are extracted once at generation time and written back.
- The `<audio>` element is the clock (`elapsed = audio.currentTime`).

This is closer to D29's stated production pipeline ("script → TTS → timing
extraction → timings written back") than the spec's own prototype shortcut, and
it removes cross-browser variance in whether boundary events fire at all.

**D29's structural rules still bind:**
- Segment text and timings **never share an object**. Segments carry ids;
  timings are keyed by id.
- Visual cues reference **segment ids, never timestamps**.
- A segment with no timing estimates from word count at **165 wpm**.

Same generator serves the 15 lesson script bodies (L8).

### 165 wpm is the one pacing knob

`DU_WPM` (`screens/daily-update.js`) sets the pace for **every narrated
surface**: the daily update, the onboarding narrator (`onbVideoSegMs`) and now
the lesson player (`lpCuesFromWords`). Retune it once and all three move.

The lesson player used to synthesize a flat `LP_DEFAULT_LINE_SEC = 10` per line
instead — roughly double what a sentence takes to say, so every line ended in a
long silence. Worse, **`components/hyperframes.js` expressed its entrances as a
fraction of the total runtime**, and the cap was 9% — which over that inflated
70-second runtime meant a **6.3-second fade-in**. The two compounded into text
drifting into view while the narrator finished a sentence and moved on.

Entrances and exits are now wall-clock seconds (`HF_IN_SEC`, `HF_OUT_SEC`,
`HF_MARK_SEC`), converted to keyframe percentages through `hfFrac(sec, totalSec,
cap)`. A beat snaps in, holds for its line, and snaps out at any runtime. The
fraction cap survives as a ceiling so a very short beat cannot spend most of its
life easing in.

**Storyboard beat boundaries ARE script line boundaries.** The APR spine in
`lessons.json` is cut from `lpCuesFromWords(apr_about_average)`; the other four
buckets have different tail lengths, so their beats drift by up to 2%, which is
inside a line. Rewriting a script means recutting the fractions.

### Verified against the shipped scripts

All three variants have **7 segments each, every segment timed, every `cue`
resolving** to a declared type. Nothing to repair.

One asymmetry: **`number_reveal` is declared in `visualCues.types` but no
segment uses it.** Seven of the eight types are exercised. Build the eight
renderers anyway — it costs little and the type is clearly intended — but don't
hunt for the script that triggers it.

---

## 11. Screen wiring checklist

Every new screen needs all five, or the admin panel silently degrades to the
generic "Jump to screen" fallback. v3 adds ~15 screens = ~75 wiring points.

1. `screens/<name>.js` → `render<Name>()` (+ optional `render<Name>Admin()`)
2. `<script>` tag in `index.html`, in the screens block
3. `js/render.js` → `renderScreen()` · `adminSubtitle()` · `renderAdmin()` · jump list
4. `js/utils.js` → `activeTabFor` (or the stack map, per §7)
5. `js/state.js` → `destinations[]`

Plus, new in v3: a **full-bleed mode class** if the screen hides the nav (§8).

<!-- Candidate for a tiny node script that greps for screens missing any of the
     five and prints the gaps. Cheap to write, and it turns the most mechanical
     failure mode in the build into a check rather than a memory test. -->

---

## 12. Standing rules

### Code — inherited from v2 (root `CLAUDE.md`)

- **Surgical edits.** Fix one thing at a time. Never collapse files together.
- **`.item-card` is `display:block`, not flex.** Trailing children drop to their
  own line. Fix per-instance with scoped inline flex; never change the global rule.
- **Inputs use `onchange`, not `oninput`.** Full re-render on every keystroke
  destroys focus. **Sliders** are the deliberate exception — product sliders as
  much as admin ones, because a `type="range"` on `oninput` + `render()`
  destroys the element being dragged. Freeze the slider's `max` too: a ceiling
  derived from the value it controls makes the thumb recoil. Paired with
  `debouncedRender()`.
- **Always `h()`-escape** anything interpolated into an HTML template literal.
- **Style with CSS variables only**, never hardcoded hex — **all four themes**
  must work, not just the one you are looking at (§14).
- **Iterate `CATEGORIES`, never `Object.keys(data)`** — `_note` keys (§5).

### Copy — cross-cutting, applies to every surface

- **No financial advice. Ever. Anywhere** (D26). Not in buddy replies, not in
  observations, not in lesson scripts, not in empty states, not in a tip banner.
  Surface the number and the gap; never prescribe the action.
  - **Any question asking what to do must hit the safeguard reply.** Enforced by
    `chatIsAdviceSeeking()` in `js/chat-router.js`, checked *before* keyword
    scoring (L20). The response library's own keywords are a floor, not the
    guard — they miss "help me decide", "can I afford", "is it a good idea",
    "what would you do", and nine more.
  - Deflection being over-eager is the **safe** failure. A wrongly-deflected
    question costs one retry; a missed one means the prototype gave financial
    advice.
  - **Copy written later is bound by this too** — especially the 15 lesson
    script bodies (L8), which are the largest block of unwritten prose left.
    The forbidden shapes are imperatives: "you should", "we recommend",
    "cancel your", "switch to", "you must", "the best option is".
- **Frame flags as questions, not instructions.** "Haven't heard about Hulu in a
  while" — not "cancel Hulu." The app has no idea whether they still want it.
- **No exclamation marks in financial observations** (A13). The buddy may be
  encouraging; the numbers stay matter-of-fact.
- **Voice: warm, plain, second person, sentence case.**
- **Tip banner is a hard 90-character limit.**
- **"Peers", never "average users"** — the data is an external mathematical
  aggregate, never other people's real data (D23). If a user asks, say exactly
  that.
- **Vocabulary is fixed** (00-overview): Buddy · Money Journal (never "expense
  tracker") · Kibble · Streak · Peers · Observation.

### Quality floor — verified in Phase 6, designed for from the start

- **No screen renders empty** (D19). Where six days is too thin, fabricate a
  plausible value. This is a *design* constraint, not a final-pass fix — a
  screen built without it usually can't be retrofitted cheaply.
- **Every observation reachable from ≥2 screens** (D18) — guaranteed by the
  registry in §6 rather than by inspection.
- **`prefers-reduced-motion` respected**: idle animation stops, transitions
  become instant, the daily update plays as timed static frames.
- **Tap targets ≥44px. Keyboard focus visible throughout.**
- **Mobile viewport first** — the phone frame is 390px; that's the design width.

---

## 12b. Lesson framing trees — three structural traps

Verified against `lessons.json`. The decision trees are well-formed (no dangling
`next`), but their shape is irregular in ways that break a naive traversal.

**1. The key is `tag`, singular — not `tags`.** One tag per option, not an array.
A `.tags` lookup silently collects nothing, the tag set comes back empty, and
every lesson plays its fallback variant. The failure is invisible: you get a
script, just always the wrong one.

**2. `next` lives at two different levels.**

| Question | `next` location |
|---|---|
| `apr/f1`, `apr/f2_unknown`, `apr/f2_nocard`, `emergency-fund/f1`, `subscription-audit/f1` | **per option** |
| `apr/f2_known`, `emergency-fund/f2_amount`, `subscription-audit/f2` | **on the question** |
| `apr/f3`, `emergency-fund/f3`, `subscription-audit/f3` | **neither — terminal** |

Resolution order: option-level `next` → question-level `next` → terminal. All
three lessons end on an `f3` that has no `next` anywhere, so "no next" means
*done*, not *malformed*.

**3. `nocard` is declared but never emitted.** `apr_v5.matchTags` is
`["no_debt", "nocard"]`, but no framing option produces `nocard` — `apr/f1`'s
"I don't have a credit card" carries only `next: f2_nocard`, no `tag`.
`apr_v5` stays reachable via `no_debt`, so nothing breaks. Either add
`tag: "nocard"` to that option or leave it; **don't "fix" it by inventing a
question.**

### Unmatched tags are the design, not a bug

Many answer tags match no variant: `unsure_apr`, `unknown_balance`,
`unknown_debt`, `other_debt`, and all of `f3`'s confidence tags (`confident` ·
`partial` · `new`). They fall through to the fallback — and `apr_default`'s own
note says *"Also serves every 'I don't know' path."*

That is 06-education's *"'I don't know' is a first-class answer, not a failure"*
implemented in data. Don't add variants to "cover" them.

<!-- Coverage per lesson: apr 14 answer tags → 8 variant tags; emergency-fund
     11 → 7; subscription-audit 10 → 7. Every unmatched tag routes to the
     lesson's isFallback variant. All three lessons have exactly one. -->

---

## 13. Buddy representation (L15)

No AI-generated art and no hand-drawn SVG. The buddy stage renders a **labelled
placeholder frame that describes, in text, what the user would be seeing** given
their choices.

```
┌───────────────────────────────┐
│                               │
│   [ buddy placeholder ]       │
│                               │
│   Golden retriever · cream    │
│   Medium                      │
│   Pose: sitting, facing        │
│         forward, calm          │
│                               │
└───────────────────────────────┘
```

**Why this and not a square:** it proves the customization plumbing works
end-to-end. A tester picks a breed, and the stage visibly reflects it — the
choice registers and is legible, which is what onboarding step 7 is there to
test. A flat colour swatch would test nothing.

- **Character creation stays real, with all five attributes** (L18): breed,
  fur, eyes, nose, size — as 01-onboarding step 7 originally specified.
  Selections write to `state.buddy` and the description re-renders. Nothing is
  faked. The persona's default is `PERSONA.buddy` (golden retriever, cream,
  brown eyes, black nose, medium). The name is intentionally blank — naming the
  buddy is required in onboarding, and it falls back to "Buddy" until then.
- **The idle cycle is real too.** Pose text changes on the 4–6 second cadence
  the design system specifies, cycling poses 1, 3, 4, 5. Stops under
  `prefers-reduced-motion`.
- **Six pose names** come from `10-ai-assets.md`'s table (sitting calm · head
  tilted · drinking · sniffing · lying down · joyful). Poses 2 and 6 are
  event-driven — chat open, and reward/streak.
- **Same treatment for the other assets**: the two login backgrounds render as
  described scenes (day/night per local time), and the kibble bowl as a labelled
  frame.

<!-- D39/D40 are void in practice. Flat cream backgrounds, CSS
     background-position cropping, six fixed sheets, and the dropped eye/nose
     colours were all consequences of raster art being unable to recolour.
     With a text placeholder there is no sheet to crop and no recolour cost, so
     none of those constraints bind. Do not build the background-position
     machinery for art that will never exist. -->
<!-- If real art is ever produced, this swaps to an <img>/sprite behind the same
     state.buddy shape. Keep the description generation separate from the frame
     so only the frame changes. -->

---

## 14. Theming — four themes, one contract (L21)

Four themes ship, switched from the Admin Tools panel. Two reproduce v2's
palette so the D36 repaint can be compared against what it replaced; two are the
repaint itself. **Dark is the default** (`state.settings.colorMode`).

| Theme | Class on `.screen` | What it is |
|---|---|---|
| Light | `.theme-light` | v2's crisp blue-on-white |
| Dark | `.theme-dark` | v2's cool dark — **default** |
| Natural Light | *(none — `:root`)* | D36 cream + sage |
| Natural Dark | `.theme-natural-dark` | D36 dimmed, warm |

`THEMES` in `js/theme.js` is the single source of truth. `render()` calls
`themeApply()`, which puts exactly one class on `.screen`. To add a theme, add
an entry there and a class in `variables.css` — nothing else reads the list.

### The 40-token contract

`:root` holds the complete Natural Light set, so every token always resolves.
Each of the three classes must then define **all 40 colour tokens, no more and
no fewer.**

This is enforced (`scripts/sweep.sh` §1b) rather than trusted, because the
failure mode is invisible: a theme that omits a token inherits `:root`'s
**cream**, which paints one warm patch into a cool theme and reads as a
deliberate accent rather than a bug. Adding a token to `:root` now fails the
sweep until all three themes define it.

### What a theme must never touch

**`--chrome-*`, `--bg`, `--phone`.** These style the admin panel, the page and
the bezel — all of which live *outside* `.screen`, where theme classes are
applied. An override is therefore inert as well as unwanted: the frame is meant
to hold still while the app repaints. The sweep asserts this. (Eight such dead
overrides existed in the old `.dark-mode` and were removed — see `plan.md` §17.3.)

### Colours that pair, and must be declared as pairs

`--accent` is **dark** in the light themes and **light** in the dark ones. Any
rule putting text on it therefore cannot hardcode a text colour — there are two
tokens for this, and new rules should use them rather than reaching for
`--on-dark`:

| Background | Text token |
|---|---|
| `--accent` | `--on-accent` |
| `--accent-fill` | `--accent-fill-text` |
| a genuinely always-dark surface (lesson stage, night login) | `--on-dark` |

The sweep checks 12 foreground/background pairs across all four themes at a
4.5:1 floor. That gate caught `--info` shipping at 3.92:1 in Natural Light.

---

## 15. Not covered here

Deliberately deferred to per-phase docs, written just before each phase:

- Journal question sequencing, estimate sliders, confirmation layout (Phase 1)
- Lifestyle wizard screens and budget slider UI (Phase 2)
- Buddy stage poses, idle cycle, hamburger overlay contents (Phase 3)
- Daily update visual cue implementations, share sheet, anonymization (Phase 4)
- Goal suggestion scoping, event-based update prompts (Phase 5)
- Lesson framing decision trees, script variant bodies (Phase 5)

Design detail has a shelf life. Writing Phase 5's screens before Phase 1 has
taught us what a journal entry actually looks like produces fiction.
