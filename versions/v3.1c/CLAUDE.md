# Money Buddy v3.1 (C) — `versions/v3.1c/`

**This folder is v3.1 (B) plus the Big Purchase Calculator.** It was copied
from `versions/v3.1/` on branch `HoffDemo-Purchase` (2026-09-21) so the gate can
show the purchase build and the ESF/Buddy-chat build side by side. Everything
below this section was inherited from v3.1 and still applies here; read "v3.1"
as "this folder" where it describes contracts and traps.

- **Tooling:** pass `MB_VERSION=v3.1c` — the scripts default to `v3.1`.
  `wrap-data.sh` maps `big-purchase` → `BIG_PURCHASE` and `buddy-bp` → `BUDDY_BP`.
- **Spec:** `docs/big-purchase-spec.md` (repo root), revision 2.
- **Entry:** `BP_ENTRY` in `js/config.js` — onboarding hands to the calculator
  instead of the emergency fund. The Goals tab also carries an "Estimate a big
  purchase" card. `false` makes onboarding behave exactly like v3.1 (B).

### The calculator — files

| File | Holds |
|---|---|
| `js/bp-engine.js` | All arithmetic, category-blind, no DOM: cost stack, loans, true cost, opportunity cost, cash vs loan, save-to-afford, bands, log |
| `js/bp-vehicle.js` | The Vehicle category — registers itself with the engine (spec §3.1 interface) |
| `js/buddy-bp.js` / `screens/bp-buddy.js` | Buddy's explain-only model and panel, drawn with the ESF panel's classes |
| `screens/bp-landing.js` | Landing + emergency fund check (`bpLanding`), and the Goals-tab cards: entry, "Back to your car", both budget reminders |
| `js/bp-finder.js` / `screens/bp-finder.js` | Find your car (`bpFinder`): catalog, quiz, peers, the car view, Buddy's editable breakdown. Sits between the landing and step 1 |
| `screens/bp-setup.js` · `bp-cost.js` · `bp-options.js` · `bp-finance.js` · `bp-commit.js` | Steps 1–5 (`bpSetup`, `bpCost`, `bpOptions`, `bpFinance`, `bpCommit`) |
| `screens/bp-sheet.js` | Every in-frame sheet (range picker, credit, tax break, simulated IRS page, savings rate) — never a native `<select>` |
| `data/big-purchase.json` / `data/buddy-bp.json` | Every figure (sourced or `_prototype`) and Buddy's copy |

### Calls made where the spec was silent or contradicted itself

- **Trade-in in save-to-afford.** §3.5 subtracts it in both modes, but with a
  loan §3.4 already took it off the principal — counted twice. It comes off the
  cash needed **for cash buyers only**.
- **Charger / riding gear** are cash on the day in both modes, so they are in a
  loan buyer's amount to save too (§3.5 lists them for cash only).
- **Opportunity cost is summed month by month**, so a 36-month loan stops
  paying at 36. Identical to §3.6's closed form for 60 and 72 months.
- **Credit tiers are Experian Q2 2026, all four from that one release** (§3.4's
  requirement). Under 600 = subprime (501–600).
- **The financing block shows the monthly payment** where the spec repeated
  "Interest over 5 years" a line above the cash-vs-loan block's identical figure.
- **Changing new/used or the price on screen 2 clears per-car edits** — they
  describe a car no longer on screen. About-you rows survive.
- **The purchase-date task and goal-complete prompt surface on the Goals tab**,
  not the Home daily loop, because ESF_ONLY hides Home. Admin buttons fast-forward both.

### The flow is FIVE screens, not the spec's three (owner, 2026-09-22)

`bpLanding` → `bpSetup` (1) → `bpCost` (2) → `bpOptions` (3) → `bpFinance` (4)
→ `bpCommit` (5). The spec's merged screen 2 — cost stack, alternatives and
financing at once — was rejected outright ("way too much info"). Each of those
is now its own step, in the order a person actually decides:

1. **What you're buying** — one question at a time, choices docked at the bottom.
2. **The costs that are easy to miss** — ONLY the car they came for. A read-only
   table: ONE LINE per expense, no rules between rows, two aligned figure
   columns ("a month", "first year"), and the car's own price as the first row
   with a Total beneath. The headline equals that total exactly — it is printed
   from the same figure rather than rounded separately.
   Taxes and registration are ONE line. Renewal, loan interest and value lost
   are deliberately NOT here — none is a forgotten running cost. Ends with the
   single question "Will this be financed?"
3. **Ways to spend less** — the alternatives, with the context they never had.
   Summary cards ("Consider used to save $5,600") that expand into an
   apples-to-apples table: both cars on the same rows over five years, minus
   what each is worth when sold. Buddy with a bag of money carries the saving.
4. **Paying for it** — final price and financing adjustments, at the end.
5. **Plan for it** — the goal, the date, the reminder (unchanged).

`bpCostLines()` (screen 2) and `bpFiveYearRows()` (screen 3) are the two shapes
the engine's stack is displayed in; both read `bpStack()` and neither adds
arithmetic of its own.

**Buddy explains every expense** — `data/buddy-bp.json` has an entry per line on
screen 2 saying what it is, how it was worked out, and what it means.

### Owner's rulings after the first review (2026-09-22) — these beat the spec

- **Landing copy** is the owner's, verbatim: "The real cost of something isn't
  just what you pay at the register. We'll help you estimate the hidden and
  forgotten costs."
- **The fund question is a highlighted box at the bottom of the landing**, not
  its own screen. Answering never blocks picking a category.
- **Back on the landing returns to the onboarding question** the tester left
  from (`state.bpOnbReturn`), not to the Goals tab.
- **Step 1 asks one question at a time.** Choices dock at the bottom in thumb
  reach; each answer collapses into a dropdown-style row that reopens it.
- **Docked choices NEVER wrap.** `bpDockLayout()` picks a full-width grid with
  equal cells from the option count and label length: 2 short → two across,
  3 short → three across, 4 short → two by two, anything longer or carrying
  example text → one per line, left-aligned, with a tick on the selected row.
  *This reverses the centred, right-nudged cluster tried on 2026-09-22* — it
  wrapped to "2 + 2 + 1" with three different left edges, which is a wrapped
  grid rather than a layout. One-handed reach comes from the dock's position at
  the bottom of the screen, not from shoving controls sideways.
- **Costs are read-only.** No per-row editing, no range dropdowns, no trade-in
  or "anything else" rows (the engine still supports all three).
- **The saving is a picture:** Buddy with a bag of money, not a "worth about
  $X" sentence. An earlier growing-bills chart was replaced by it.
- **Financing is rows that open sheets**, not tile grids. Loan-vs-cash lives in
  its own sheet (§3.7's closing line is kept there, unchanged).

### Spec revision 4 reconciled (2026-09-26)

The owner revised `docs/big-purchase-spec.md` outside the code, from screenshots
of an earlier build, so parts of it restated things that had already been
changed here. The conflicts were put to them item by item. **Taken from the
spec:**

- **Upkeep is base-plus-rate:** `($400/yr + $0.06/mile) × condition × tier`,
  every factor centred on 1.00 at a NEW STANDARD car, plus this build's own fuel
  and type multipliers. The old flat per-mile model ran about a third of the
  right figure and collapsed at low mileage. It matters beyond one row: upkeep
  and the loan rate are the two costs that eat a used car's sticker advantage.
- **This feature never asks how far you drive.** `bpVMilesPerDay()` reads the
  profile or assumes `milesPerDayDefault` (15), and `bpVMilesLine()` says which
  of the two it was, on every screen that prints a figure built on it.
  `milesFloor` (2) is what "I don't drive" becomes HERE only — the onboarding
  band still means "no car" to the ESF.
- Gas SUV mpg 25 → 28. Tier ladder's third rung displays as **Standard**
  (the data key stays `everyday`). Screen 2 is **"The costs that are usually
  overlooked"**. Landing rows carry a per-category emoji from the data file.
- **The fund box is three side-by-side buttons** (Yes · Not yet/start one ·
  Not yet/later) that collapse to a one-line confirmation with a Change link.
- **The comparison table:** two figures in Buddy's bag (saved, and worth at the
  savings rate), no resale row, "Over 5 years" in the header once, a third
  column on request, the lowest Total in green, and tap-a-column to choose.

**Rejected, because the owner's later instructions in code win:** the three-step
merged screen, editable cost rows, the options as buttons on screen 2, the old
landing copy, and inline price editing on screen 2.

**Not built:** the shared profile with provenance (spec §6.2). It touches the
ESF too and waits until this feature settles.

### THE NEW FRONT: start from the person, not the car (owner, 2026-09-28/29)

Owner: *"the current experience is all about the user having a car in mind
then finding a cheaper option. the goal should actually make the user feel
comfortable with what they're buying."* The flow is now:

    onboarding (5) → bpLanding → bpFinder → bpSetup (1) → bpCost (2) → bpFinance (3) → bpCommit (4)

The original four steps stay, unchanged, at the end (owner: *"keep the
original screens in at the end"*). `bpFinder` writes the chosen car into
`state.bp.setup`, so step 1 opens fully answered and every figure on steps 2–4
is the finder's figure. Checked: F-150 new, $1,250 a month / $22,900 year 1 /
$83,155 five years on both.

- **Onboarding is THREE questions: ZIP, income, miles** (owner, 2026-09-29:
  household and place *"not needed"*, reversing the five of the day before).
  **Income is docked** at the bottom, tap = answer = advance, for one-handed
  use; the band's midpoint stands (no slider in this flow). Peers read the
  profile's default household (2), so the peer line names the city and
  income only, never a household size nobody gave.
- **Landing (screen 1), as of 2026-10-01:** a one-line header *"Thinking
  about a big purchase?"* (20px, nowrap; 23px wrapped) and two lines of value
  *"We'll show you what it really costs to own, and help you find the one
  that fits your life."*
  (owner: one-line header, max two lines, explain the value). Fund box line is
  the owner's, verbatim: *"An Emergency Savings Fund helps you save money to
  pay your monthly bills during hard times."* Fits 812px, 0 overflow.
- **Landing layout, 2026-10-01** (owner: *"too crowded… more space between the
  three sections… one hand friendly… primary action buttons towards the
  bottom… center the text"*): the body is `space-between` with a 16px minimum
  gap, so lead / fund box / category list spread (about 60px apart at 812)
  and the list sits 14px above the menu. Reading copy is centred. The fund box
  now says why it is there before it asks: eyebrow *"Before you buy"*
  (replacing "Tap one to continue"), *"A big purchase usually adds a new
  monthly bill."* then the owner's verbatim line, then the question, then the
  three answers last.
- **Finder start, 2026-10-01:** NO peer figures (owner: *"delete this
  section, it isn't needed here or yet"*); peers first appear beside a car.
  Spaced out (owner: *"space out screen 2"*): banner 190px, centred title and
  lead, the two path buttons pinned to the bottom in thumb reach, spare height
  between (about 157px at 812).
- **The owner's banner** (`assets/img/buddy-car.jpg`, Buddy and a car with a
  bow) sits on the FINDER's first view above *"Find the right car for you"*,
  140px tall, cover-cropped (owner, 2026-10-01: it belongs on that screen).
- **Find your car (screen 2), `screens/bp-finder.js`, model in
  `js/bp-finder.js`.** Five views: start (two paths plus what peers spend) ·
  know (type → make/model → new/used, dropdown choices only) · quiz (five
  short questions → a type-and-use → a price range) · cars (three specific
  cars, each with a NEW and a USED price to tap) · car (the five lines, peers,
  two ways to spend less). The tester taps a PRICE, not a car (owner).
- **"I know what I want" is the car-site pattern** (owner, 2026-10-01: *"the
  car list experience is pretty bad… drop-downs by make, then model… replicate
  that for familiarity"*). Make (A–Z, 23 makes) → Model (locked until a make
  is chosen, A–Z) → New / Used tiles with their prices → one "See what it
  costs" button, all in the thumb dock; the chosen car shows by name above.
  No type question. Picks survive Back from the car view.
  `renderBpfModelList()` (the old tier-grouped list) is unused, kept.
  **Not native `<select>`s** (owner, 2026-10-01: native ones at the bottom of
  the screen *"dropped up which was a weird experience"*). Each field looks
  like a car-site dropdown and opens a bottom sheet (`bpfOpenList`,
  `renderBpfListSheet`, routed through `renderBpLayer`), Close at the foot.
  New / Used prices are 20px 900, the same as the car's name (owner: *"at
  least as big and bold as the make and model"*). The button names the next
  screen and what is missing: "Pick a make and model" → "Pick new or used" →
  **"See the real cost to own"**.
- **Every car says what it is KNOWN for** (`known` in the catalog,
  `bpfKnown()`), its reputation, the line its marketing leads with (owner:
  *"what is the car known for? im sure it isn't known for 5 seats and roomy
  back seats"*). Shown on the pick card, the three-car cards and the car view.
  `why` (the spec line) stays as the fallback. `_prototype` copy: keep to
  reputation, avoid sales figures that date ("best-selling since…" only where
  long-standing: F-150, Camry, RAV4).
- **The five lines, in the owner's order:** sticker price · down payment ·
  **total monthly cost** (highlighted: car payment + running it) · year 1 ·
  five years. All from `bpBreakdown()`; nothing in the finder does its own
  arithmetic.
- **"See how we calculated this"** opens the Buddy panel in a `calc` mode
  (`renderBpfCalcPanel`): price, taxes, loan settings, insurance, fuel,
  upkeep, every one editable. Edits land on the pick card through
  `bpSetRow`, so they carry into steps 1–4. The panel keeps its scroll on
  repaint (`calcScroll`); the chat mode still pins to the newest message.
- **Two ways to spend less, each a SPECIFIC car** (owner: *"which car is it"*),
  one number each: the monthly, and the difference. (1) the same car used,
  about 3 years old. (2) what peers' payment buys: peers' monthly payment worked
  back to a price on the same loan terms (`bpfPeerPrice`, bisection against
  the engine), then the dearest car of the same use, new or used, at or under
  it. A row that would not cost less is left out.
- **Peers are information, never a limit.** Owner: *"cannot say that and that
  rule cannot be broken. full stop. we cannot incur legal risk."* No "% of
  income is too high", no threshold anywhere. The car view shows this car and
  peers side by side (payment, total monthly, share of income) and the
  difference in dollars. The range tag reads *"Peers spend about here"*.
- **Three tiers, displayed as a tier plus its dollar range** (owner: *"a duo
  display of the tier and price range"*): Value · Standard · Premium, keys
  `value` / `everyday` / `premium` so the insurance and upkeep factors apply
  unchanged. Each range is derived from its three cars, never typed.
- **Catalog: Sedan, SUV, Truck only** (owner accepted the scope cut), three
  uses each, 81 cars at base trim (owner: *"display the basic make/model"*),
  `vehicle.finder.models`. Sedan is type `car`. Prices are approximate 2026
  base MSRP, `_prototype`.
- **Used = about 3 years old, priced with `alternatives.usedCut`** (28%) — the
  same cut the options screen uses, so a used car costs the same wherever it
  appears. Its factors are the `1-3` age band (higher upkeep, lower insurance).
  Step 1 therefore shows its age as "1-3 yrs".
- **Peer car spend is new data:** `vehicle.peerSpend`, payment and running
  cost by income band and household size (array index = size − 1, the usual
  trap). Running is scaled by the ZIP's Transport cost-of-living multiplier;
  the payment is not. `_prototype`.
- **Why-lines are facts from the tester's answers**, never "best for you"
  (owner: *"it's always here are choices based on info the user submitted"*).
- **STANDING PATTERN, any screen that asks several questions (owner,
  2026-10-03):** *"the first question appears at the bottom then when it's
  answered, it moves to the top… show the first question as a drop-down with the
  question already opened… this pattern will need to be used everywhere."* Every
  question has its row from the start, in place: answered = its answer, the one
  being asked = an open outlined "Select one" row with its choices docked below,
  the rest locked. `renderBpfAnsRow(label, val, onclick, on, locked)` is the one
  helper; used by the finder quiz, step 1 and the old Help me pick. Any new
  multi-question screen uses it. Every picker that opens in the dock ends in an
  X "Close" (`bpfDockClose`).

### Onboarding here was TWO questions (2026-09-26) — superseded 2026-09-28

Now five; see the section above. Kept for the history.

`ONB_STEPS_BP = ["zip", "miles"]` in `screens/onboarding.js`, chosen by
`BP_ENTRY`. Owner: *"remove these onboarding screens from this build."* The
household, home-type, coverage and income steps belong to the emergency fund and
were being walked through on the way to a calculator that reads none of them.

**Consequence worth knowing:** somebody who starts an ESF from the landing
arrives without those answers. Every ESF model falls back (household → adults at
a middling age, place and coverage → null), so nothing breaks, but its figures
are coarser than they would be after its own onboarding.

**Mileage bands are priced for a car here.** `vehicle.milesBandMidpoints` maps
the onboarding band ids to what this tool uses — under 5 → 3.5, 5–15 → 10,
15–30 → **25**, 30+ → 40 — deliberately NOT the ESF's own midpoints (15–30 is 22
there). Car costs scale straight off this number, so the owner set it for the
car. `milesFloor` (2) still catches "I don't drive".

### "Help me pick" — the four-question quiz (2026-09-26)

`screens/bp-quiz.js`, screen id `bpQuiz`, offered from screen 1 while the type
is unanswered. Owner: *"the experience assumes the user has a car in mind, but
they may not."* Four questions — who's in the car, what it's for, where they
drive, what matters — each option carrying **scores per vehicle type** in
`vehicle.quiz`. Highest score wins; `tier` and `fuel` are nudges applied only
when an answer points somewhere clearly.

**A new question is a data entry, not a branch.** Nothing in the screen knows
what a truck is. It suggests and never chooses: the result screen offers *Use
this* or *I'll pick myself*, and no figure moves until the tap.

### Category icons are inline SVG, never emoji

`BP_CATEGORY_ICONS` in `screens/bp-landing.js`. Emoji were tried and rejected
(owner: *"these icons look janky and old"*) — they render at a different age and
weight on every platform, they cannot take the row's colour, and ✈️ drew nothing
at all here, which is what a font you do not ship can always do to you. The
icons inherit `currentColor`, so a coming-soon row greys out with its label.

**An inline SVG has no intrinsic size.** Without `.bp-cat-icon { width: 24px }`
it takes every pixel the flex row offers — which on first run was most of the
phone. Any new inline icon needs its box set.

### The quiz fills everything, not just the type

Five questions now, and the result writes **type, brand, fuel and condition**,
so screen 1 opens on the price alone (owner: *"we have the answers needed to
pre-fill these questions and jump to price screen"*).

**Fuel is never asked as a drivetrain question.** The options are "Plug it in",
"A bit of both", "Stick with gas" and "No preference", each carrying what it
means day to day — where you fill up, what breaks, what it costs to buy. "No
preference" is resolved from the answers already given: city or commuting →
hybrid, hauling in a truck → diesel, otherwise gas. A drivetrain the chosen type
does not offer falls back to gas.

### Where the cheaper options live

Both places, deliberately (owner's call, 2026-09-26). The **detail** keeps its
own screen — the original objection was that options arrived with no context —
and the **costs screen carries a callout** naming the biggest saving.

That callout started as a quiet one-line link and was missed ("it was almost
hidden"), so it is now the saving in 34px with two buttons: **Explore** opens
the options screen, **Not interested** takes it out of the flow — `Continue`
then goes straight to paying for it. The choice is reversible from the one line
it collapses to. A declined saving is logged (`bp_explore_choice`), which is
better instrumentation than a scroll-past ever was.

### WHAT IT COSTS vs HOW YOU PAY — the one money model (2026-09-27)

Owner: *"I need to be clear about the cost of the car… right now it's all of
them at once and really confusing."* The arithmetic was never wrong; the screens
answered two different questions in one column. `bpBreakdown()` in
`js/bp-engine.js` is now the single source, and it returns them **separately**:

| Group | Figures | Where it shows |
|---|---|---|
| **What it costs** | price · taxes, fees and setup · running and maintaining · loan interest → **5-year total**, with **year 1** beside it | Screen 4's "What the car costs you" box; the comparison's columns |
| **How you pay** | down payment · loan amount · monthly payment | Screen 4's headline and financing box |

**The two groups must never share a list.** A down payment and a loan are the
same money as the price, arriving in instalments — printing them beside it
counts the car twice, which is exactly what made the screen unreadable.

The four cost rows **sum to the total**, always. If a row is added, it goes in
`bpBreakdown().costs` or it does not appear.

**Consequences, applied:** screen 2 is running costs ONLY (its headline lost the
price, which was making an $87,820 figure that mixed the car with keeping it);
screen 4 carries the full picture in two boxes; the options list on screen 4
dropped the car you already chose, whose total sits immediately above it.

### Resale is not in this tool (2026-09-26)

Owner: *"I don't want resale value at all… it should never be included."* So
`bpStack().trueCost` counts the **price in full** and credits nothing back:

    trueCost = price + upfront + monthly×12N + yearly×(N−1) + interest

That is not the double count the old comment warned about — the price is counted
once and depreciation is not counted at all. `bpVResale()` and the retention
curve stay (the category owns its depreciation model) but **nothing reads
them**. A figure on screen that moves when the retention curve changes is a bug.

Two things fell out of it: the comparison columns now add up exactly, and
`bpOpportunity()` lost its `endDiff` term — there is no "the pricier car sells
for more" credit to subtract any more.

### Steps 2 and 3 FILL the frame (owner, 2026-09-27)

*"its all crowded towards the top with a lot of space at the bottom."* The
boxes were packed to the top on a fixed gap, so anything that made the content
shorter — a cheaper car, fewer rows, paying cash — left a dead band above the
footer while the blocks above it stayed jammed together. Every screenshot the
owner sent of a modest car looked worse than the worst case I had been tuning
against.

Both bodies are `justify-content: space-between` now, so the **leftover height
goes into the gaps**. The `gap` is a MINIMUM: 11px on step 2 and 9px on step 3,
which is what the tallest configuration needs to stay inside the frame, and
anything shorter spreads to fill.

Safe inside a scroll container because `space-between` packs from the top once
there is no free space. `center` and `end` do not — they would push the first
block above the scroll origin, out of reach.

**Tune the minimum gap against the TALLEST configuration** (premium SUV, 40
miles a day, electric, on a loan) and let the layout handle the rest. Tuning
against an average one is what produced the dead band.

**The last box stops short of the footer.** A 12px bottom inset on the body
(owner: *"the bottom box is too close to the menu buttons"*). Because the body
is `space-between`, that inset is paid for out of the gaps above rather than
out of the screen — the blocks stay spread, they just stop clear of the menu.

**Specificity trap:** `.journal-shell.onb-pinned .journal-body` is three
classes and beat the two-class `.bp-fin-shell .journal-body`, so the inset
silently did nothing on the screen that needed it most. Caught by measuring
`footer.top − lastBox.bottom`, not by looking at the stylesheet, where the rule
appeared to be there.

**Version B is the default** (owner: *"stick with version B"*): the saving in
the middle, the running-cost table last. A stays behind the admin toggle.

### Screen 2 ships as A and B (owner, 2026-09-27)

Two layouts, switched from the admin panel (`bpCostVariant()`, session state,
A by default):

- **A** — the six rows, the running-cost table, then the cheaper-options
  callout.
- **B** — the six rows, the **callout in the middle**, the table last.

`renderBpCost()` differs between them by exactly two lines. Anything else that
diverges makes the comparison worthless, so keep the difference to the order.

Everything else on the screen changed for both: labels **unbolded** (six bold
rows meant nothing was emphasised), "Down Payment at purchase" shortened to
**"Down Payment"**, the "estimated for…" line moved **under the table heading**
where it qualifies the table before it is read, the saving and "over 5 years"
onto one line, and the boxes given real gaps.

**Year 1 and the five-year total share a tinted band, and year one is the
bigger of the two** (owner: *"year 1 should be more prominent"*). It is the
figure a person can picture; the five-year total is what it grows into.

**Where the space came from:** inside the boxes, never from the gaps between
them. The gaps are what the owner asked for, and they are what every previous
trim had quietly eaten.

### ONE TYPE SYSTEM (owner, 2026-09-27)

*"all kinds of mixed fonts here. standardize every screen to use the same
font."* There were **three families on one screen**: the display face on titles
and footer buttons, Inter on content, and **Arial** on the Ask button and every
chat and input control, left over from the earliest screens. Seven `font-family:
Arial` declarations, none of them deliberate; all now `var(--font-body)`, and
`.esf-ask` takes the display face so the footer's three buttons match.

What is left is a system: **display face for titles and buttons that act, Inter
for everything a person reads.** Sizes are one scale — 11 caption, 12.5 row,
15 figure, and one hero per screen — replacing the 10 / 10.5 / 11 / 11.5 / 12 /
12.5 / 13 drift that accumulated one trim at a time.

**Check it the same way:** walk `.journal-shell *`, collect computed
`fontFamily`, and look at the set. Three families means something inherited a
default nobody chose.

### "You could have" is a projection, not a promise

Owner asked whether *"over 5 years you could have"* breaks any promise
language. It does not, and the reason is worth keeping: it is conditional
(*could*), the rate it assumes is **printed beside every figure it produces**
("worth $26,567 at 7%"), and 7% is documented as a long-run average rather than
a recent return. D26 forbids telling somebody what to do; it does not forbid
showing what a saving is worth. The line to never cross is a figure with no
rate attached, or any wording that implies the money is certain.

### Icons: the owner's own artwork (2026-09-27)

Four rounds were rejected — emoji (*"janky and old"*), flat line icons,
two-tone SVG silhouettes, then a redraw of those (*"the icons continue to look
like shit"*). The owner ended it by supplying the set they wanted: **"use the
ones here"**, with an image of five sticker-style tiles.

`assets/cat-*.png` are that image, sliced into its five tiles and nothing else.
`BP_CATEGORY_ICONS` is now a map of ids to file paths, `bpCategoryIcon()`
renders an `<img>`, and the CSS plate that used to sit behind the SVGs is gone
because each file carries its own coloured plate. **Do not redraw them.** If a
sixth category is added, ask for its tile.

The slice, for the record: the source is 809x170, tiles 136x136 at x = 13, 176,
340, 504, 668, y = 6. Order in the image is car, house, boat/RV, jet, bag —
**not** the order of the rows, so the mapping is explicit in the object.

### No em dashes in product copy (2026-09-27)

Owner: *"it sounds and looks like AI slop. the tone is right, but the use of
the em dash is an AI give away."* The landing lead was *"The real cost of a big
purchase isn't just what you pay for it — it includes using and maintaining
it."* Two tells in one line: the dash, and the "it's not just X, it's Y"
construction. It is two plain sentences now.

Swept the whole feature at the same time: thirteen in `data/buddy-bp.json`,
three in the screens. **Zero em dashes render in tester-facing text**, and the
check is one line in the console:

    (document.body.innerText.match(/\u2014/g) || []).length

Comments and these docs keep theirs; they are for us. The one exception on
screen is the `—` used as an empty-cell mark in the comparison table, which is
a symbol rather than punctuation.

### The fund box must look UNANSWERED (2026-09-27)

Owner: *"this doesn't indicate a user should make a selection. it looks like
it's preselected and something will happen, but nothing does… having the start
one now selected in green isn't working so need to try something else."*

The green "Start One Now" was the owner's own earlier call and it backfired for
a reason worth keeping: **one tinted button among three plain ones is the
universal look of a chosen option.** The box read as already answered, so the
tester went straight to the car. A different highlight would have had the same
problem; the answer is no highlight at all.

Three changes, and the `strong` flag is out of `BP_ESF_CHOICES` rather than
just unstyled:

1. **All three options identical** — nothing can be mistaken for a selection
   already made. Each carries a plain sub-line (*I have one · I need one*), so
   they read as three answers rather than one button and two footnotes.
2. **An instruction, not a hint.** A small accent eyebrow, `TAP ONE TO
   CONTINUE`, above a question shortened to *"Do you have an Emergency Savings
   Fund?"*.
3. **The box looks outstanding.** Dashed border with a solid accent spine down
   the left, which is visibly a task. Answering swaps it for the solid,
   ticked, one-line confirmation it already had — so the tester sees the state
   change they caused, which is the thing that was missing.

**Nothing here blocks the flow** (that has been the rule since 2026-09-22), and
"Tap one to continue" is a nudge, not a gate — the category rows stay live.

### We do the maths (2026-09-27)

Owner, on step 3's option chips: *"this screen is making users do math and it
shouldn't. it should show how much money is saved and then how much that could
be worth over the 5 years. it's this kind of insights we give to our users to
help make finance easy and approachable. we do the math… we offer the
data-driven insights. they make the decisions."*

The chips printed each option's five-year TOTAL — $124,500 next to a pick
costing $145,211 — so the one thing the tester wanted was a six-figure
subtraction they had to do in their head. Each chip now says the **saving**,
and under it what that saving is **worth kept at 7%**. Nothing on the chip
needs anything done to it.

**Treat this as the standing test for every figure in this tool: if a screen
shows two numbers whose difference is the point, show the difference.** The
invested figure comes from `bpOpportunity()`, the same function behind the
options screen's money-saved row, so the two screens cannot disagree.

### The monthly payment is NOT a second copy of the car (checked 2026-09-27)

Owner: *"the monthly car payment should only be the car loan payment (it looks
like the monthly is included and counted twice). I doubt a $55K car really
costs $98K in 5 years."* Worth checking properly rather than reassuring, and
the model holds. A $55,000 premium car, Nashville, 10 miles a day, 20% down at
the default 600-660 band:

| Row | |
|---|---|
| The car itself | $55,000 |
| Tax, fees and paperwork | $4,395 |
| Keeping it on the road (60 mo x $392) | $23,520 |
| Interest to the lender | $12,909 |
| **Five-year total** | **$95,824** |

The same money counted the other way — down payment $11,000 + 60 payments of
$1,020 + 60 months of running $390 — is $95,600. The two agree to a rounding
stub, which is the proof there is no double count: **60 payments equal the loan
plus its interest** ($48,395 + $12,909 = $61,304 against $61,200 shown), so the
payment row IS the car, arriving monthly, not a charge on top of it.

**What actually makes the number big is the credit band.** The data's default
is `600-660` at 9.71%, which puts $12,909 of interest on this car. At 661-780
(6.15%) it is about $8,000. A buyer of a $55,000 premium car is more likely in
the higher band, so the default flatters nobody — raise it with the owner
rather than changing it quietly, since it moves every figure in the tool.

### ONE ROUNDING, EVERYWHERE — the numbers have to add up (2026-09-27)

The owner reads down a screen and adds it up. Twice in one pass they caught
figures that did not tie, and both were display rounding rather than maths:

- *"why don't Monthly use and Maintenance $800/mo equal Total $760 in the table
  below?"* — the summary rounded to the nearest hundred, the table to the
  nearest five. `bpMoney100()` is now used **nowhere**; it is kept, with its
  argument written on it, but every screen prints `bpMoney()`.
- *"step 2 shows 2150 monthly, which doesn't match $1,400 + $760"* — step 3
  rounded the SUM of the raw payment and the running cost; step 2 rounded the
  payment alone. **Rounding the parts and rounding the total are different
  sums.** `bpAmortize()` now rounds the payment **once, at the source**, so the
  schedule, the interest and every total are built from the $1,390 the screens
  actually print. `bpMonthlyPayment()` / `bpMonthlyAllIn()` are the only ways a
  screen should get at it.

Year 1 ties exactly: down payment + 12 payments + 12 months of running. The
five-year total does not equal 60 × the payment, and should not — the last
payment of a rounded schedule is a stub, so it is about $100 under.

**If a figure appears on two screens, it must be the same figure.** Anything
that looks like false precision is fixed by changing what is computed, never by
rounding one of the two places it is shown.

### The six rows are a designed block, not six dashed bands (2026-09-27)

Owner: *"this legit looks ugly. use your best head of design."* The wording is
untouched — it is theirs, verbatim. What changed:

- **A figure column.** Labels flex, figures sit right in a fixed column with
  `tabular-nums`, so the digits stack and the eye runs down them. The bracket
  used to push every number to a different x.
- **Groups made of air, not rules.** A dashed line under all six rows gave six
  equal bands and no shape. They are really three questions — what it takes to
  drive it away, what it takes each month, what it comes to — so a 6px gap
  separates those and the dashes are gone.
- **One hero.** The five-year figure is the answer, so it is the only large
  green number, on its own tinted band at the foot of a white card. The card
  used to be tinted throughout, which made the band invisible.
- **`/mo` is a unit**, set smaller and lighter, never part of the figure.

### Step 2 is six rows, in the owner's words (2026-09-27)

Owner, verbatim: *"I want to split this out and give step by step so users
understand the math with pure clarity… I don't want subtext. I want the info
displayed in parenthesis after the line."* Bold label, italic non-bold bracket
**on the same line**, figure right. `renderBpCostLadder()`:

1. **Car Price** *(car + accessories):*
2. **Down Payment at purchase** *(20% of Car Price)*
3. **Monthly Car Payment** *(car loan)*
4. **Monthly use and Maintenance**
5. **Year 1 Cost** *(all-in)*
6. **Cost over 5 Years** *(all-in)*

Two things the wording forced:

- **Car Price includes the accessories**, because the bracket says it does — a
  home charger or a motorcycle's gear. The down-payment percentage is therefore
  computed from *that* figure, not printed as a flat "20%": on a car with no
  accessories they are the same number, and on an electric one they are not.
  A row whose job is to explain itself must not be the row that is wrong.
- **Paying cash, rows 2 and 3 do not exist** — there is no deposit and no
  payment — so a single "Paid at purchase" row stands in their place.

Row 2 is the only one whose bracket wraps. `white-space: nowrap` was tried and
pushed its figure 54px off the right edge; a wrapped bracket is still the same
line of copy, the separate sub-line underneath is what the owner cut.

### The loan question is the FIRST thing on step 2 (2026-09-27)

Owner: *"we need to know if its financed because the estimated costs are
assuming its financed."* Every figure on the screen moves with the answer, so
asking underneath them showed a table built on an unstated assumption and put
the switch below it. Worded **"Will you need a loan?"** with *"Yes, car loan"*
and *"No, paying cash"* — the owner's doubt that everyone reads "financed" the
same way is a fair one, and these answers name the thing either way.

### Fuel: the owner's mpg, and the owner's pump price (2026-09-27)

`mpg` is car 24 · SUV 15 · minivan 19 · truck 14, and
`pumpPricePerGallon` is **4.25**.

The mpg figures were raised earlier the same day, on a read of *"fuel costs
seem way off"* as meaning too high. It meant too **low**. The owner showed the
arithmetic they expect — *15 miles a day × 30 days ÷ 15 mpg × $4 a gallon* —
so a gas SUV is 15 mpg here and the pump price is the owner's, not the
emergency fund's. **When a complaint about a number is ambiguous in direction,
ask; do not pick one and rebuild the table around it.**

The pump price is this tool's own on purpose. The ESF prices a bill being paid
this month, where the EIA's $3.15 national average is right; this prices five
years of fuel from whenever the car is bought. `bpVPerGallon()` takes the
HIGHER of the two, so California keeps its $4.65 rather than being dragged down
to a floor meant for everywhere else. Diesel still adds its premium on top.

### Insurance is a full-coverage premium (2026-09-27)

The ESF's state figure is the **average premium written** in that state, and
most of those policies are liability-only on a paid-off car. Everything here is
being bought, usually on a loan that requires comprehensive and collision, so
`factors.insuranceFullCoverage` (1.6) scales the base **before** the type, tier
and age factors run. Owner: *"insurance seems way too low"*.

### There is no subscriptions row (2026-09-27)

Owner: *"remove subscriptions from the costs. that is an add-on that I wouldn't
consider for a car alone."* Satellite radio and the connected-car app are
things a person opts into; a screen that claims to price the car should not
price them. The row is out of `BP_VEHICLE_ROWS`, out of `bpCostLines()` and out
of `BP_CMP_ROWS`. The figures and `bpVSubscriptions()` are left in place, so
putting it back is one array entry — but do not put it back unasked.

### Money saved is a grid, not two flex columns (2026-09-27)

Owner: *"this screen is so misaligned… line it up exactly… line all this up in
a single line."* Two right-aligned flex columns of different widths gave
captions at different x, figures off each other's baseline, and a pencil
hanging off one number. `.bp-bag-row` is a three-cell grid (art, saving,
invested); each cell is caption over figure, so both pairs line up whatever the
captions say. The 7% the invested figure assumes was never stated anywhere —
it is its own line underneath now, and that line is the control that opens the
rate sheet.

### Diesel is hidden for minivans and motorcycles, on purpose

`fuels[].hideFor`. Neither is sold as a diesel in the US — diesel minivans are
a European body style, and diesel motorcycles are essentially military-only.
The list offers what a tester could actually go and buy.


### A used car is 28% off, not 20% (2026-09-27)

`alternatives.usedCut`. Owner: *"used price feels too low, especially compared
to other brand"* — the used card was saving a fraction of what one tier down
saved, which made it look like the weak option rather than the near one. Most
of what a car loses goes in its first two or three years.

### The option cards quote the PLAIN saving (2026-09-27)

They used to print the **invested** figure under "Save up to" while the
headline above printed the plain five-year saving, so one screen carried two
different numbers for the same choice. The cards now say "Saves over 5 years"
and the invested figure stays where it is explained — the money-saved row
inside the detail. Their copy also names the alternative (*"A 1-3 year old one,
about $43,200"*) before characterising it; the old "don't be car poor" quip
never said what was being offered (owner: *"the copy under used and other brand
is terrible, it doesn't make sense"*).

### Onboarding docks its choices too (2026-09-27)

The two questions in front of this flow (ZIP, miles) now match the calculator's
own manners: choices at the **bottom** in thumb reach, and **no Continue** on a
tile question — the tap is the answer and the answer is the advance (owner:
*"user is seeing a choice and just clicking. they can change if needed or go
back"*). Scoped to `BP_ENTRY` in `onbDocked()`, because the same renderer still
serves the emergency fund's longer onboarding run.

### The 3-year figure is gone

Removed on the owner's call (2026-09-26). It appeared on no screen after the
five-way split, and a second horizon printed beside the first reads as a rival
answer to the same question. `horizons.secondary` is out of the data file and
`stack3` is out of the saved plan. **Everything is 5 years.**

### Trap: perl one-liners double-encode this repo's files

Three separate rounds of mojibake — `600â660` in the credit labels, `$200 â
$225` in Buddy's ranges, a whole comment block in `bp-engine.js` — all from the
same mistake: `perl -0pi -e` reading a UTF-8 file as BYTES and writing back a
string containing a wide character. Perl then encodes the whole buffer again,
so every existing `–` becomes `â€"`. The damage is invisible in a diff viewer
and shows up on screen days later.

**Use the Edit tool for these files.** If a shell edit is genuinely needed,
either keep the replacement pure ASCII, or open with explicit layers:
`open my $in, "<:encoding(UTF-8)"` … `open my $out, ">:encoding(UTF-8)"`.
Check afterwards: `grep -c "Ã¢" <file>` should be 0.

### Trap: a grid label with `nowrap` pushes its own row off the grid

A `1fr` track has `min-width: auto`, so a `white-space: nowrap` label does not
shrink — the track grows past the container and drags the figure columns right
with it. One row's numbers then sit further right than every other row's, which
is exactly what "May need: Home charger" did. `min-width: 0` on the label is the
fix; an ellipsis is the fallback, and a smaller label is better than either.

### Trap: a typed field followed by a tap

A field commits on `change`, which fires on the blur caused by the NEXT tap's
pointerdown. If that handler calls `render()`, the tapped button is replaced
before the finger lifts and the click is lost. The keypad latch holds the
layout, not the node. Every BP typed field commits through `bpFieldCommitted()`
(`screens/bp-sheet.js`), which queues the repaint when a press is in flight.
**The ESF screens inherited from v3.1 still have this bug** — typing rent and
tapping Continue needs two taps. Not fixed here; it lives in B as well.

---

# Money Buddy v3.1

Auto-loads whenever you work in `versions/v3.1/`. Everything here binds even if
nobody opens another doc.

## v3.1 is the B side of an A/B pair

It began as a **byte-for-byte copy of `versions/v3/`**, so every contract, trap
and decision below was inherited rather than written for it. Two consequences:

- **`versions/v3/` is the control.** It does not get feature work — changing it
  changes what this is being measured against.
- **This is where new work happens.** The tooling agrees: `sweep.sh`,
  `wrap-data.sh` and the generators default to `MB_VERSION=v3.1`. Pass
  `MB_VERSION=v3` to look at the control side.

As the two diverge, record what differs — a reader who knows only that "it
started as a copy" cannot tell an intentional variation from a bug.

### What differs from v3 so far

1. **The budget builder is three steps with a per-line "Help me out" toggle.**
   `screens/budget-build.js`, screen id `budgetBuild`. v3 asks six lifestyle
   questions and derives a budget from the answers; v3.1 opens on figures the
   tester adjusts, grouped into three steps, and asks questions **only about
   the lines they say they cannot estimate**.
   - **Every line is a slider**, on all three steps. The steps group categories
     by how well a tester knows them — not by how the figure is entered. That
     was misread once and built as a number field on step 1; "Housing — Exact"
     means rent is a figure you can state, so it needs less dragging, not that
     it needs a keyboard.
   - **The thumb opens on `benchPeerValue()` for that profile**, the same
     options the band behind it is drawn with, so it starts dead centre of its
     own band. It used to open on the no-lifestyle national figure, which put
     it visibly off the band for no reason a tester could see.
   - **The header bar is cumulative** — `bbCategoriesSoFar()`, reviewed steps
     only (2 → 7 → 12). Counting all twelve makes the bar open near-full
     because ten unseen categories are already in it, and it then has nothing
     left to show as the tester works.
   - `BB_STEPS` must **partition the taxonomy exactly**. A category in no step
     saves at whatever the peer model opened it on and is never put to the
     tester; one in two steps is asked twice and the second answer silently
     wins. Neither raises anything. `scripts/sweep.js` §7 asserts it and the
     builder's admin card shows the coverage.
   - **This supersedes the earlier inverted flow.** `spendingProfile`,
     `lifestyleWizard` and `budgetCompare` are no longer reachable from the
     product — every door (Budget tab Start and Rebuild, the update-confirm
     Rebuild, the daily task) now opens `budgetBuild`. The screens, their
     renderers and `lwStart()` are **not deleted**: they stay routed and
     admin-reachable, and v3 still runs them.
2. **There are no lifestyle questions.** The six-dimension wizard is gone as a
   concept in v3.1, and with it the "Which is closer?" reconciliation.
   - **Consequence for the peer model:** `state.lifestyle` is still seeded from
     the persona at boot, so peer figures are not generic — but nothing in the
     v3.1 flow *changes* it any more. Until the Help-me-out trees write those
     dimensions back (planned), two testers with the same income, household and
     ZIP get the same band however differently they live. Do not write copy
     that implies otherwise.
3. **Budget figures render as a band, not three bars.**
   `components/budget-band.js` — one track carrying the peer band (the peer
   figure ±10%), a budget mark, and a dot. It replaced `renderComparisonRow`'s
   three stacked bars, so the Budget tab, "Where it's going", the category
   detail and My Progress all changed together from one file.
   - **The track's right edge is `1.1 × max(budget, actual, peerHi)` — every
     mark on the track is in that max**, so nothing ever falls off and there is
     always a tenth of the track as headroom past the highest one.
     *This was briefly the other way round*, with peers excluded so a band
     above everything else would run off the edge and be marked. Against the
     seeded persona that fired on **five of twelve** categories (LA prices, a
     modest budget) and drew an empty track on nearly half the rows. Owner's
     correction: the rail fits whatever is on it. "Peers spend far more than
     you planned" is better said by a band sitting hard right of the budget
     mark than by an empty track and a rule.
   - **`clipped` / `bandOffChart` survive as a GUARD, not a designed state.**
     Nothing can overflow the computed edge, but a caller supplying its own
     `hi` could hand over one tighter than the band — and a band silently drawn
     to the edge would read as "peers top out exactly here".
   - **Build mode supplies its own edge** (`budgetSliderMax()`), because there
     the budget IS the dragged value and an edge computed from the marks would
     move under the thumb. That ceiling is at least 2.2× the peer figure
     against a band top of 1.1×, so peers stay on screen there too — and a
     slider needs somewhere to drag *to*, which an edge pinned to the current
     marks would not leave.
   - The track doubles as the slider — a real `<input type="range">` over the
     marks with a transparent track. **The 9px inset on `.band-build
     .band-track` is load-bearing:** a native thumb's centre travels from
     `thumbWidth/2` to `width - thumbWidth/2` while `left: %` marks travel the
     full width, so without it the thumb and the band disagree by ~3% at the
     ends.
   - Colour could not reuse the old legend. `--accent` and `--good` are near
     identical in the Natural themes (#557B58 / #4B7650) — fine as separated
     bars, unreadable as marks on one track. Peers are the pale `--good-bg`
     wash, the budget a neutral `--muted` rule, `--accent` is the dot.
   - **The rail is `--rail`, a token added for it, used as a 1px border.**
     `--progress-bg` is a FILL and measures **1.02–1.20:1 against `--card`** in
     every theme — no perceptible edge, so the sliders rendered as a thumb
     floating in white space with no track under it. Nothing caught it: the
     contrast block checks text pairs at 4.5:1, and every one of those passed.
     `sweep.js` §1b now gates `--rail` at 2.0:1.
   - **"Worth a look" is signed and peers-only.** `cmpWorthNoticing` and
     `cmpImpact` both used `Math.abs`, so far *below* peers scored like far
     above — and the seeded persona is under peers nearly everywhere, so the
     section listed the biggest under-spends. A category over its own plan but
     under peers no longer qualifies; both gaps still appear on the card, so
     L11 holds.
4. **`Health` displays as "Medical & Dental" — via a label, not a rename.**
   `CATEGORY_LABELS` + `catLabel()` in `js/taxonomy.js`. The data key is
   untouched everywhere, because `"Health"` is a join key across
   peer-benchmarks, seed-state, monthToDateActuals, estimator-questions and
   zip-cost-of-living, and any file missed is a lookup that silently returns
   undefined. **`catLabel()` on every display site; the bare string for every
   lookup, object key, comparison and `onclick` argument.**
5. **"Help me out" has its own engine** — `js/help-me-out.js` (model),
   `data/help-me-out.json` (twelve trees, a source on every figure),
   `screens/help-me-out.js` (one screen per category: progressive reveal, then
   a confirm slider). It briefly rode on the actuals estimator and must not go
   back — see the trap below.
   - **FIGURES are data, ARITHMETIC is code.** A rate table belongs in JSON
     where it can be re-sourced; multiplying it by a slider belongs where it
     can be tested. `HMO_MODELS` reads every number out of `rates`; a literal
     in a model is a figure with no source attached.
   - **`col: "apply"` vs `col: "included"`.** Absolute trees get the category's
     cost-of-living multiplier on the way out. Trees anchored on a peer figure
     (Housing) or applying it per component (Utilities) declare `"included"`
     and do it themselves — applying it twice squares it.
   - **The confirm band is conditioned on the answers**, via
     `hmoLifestyleFrom()` → `PEER_BENCHMARKS.lifestyleModifiers`. Somebody who
     truthfully says "most nights" must not be shown a band built from people
     who cook. Where lifestyle reaches nothing (Utilities, Subscriptions,
     Medical, Personal care, Debt payments) it falls back to the profile band
     and only the copy changes.
   - **The trees are the only thing writing `state.lifestyle`** now that the
     six lifestyle questions are gone. `hmoApplyLifestyle()` runs on accept.
   - **Toggling several lines chains them.** `bbNext()` queues every pending
     category on the step and `hmoAdvanceQueue()` walks it, then advances the
     step. On accept the row's toggle switches **off** — a line you just
     answered four questions about must not look like one you never started.
   - **`screens/spend-estimator.js` still serves the actuals path** ("Update
     what you've spent"), where month-to-date scaling is correct. Its
     `target: "budget"` branch is no longer reached.
6. **`renderSpendEstimator` has a real no-session fallback.** A D19 fix, owner
   decision to leave v3's dead end alone — it is recorded in `D19_ACCEPTED` in
   `scripts/sweep.js` so the control's sweep stays green and the exception stays
   visible.
7. **Onboarding is seven steps, reordered.** v3 asks nine:
   name · ZIP · household · income · lifestyle · goal · buddy · film · trial.
   v3.1 asks **name · goal · ZIP · household · income · buddy · film**. The goal
   question moves from sixth to second so the tester has a stake before being
   asked for a ZIP and an income band; the housing/commute pair and the trial
   pitch are gone.
   - **The removed steps were not deleted.** Their keys came out of
     `ONB_STEPS`; every renderer, handler and helper is still there and still
     referenced, which is why nothing landed in `DEAD_BASELINE`. Putting a step
     back is a one-word edit.
   - **`state.trialAccepted` defaults to `true` in `onbFinish`.** Nobody answers
     the trial pitch any more, and that flag gates 💎 diamonds and the reward
     screen's subscriber section — left null they would be unreachable.
   - **Every step pins Back/Continue** (`pinned` is unconditional). v3 keeps
     `o.step >= 5`, which is still correct for *its* order.
   - The budget wizard now collects housing and commute from a blank slate:
     `state.lifestyleAnswered` is empty at the end of onboarding, so all six
     questions open unanswered. `lwStart()` already handled that case.

Everything else is still the copy.

### Shared with v3, deliberately

**The nine starting profiles** (`js/profiles.js`, `data/test-profiles.json`,
`screens/profile-picker.js`) are **identical in both versions** and are not part
of what the A/B tests — they are the floor both sides stand on. Three
cost-of-living tiers x three income levels, chosen empirically from
`zip-cost-of-living.json` by BEA RPP with Census ACS county median incomes:

| tier | ZIP | county | RPP | median | peers/mo |
|---|---|---|---|---|---|
| above | 95054 | Santa Clara, CA | 112.9 | $164,281 | $9.2k–12.0k |
| at | 37203 | Davidson (Nashville), TN | 97.4 | $75,664 | $3.3k–5.5k |
| below | 72201 | Pulaski (Little Rock), AR | 89.1 | $60,385 | $2.4k–3.1k |

- **They are also the headless test matrix.** `sweep.js` §1c drives every screen,
  the peer model, every Help-me-out tree and the whole builder through all nine.
  Everything the app computes is anchored on a ZIP and an income, and until this
  existed there was exactly one of each to test against — which is why "$10 of
  transport" had to be found by hand.
- **Household size is FIXED at 2 across all nine.** It drives groceries harder
  than anything else, so varying it would confound the two axes the matrix
  exists to isolate.
- **`PROFILE_PICKER` in `js/config.js` is one line** and takes the screen out of
  the flow; skip then applies `profileDefault()` silently and the matrix still
  works. This is scaffolding and is meant to be removable.
- **`SKIP_ONBOARDING` deliberately does NOT show the picker.** That flag exists
  to reach Home fast; stopping it for two questions defeats it.

## Read first

| File | Why |
|---|---|
| `plan.md` §0 (repo root) | **22 locked decisions, L1–L22. Do not re-litigate them.** L1–L19 were settled across eight question rounds with the repo owner; L20 and L21 landed mid- and post-build; **L22 reverses L15** and is the only decision so far to overturn an earlier one |
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
- **Cost of living is BEA Regional Price Parities, not the tier table.**
  `benchColMultipliers(zip)` is the only chokepoint: ZIP → county → BEA
  geography → four price buckets, then a **per-category** local modifier
  (housing from county rents, utilities from state electricity prices, nothing
  else — see architecture §5). `peer-benchmarks.json`'s `colTiers` survives only
  as a guard; **never read it directly.** Its four tiers gave Manhattan, Palo
  Alto, Santa Clara and LA all the same number and capped housing at 1.85.
- **`benchSelfTest` no longer asserts the spec's 370.** That figure carried the
  old `very_high` tier's 1.34; BEA prices LA restaurant meals at 1.071, so the
  peer value is 295. The test now checks base, lifestyle and cost-of-living
  separately — stronger than the single assertion it replaced.
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
- **`state.monthlyIncome` is not a take-home figure**, despite the seed JSON key
  still reading `monthlyIncomeNet`. It is `profile.incomeAnnual / 12` — what the
  tester said, no tax factor. Separate from `state.userProfile.monthlyIncome`,
  an unrelated v2 form field.
- **`travelFrequency`'s middle option is a ×1.0 no-op**, and the dimension moves
  only `Other`. Picking "Now and then" was mathematically identical to never
  answering, which is why its figure looked broken. Travel is now an explicit
  trips × cost ÷ 12 line inside Other and is exempt from the wizard's slider
  bands, because its figure is composed rather than `base × multipliers`.
- **Closing the simulated keyboard moves the layout by 250px**
  (`.screen-scroll.kbd-open`), so anything that closes it mid-gesture pulls the
  button out from under the finger and no `click` is ever dispatched. That is
  why `kbdInit` holds the close while a button press is in flight, and why
  `render()` calls `kbdSyncAfterRender()`.
  **BOTH focus handlers have to respect that latch, not just `focusout`.**
  Chrome and Edge focus a `<button>` on mousedown, so pressing Continue fires
  `focusin` with the BUTTON as target — and that path closed the keyboard
  synchronously, defeating the latch entirely. Safari and Firefox on macOS do
  not focus buttons this way, so the bug is invisible on half the machines you
  might check it on. Any test for this must fire the **whole** sequence:
  `pointerdown → focusout(field) → focusin(button) → pointerup → click`.
- **Both narrated players snap the clock forwards only.** `elapsed` is normally
  ahead of the current cue (the speech cap lets the tick run to just short of
  the next one), so an unconditional snap rewinds it — and the hyperframes
  faithfully rewind with it, which reads as a flicker at every line boundary.
  There are THREE snap sites: live speech in the lesson player, live speech in
  the onboarding player, and the onboarding `.wav` `onplay`.
- **A capped clock has to hold the PICTURE too.** When speech drives playback,
  the tick freezes `elapsed` at the speech cap and waits for `onEnd` — but the
  hyperframes are native CSS animations running on wall clock, so they carried
  on. Every 100ms tick then found them ahead of the frozen clock and
  `hyperframesSync`'s 120ms drift check yanked `currentTime` backwards, roughly
  eight times a second for the length of the overrun. That is a visible,
  erratic stutter and it fires on any line the narrator takes longer over than
  165 wpm predicts — two- and three-sentence lines, because sentence-final
  pauses are not in the word-count estimate. Both players now pass
  `playing: false` while held (`onbVideoHeld`, `lpHeld`), which pins the
  animation instead of fighting it.
- **A skipped onboarding field falls back to a PROFILE, never to the persona.**
  Every write in `onbFinish()` is guarded (`if (o.zip) …`), which is correct — an
  unanswered field must not clobber an answered one. What was wrong was what sat
  behind the guard: `bootV3`'s persona seed, so skipping quietly made the tester
  Sam from Los Angeles on $68,000 and nothing on screen said so. Every figure
  downstream was anchored on a profile nobody chose. `profileDefault()` is the
  fallback now. Related: `o.name || "Buddy"` made the **tester** "Buddy", the
  same as the dog — the person is "Me".
- **An unnamed buddy had three different fallbacks.** `"Buddy"` on Home and in
  Chat, `"Your buddy"` in the character frame. `onbFinish()` now names it once at
  the source so every surface agrees; the display-time fallbacks stay as
  belt-and-braces.
- **A BUDGET IS A MONTH. Never pro-rate one.** The Help-me-out questions first
  shipped on `estimatorCompute()`, which multiplies every option by
  `estimatorMonthFraction()` — right for "what have you spent so far this
  month", catastrophic for a budget. On the 4th of a 30-day month every answer
  came out at 13% of itself: "light local driving" became **$10** of transport,
  "a regular ongoing cost" became **$20** of healthcare, and picking the most
  expensive option still *lowered* the category, because the peer default it
  replaced was eight times larger than anything the sum could return. Nothing
  in `js/help-me-out.js` reads a clock, and `sweep.js` §7 stubs
  `estimatorMonthFraction` and asserts no tree's figure moves.
- **Never reach past `benchColMultipliers()` to price a place.** The Utilities
  model looked up `state.utilitiesRatio` itself to price local electricity —
  but `benchColLocalModifier` already returns exactly that ratio for Utilities,
  so the category multiplier carried it and the model squared it: Los Angeles
  at 1.353 x 1.648 x 1.648, a 65% overstatement, every figure still looking
  like a plausible power bill. Same shape as the retired `colTiers` trap.
  Utilities now applies the multiplier itself, to **power and water only** —
  broadband and a mobile plan are priced nationally, and a blanket multiplier
  overstated them by more than the double-count did.
- **`.screen input` outranks a bare component class, and it sets a background.**
  `.screen input, .screen select, .screen textarea` is (0,1,1) and applies
  `background: var(--card)` plus a card radius. A component class like
  `.band-range` is (0,1,0) and **loses**. This is invisible for every slider
  that keeps its native track — the element's own background is never painted —
  and lethal for the one with `-webkit-appearance: none`, which strips the
  track and lets that card background through as a full-width, 44px, rounded
  box drawn straight over the rail with the thumb floating in the middle of it.
  Any input styling that must win has to carry `.screen` itself. `sweep.js` §1b
  asserts every `.band-range` rule does, and `components.css` is injected into
  the sweep for exactly this class of check.
- **`--progress-bg` is a FILL, not an EDGE.** Against `--card` it is
  1.02–1.20:1 in all four themes — invisible. Anything whose *outline* carries
  meaning (a slider rail, where the thumb's position along it is the whole
  reading) needs `--rail` instead, which is gated at 2.0:1 by `sweep.js` §1b.
  The failure looks like a rendering bug — a thumb with no track — and no text
  contrast check will ever catch it.
- **`overflow-y: auto` is not a one-axis declaration.** When one axis is not
  `visible`, the other's `visible` **computes to `auto`** — so a rule meant to
  let a column scroll silently makes the element a scroll container
  *horizontally* too. Two things then break with no error and no scrollbar to
  hint at it: the `:focus-visible` ring (2px outline + 2px offset = 4px outside
  an input that is `width: 100%` of the content box) is clipped at both ends,
  and when a vertical scrollbar does appear it narrows the content so it stops
  lining up with anything outside the scroller. An outline is *ink* overflow,
  not scrollable overflow, which is why it clips without ever producing a
  horizontal scrollbar to explain itself. Fix: negative side margin plus equal
  padding, so the ring has room inside the scroller and the content box stays
  put. See `.journal-shell.onb-pinned .journal-body`.
- **A correction to a playing animation must GLIDE, not cut.** There is one at
  every segment boundary — the cue map is a word-count estimate and the narrator
  is not — and writing `currentTime` skips the outgoing beat's fade-out and
  starts the incoming one part-way through its fade-in. `hyperframesSync` nudges
  `playbackRate` for anything under `HF_SNAP_MS` and only snaps past it, so a
  scrub or a ±10s skip still lands instantly. Paused animations are always
  pinned exactly, because the hold depends on it.
- **`play()` on a FINISHED animation rewinds it to zero.** `hyperframesSync`
  knew this and still guarded on `playState !== "running"` — and a finished
  animation is not running either. Every element is one animation spanning the
  whole runtime, so they all finish while the narrator is still on the last
  line, and the tick flashed the entire scene back to its first beat ten times
  a second. Only `paused` and `idle` get `play()`; setting `currentTime` is
  enough to un-finish one.
- **The wizard composes answers from the BASELINE, never from the preview.**
  `preview = implied x drift`, where implied is the neutral peer figure times
  every applied modifier and drift is the tester's drag as a *ratio*. Scaling
  the live preview instead — which is what it used to do — compounds through
  rounding when someone toggles between options, and produced $10 groceries for
  "Very into it". Re-answering the same question clears that dimension's drift;
  answering a different one keeps it.
- **Paying a card in full costs nothing.** `lrSimBalance` returns 1 month and $0
  interest when the payment covers the balance, because that is the grace period
  the APR lesson teaches in its own script. It used to charge a month first.
- **There are TWO quiz screens.** `quiz` (`screens/quiz.js`) serves the v2
  catalog; `lessonQuiz` (`screens/lesson-outcome.js`) serves v3, and every v3
  lesson including APR goes through that one. Fixing the wrong one changes
  nothing a tester sees. `render.js` says which is which on its own subtitle
  lines.
- **HTML comments inside a template literal are rendered into the DOM.** Naming
  a function or a class in one puts that identifier in the markup and in any
  grep over it — which is how a deleted button appeared to still exist. Describe
  the thing, don't name it.
- **Onboarding's option lists must test `lifestyleAnswered`, not the value.**
  `state.onboarding.lifestyle` is seeded from the persona so the four dimensions
  onboarding never asks still reach `state.lifestyle`. Comparing that seeded
  value against an option renders it pre-picked — which is what put "Car" under
  the tester's thumb before they touched anything. `paysRent` only looked fine
  because its persona value is the boolean `true` and the option values are
  strings, so it never matched. Use `onbLifestylePicked()`.

Self-test for the benchmark model (`benchSelfTest`): Dining out, b3, household
2, ZIP 90066, foodie moderate + cooks sometimes. Base **275** and lifestyle
**1.0** are still exactly the spec's; the cost-of-living factor is now BEA's
1.071 rather than the retired tier's 1.34, so the result is **295**, not 370.
The three factors are asserted separately — see architecture §5.

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
- Don't build sprite-sheet `background-position` cropping. **L22 allows
  owner-supplied buddy illustrations, but they are separate files chosen by
  buddy state — not sheets addressed by offset.** D39's cropping machinery stays
  unbuilt.
- Don't delete the descriptive buddy frame now that art exists. It is the
  **fallback** (L22): no image set covers every breed x coat x pattern x eyes x
  nose x size x pose, and D19 forbids a screen rendering empty. A missing image
  must degrade to the description, never to a gap.
- Don't generate buddy art. D10's prohibition is on *generation* and it holds —
  the images are supplied by the owner.
- Don't add variants to "cover" unmatched lesson tags — falling through to the
  fallback is the design.
- Don't paraphrase `data/*.json` numbers into JS literals. Load them.

### Cost screen rulings (owner, 2026-10-03)

- Header reads "What it costs to own" with the make's logo beside the car name; the
  deal line is "New/Used · $ sticker price · $ down", 15px bold.
- One expense table, this car bold, peers plain at 13px behind a vertical rule, with the
  peer footnote and the assumed miles INSIDE the card. Regular and bold only, one font.
- **Ways to spend less (per month)**: measured against `bpfOrigin()`, the car the tester
  CHOSE. The original stays in the list as the first row so it is one tap away; trying
  an option (`bpfChooseAlt`) changes the costs and outlines the row, never the list.
  Rows: same car used (new only), cheapest in the class (only if it costs less), and
  "<tier> range, what peers spend", which opens the cars in that range (we do not
  assume peers own a used or any particular car). Model name only, one line (the
  logo carries the make). Lowest monthly is green; the saving is the bold figure.
- Logos: 17 Simple Icons SVGs + 6 PNGs from filippofilip95/car-logos-dataset, in
  `assets/img/logos/`, mapped in `BPF_LOGO_FILES`.

### The post-finder screen: `bpYourCar` (owner, 2026-10-03)

The finder's Continue now goes to ONE screen, `screens/bp-yourcar.js`, instead of steps 1 to 4
(those screens still exist but the new flow no longer walks them): the car's name and logo at
the top; one sentence on what the screen does; a single "Change your mind? / Choose a different
car" button that opens the cost screen's options in a sheet (`renderBpfSave`, `bpYcAltsSheet`);
**Paying for it** (price, Loan/Cash, down payment, loan length, credit score, amount
financed, the old step 3's own controls); **Planning for it** (down payment, already saved,
still to save, by when, then Set my goal = `bpCommit`). No arithmetic of its own: `bpStack`,
`bpBreakdown`, `bpSaveToAfford`. Fits one screen for loan, cash and "savings cover it".
**Leasing is NOT built yet**; owner asked for it as a payment option throughout (scope open).
- **Leasing (owner, 2026-10-03: "only include lease in this last screen")**: `js/bp-lease.js`.
  A third segment, Loan / Cash / Lease, on `bpYourCar` only (flag `pay.leasing`; the loan/cash
  engine and every earlier figure are untouched, the finder's cost table stays loan-based).
  New cars only (Lease is dimmed on a used one). Rows: due at signing, lease length, miles a
  year, credit score (the same sheet); the monthly is the standard formula in the file's
  header, an ESTIMATE (`_prototype`: residual 64/58/50% for 24/36/48 months at 12k miles,
  1 point per 1,000 miles, money factor = APR / 2400, sales tax on the payment). Planning
  reads "Due at signing". The saved goal carries `payMode: "lease"`.
- **The goal names the car** ("Save for the BMW X3 (new)") when it came from the finder.
- **Cost screen round 5 (owner, 2026-10-03):** the expense table is tinted (accent-soft,
  2px accent border) so it is the thing to look at; every box on these screens has a 2px
  border. The options box is **"Alternative cars that can save you money"**: two columns,
  *Saved per month* and *Saved over 5 years\** (the footnote says the money is invested at the
  saved rate, 7%), `bpfSavings`; loan and cash rows use `bpOpportunity`, a lease and the peers'
  range use `bpfGrowth` from the figures on screen. **Lease is now also in "How we worked it
  out"** (Loan / Cash / Lease), and while `pay.leasing` is on, `bpfFigures` returns lease
  figures for new cars (peers always stay loan-based, `{noLease:true}`). This reverses
  "lease on the last screen only". The calc panel's controls are condensed (26px segments).
