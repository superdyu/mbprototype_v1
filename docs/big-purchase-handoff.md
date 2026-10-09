# Big Purchase Calculator — handoff (updated 2026-10-03)

Everything below describes work that **already exists in this repo**, on branch
`HoffDemo-Purchase`, in `versions/v3.1c/`. Nothing here needs rebuilding. This
document is the state of play so a fresh session can pick up mid-flight.

**Section 0 is the newest work (2026-09-28 to 10-03) and supersedes anything
below it that disagrees.** Sections 1–10 were written 2026-09-27 and still
hold for steps 1–4, the money model, the copy and layout rules and the traps.

---

## 0. The new front (2026-09-28 → 10-03)

**Direction change (owner):** the tool used to start from a car the user
already wanted and hunt for a cheaper one. It now starts from the PERSON:
what they want the car for, what peers spend, and a specific make and model,
with the real cost to own. The original four steps stay, unchanged, at the end.

```
onboarding (ZIP, income, miles) → bpLanding → bpFinder → bpSetup (1) → bpCost (2) → bpFinance (3) → bpCommit (4)
```

Full rulings with the owner's words: `versions/v3.1c/CLAUDE.md`, section
**"THE NEW FRONT"**. Summary:

| Piece | State |
|---|---|
| **Onboarding** | 3 questions: ZIP, income (docked at the bottom, tap advances, band midpoint, no slider), miles. Household and place were added then removed again |
| **Landing** (`screens/bp-landing.js`) | One-line header "Thinking about a big purchase?" (20px, nowrap), two lines of value copy, fund box that says why before it asks ("Before you buy", then the owner's verbatim line, question, three answers last), category list pinned to the bottom. Body is space-between, reading copy centred |
| **Find your car** (`screens/bp-finder.js`, model `js/bp-finder.js`) | Views: start · know · quiz · cars · car |
| start | Owner's banner `assets/img/buddy-car.jpg` (190px), title, lead, two path buttons pinned to the bottom. **No peer figures here** |
| know | Car-site pattern: Make (A–Z) → Model (locked until make) → New / Used price tiles (20px bold) → "See the real cost to own". Make/Model open **bottom sheets**, not native selects (those dropped UP) |
| quiz | 5 short fun questions → a type+use ("Adventure SUV") with two "Also fits" links → price range = tier + $ range, "Peers spend about here" tag → 3 specific cars, each a NEW and a USED price to tap |
| car | Five lines (sticker · down · **total monthly**, highlighted · year 1 · 5 years), loan line + "See how we calculated this" (Buddy panel in `calc` mode, every figure editable, edits carry to steps 1–4), peers box (payment, total monthly, share of income, $ difference), two named cheaper cars (same car used; what peers' payment buys) |
| **Data** (`data/big-purchase.json`) | `vehicle.finder`: 81 cars (Sedan/SUV/Truck × 3 uses × 3 tiers × 3), base trim, approx 2026 MSRP, each with `known` (its reputation, shown everywhere) and `why` (spec line, fallback). `vehicle.peerSpend`: peer payment + running cost by income band × household. `buddy-bp.json` step `pick`. All `_prototype` |

**Hard rules from this stretch:**
- **Peers are information, never a limit.** No "% of income is too high",
  no threshold, anywhere (owner: legal risk, "full stop").
- Suggested cars are "choices based on what you told us", never "best for you".
- Used = about 3 years old at `alternatives.usedCut` (28%), the same cut the
  options screen uses, so a used car costs the same on every screen.
- Every finder figure comes from `bpBreakdown()`. Checked: F-150 new is
  $1,250/mo, $22,900 year 1, $83,155 five years on the finder AND on step 2.
- The finder car view must fit one screen at its tallest (quiz pick, new,
  loan, both cheaper cars); measured 0 overflow incl. R1S electric at 40 mi.
- One-handed: primary actions at the bottom of every screen; space-between
  bodies with a small bottom inset (needs the three-class selector,
  `.journal-shell.onb-pinned.<shell> .journal-body`, or it silently loses).
- Household is no longer asked, so peers use the profile default (2) and the
  peer line names city and income only.

**Open items (not acted on):**
1. **ZIP field infinite loop** in onboarding (`screens/onboarding.js` ~510):
   at 5 digits it calls `kbdCommit()`, which dispatches `change`, which calls
   the same handler again. Pre-existing in v3.1c, not in v3.1. One-line
   re-entrancy guard offered, owner has not said yes.
2. The finder start's middle gap is ~157px at 812; owner may want it tightened.
3. Primary buttons are the theme's pale `--accent-fill`; can read as disabled.
   Theme-wide if changed.
4. "What peers' payment buys" row is hidden when that car would not cost less
   a month (e.g. a used Ram vs a new F-150).
5. `renderBpfPeerFact()` and `renderBpfModelList()` are unused, kept (house rule).
6. **Screen 3 of the new front** has not been specified yet; the owner said
   they would describe it next.
7. Carried over from below: credit-band default (600-660), stale
   `docs/big-purchase-spec.md`, ESF typed-field two-tap bug.
8. **Nothing is committed.**

---

## 1. Where the work is

| | |
|---|---|
| Branch | `HoffDemo-Purchase` (do not work on `main`) |
| Version folder | `versions/v3.1c/` — **all work happens here** |
| Gate label | `v3.1 (C)` — sits beside `v3 (A)` and `v3.1 (B)` |
| Tooling env var | `MB_VERSION=v3.1c` (the scripts default to `v3.1`) |
| Committed? | **No.** Every change sits in the working tree, uncommitted |

`versions/v3.1c/` is v3.1 (B) plus the Big Purchase Calculator, copied so the
gate can show the purchase build and the ESF/Buddy-chat build side by side.
**v3, v3.1, v1 and v2 are untouched by this work and must stay that way.**

### The authoritative record is already in the repo

`versions/v3.1c/CLAUDE.md` (~1,160 lines) auto-loads when you work in that
folder and carries **every ruling, trap and rationale** from the build,
including all of the design review recorded here. Read it before touching
anything. This handoff is the index; that file is the detail.

---

## 2. How to run and verify

- **No build step, no dependencies.** Pure static files.
- The app normally opens as a `file://` page, so `fetch()` is blocked. Data
  ships as `<script>`-loadable wrappers: edit `data/*.json`, then run
  `MB_VERSION=v3.1c bash scripts/wrap-data.sh`.
- **This machine has no `node` and no `python`**, so `scripts/check-syntax.sh`
  cannot run and a headless harness is not an option.
- **Verification is done in the browser instead**, and it works well:
  `scripts/serve.ps1` serves the repo on port 8787, and the desktop app's
  preview pane loads `http://localhost:8787/versions/v3.1c/index.html`.
  Reloading bounces to the gate, so navigate to that URL directly each time.
- The phone frame is 375x812 in testing. Its height follows the browser
  window, so **layout must work at 812 and at 1000+**.

### The fit check that matters

Steps 2, 3 and 4 must hold one screen with no scrolling. Measure, never
eyeball:

```js
const b = document.querySelector('.journal-body');
b.scrollHeight - b.clientHeight          // must be 0
```

**Tune against the TALLEST configuration** — premium SUV, electric, 40 miles a
day, on a loan — and let the layout handle shorter ones. Tuning against an
average car is what produced a dead band at the bottom of every cheaper one.

---

## 3. The flow as it stands

**Updated 2026-09-29: a new front was added.** Onboarding is five questions
(ZIP, income, household, place, miles), the landing states the tool's purpose,
and **`bpFinder` ("Find your car") sits between the landing and step 1**. It
starts from the person: pick a make and model, or a five-question quiz, then
three specific cars, then the five lines beside what peers spend and two
named cheaper cars. Details and rulings: `versions/v3.1c/CLAUDE.md`, "THE NEW
FRONT". The steps below are unchanged and follow it.

```
onboarding (5) → bpLanding → bpFinder → bpSetup (1) → bpCost (2) → bpFinance (3) → bpCommit (4)

(the original description, still accurate for steps 1-4:)
bpLanding → bpSetup (1) → bpCost (2) → bpFinance (3) → bpCommit (4)
                                   ↘ bpOptions (optional, no step number)
bpQuiz — "Help me pick", reachable from step 1
```

**Four numbered steps.** "Ways to spend less" (`bpOptions`) is deliberately not
one of them: it is optional, reached only by tapping **Explore** on step 2, and
numbering it produced a flow that jumped from step 2 to step 4.

| Screen | What it does |
|---|---|
| `bpLanding` | Emergency-fund box + the five categories (only *A vehicle* is built) |
| `bpSetup` (1) | One question at a time, choices docked at the bottom |
| `bpCost` (2) | Loan question, the six-row cost block, the saving callout, the running-cost table |
| `bpOptions` | Used vs one tier down, apples-to-apples over five years |
| `bpFinance` (3) | Price, loan settings, what it costs over five years, the cheaper options as savings |
| `bpCommit` (4) | Amount to save, the date, the reminder |

---

## 4. The money model — read this before touching a figure

`bpBreakdown()` in `js/bp-engine.js` is the **single source**. It returns two
groups that must never share a list:

- **What it costs:** price · taxes/fees/setup · running · loan interest →
  five-year total, with year one beside it.
- **How you pay:** down payment · amount financed · monthly payment.

A down payment and a loan are the *same money* as the price arriving in
instalments. Printing them beside the price counts the car twice.

### Rules that came out of review and must hold

1. **Everything rounds the same way.** `bpMoney()` everywhere; `bpMoney100()`
   is used nowhere. Two screens showed $800 and $760 for the same figure.
2. **`bpAmortize()` rounds the payment once, at the source**, so the schedule,
   the interest and every total are built from the payment the screens print.
   Rounding the parts and rounding the total are different sums.
3. **Year 1 ties exactly:** down payment + 12 payments + 12 months of running.
4. **The five-year total is not 60 x the payment** and should not be — the last
   payment of a rounded schedule is a stub, so it lands about $100 under.
5. **No resale, anywhere.** The price is counted in full and nothing is
   credited back. `bpVResale()` still exists; nothing reads it.
6. **If a figure appears on two screens it must be the same figure.** Fix
   apparent false precision by changing what is computed, never by rounding one
   of the two places it is shown.
7. **If a screen shows two numbers whose difference is the point, show the
   difference.** We do the maths; the user makes the decision.

### Verified, not a bug

A $55,000 premium car showing ~$96,000 over five years was checked line by
line: $55,000 + $4,395 tax/fees + $23,520 running + $12,909 interest. The same
money counted as down payment + 60 payments + 60 months of running comes to
$95,600, agreeing to a rounding stub. **The monthly payment row is the car
arriving monthly, not a charge on top of it.**

---

## 5. Data and figures (`data/big-purchase.json`)

| Figure | Value | Why |
|---|---|---|
| `mpg` | car 24 · SUV 15 · minivan 19 · truck 14 | The owner's real-world figures, with their own arithmetic: 15 mi/day ÷ 15 mpg x $4/gal |
| `pumpPricePerGallon` | **4.25** | This tool's own, not the emergency fund's $3.15. `bpVPerGallon()` takes the HIGHER of the two, so California keeps $4.65 |
| `factors.insuranceFullCoverage` | **1.6** | The shared state figure is the average premium written, mostly liability-only on paid-off cars. Every car here is being bought |
| `alternatives.usedCut` | **0.28** | A 1–3 year old car, not 20% |
| Subscriptions row | **removed** | An opt-in add-on, not a cost of owning the car. Figures and `bpVSubscriptions()` remain; the row is out of `BP_VEHICLE_ROWS`, `bpCostLines()` and `BP_CMP_ROWS` |
| Mileage | never asked | Read from the shared profile; `milesBandMidpoints` prices each onboarding band for a car |
| Diesel | hidden for minivan and motorcycle | Neither is sold as a diesel in the US |

**Open question for the owner:** the credit default is `600-660` at 9.71%, which
puts $12,909 of interest on a $55,000 car. At `661-780` (6.15%) it is about
$8,000. A buyer of a $55,000 premium car is more likely in the higher band. The
default has not been changed, because it moves every figure in the tool.

---

## 6. Copy rules

- **No em dashes in anything a tester reads.** They are an AI tell. Swept the
  whole feature; the check is one line:
  `(document.body.innerText.match(/—/g) || []).length` must be 0.
  Code comments and internal docs keep theirs.
- **No "it's not just X, it's Y" constructions.** Same tell.
- **No financial advice, ever** (D26). Surface the figure and the gap; never
  prescribe. No "you should", "we recommend", "the best option is".
- **Never call a cost high.** State it.
- **"You could have" is acceptable** for a projection: it is conditional, the
  rate is printed beside every figure it produces ("worth $26,567 at 7%"), and
  7% is documented as a long-run average. The line not to cross is a projected
  figure with no rate attached.
- **Owner-dictated copy is verbatim.** The six row labels on step 2 are theirs.

---

## 7. Layout rules earned the hard way

- **Steps 2 and 3 fill the frame.** Both bodies are
  `justify-content: space-between`; `gap` is a MINIMUM (11px / 8px), and
  leftover height goes into the gaps. Safe in a scroll container because
  space-between packs from the top when there is no free space — `center` and
  `end` would push the first block out of reach.
- **Step 3 has a shrinkable/growable spacer** at the foot of the body:
  `flex: 1 1 0; max-height: 36px`. Surplus fills the bottom inset first (so the
  last box sits ~2 lines clear of the menu), and the rest goes to the gaps. A
  fixed `padding-bottom` cannot do this — the tallest configuration has no
  spare height to give.
- **Specificity trap:** `.journal-shell.onb-pinned .journal-body` is three
  classes and beats a two-class `.bp-fin-shell .journal-body`. A rule that
  looks applied in the stylesheet can be doing nothing. Measure
  `footer.top - lastBox.bottom`.
- **Take space from inside the boxes, never from the gaps between them.**
- **One type system:** the display face for titles and the buttons that act,
  Inter for everything read. **Arial is gone repo-wide in this version** (it was
  seven undeliberate declarations). One size scale: 11 caption, 12.5 row, 15
  figure, one hero per screen.
  Check with: walk `.journal-shell *`, collect computed `fontFamily`, look at
  the set. Three families means something inherited a default nobody chose.

---

## 8. Screen-by-screen state

### Landing (`screens/bp-landing.js`)
- Emergency-fund box at the **top**, dashed border, eyebrow **"Tap one to
  continue"** centred at 12px, question on one line, three identical options
  (Yes · Start One Now · Ask me later) with **no highlighted answer** — a
  tinted button among plain ones reads as already chosen. Answering collapses
  it to a ticked one-line confirmation. It never blocks the flow.
- Lead copy: *"The price is only the start. What you spend to run it and keep
  it going can cost more than the thing itself."*
- **Category icons are the owner's own artwork**, `assets/cat-*.png`, sliced
  from an image they supplied. `bpCategoryIcon()` renders an `<img>`.
  **Do not redraw them.** A sixth category needs a tile from the owner.

### Step 1 — what you're buying (`screens/bp-setup.js`)
One question at a time, choices docked at the bottom in thumb reach, answers
collapsing into tappable dropdown rows. A persistent "Help me pick" link opens
the five-question quiz, which fills type, brand, fuel and condition.

### Step 2 — estimated costs (`screens/bp-cost.js`)
Title: *"Estimated costs for a new SUV"*. In order:

1. **"Will you need a loan?"** — Yes, car loan / No, paying cash. **First on
   the screen**, because every figure below it moves with the answer.
2. **The six rows**, labels unbolded, italic bracket on the same line, one
   figure column with tabular numerals, grouped by whitespace:
   - Car Price *(car + accessories):*
   - Down Payment *(20% of Car Price)*
   - Monthly Car Payment *(car loan)*
   - Monthly use and Maintenance
   - **Year 1 Cost** *(all-in)* — tinted band, the larger figure
   - **Cost over 5 Years** *(all-in)* — tinted band
   No `/mo` suffix: the label already says "Monthly".
   Car Price includes accessories (charger, riding gear), so the down-payment
   percentage is computed from that figure rather than printed as a flat 20%.
   Paying cash, rows 2 and 3 become one "Paid at purchase" row.
3. **The saving callout** — Explore / Not interested.
4. **The running-cost table** — "Estimated for Nashville, 15 miles a day"
   directly under the heading.

**Version A and Version B exist**, switched from the admin panel
(`bpCostVariant()`): A puts the table before the callout, B puts the callout in
the middle. **B is the default** (owner's pick). They differ by two lines in
`renderBpCost()` and nothing else.

### Step 3 — paying for it (`screens/bp-finance.js`)
- Headline: down payment | per month *(car payment + running it)*, with a rule
  between. The monthly figure is the **whole** monthly outgoing.
- Financing box: price, Loan/Cash, three unbolded setting rows opening sheets,
  and **"Amount financed"**.
- "What the car costs you over 5 years": four rows that sum to the total.
  **No year-one line** — this box answers one question.
- "Spend less, and over 5 years you could have": two chips, each showing the
  **saving** and what it is worth kept at 7%. Never each option's total, which
  made the reader subtract two six-figure numbers.

### Step 4 — plan for it (`screens/bp-commit.js`)
"To save $X for the down payment, by when?" with the monthly figure labelled
"to save".

### Onboarding (`screens/onboarding.js`)
`ONB_STEPS_BP = ["zip", "miles"]` under `BP_ENTRY`. The miles question is
**docked at the bottom with no Continue** — the tap is the answer and the answer
advances. Scoped to `BP_ENTRY` in `onbDocked()`, because the same renderer
serves the emergency fund's longer run.

---

## 9. Known issues and open items

1. **Nothing is committed.** The whole build and every revision sit in the
   working tree on `HoffDemo-Purchase`.
2. **The spec doc is stale.** `docs/big-purchase-spec.md` has not been updated
   for the last several rounds (the six-row block, the A/B variants, the money
   model, the data changes).
3. **The credit-band default** (section 5) is waiting on an owner decision.
4. **The ESF screens inherited from v3.1 still have the typed-field bug**:
   typing a figure then tapping Continue needs two taps, because the field's
   `change` fires on the blur the tap causes and `render()` replaces the button
   mid-tap. The BP screens fix it with `bpFieldCommitted()`. Not fixed in the
   ESF screens; it exists in v3.1 (B) as well.

---

## 10. Traps that fail silently

- **`perl -0pi -e` double-encodes this repo's files.** Three rounds of mojibake
  came from it. Use the Edit tool, or keep the replacement pure ASCII, or open
  with explicit `:encoding(UTF-8)` layers. Check with `grep -c "Ã¢" <file>`.
- **A typed field followed by a tap** loses the tap unless it commits through
  `bpFieldCommitted()`.
- **An inline SVG has no intrinsic size** and will take every pixel the row
  offers.
- **A grid label with `nowrap` pushes its own row off the grid** — a `1fr`
  track has `min-width: auto`. Use `min-width: 0`.
- **Everything is global.** One namespace across plain `<script>` tags; keep
  names unique and feature-prefixed, and mind the load order in `index.html`.
