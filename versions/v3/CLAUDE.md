# Money Buddy v3

Auto-loads whenever you work in `versions/v3/`. Everything here binds even if
nobody opens another doc.

## Read first

| File | Why |
|---|---|
| `plan.md` §0 (repo root) | **21 locked decisions, L1–L21. Do not re-litigate them.** L1–L19 were settled across eight question rounds with the repo owner; L20 and L21 landed mid- and post-build |
| `versions/v3/PROGRESS.md` | Start at `Current state:`, work the first unchecked item, tick as you go |
| `versions/v3/docs/architecture.md` | Cross-cutting contracts — data loading, taxonomy, nav, top bar, audio |
| `versions/v3/docs/spec-coverage.md` | Where each of the 53 spec items lands |

The spec is at `v3 Files/spec/` — **read-only reference, never edit it.**
Its `docs/DECISIONS.md` beats every other spec doc; `plan.md` §0 beats *that*
where they conflict. Several spec decisions are deliberately overridden
(A1, D04, D39, D40 — see §0).

**v3 is a delta over v2 (D37).** Where the spec is silent, v2 governs — carry
forward what v2 did rather than inventing.

## Traps that fail silently

Each of these produces a plausible-looking wrong result rather than an error.
All verified against the raw JSON on 2026-08-07.

- **`base[cat][band]` is a 4-element ARRAY indexed by `householdSize − 1`.**
  Household 2 → index **1**. `4+` clamps to index 3. Reading `[householdSize]`
  returns the next household's figure.
- **Cost of living is a two-step lookup** — `zipPrefixes[zip3]` gives a tier
  *name*, then `tiers[name][cat]` gives the multiplier. **Never read it
  directly**: `benchColMultipliers(zip)` resolves the ZIP's own county first
  (`data/zip-cost-of-living.json` — all of Arkansas and every bordering county,
  five-digit) and only then falls back to the prefix tier.
- **Lifestyle is a product across six dimensions**, not one lookup.
- **`paysRent` data keys are the strings `"true"` / `"false"` / `"shared"`**,
  not booleans. The wizard's option values map onto them via `benchLifestyleKey`:
  rent/mortgage → `"true"` (×1.0), family → `"false"` (×0.22, rent-free),
  other → `"shared"` (×0.6, the middle housing tier).
  **`commute`'s key for "mostly walk" is `none`.** A missed key silently
  contributes 1.0.
- **`_note` keys sit alongside real data** in `monthToDateActuals`,
  `PEER_BENCHMARKS.base`, `zipPrefixes`, and `lifestyleModifiers`.
  **Always iterate `CATEGORIES`, never `Object.keys(data)`.**
- **Lesson framing options key on `tag`, singular.** A `.tags` lookup collects
  nothing and plays the fallback variant every time.
- **The self-reported layer is `monthToDateActuals`** ($429 dining), *not* the
  sum of `journalHistory` (~$168). Getting it backwards breaks every observation.

Self-test for the benchmark model: Dining out, b3, household 2, ZIP 900, foodie
moderate + cooks sometimes → `275 × 1.34 × 1.0 = 368.5` → **370**.

## Hard rules

**Runtime**
- **No live LLM, no API keys, no network at runtime** (D02). Chat is a keyword
  matcher; benchmarks are static; the journal is structured.
- **No backend, no database, no localStorage** (D03). State is in-memory and
  resets on refresh. This is intentional.
- **The app runs on `file://`** — `fetch()` and XHR are blocked and there is no
  dev server. Data loads via `<script>` tags (`data/*.js`), never a network call.

**Code**
- Vanilla JS, everything global, plain `<script>` tags. Keep names unique and
  feature-prefixed. Load order in `index.html` matters.
- One global `state`; mutate it then call `render()`. No partial updates.
- **Always `h()`-escape** anything interpolated into an HTML template literal.
- **Inputs use `onchange`, not `oninput`** — a full re-render mid-keystroke
  destroys focus. Sliders are the exception, paired with `debouncedRender()`.
- **A `type="range"` slider on `oninput` must use `debouncedRender()`, never
  `render()`** — product sliders as much as admin ones.
  `render()` reassigns `.screen`'s innerHTML, destroying the element being
  dragged — the browser's pointer capture dies with the old node and the thumb
  stops tracking. State still updates immediately; only the repaint waits.
  If a handler serves both a slider and a button, pass a `live` flag rather
  than debouncing the button too (see `budgetSetPlan`).
- **Never declare a name in two files.** Everything is one global namespace, so
  the later `<script>` silently wins and the earlier becomes unreachable — not
  an error, just dead. `sweep.sh` §7b checks this; §7b's *reference* count
  cannot, because a shadowed function is still referenced.
- **`.item-card` is `display:block`, not flex.** Fix trailing children with
  scoped inline flex; never change the global rule.
- Style with CSS variables only, never hardcoded hex. **All four themes** must
  work (L21) — Light, Dark, Natural Light, Natural Dark. Adding a colour token
  means adding it to `:root` **and** all three theme classes, or the sweep fails.
- **Never hardcode a text colour over `--accent` or `--accent-fill`.** `--accent`
  is dark in the light themes and light in the dark ones. Use `--on-accent` and
  `--accent-fill-text`; `--on-dark` is only for genuinely always-dark surfaces.
- **A theme must never set `--chrome-*`, `--bg` or `--phone`.** They style the
  admin panel, page and bezel, which live outside `.screen` where theme classes
  are applied — the override is inert, and the frame is meant to hold still.
- **Surgical edits.** Change only what you're fixing. Never collapse files.
- **Do not delete unused code.** This is a prototype under iteration; something
  dropped today is something rewritten next week. `sweep.sh` §7b inventories
  unreferenced functions against a baseline and **warns only on new ones** —
  a function that was referenced and now isn't was likely orphaned by accident.
  Deliberately-unused code goes in `DEAD_BASELINE`, it does not get removed.
- **Never judge "is this used?" by grepping for `name(`.** Functions here are
  reached four ways: ordinary calls, `onclick` in screen template literals,
  `onclick` in `index.html`, and bare identifiers in dispatch tables. Only the
  first looks like a call. Use `sweep.sh` §7b — grep gets this wrong.

**Copy** — applies to every surface
- **No financial advice. Ever. Anywhere** (D26). Surface the number and the gap;
  never prescribe the action. **Any question asking what to do gets the
  safeguard reply** — `chatIsAdviceSeeking()` runs before keyword scoring (L20),
  because the library's own keywords miss most natural phrasings. Forbidden
  shapes in any copy you write: "you should", "we recommend", "cancel your",
  "switch to", "you must", "the best option is".
- **Frame flags as questions, not instructions.** "Haven't heard about Hulu in a
  while" — not "cancel Hulu."
- No exclamation marks in financial observations. Warm, plain, second person,
  sentence case.
- Tip banner is a hard **90-character** limit.
- **"Peers", never "average users"** — the data is an external mathematical
  aggregate, never real user data (D23).
- Fixed vocabulary: Buddy · Money Journal (never "expense tracker") · Charity
  Points (two non-converting tiers: 💎 diamonds = subscriber, 🦴 bones = free/ad;
  the old "Kibble" term is retired, though `state.kibble` stays as the internal
  bone counter) · Streak · Peers · Observation.

**Quality floor**
- **No screen renders empty** (D19). Fabricate a plausible value rather than
  showing a blank. Design for it; it can't be retrofitted cheaply.
- `prefers-reduced-motion` respected. Tap targets ≥44px. Keyboard focus visible.
- Mobile first — the phone frame is 390px.

## Adding a screen — 5-point wiring

A screen is **not done** until all five are complete, or the admin panel
silently degrades to its generic fallback:

1. `screens/<name>.js` → `render<Name>()` (+ optional `render<Name>Admin()`)
2. `<script>` tag in `index.html`, screens block
3. `js/render.js` → `renderScreen()` · `adminSubtitle()` · `renderAdmin()` · jump list
4. `js/utils.js` → `activeTabFor` (the nav stack is the real source of truth —
   see architecture §7; keep this as the admin-jump fallback)
5. `js/state.js` → `destinations[]`

Plus a **full-bleed mode class** if the screen hides the nav, zeroing *both* the
top-bar and nav offsets.

## Verifying

No browser here — you cannot visually QA. **Which JS engine exists depends on the
machine**: the Mac has `jsc` and no `node`; the Linux/WSL box has `node` (often
only under `~/.nvm`, off PATH) and no `jsc`. Don't assume either.
- `bash scripts/check-syntax.sh <path>` on everything you touch (no args = all
  v3 + gate JS). It's the only automated gate, and it detects both engines.
- For logic, write a temporary DOM-stubbed harness that concatenates the needed
  files into **one** script, then run it (`node harness.js` / `jsc harness.js`).
  Concatenating matters: separately-evaluated scripts don't share top-level
  `const` bindings, but a browser's `<script>` tags do. Under node, use
  `vm.runInContext` with a stub context and append `this.__api = { ... }` —
  top-level `const` does not attach to a vm context's globals.
  **Delete it before committing.**
- The data wrappers are checkable: eval each `data/*.js` and deep-compare the
  global it declares against the `.json` beside it. That catches wrapper drift,
  which is silent and otherwise invisible until a figure looks wrong.
- Ask the repo owner to eyeball anything visual — say so plainly rather than
  claiming it renders.

## Don't

- Don't edit `versions/v1/` or `versions/v2/` — both frozen. Versions are test
  variants a tester picks at the gate, not a migration path.
- Don't build sprite-sheet `background-position` cropping — there is no buddy
  art and never will be (L15).
- Don't add variants to "cover" unmatched lesson tags — falling through to the
  fallback is the design.
- Don't paraphrase `data/*.json` numbers into JS literals. Load them.
