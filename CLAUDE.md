# MoneyBuddy Prototype

In-browser, mobile-shaped prototype of a personal-finance coaching app. This is a
**clickable prototype**, not production software — favor clarity and fast iteration
over abstraction, but keep the file structure clean (see Architecture).

## Repo structure — multiple versions behind a gate

The repo root is a **passcode + version-selector gate** (`index.html`, `gate/`),
not the app itself. Each major iteration is a fully self-contained, independently
runnable copy of the app under `versions/<name>/` (currently `versions/v1/` and
`versions/v2/`). `versions/v1/` is a frozen milestone — don't edit it. New work
happens in the newest version folder (currently `versions/v2/`) unless told
otherwise.

- **The gate** (`index.html`, `gate/style.css`, `gate/gate.js`) is deliberately
  standalone and outside the app's module system — it never loads a version's
  `<script>` tags (see "Everything is global" below; two versions' scripts
  sharing one page would collide). Picking a version does a real page
  navigation to `versions/<name>/index.html`. Passcode is a hardcoded,
  intentionally-not-secure speed bump — don't add real auth here.
- **Adding a new major version:** copy the newest `versions/<name>/` folder to
  `versions/<next>/`, then add one entry to the `VERSIONS` array in
  `gate/gate.js`. No other wiring needed.
- Everything below this section (Architecture, hard conventions, Goals V2,
  Testing) describes the structure **inside a single version folder** — paths
  like `css/variables.css` or `js/state.js` are relative to whichever
  `versions/<name>/` you're working in.

## How to run / preview

- **No build step, no dependencies, no package.json.** Pure static files.
- Preview the gate: open the repo-root `index.html` (passcode `1337`), then pick
  a version.
- Preview a specific version directly (skip the gate): open
  `versions/v1/index.html` or `versions/v2/index.html`. The app renders into a
  phone frame on the left and an **Admin Tools** panel on the right (manual
  controls + time travel + state inspector for the active screen).
- In a headless environment with no browser, you cannot visually QA. Instead:
  - Syntax-check any file you touch: `node --check path/to/file.js`
  - For logic, write a temporary DOM-stubbed Node smoke harness that loads the
    relevant files, exercises the functions, asserts, prints results — **then
    delete it** (don't commit harnesses). See "Testing" below.

## Architecture (read before editing)

- **Vanilla JS. No framework.** One global `state` object (`js/state.js`) is the
  single source of truth. The entire UI is re-rendered from `state` by calling
  `render()` (`js/render.js`) after any state change. There is no virtual DOM and
  no partial updates — every handler mutates `state` then calls `render()`.
- **Everything is global.** Files are plain `<script>` tags concatenated by the
  browser (no modules/imports). Function and `const` names share one global
  namespace, so keep names unique and prefixed by feature (e.g. `goals*`, `gc*`,
  `gt*`).
- **Load order matters** and is fixed in `index.html`: dev error-catcher → data
  (`state`, `utils`) → shared components → Goals V2 module → screen renderers →
  shared UI (`badge-ring`, `nav`) → core engine (`wizard-bridge`, `render`,
  `navigation`). A file may only call things defined in earlier `<script>` tags
  at load time (calls inside functions are fine — they run after full load).

### File map
- `css/variables.css` — theme tokens with **light AND dark** scopes:
  `--card --text --line --accent --accent-soft --soft --muted --danger`. Always
  style with these vars so both modes work; never hardcode hex.
- `css/layout.css` — page/phone/admin frame. `css/components.css` — shared UI
  classes (buttons, cards, inputs, `.item-card`, etc.).
- `js/state.js` — the `state` object, `resetUserData()`, and the admin
  `destinations[]` jump list. `js/utils.js` — helpers incl. `activeTabFor`,
  `h()` (HTML-escape — **always escape interpolated user/data strings**),
  `budgetFmt`.
- `js/render.js` — `render()`, `renderScreen()`, `renderAdmin()`,
  `adminSubtitle()`, and the admin jump list. `js/navigation.js` — `go(screen)`,
  history. `js/wizard-bridge.js` — budget-wizard data bridge.
- `components/` — reusable visualizations (`thermometer`, `badge-ring`,
  `sprint-timeline`, `nav`). Reuse these; don't re-implement charts inline.
- `screens/` — one file per screen, each exporting a `render<Screen>()` and an
  optional `render<Screen>Admin()`.
- `js/goals/` — the **Goals V2** module (see below). `docs/goals-module-plan.md`
  is its authoritative spec.

### Adding a new screen (wiring checklist)
1. `screens/<name>.js` with `render<Name>()`.
2. Add a `<script>` tag in `index.html` in the screens block.
3. `js/render.js`: add to `renderScreen()` switch, `adminSubtitle()`,
   `renderAdmin()`, and the jump list.
4. `js/utils.js`: map the screen → its tab in `activeTabFor`.
5. `js/state.js`: add to `destinations[]` if it should appear in the admin jump.

## Hard conventions / gotchas (these have bitten us)

- **Surgical edits only.** When fixing one thing, change only that thing. Do not
  rewrite working code to fix broken code. Never collapse multiple files into one
  — modular structure is a hard requirement, not a preference.
- **`.item-card` is a `display:block`, not flex** (`css/components.css`). Any
  trailing child (chevron, checkbox) drops to its own line. Fix per-instance with
  **scoped inline flex** on that element; never change the global `.item-card`
  rule (it would shift every screen).
- **Inputs use `onchange`, not `oninput`.** `oninput` + full re-render destroys
  the focused element mid-keystroke and loses focus/cursor. Commit on blur with
  `onchange`. (Live-tuning admin sliders are the deliberate exception, paired with
  `debouncedRender()`.)
- **Always `h()`-escape** any string interpolated into an HTML template literal.

## Goals V2 module (`js/goals/` + `screens/goal-*.js`)

A gamified goal-setting system. Spec: `docs/goals-module-plan.md` (authoritative —
follow it for any module change). Core model:

- A goal = a **frozen `baseline`** + an **append-only `events[]`** array. Sprints,
  pace, cohort standings, achievements are all **derived by pure functions at
  render time**, never stored. (One deliberate stored exception: the debt-paydown
  `payoffCurve`.)
- **Simulated clock:** inside `js/goals/` and the goal screens, use
  `goalsTodayISO()` / `goalsNow()` (real now + `state.goalsV2.clockOffsetDays`).
  **Never call `todayISO()` there** — the admin panel time-travels via the offset,
  and `todayISO()` would ignore it. (Treat this as a grep gate.)
- **Deterministic cohort:** peer "bots" are pure functions of
  `(cohortSeed, dayIndex)` via FNV-1a hash + mulberry32 PRNG. Guardrails clamp
  only the *user's* rank, never bot scores. The board is explicitly labeled
  SIMULATED.
- **Thin documented seams:** all reads of host app state go through
  `goals-bridge.js`; all mocked automation (credit, rates, tax) goes through
  `goals-autofill.js`. Keep new host-state access behind the bridge.
- **`GOALS_TUNING`** (`goals-tuning.js`) is the single source of behavioral knobs,
  hot-editable from the admin tuning panel. Add new balance values there, not as
  inline literals.

## Testing (headless)

No browser/test runner is wired up. To verify logic, build a one-off Node harness
that stubs `document`/`window`, concatenates the needed files into a single script
(separate `vm.runInContext` calls do **not** share top-level `const` bindings —
browsers do, so concatenate into one script and run once), exercises the functions,
and asserts. Delete the harness before committing.

## Working with the repo owner

PM/product background, not a career engineer — explain with product/systems
analogies when teaching, but default to task-first execution. Direct feedback, no
filler. **Commit and push are one action** (always `git push` right after a
commit). Flag L/XL-scope changes before starting and include one suggested scope
reduction. Linux/WSL only — never touch `/mnt/c/Windows` or Program Files paths.
