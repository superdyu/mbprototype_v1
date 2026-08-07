# AI-Generated Assets

Everything that needs generating in Midjourney or DALL·E, with prompts to copy
directly. Nine images total.

Anything not listed here — icons, badges, charts, UI chrome — is code, not
generated art. Use `lucide-react` and CSS.

---

## Before you generate: three rules

**1. Sprite sheets, not individual files.** Generate all six poses of a dog in
*one* image. This is not a convenience — it is the only reliable way to keep
style consistent. Six separate generations give you six slightly different dogs.
One generation gives you one dog six times.

**2. Flat cream background, no transparency needed.** Generate on solid
`#FBF7F0`, the same cream as the page. Make the buddy stage cream too. The
image sits on the page and reads as seamless with zero post-processing.

If you later want the buddy over a scene, run the file through `rembg` — free,
local, one command — rather than trying to make the generator produce alpha.

**3. Style block goes in every prompt.** Consistency across assets comes from
reusing the exact same style text. Do not paraphrase it between runs.

---

## The style block

Paste this into every prompt. Do not edit it between assets.

```
soft pastel storybook illustration, gouache paint texture, rounded gentle
shapes, palette of cream, sage green, soft sky blue, warm apricot, cozy and
calm mood, flat even lighting, no harsh shadows, simple minimal detail, thick
soft forms, no outlines, solid flat cream background
```

**Midjourney suffix** — append to every prompt:

```
--style raw --v 7 --no text, letters, numbers, watermark, signature,
photorealistic, harsh shadows, gradient background, drop shadow
```

**DALL·E note:** add this sentence, because it will otherwise add labels and
vignettes:

```
Do not include any text, letters, numbers, borders, or vignette. The background
must be one flat solid cream color across the entire image.
```

---

## A. Buddy character sheets — 6 images

Six poses per sheet, arranged 3 across and 2 down, so each cell is square.

Pose order matters — the slicing script expects it:

| Cell | Pose | Used for |
|---|---|---|
| 1 | Sitting, facing forward, calm | Default idle |
| 2 | Head tilted, looking up at viewer | Attentive, chat open |
| 3 | Drinking from a bowl, head down | Idle animation |
| 4 | Nose to ground, sniffing, tail up | Idle animation |
| 5 | Lying down, paws forward, relaxed | Idle animation |
| 6 | Sitting upright, front paws raised, joyful | Reward, streak, celebration |

### A1 — Golden retriever, cream fur *(default buddy)*

```
A character sheet of the same cute cartoon golden retriever puppy with pale
cream fur shown in six poses, arranged in a grid three across and two down,
each pose centered in its own square cell with generous even spacing. Pose one
sitting facing forward calmly. Pose two head tilted looking up. Pose three
drinking from a small bowl with head lowered. Pose four nose to the ground
sniffing with tail raised. Pose five lying down with front paws forward
relaxed. Pose six sitting upright with front paws raised joyfully. Identical
puppy in every pose, same proportions, same fur color, same face. Soft pastel
storybook illustration, gouache paint texture, rounded gentle shapes, palette
of cream, sage green, soft sky blue, warm apricot, cozy and calm mood, flat
even lighting, no harsh shadows, simple minimal detail, thick soft forms, no
outlines, solid flat cream background --ar 3:2 --style raw --v 7 --no text,
letters, numbers, watermark, signature, photorealistic, harsh shadows,
gradient background, drop shadow
```

### A2–A4 — Golden retriever, fur variants

Same prompt as A1. Change only the fur description, and add a style reference
to A1 so the shape stays identical.

- **A2 golden:** replace `pale cream fur` with `warm golden fur`
- **A3 chocolate:** replace with `deep chocolate brown fur`
- **A4 grey:** replace with `soft silver grey fur`

Midjourney: once A1 is right, append `--sref <A1 image URL> --sw 100` to A2–A4.
This locks the style. Without it you will get four different dogs.

DALL·E: upload A1 and say "same puppy, same style, same poses, only the fur
color changes to X."

### A5 — Corgi, tan and white

Same prompt as A1, replacing `golden retriever puppy with pale cream fur` with
`corgi puppy with tan and white fur and short legs`.

### A6 — Beagle, tricolor

Same prompt as A1, replacing with `beagle puppy with soft tricolor markings and
long floppy ears`.

---

## B. Backgrounds — 2 images

### B1 — Login scene, daytime

```
A wide empty cozy scene for an app loading screen. A gentle sunlit meadow with
soft rolling hills, a few simple round trees, small pastel wildflowers, and a
calm pale blue sky with two or three soft clouds. Warm morning light. The
center and lower third of the image are open and uncluttered so a character can
be placed there. Soft pastel storybook illustration, gouache paint texture,
rounded gentle shapes, palette of cream, sage green, soft sky blue, warm
apricot, cozy and calm mood, flat even lighting, no harsh shadows, simple
minimal detail, thick soft forms, no outlines --ar 9:16 --style raw --v 7 --no
text, letters, numbers, watermark, signature, photorealistic, harsh shadows,
people, animals, buildings
```

### B2 — Login scene, nighttime

Same prompt as B1, replacing the second sentence with:

```
A gentle moonlit meadow with soft rolling hills, a few simple round trees,
small glowing fireflies, and a deep dusky blue sky with a soft crescent moon
and scattered stars.
```

Change the palette line to `palette of dusky blue, deep sage, soft lavender,
warm apricot moonlight`.

Add `--sref <B1 image URL> --sw 100` so day and night are visibly the same
place.

---

## C. Supporting — 1 image

### C1 — Kibble bowl

```
A single small ceramic dog bowl filled with rounded kibble pieces, viewed
slightly from above, centered with generous empty space around it. Simple and
iconic. Soft pastel storybook illustration, gouache paint texture, rounded
gentle shapes, palette of cream, sage green, warm apricot, cozy and calm mood,
flat even lighting, no harsh shadows, simple minimal detail, thick soft forms,
no outlines, solid flat cream background --ar 1:1 --style raw --v 7 --no text,
letters, numbers, watermark, signature, photorealistic, harsh shadows, drop
shadow, dog, animal
```

---

## Not generated — build these in code

| Thing | Build with |
|---|---|
| Badges, all five metal tiers | CSS gradients on an SVG shape |
| Nav icons, task icons, UI chrome | `lucide-react` |
| Charts, progress rings, bars | `recharts` or hand SVG |
| Streak flame, kibble counter | `lucide-react` + CSS |
| Celebration burst | CSS particles, not art |
| Daily update visuals | Animated DOM, per `08-video-updates.md` |

Generating these costs consistency and gains nothing — they need to recolor,
scale, and animate, which raster art fights.

---

## Slicing the sheets

Sprite sheets ship whole. The app crops with CSS — no slicing needed at
runtime:

```css
.buddy {
  width: 240px;
  height: 240px;
  background-image: url('/assets/buddy-golden-cream.png');
  background-size: 720px 480px;   /* 3 cells across, 2 down */
  background-position: 0 0;        /* pose 1 */
}
.buddy[data-pose="2"] { background-position: -240px    0; }
.buddy[data-pose="3"] { background-position: -480px    0; }
.buddy[data-pose="4"] { background-position:    0  -240px; }
.buddy[data-pose="5"] { background-position: -240px -240px; }
.buddy[data-pose="6"] { background-position: -480px -240px; }
```

If a generation comes back with uneven cell spacing, crop it to a clean 3:2 in
any editor before importing. The math above assumes even cells.

If you would rather have individual files, `scripts/slice-sheet.py` in this
repo cuts a sheet into six PNGs.

---

## What this buys, and what it costs

Six sheets gives character creation three breeds and four fur colors on the
default breed — enough for a tester to feel they made a choice.

The honest limit: raster art cannot recolor. Every fur option is its own
generation. If you later want twelve fur colors across three breeds, that is
thirty-six sheets, and style drift becomes the problem. If character
customization turns out to matter in testing, that is the moment to move the
buddy to SVG.
