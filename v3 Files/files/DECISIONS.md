# Decisions

Every resolved product and build decision, with rationale. This file is the
source of truth. If a feature doc contradicts this file, this file wins.

Format: `D##` — decision — rationale.

---

## Scope and fidelity

**D01 — This is a throwaway user-testing prototype, not an MVP.**
Web-based. Built to answer "do people like this?" — specifically whether they
engage with the input points and react to the observations. Not built to be
extended into production.

**D02 — No live LLM anywhere in the prototype.**
Money Journal parsing, Buddy chat, and peer benchmarks are all structured,
keyword-based, or pre-generated. No API keys required to run.

**D03 — State is in-memory only. Full reset on browser refresh.**
While the tester clicks through, the app recalls everything they have done and
prior relationships hold. Refresh returns to the seeded start state. No backend,
no database, no localStorage.

**D04 — Web Speech API for all text-to-speech.**
Browser-native. No third-party keys, no ElevenLabs, no build-time audio assets.

**D05 — Build depth priority order.**
1. Money Journal: input → confirmation → financial entries
2. Budget, peer benchmarks, lifestyle wizard
3. Daily loop: home, tasks, buddy, streak, kibble
4. Video update + share flow
5. Education: lessons, quizzes, simulations

When scope pressure hits, thin from the bottom.

---

## Onboarding and entry state

**D06 — Full onboarding is in the prototype.** Tester completes it and lands on
a **one-day streak**.

**D07 — A skip flag bypasses onboarding and lands on a six-day streak.**
Single config constant, flipped without unwinding the build. Two entry variants
total: onboarding → 1-day streak, or skip → 6-day streak.

**D08 — One fixed hardcoded persona backs all seeded data.**

**D09 — Tester inputs override the persona where they overlap.**
ZIP, household size, and income entered during onboarding take precedence.
Everything else falls back to the hardcoded profile.

**D10 — Buddy art is externally generated raster sprite sheets.**
Produced in Midjourney or DALL·E ahead of the build, six poses per sheet, three
across and two down. Prompts and pose order in `docs/10-ai-assets.md`.

Claude Code does not generate these and must not attempt to. If a sheet is
missing, use a flat colored placeholder of the correct cell size and note it in
`PROGRESS.md`.

**D39 — Sheets carry no transparency. Backgrounds are flat cream `#FBF7F0`.**
The buddy stage is cream, so the image reads as seamless with no keying. Crop
poses with CSS `background-position`, never at runtime in JS.

**D40 — Character creation offers three breeds and four fur colors on the
default breed.** Six sheets total. Raster art cannot recolor, so each fur option
is its own generation. Eye and nose color selection is dropped — it cannot be
delivered without multiplying the sheet count. If customization proves to matter
in testing, that is the trigger to move the buddy to SVG.

---

## Money Journal

**D11 — Structured inputs carry the parsing load.**
Multiple choice, fill-in-the-number, and dropdown questions focused on
previous-day recall. This is what produces financial entries.

**D12 — A free-text paragraph exists but is silently ignored.**
Users can type anything. It is not parsed, not surfaced on the confirmation
screen, and not acknowledged. It exists so testers experience the affordance.

**D13 — Cadence: one prompted entry per day, plus user-triggered additional
entries.** Like filling out multiple pages of a physical journal on the same
day. Not a fixed morning/afternoon/evening split.

**D14 — Confirmation screen derives entirely from structured answers.**
Shows category of spend observed, an estimated cost from the persona profile,
and sliders to adjust toward the real number. Then confirm and submit.

**D15 — Cash-flow only. No pantry or inventory deduction.**
If a user ate at home from food already purchased, the entry is $0. Grocery
spend was already captured at purchase. Never ask a user to price a slice of
toast.

---

## Seeded data

**D16 — Six days of fabricated history, matching the streak.**

**D17 — Persona health state: slightly behind.** Room to improve. Not dramatic,
not comfortable.

**D18 — All four observations are seeded and visible:**
- Overspending versus peers in a category
- An unused subscription flagged
- Savings goal behind pace
- A bill due soon that is not budgeted

**D19 — No screen may render empty.** Where six days is insufficient depth,
fabricate a plausible display value rather than showing a blank or zero state.

---

## Budget and benchmarks

**D20 — Peer benchmarks are AI-generated at build time and stored static.**
Stored as a *model* — a set of base values plus adjustment rules — not a flat
lookup of finished numbers.

**D21 — The model adjusts for lifestyle, household size, and income.**

**D22 — ZIP coverage: all US ZIPs if feasible. Otherwise CA, AR, NY, VA.**

**D23 — Peer data never uses real user data.** It is an external mathematical
aggregate derived from government data and cost-of-living adjustment.

**D24 — Three spend layers, always distinguished:**
plan (budget) · self-reported (Money Journal) · automated (Plaid-like, not in
prototype).

---

## Buddy chat

**D25 — Keyword search against a static response library.**
No LLM. Pre-established responses to key questions. Users pick from bubble
options rather than typing free-form. Illustrative of the interaction, not
functional.

**D26 — No financial advice is ever stated**, in any response, in any surface.

---

## Video updates

**D27 — Daily update only. Several engagement variants recorded.**
Weekly, monthly, quarterly, semi-annual, and annual scripts are specified but
deferred — six days of history cannot support them.

**D28 — Pre-rendered Hyperframes-style example, illustrative, no asset
library.**

**D29 — Scripts carry timing stamps and are revisable in reverse.**
The production pipeline is: script → TTS → timing extraction → feed timings back
to update visual sequencing. The data structure must tolerate timing values being
rewritten after the fact without touching script content. In the prototype,
Web Speech API timing is captured live via boundary events.

**D30 — Scripts stay generalized; visuals carry the numbers.**
The script says "you're a little bit behind." The visual layer shows the actual
figure.

---

## Monetization in the prototype

**D31 — No ads and no paywalls appear.**

**D32 — The seven-day trial popup still appears in the first session**, showing
conversion terms and subscribed features. Accept or reject, the tester's
experience is identical afterward.

**D33 — Marketplace is a greyed-out, non-interactive tab.** Visible in the nav,
does nothing.

---

## Navigation

**D34 — Bottom nav, five tabs, in order:**
Goals · Budget · My Progress · Education · Marketplace

**D35 — No push notifications or alerts.** Web prototype. Notification behaviour
is specified in the docs for production reference but not built.

---

## Visual direction

**D36 — Finch-like: soft pastels, cozy, rounded.**

---

## Inheritance from v2

**D37 — This is the v3 prototype. Where this spec is silent, v2 governs.**

If an area, screen, behaviour, or detail is not mentioned anywhere in these
docs, do not invent it and do not ask — carry forward whatever v2 did. This
spec is a delta over v2, not a replacement for it.

Applies to: unspecified screens, copy, layout details, interaction patterns,
naming, and anything else that simply never came up. It does not override an
explicit decision here — where this spec and v2 disagree, this spec wins.

The v2 codebase must be present in the project folder for this to work. Claude
Code: if you cannot find it, say so rather than improvising.

**D38 — v2's lesson pipeline is inherited and extended, not rebuilt.**
v2 already has one lesson with audio. It lacks the pre-lesson framing questions
and the answer-driven script personalization. Build those two things onto the
existing pipeline. Do not rewrite the lesson player.

## Deferred to production (specified, not built)

- Plaid-like account connection
- Weekly/monthly/quarterly/annual video scripts
- Push notification cadence for holidays and budgets
- Special event and holiday budgets
- Community charity donation loop and kibble reset
- Profile deletion and prorated refund flows
- Ad placement for free tier
- Affiliate marketplace
