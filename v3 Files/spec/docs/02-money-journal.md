# Money Journal

The deepest build (D05). This is what user testing is about — whether people
engage with the input point.

## The idea

You tell it about your day. It works out what that meant financially. No bank
connection required, which is what makes it work in places Plaid doesn't reach
and for people who won't connect an account to an app they just met.

## Input

Four structured questions per entry, drawn from `journal-questions.json` by
priority score, skipping anything on cooldown. Types: multiple choice,
fill-in-number, dropdown.

A free-text paragraph always comes last. It accepts anything, including
attachments. **It is silently discarded** (D12) — not parsed, not surfaced on
the confirmation screen, not acknowledged. It exists so testers experience the
affordance.

Attachment icons — image, camera, voice-to-text — are present and tappable. They
open a picker and accept a file. Nothing is processed.

## Cadence

One prompted entry per day, plus a visible entry point for additional entries
the same day (D13). Like filling out several pages of a physical journal. Not a
fixed morning/afternoon/evening split.

## Pattern follow-ups

When a signal repeats — coffee out five days running — a follow-up question
fires asking whether that's the norm. The answer sets a recurring assumption so
future entries pre-fill. Cooldown 30 days.

## Confirmation

Everything structured converts here. For each detected event:

- Category, from the twelve-item taxonomy (A2)
- An estimated cost from the persona profile
- A slider to move the estimate toward the real number

Then confirm and submit. Entries write to session state and flow into the
budget comparison, the daily update, and My Progress.

## Cash flow only

If a user ate at home from food already bought, the entry is $0 with a
"already in your groceries" note (D15). Never ask someone to price a slice of
toast — that money was captured at the supermarket.

**Done when:** a tester completes an entry end to end, adjusts estimates,
submits, and can immediately start another.
