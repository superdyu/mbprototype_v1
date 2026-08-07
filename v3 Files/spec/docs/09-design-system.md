# Design System

Finch-like: soft pastels, cozy, rounded (D36). Warm and unhurried. This is an
app about money that is deliberately not trying to look like a bank.

## Palette

```
--cream        #FBF7F0   page background
--sage         #A8C4A2   primary, buddy stage, positive states
--sky          #9BBFD4   secondary, informational
--apricot      #E8B48A   accents, kibble, streak
--clay         #C98B7E   attention states — never alarm red
--ink          #3D3A36   text
--ink-soft     #7A736B   secondary text
```

No pure black, no pure white, no red. A flagged bill uses clay, not danger
colouring — nothing here is an emergency.

## Type

Display: a rounded geometric sans with warmth — Nunito or Quicksand. Used for
headings, figures, and the buddy's voice.

Body: a neutral, highly legible sans — Inter or Source Sans. Used for
everything a user has to read carefully.

Numbers are display face, one weight heavier than surrounding text, and always
larger than their label. Financial figures are the thing people look for.

## Shape and depth

Border radius 16px on cards, 24px on primary buttons, full round on pills and
the buddy stage. Nothing square.

Shadows are wide and soft — `0 4px 24px rgba(61,58,54,0.06)`. No hard edges,
no heavy elevation.

## Motion

Ease-out, 240ms, everywhere. The buddy's idle cycle runs slowly — a small
movement every four to six seconds, never constant.

The daily update is the one place motion is orchestrated rather than ambient.
Let it be the memorable moment; keep everything else quiet.

Respect `prefers-reduced-motion`: idle animation stops, transitions become
instant, the daily update plays as timed static frames.

## Voice

Warm, plain, second person, sentence case. No exclamation marks on financial
observations — the buddy can be encouraging, the numbers stay matter-of-fact
(A13).

Empty states invite action rather than apologize. Errors say what happened and
what to do. A button that says "Save" produces a confirmation that says
"Saved."

## Floor

Mobile viewport first. Visible keyboard focus. Reduced motion respected. Tap
targets 44px minimum.
