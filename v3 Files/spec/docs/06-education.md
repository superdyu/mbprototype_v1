# Education

Lowest build priority (D05). First to thin. Three lessons only, first-time tier
only (A6).

## Structure at full scope

Courses contain lessons. Lessons are shared entities — "What is APR" belongs to
the interest rate course, the mortgage course, and the credit card course
simultaneously. Progress on a lesson is progress everywhere it appears, so
cross-cutting lessons level faster.

Each lesson has three tiers: three first-time versions, three practice
versions, five refresh versions. Users move through them by home screen
priority and cooldown, never linearly. Lessons are ungated and searchable.

**In the prototype:** v2 already ships one lesson with working audio. Do not
rebuild the lesson player (D38).

Two gaps to fill on top of it:

1. **Pre-lesson framing questions** — the decision tree that runs before the
   script.
2. **Answer-driven script personalization** — selecting which pre-generated
   script variant plays based on those answers.

Extend to three lessons if time allows. One fully working lesson with framing
and personalization is worth more than three without.

## Lesson flow

1. **Framing questions** — three to five, decision-tree branching. "Do you know
   your card's APR?" Yes branches one way, no another. "I don't know" is a
   first-class answer, not a failure.
2. **Script** — pre-generated for every combination of answers. Delivered as
   text with optional Web Speech playback.
3. **Quiz and simulation** — bias toward simulation. A sandbox mortgage or loan
   calculator a user can push numbers through beats a multiple-choice question
   about what a rate means.
4. **Reward screen** — XP, badge progression, kibble.

Return routing: came from home, return to home; came from Education, return to
Education.

## Badges

Per lesson. Metal tier plus level number, Overwatch-style. XP from correct
answers, bonus XP when the lesson came from the daily task list. The badge is
vanity — it unlocks nothing. That's the point.

Separately, the user has one overall buddy level. Levelling up pays bonus
kibble.

## The three lessons

APR, emergency fund, subscription audit. Each maps to a seeded observation, so
finishing one makes something on another screen legible.

**Done when:** one lesson runs start to finish including framing questions,
script, quiz, one simulation, and the reward screen.
