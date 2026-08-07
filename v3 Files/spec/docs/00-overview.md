# Overview

## Thesis

Most personal finance apps depend on bank connection to know what you spent.
That is expensive, unavailable in much of the world, and demands trust before
the app has earned any.

Money Buddy inverts it. You tell it about your day — the way you would write in
a journal — and it works out what that meant financially. The bank connection
becomes optional rather than foundational, and by the time it is offered, the
app has already been useful for weeks.

Three layers of truth, always kept distinct:

| Layer | Source | What it answers |
|---|---|---|
| Plan | Budget you set | What you intended |
| Self-reported | Money Journal | What you think happened |
| Automated | Bank connection | What actually happened |

The gaps between them are the product. You underestimate food. You forgot a
subscription. Your peers in your ZIP code with your household size spend less on
dining out than you do.

## What the prototype validates

One thing: **do people engage with the input point, and do they react to the
observations?**

Not retention. Not accuracy. Not whether the economics work. If a tester enjoys
answering the journal questions and has a visible reaction to being told they
are 34% over their peers on dining out, the prototype has done its job.

Everything in this build serves that. Anything that does not is thinned.

## The persona

One fixed persona backs all seeded data. Tester inputs override it where they
overlap — ZIP, household size, income — but everything else falls back.

- 34, single income, renting
- Household size 2
- $68,000 annual
- ZIP 90066, Los Angeles
- Six days into using the app
- **Slightly behind** — room to improve, not in crisis

Four observations are seeded and must be reachable:

1. Dining out is 34% over the peer benchmark
2. Hulu has not been mentioned in three weeks
3. The emergency fund goal is at 41% of pace
4. Car insurance is due in four days and is not in the budget

## The daily loop

```
login  →  daily update prompt  →  Money Journal
                                       ↓
                              confirmation + estimates
                                       ↓
                              daily video update
                                       ↓
                              summary + share
                                       ↓
                              streak registers
                                       ↓
                          home: tasks, buddy, tip
                                       ↓
                    ┌──────────────────┼──────────────────┐
                  goals             budget            education
```

## Vocabulary

Consistent naming matters more than it looks — testers learn the product by its
words.

- **Buddy** — the puppy character, and the chat assistant. Same entity.
- **Money Journal** — the input feature. Never "expense tracker."
- **Kibble** — the currency. Earned through engagement.
- **Streak** — consecutive days used.
- **Peers** — the benchmark cohort. Never "average users" — the data is
  external and mathematical, not other people's real data.
- **Observation** — a surfaced insight about the gaps between layers.
