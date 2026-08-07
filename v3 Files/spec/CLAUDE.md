# Money Buddy — Prototype

A personal finance app with gamified UX and journal-based expense capture.
This build is a **throwaway web prototype for user testing**. It exists to
answer one question: do people engage with the input points and react to the
observations?

## Stack

React + Vite + Tailwind. Single-page app, no router. State in a top-level
machine. `npm install && npm run dev` must be the only setup.

## Hard rules

- **No live LLM calls.** No API keys. Nothing requires network access at runtime.
- **No backend, no database, no localStorage.** State is in-memory and resets on
  browser refresh. This is intentional — do not add persistence.
- **No screen renders empty.** Fabricate a plausible value before showing a
  blank state.
- **No financial advice** in any copy, any response, any surface.
- **Text-to-speech is Web Speech API only.**
- Read `docs/DECISIONS.md` before implementing anything. It overrides every
  other doc.
- **Where this spec is silent, v2 governs.** This is the v3 prototype and these
  docs are a delta over v2, not a replacement. If something is never mentioned
  here, carry forward what v2 did — do not invent it. If you cannot find the v2
  codebase in this folder, say so rather than improvising.

## Non-goals

Do not build these, even if they seem natural:

- Plaid or any bank connection
- Weekly, monthly, quarterly, or annual video updates (daily only)
- Push notifications or alerts
- Holiday and special-event budgets
- Charity donation loop and weekly kibble reset
- Ads, paywalls, or tier gating
- Marketplace functionality — it is a greyed-out tab
- Profile deletion and refund flows
- Practice and refresh lesson tiers
- A new lesson player — v2's already works, extend it

## Build order

Follow `docs/build-plan.md`. Depth priority when scope is tight:

1. Money Journal → confirmation → financial entries
2. Budget, peer benchmarks, lifestyle wizard
3. Daily loop — home, tasks, buddy, streak, kibble
4. Video update + share
5. Education

Thin from the bottom.

## File map

```
docs/DECISIONS.md          every resolved call — read first, overrides all
docs/ASSUMPTIONS.md        numbered, overridable calls
docs/build-plan.md         phased sequence
docs/00-overview.md        thesis, persona, what testing validates
docs/01-onboarding.md
docs/02-money-journal.md
docs/03-home-daily-loop.md
docs/04-budget-benchmarks.md
docs/05-goals.md
docs/06-education.md
docs/07-progress-bills.md
docs/08-video-updates.md
docs/09-design-system.md
docs/10-ai-assets.md         generation prompts for the 9 raster assets
data/*.json                seed state, question banks, scripts, benchmarks,
                           lessons
scripts/slice-sheet.py     cuts a buddy sheet into six PNGs
PROGRESS.md                build checklist — update as you go
```

## Session protocol

At the start of every session, read `PROGRESS.md` and continue from the first
unchecked item. Check items off as you complete them, and write a one-line note
under each when the implementation diverged from the spec.

This matters more than it sounds — long sessions get compacted and lose the
plan. `PROGRESS.md` on disk is what survives.
