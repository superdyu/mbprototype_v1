# Build Plan

Six phases. Each has a checkable exit condition. `PROGRESS.md` is the working
checklist; this file explains why the order is what it is.

---

## Phase 0 — Scaffold

Get the shell standing so every later phase has somewhere to land. Design tokens
go in first, not last — retrofitting a visual direction costs more than
establishing it.

**Done when:** the app runs, all five tabs are reachable, Marketplace is visibly
greyed out, and flipping `SKIP_ONBOARDING` changes the entry state.

---

## Phase 1 — Money Journal

The deepest build. This is what the user testing is actually about — testers
interacting with the input point. Everything downstream consumes what this
produces, so building it first means later phases have real data shapes to work
against instead of placeholders.

**Done when:** a tester can complete a journal entry end to end, see structured
answers converted into categorized financial entries with estimates, adjust
those estimates with sliders, submit, and start a second entry the same day.

---

## Phase 2 — Budget and benchmarks

Second-deepest. The peer comparison is the other half of what testers react to —
the observations. It needs the journal's output to compare against, which is why
it follows rather than leads.

**Done when:** the lifestyle wizard produces a budget, the benchmark model
returns peer values adjusted for the persona, and the three-layer comparison
renders with all four seeded observations visible.

---

## Phase 3 — Daily loop

The connective tissue. Home, tasks, buddy, streak, kibble. Built third because
it routes to Phases 1 and 2 — it needs destinations that exist.

**Done when:** login through to home works, four tasks route correctly, Buddy
chat returns keyword-matched responses, and the streak displays the right value
for the current entry mode.

---

## Phase 4 — Video update and share

The payoff moment. Technically the riskiest piece because of speech timing, so
it gets its own phase rather than being wedged into the daily loop.

Build the timing structure before the visuals. Script data must tolerate timing
values being rewritten without touching script text — see D29.

**Done when:** the daily update plays with speech and synchronized visuals, all
three engagement variants are selectable, and the share sheet's anonymization
preview shows exactly what would be posted.

---

## Phase 5 — Goals, Progress, Education

Lowest depth priority. Goals and Progress are mostly views over data that
already exists by this point. Education is a self-contained module and the first
thing to thin if time runs short.

**Done when:** goals can be created and updated through event-based prompts,
My Progress renders all six sections, and at least one lesson runs start to
finish including quiz and reward screen.

---

## Phase 6 — Pass

Not polish. A correctness sweep against the things that would break a user test:
empty screens, unreachable observations, broken mobile layout.

**Done when:** every item in the Phase 6 checklist is verified by actually
clicking through, not by inspection.

---

## If time runs out

Thin from the bottom. A prototype with a deep Money Journal, working benchmarks,
and no Education is testable. The reverse is not.
