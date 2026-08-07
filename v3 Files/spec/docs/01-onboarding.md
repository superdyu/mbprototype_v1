# Onboarding

Full onboarding is in the prototype (D06). A single config constant,
`SKIP_ONBOARDING`, bypasses it entirely (D07).

| Mode | Entry point | Streak shown |
|---|---|---|
| `false` (default) | Onboarding, step 1 | 1 day |
| `true` | Home | 6 days |

Flipping the flag must not require touching anything else. If you find yourself
unwinding logic to make skip work, the wiring is wrong.

## Sequence

1. **Name** — single field, warm prompt.
2. **ZIP** — drives the peer benchmark cost-of-living tier.
3. **Household size** — 1, 2, 3, 4+.
4. **Income band** — five bands, presented as ranges, never a precise figure.
5. **Lifestyle wizard** — six questions. See `04-budget-benchmarks.md`.
6. **Strategic goal** — "what are you actually here for?" Four options plus
   custom.
7. **Buddy creation** — breed, fur, eyes, nose, size.
8. **Trial popup** — fires immediately after buddy creation.

## Persona override

Steps 2, 3, and 4 override the hardcoded persona (D09). Everything else falls
back to `persona.json`. If a tester skips a field, the persona value stands —
never block progress to collect data.

## Buddy creation

Hand-authored parameterized SVG (D10). No Spline, no animation library, no
image generation dependency.

Breed is a shape variant — three is enough. Fur, eye, and nose colors are SVG
fill variables, and size is a transform. This means character creation actually
works: every combination renders, rather than the tester picking from a fixed
grid of pre-made stills.

Idle animation is CSS transforms on named SVG groups — ears, tail, head. Small
movements, four to six seconds apart.

Draw the puppy to the palette in `09-design-system.md`. Soft, rounded, few
paths. It should look hand-drawn, not rendered.

A default buddy exists for testers who skip. The default is the mascot.

## Trial popup

Seven-day free trial for the platinum tier. Shows the price and what a
subscriber gets. Accept or decline — the experience afterward is identical
(D32). No paywalls, no ads, no gated features anywhere in the prototype (D31).

Production behaviour, not built: declining re-prompts after three logged-in
days; trial completion converts to annual; the cheaper premium tier is only
offered to users who neither subscribed nor trialled.

**Done when:** a tester completes all eight steps and lands on home with a
1-day streak and their own ZIP reflected in the peer numbers.
