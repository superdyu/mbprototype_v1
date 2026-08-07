# Build Progress

Claude Code: read this at session start. Continue from the first unchecked item.
Check items off as you complete them. Add a one-line note under any item where
the implementation diverged from the spec.

---

## Phase 0 — Scaffold

- [ ] v2 codebase located and confirmed present (D37) — stop and report if absent
- [ ] Vite + React + Tailwind project initialized
- [ ] Design tokens from `docs/09-design-system.md` in Tailwind config
- [ ] Top-level state machine with screen routing
- [ ] Seed state loaded from `data/seed-state.json` on mount
- [ ] `SKIP_ONBOARDING` config constant wired (false → 1-day streak,
      true → 6-day streak)
- [ ] Bottom nav shell, five tabs, Marketplace greyed out

### Assets (do before Phase 3, not blocking Phases 1–2)

- [ ] 6 buddy sheets generated
- [ ] 2 login backgrounds generated
- [ ] 1 kibble bowl generated

## Phase 1 — Money Journal (deepest build)

- [ ] Journal entry screen: structured question sequence
- [ ] Question types: multiple choice, fill-in-number, dropdown
- [ ] Free-text paragraph field — accepts input, silently discarded
- [ ] Attachment affordances: image, camera, voice-to-text (UI only)
- [ ] Question selection from priority score + cooldown
- [ ] Confirmation screen: category, estimate, adjustment sliders
- [ ] Submit → financial entries written to session state
- [ ] Additional same-day entry entry point

## Phase 2 — Budget and benchmarks

- [ ] Lifestyle wizard, 6 questions
- [ ] Peer benchmark model loaded and applied
- [ ] Benchmark adjustment for ZIP, household size, income, lifestyle
- [ ] Budget screen with category sliders
- [ ] Three-layer comparison view: plan vs peers vs journal

## Phase 3 — Daily loop

- [ ] Login screen: day/night scene, animated greeting
- [ ] Daily update prompt with "remember my choice"
- [ ] Home screen: top bar (kibble, streak, buddy level)
- [ ] Buddy sprite sheets present in assets/ (6 files, see docs/10-ai-assets.md)
      — if absent, use flat placeholders at correct cell size and note it here
- [ ] Buddy stage: CSS background-position pose cropping
- [ ] Idle animation cycle across poses 1, 3, 4, 5
- [ ] Tip banner with puppy icon
- [ ] Daily task list, four tasks, each routing to its destination
- [ ] Chat with Buddy — keyword match against static library, bubble options
- [ ] Hamburger menu, half-screen overlay

## Phase 4 — Video update and share

- [ ] Daily script data structure with revisable timing stamps
- [ ] Web Speech API playback with boundary event capture
- [ ] Animated visual sequence synced to speech timing
- [ ] Three engagement variants selectable
- [ ] Completion summary screen
- [ ] Share sheet: platform options, anonymization default on
- [ ] Anonymization preview — expandable, shows exactly what would post
- [ ] Done → streak registers → home

## Phase 5 — Goals, Progress, Education

- [ ] Goals screen: strategic and tactical, progress tracking
- [ ] Contextual goal suggestions, 1–3 with custom always last
- [ ] Event-based goal updates (bank balance, monthly spend)
- [ ] My Progress: trend chart, three-layer comparison, bills calendar
- [ ] Subscription usage flags surfaced
- [ ] Badge and buddy level display
- [ ] v2 lesson player inherited unchanged — do not rebuild (D38)
- [ ] Pre-lesson framing question decision tree (new)
- [ ] Answer-tag collection and script variant matching (new)
- [ ] Quiz and one simulation calculator
- [ ] Extend to three lessons if time allows
- [ ] Reward screen with XP and badge progression

## Phase 6 — Pass

- [ ] Every seeded observation reachable from at least two screens
- [ ] No screen renders empty in any state
- [ ] Mobile viewport verified
- [ ] Reduced motion respected
- [ ] Keyboard focus visible throughout
