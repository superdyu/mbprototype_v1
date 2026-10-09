# Big Purchase Calculator: state of the build

**Updated 2026-10-08.** This describes what exists in the prototype today. It
replaces the 2026-10-03 handoff, whose sections on steps 1 to 4 no longer
describe the flow a tester walks.

| | |
|---|---|
| Repository | `superdyu/mbprototype_v1` |
| Branch | **`HoffDemo-BigPurchase`** (commit `f84f142`). `HoffDemo-Purchase` holds the same work one commit behind. `main` is untouched |
| Version folder | `versions/v3.1c/`, gate label **v3.1 (C)**. v1, v2, v3 and v3.1 are untouched |
| Detailed rulings | `versions/v3.1c/CLAUDE.md`: every owner ruling, in the owner's words, with the reasoning and the traps |
| Status | Clickable prototype. All figures marked `_prototype` are estimates, not quotes |

---

## 1. What the tool is for

The Big Purchase Calculator helps someone feel comfortable with a car they are
about to buy. It starts from the **person** (what they use a car for, what
people like them spend) and ends with a **savings goal** for the money they
need up front. The question it answers is not "can I afford this" but "what
does this really cost to own, beside people like me, and what would it take to
get there".

**It never gives advice.** It shows figures and differences and lets the
tester decide. Peers are shown as information and never as a limit.

---

## 2. The flow

```
Onboarding (ZIP, income, miles)
  → Landing: "Thinking about a big purchase?"
  → Find your car
       ├ Help me choose a car  → 5 questions + price range → 3 specific cars
       └ I know what I want    → Make → Model → New or Used
  → What it costs to own      (the expense table, peers, alternative cars)
  → Your car                  (Paying for it + Planning for it, one screen)
  → Goal saved → Goals tab
```

| Screen id | File | What it does |
|---|---|---|
| `onboarding` | `screens/onboarding.js` | Three questions under `BP_ENTRY`: ZIP, income (docked, tap answers and advances), miles a day |
| `bpLanding` | `screens/bp-landing.js` | Purpose, the emergency-fund check, and the category list (only *A vehicle* is built) |
| `bpFinder` | `screens/bp-finder.js`, model `js/bp-finder.js` | Views: `start`, `quiz` (questions, price range and the cars on one screen), `car` (the cost screen) |
| `bpYourCar` | `screens/bp-yourcar.js` | Paying for it and Planning for it, then the goal |
| sheets | `screens/bp-sheet.js` | Make list, model list, alternatives, peers' range, lease options, months, finance settings |

**The old numbered steps 1 to 4** (`bpSetup`, `bpCost`, `bpFinance`,
`bpCommit`, plus `bpOptions` and `bpQuiz`) still exist in the code and still
work, but **the flow no longer walks them**. Continue on the cost screen goes
to `bpYourCar`. `bpCommit()` is still the function that saves the goal.

---

## 3. Screen by screen

### 3.1 Landing
- Header: **"Thinking about a big purchase?"** (one line), then *"We'll show you
  what it really costs to own, and help you find the one that fits your life."*
- **Emergency fund box, "Before you buy"**, two short paragraphs (3 lines in
  total):
  - *"A big purchase adds a new monthly bill, so it may help to have an
    Emergency Savings Fund first."*
  - *"It helps pay your bills in hard times."*
  - Then *"Do you have an Emergency Savings Fund?"* with Yes · Start One Now ·
    Ask me later. It never blocks the flow.
- **Category list** ("What are you thinking about buying?"), each option a
  2px-bordered box. The category artwork is the owner's and must not be
  redrawn.

### 3.2 Find your car (start)
Three sections with **equal space between them**:
1. **Help me choose a car**: a warm apricot pill with **Buddy's face** (the
   same art as the Ask button), an arrow, and the label.
2. **I know what I want**: Make → Model → New / Used → *"See the real cost to
   own"*.
   - Make and Model open **bottom sheets** (native selects open upward at the
     bottom of the phone). **The make list shows each maker's logo**, and so
     does the Make field once chosen.
   - **Choosing a make opens the Model list straight away.**
   - New and Used show their price on one line (*"Used, ~3 yrs"*). Every box
     in this section is the same 40px height.
   - Once chosen, the car's name and what it is known for show above.
3. The Back and Ask buttons.

Above them: the owner's banner (Buddy and a car with a bow), shown **whole and
never cropped**, the title *"Find the right car for you"*, and the lead line.

### 3.3 Help me choose (the quiz)
**Six question rows from the start** (the standing pattern, section 6.4):
Weekends, Riders, Driving, Fuel, Vibe, **Price**. The question being asked is
an open, outlined "Select one" row; the rest are locked; an answer fills its
row in place. The question being asked and its answers sit in the dock at the
bottom, **at the same height on every question**.

| Question | Answers |
|---|---|
| 🗓️ On a typical weekend, what do you use your car for? | 🏕️ Trips to the trail or campsite · ⚽ Driving to games and practice · 📦 Hauling something big · 🛍️ Errands and short trips (each with a one-line description) |
| 👥 Who's usually riding with you? | 🎧 Just me and my playlist · 👫 Me plus one · 👨‍👩‍👧 A full car, 3 to 5 · 🚌 The whole team, 6 or more |
| 🚗 What's your everyday drive? | 🏙️ Short hops around town · 🛣️ Long highway miles · 🌄 Dirt roads and back roads · 🚤 Pulling a trailer or boat |
| 🌱 How green are you feeling? | 🔌 Plug it in · 🍃 Hybrid's my speed · ⛽ Gas is fine · 🤷 Not sure yet |
| ✨ Pick a vibe | 🏎️ Fun to drive · 🛋️ Smooth and quiet · 💪 Tough and capable · 🔧 Simple and reliable |
| 💰 Price | Value · Standard · Premium, each with its dollar range and **the three cars in it by full name**; "Peers spend about here" tags the range peers fall in |

- **Answers look like buttons**: all in one soft-blue box, each a white raised
  button with a firm border and a round green arrow; the picked one turns
  green. Every question uses the same format and the same colour. Emojis
  live in the data (`emoji` on each question and answer), so they can change
  without code.
- Answered rows carry their emojis; once all six are in, they fold into one
  *"Your answers"* row.
- **Every picker has an X Close** at its foot (a question, the answers list,
  the price range), so a tester can back out without choosing.
- **The result**, on the same screen: the banner at 72% width; the folded
  answers; a box *"Sounds like **Commuter sedan** / Standard · $25K to $30K /
  Easy on gas for daily miles / Also fits: …"*; and **three car boxes**. Each
  car box has the maker's logo, the full name, one line on what the car is
  known for (centred, never wrapping), and **New** and **Used** buttons with the
  price and the 5-year cost. The box colour says where the car sits by price:
  **cheapest green**, then blue, then violet (no red or amber: a price is never
  flagged as high).

### 3.4 What it costs to own (the cost screen, finder view `car`)
- Eyebrow *"What it costs to own"*; the maker's logo and **"Jeep Gladiator
  (New)"**; the known-for line; then **$40,000 Sticker price | $8,000 Money
  down** in large type (*Due at signing* on a lease).
- **The expense table** (soft blue, 2px blue border, the thing to look at).
  This car in bold, **Peers\*** in plain smaller type behind one continuous
  vertical rule:

  | Row | This car | Peers* |
  |---|---|---|
  | Car payment (*Lease payment* on a lease) | ✓ | ✓ |
  | Cost of running it | ✓ | ✓ |
  | **Total monthly payment** (green highlight) | ✓ | ✓ |
  | Payment as % of income (the payment alone) | ✓ | ✓ |
  | Year 1 cost | ✓ | ✓ |
  | Cost over 5 years | ✓ | ✓ |

  Then **"See how we calculated this"** (once, under the table) and the
  footnote *"\* Based on peers in Nashville, estimated 15 miles a day."*
- **"Alternative cars that can save you money"**, halfway between the table
  and the buttons, with two columns: **Saved** *per month* and *over 5 years\**.
  - *Your pick* (grey, $0 and $0, still tappable to go back)
  - *Same car, used* (new cars only)
  - *Cheapest in class* (only if another car in the class costs less)
  - *What peers spend*: the peers' price range (never a single assumed car);
    tapping opens the cars in that range
  - The lowest monthly is green. Footnote: *"\* If the money you save is
    invested at 7% a year."*
  - **Tapping an option changes the costs above and outlines the row; the list
    itself never changes**, and the original is always one tap away.
- **"See how we calculated this"** opens Buddy's panel: price, taxes and fees,
  **Loan / Cash / Lease**, the loan or lease settings, credit score, insurance,
  fuel, upkeep, each editable, with the totals. Edits carry through to the next
  screen.

### 3.5 Your car (pay and plan, one screen)
- The maker's logo and **"Hyundai Elantra Hybrid (New)"**, and the line
  *"Choose how to pay, then plan your savings."*
- **"Change your mind? / Choose a different car ›"**: one button that opens
  the alternatives from the cost screen, plus *Search all cars*.
- **Paying for it**: Price (right-aligned field), **Loan / Cash / Lease**, then
  the settings as dropdown pills:
  - Loan: Down payment, Loan length, Credit score → **Amount financed**
  - Lease: Due at signing, Lease length, Miles a year, Credit score →
    **Monthly lease payment** (Lease is dimmed on a used car)
  - Cash: a one-line note
- **Planning for it**:
  - *"Do you need to save for the down payment?"* (*the purchase* for cash,
    *signing costs* for a lease) **Yes / No**.
  - Yes opens: Down payment, − Already saved (typed), **= Need to save**
    (highlighted green), **Save it by** (a dropdown of the next 36 months), and
    *"That is $434 a month for 12 months."*
  - If savings already cover it, it says so.
- **"Set goal: save $5,200 for the down payment"**, full width, above Back and
  Ask. It becomes **Done** when nothing needs saving or the answer is No (no
  goal is created).
- The four blocks (strip, the two cards, the goal button) are spaced
  **equally**.
- **The saved goal names the car**: *"Save for the BMW X3 (new)"*, and records
  `payMode: "lease"` when leased.

---

## 4. The money model

### 4.1 One source
`bpBreakdown()` in `js/bp-engine.js` is the single source for loan and cash.
`bpfFigures()` in `js/bp-finder.js` turns it into the screen figures (sticker,
down, payment, running, monthly, year 1, 5 years). **If a figure appears on two
screens it is the same figure.**

Rules that hold (from earlier review, still true):
- `bpMoney()` everywhere; one rounding.
- `bpAmortize()` rounds the payment once, at the source.
- Year 1 = down payment + 12 payments + 12 months of running it.
- The 5-year total is not 60 × the payment (the last payment is a stub).
- **No resale anywhere.** Nothing is credited back.
- If two numbers' difference is the point, **show the difference**.

### 4.2 Peers (`bpfPeer()`, `data/big-purchase.json` → `vehicle.peerSpend`)
- Peer car payment and running cost by **income band × household size**
  (array index = size − 1). Running cost is scaled by the ZIP's transport
  cost of living; the payment is not.
- Household is no longer asked, so peers use the profile default (2).
- **Peers' year 1 and 5 years** are estimated: the price peers' monthly
  payment buys on this car's loan settings (`bpfPeerPrice`, found by bisection
  against the engine), with the peers' running cost swapped in.
- The peers column is **always loan-based**, even when the tester leases.

### 4.3 Savings over 5 years
`bpfSavings()`: the money an alternative saves is **kept and grown at 7% a
year** (the session's `savingsRate`), not the plain price difference.
- Loan and cash rows use the engine's `bpOpportunity()`, which counts the
  up-front money and each month's difference.
- Lease rows and the peers' range use `bpfGrowth()` from the figures on screen:
  the up-front difference grown for 5 years plus the monthly difference as a
  60-month annuity.

### 4.4 Leasing (`js/bp-lease.js`), an estimate
On while `pay.leasing` is set, for **new cars only**. The standard formula:

```
capitalised cost = price - due at signing
residual         = price x share (64% / 58% / 50% for 24 / 36 / 48 months at
                   12,000 miles a year, minus 1 point per 1,000 extra miles)
monthly          = ((cap cost - residual) / term + (cap cost + residual) x MF)
                   x (1 + sales tax rate)
money factor     = the credit tier's APR / 2400
```

On a lease, Year 1 = due at signing + 12 × (payment + running), and **5 years
repeats the lease**. Options: due at signing $0 / $1,000 / $2,500 / $5,000,
24 / 36 / 48 months, 10,000 / 12,000 / 15,000 miles. These are placeholder
figures for the prototype.

---

## 5. Data

| File / key | What it holds |
|---|---|
| `data/big-purchase.json` → `vehicle.finder.models` | **81 cars**: Sedan, SUV, Truck × 3 uses × 3 tiers × 3, base trim, approximate 2026 MSRP. Each has `known` (its reputation, one short line, nine were shortened to fit one line) and `why` |
| `vehicle.finder.quiz` | The five questions, their answers, scores per type and use, and the `emoji` for each |
| `vehicle.peerSpend` | Peer payment and running cost (section 4.2) |
| `alternatives.usedCut` | **0.28**: used = about 3 years old, the same everywhere |
| `assets/img/logos/` | **23 maker logos**: 17 SVGs from Simple Icons, 6 PNGs (Genesis, GMC, Land Rover, Lexus, Mercedes-Benz, Rivian) from the open *car-logos-dataset*. Mapped in `BPF_LOGO_FILES`. Logos are the makers' trademarks, used here only to identify the cars in a prototype |
| `assets/img/buddy-car.jpg` | The owner's banner |

After editing any `data/*.json`, run `MB_VERSION=v3.1c bash scripts/wrap-data.sh`
(the app loads data through generated `.js` wrappers because it runs from
`file://`).

---

## 6. Standing rules (owner rulings)

### 6.1 Content and legal
- **No financial advice, ever.** No "you should", "we recommend", "best for you".
  Suggested cars are *choices based on what you told us*.
- **Peers are information, never a limit.** No "% of income is too high", no
  threshold, anywhere (owner: legal risk, "full stop").
- **Never call a cost high.** No red or amber on prices.
- No em dashes in anything a tester reads. The owner's copy is verbatim.

### 6.2 Type and colour
- **Dark text by default.** Inside the purchase screens `--text` is the strong
  ink and the base weight is 500; nothing a tester reads is grey.
- **Descriptive copy is centred**; labels inside rows and tables are not.
- **One font in tables and option lists**: Inter, regular and bold only, size
  changes allowed. (Weights 500/600/800/900 render as different-looking cuts on
  Windows and read as a font mix.)
- **Every box has a 2px border**, so each reads as its own function. **Every
  button has a visible border** so it looks pressable.

### 6.3 Layout
- **One screen, no scrolling.** Measured, never eyeballed:
  `document.querySelector('.journal-body')` → `scrollHeight - clientHeight`
  must be 0. Verified for all 81 cars, new and used, loan and lease, at a
  900px-tall window (phone frame ~820px).
- One-handed: primary actions at the bottom; choices docked; bottom sheets
  instead of native selects.
- **Spare height goes into equal gaps** between sections, never into the boxes.
  Take space from inside boxes when tightening.

### 6.4 Patterns to reuse
- **Question rows** (`renderBpfAnsRow`): every question has its row from the
  start; the one being asked is open; the rest are locked; answers fill in
  place and nothing jumps. Used by the quiz, step 1 and the old Help me pick.
  **Any new multi-question screen uses it.**
- **Every picker in the dock ends in an X Close** (`bpfDockClose`).
- **Options list with an original**: the tester's own choice stays at the top
  so it is one tap away; trying an option never rebuilds the list
  (`bpfOrigin`, `bpfChooseAlt`).

---

## 7. How to run and verify
- No build step, no dependencies; pure static files.
- On the owner's Windows machine there is no `node` or `python`. Verification is
  in the browser: `scripts/serve.ps1` serves the repo on port 8787 (launch
  config `prototype`); open
  `http://localhost:8787/versions/v3.1c/index.html` directly (a reload bounces
  to the gate).
- Drive state with the page's own functions to reach a screen quickly, for
  example `go('bpFinder'); bpfChoose(id, 'new')`, then `bpfContinue()`.

---

## 8. Open items

1. **Onboarding ZIP field loop** (`screens/onboarding.js` ~510): at 5 digits
   `kbdCommit()` dispatches `change`, which calls the same handler again. A
   one-line re-entrancy guard is offered; not applied.
2. **Credit-score default** is 600-660 (9.71%), which drives large interest
   figures; 661-780 would be about two-thirds of it. Owner decision.
3. **Lease and peer figures are placeholders.** Real residuals, money factors
   and peer lease data would replace them.
4. **Old steps 1 to 4 are dormant** in the code. Decide whether to remove them
   or keep them for comparison.
5. **Two long model names truncate** in the alternatives rows (*Colorado Trail
   Boss*, *Tacoma TRD Off-Road*).
6. **Short phones**: layouts are tuned at a ~820px phone. In a very short
   window (~540px) the body scrolls.
7. **Emoji rendering varies by platform** (the owner earlier rejected emoji
   for category icons for this reason; the quiz now uses them by request).
8. `docs/big-purchase-spec.md` is stale; this document is the current
   description.
9. The emergency-fund screens inherited from v3.1 still need two taps after a
   typed field (`bpFieldCommitted()` fixes it on the purchase screens only).
10. Unused renderers kept by house rule: `renderBpfPeerFact`,
    `renderBpfModelList`, `renderBpfKnow`, `renderBpfLines`, `renderBpfPeerBox`.

---

## 9. Traps that fail silently
- **Three-class selectors win**: `.journal-shell.onb-pinned .journal-body` beats
  a two-class rule. Use `.journal-shell.onb-pinned.<shell> .journal-body`.
- **A two-column grid quietly wraps a third item**: `.bp-seg` is a 2-column
  grid; three segments need `.bp-seg3`.
- **A grid label with `nowrap` pushes its row off the grid**; use `min-width: 0`.
- **An inline SVG has no intrinsic size**; give it a width and height.
- **A typed field followed by a tap** loses the tap unless it commits through
  `bpFieldCommitted()`.
- **`perl -0pi -e` double-encodes this repo's UTF-8 files** (emoji and `·`
  included). Use the Edit tool or `sed` with plain patterns.
- **Everything is global**: one namespace across plain `<script>` tags; keep
  names feature-prefixed and mind the load order in `index.html`
  (`js/bp-lease.js` loads after `js/bp-finder.js`).
