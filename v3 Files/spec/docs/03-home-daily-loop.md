# Home and the Daily Loop

## Login

A scene — happy, warm, day or night depending on local time. Animated greeting.
Then a prompt: watch your daily update?

Yes / No, plus a "remember my choice" checkbox. If checked on first use, tell
them once that it's changeable in their profile. Never mention it again.

## Home screen, top to bottom

**Top bar** — kibble balance, streak counter, buddy level. Right side: a
transparent hamburger opening a half-screen overlay for system information.

**Tip banner** — one line, 90 character hard limit, puppy icon alongside.
Pre-generated, matched to user configuration. Copy in `seed-state.json`.

**Buddy stage** — the puppy, on a background, with an idle animation cycle.
Playful and limited: drinking water, sniffing around, looking at the screen,
coming up close. In the prototype these are CSS transforms over static images,
not a rigged animation system.

**Chat with Buddy** — button below the stage. See `buddy-responses.json`.
Keyword match against a static library, bubble options as the primary input
path. No LLM. No financial advice, ever, in any response.

**Daily tasks** — four at a time. Each routes somewhere real and pays kibble.
Precomputed order in the prototype (A7).

**Bottom nav** — Goals, Budget, My Progress, Education, Marketplace.
Marketplace is visibly greyed out and does nothing (D33).

## Task prioritization

Specified for production; not run at runtime in the prototype.

Static point assignment anchored to the user's strategic goal, then their
tactical goals. Score is modified by:

- **Cooldown** — a completed task returns later as a refresh. A *skipped* task
  returns on a different, shorter cooldown. Repetition is how the learning
  works, so completion isn't retirement.
- **Cross-topic alignment** — a task serving several active goals scores higher.
- **Learning stage** — early-journey tasks weight above later ones until the
  early ones clear.

## Streak

Registers after a completed journal entry, at the end of the share flow. The
value shown depends on entry mode: 1 day after onboarding, 6 days after skip.

**Done when:** login through home works, four tasks route correctly, Buddy chat
returns matched responses, and the streak shows the right value for the mode.
