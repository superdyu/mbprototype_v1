# Budget and Benchmarks

Second-deepest build (D05). The peer comparison is half of what testers react
to.

## Three layers, always distinct

| Layer | Source | Label in UI |
|---|---|---|
| Plan | Budget the user set | "Your plan" |
| Self-reported | Money Journal | "What you told me" |
| Automated | Bank connection | Not in prototype |

Never blur these. The gaps between them are the product.

## Two different gaps

A trap worth naming. "Over on dining out" can mean two things:

- **Over your own plan** — $429 against a $320 budget. 34% over.
- **Over your peers** — $429 against a $370 benchmark. 16% over.

Both appear in the UI. Label them distinctly and never let one number stand in
for the other. The seeded observation uses the plan comparison.

## Lifestyle wizard

Six questions, before the budget exists:

1. How into food are you? (low / moderate / high)
2. How often do you cook? (rarely / sometimes / usually)
3. Hobbies and going out? (low / moderate / high)
4. Do you pay rent or a mortgage? (yes / no)
5. How do you get around? (car / transit / mostly walk)
6. How often do you travel? (rare / moderate / frequent)

Answers feed `lifestyleModifiers` in `peer-benchmarks.json` and produce a
starting budget across all twelve categories. The user then adjusts with
sliders.

## The benchmark model

AI-generated at build time, stored static (D20), structured as a model rather
than a lookup table:

```
peerValue = base[category][incomeBand][householdSize]
          × colTier[zipPrefix][category]
          × lifestyleMod[category]
```

Never real user data (D23). It's public spending data adjusted for where you
live and how you live. When a user asks, say exactly that.

Coverage: CA, AR, NY, VA (A12). Unlisted ZIP prefixes fall back to the
"moderate" tier rather than failing.

## Comparison view

All twelve categories. For each: plan, journal actual, peer value. Categories
with a gap worth noticing surface an observation card inline.

Deferred, specified only: special event and holiday budgets, gift-giving
budgets with per-recipient peer norms, seasonal push notifications.

**Done when:** the wizard produces a budget, benchmarks return adjusted peer
values for the persona, and all four seeded observations are visible.
