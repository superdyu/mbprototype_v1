# Assumptions

Calls made without an explicit decision. Every one is overridable with a single
instruction: "A7 is wrong, use X."

Claude Code: treat these as real until told otherwise. Do not re-litigate them
mid-build.

---

**A1 — Stack: React + Vite + Tailwind, single-page app, no router library.**
Screen state held in a top-level state machine. No backend, no build step beyond
Vite. Chosen because the prototype is throwaway and must run with `npm install`
and `npm run dev`, nothing else.

**A2 — Financial event categories are a fixed taxonomy of 12.**
Housing · Groceries · Dining out · Transport · Utilities · Subscriptions ·
Health · Personal care · Entertainment · Shopping · Debt payments · Other.
Aligned to the peer benchmark model and the lifestyle wizard so the three spend
layers compare cleanly.

**A3 — My Progress contains, in order:**
spend trend chart · budget vs peers vs journal comparison · bills calendar ·
subscription usage flags · badge and buddy level · kibble balance.

**A4 — The persona is a 34-year-old single-income renter, household size 2,
$68,000 annual, ZIP 90066 (Los Angeles).**
Chosen because it sits mid-range on the cost-of-living curve, makes "slightly
behind" plausible, and gives all four seeded observations somewhere natural to
live.

**A5 — Seeded observations attach to these specifics:**
dining out 34% over peer benchmark · Hulu unused for 3 weeks · emergency fund
goal at 41% of pace · car insurance due in 4 days, unbudgeted.

**A6 — Education ships with three lessons only.**
APR, emergency fund, and subscription audit. Each with first-time tier only —
no practice or refresh tiers. Ranked last in build depth.

**A7 — Home screen shows four daily tasks at a time.**
Drawn from a static prioritized list. The scoring engine is specified in
`03-home-daily-loop.md` but the prototype uses precomputed order.

**A8 — Onboarding collects, in order:**
name · ZIP · household size · income band · lifestyle wizard (6 questions) ·
strategic goal · buddy creation. Trial popup fires after buddy creation.

**A9 — The daily update renders as an animated sequence, not a video file.**
Timed DOM transitions synchronized to Web Speech API boundary events. No video
encoding, no media files.

**A10 — Three engagement variants are recorded for the daily script**, not six:
slightly behind (default, matches persona), on track, slightly ahead. The other
three are structurally supported but unwritten.

**A11 — Share flow copies to clipboard and shows a preview.**
No real social platform integration. The anonymization toggle and the expansion
view showing exactly what would be shared are both fully functional, because
that is the trust mechanic worth testing.

**A12 — Peer benchmark generation covers CA, AR, NY, VA only.**
All-US ZIP coverage is deferred as a build-time data generation task. The model
structure supports expansion without code changes.

**A13 — Copy tone: warm, plain, second person, sentence case.**
No exclamation marks in financial observations. The buddy is encouraging; the
numbers are matter-of-fact.
