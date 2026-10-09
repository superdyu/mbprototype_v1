# Prompt for the new session

Copy everything below the line into the first message of the new chat, and
attach `docs/big-purchase-handoff.md`.

---

I'm continuing work on the Big Purchase Calculator in this repo. It is already
built, including a new front end added over the last few days. Do not start it
over, and do not rebuild anything.

**Where the work is:** branch `HoffDemo-Purchase`, version folder
`versions/v3.1c/` (gate label "v3.1 (C)"). All work happens there. `versions/v3`,
`v3.1`, `v1` and `v2` are untouched and must stay that way. Tooling needs
`MB_VERSION=v3.1c`, e.g. `MB_VERSION=v3.1c bash scripts/wrap-data.sh` after
editing `data/*.json`.

**Nothing is committed.** Ask me before committing or pushing.

**Read these first, before touching any file:**

1. `docs/big-purchase-handoff.md` (attached). **Section 0 is the newest work
   and wins over anything below it.**
2. `versions/v3.1c/CLAUDE.md`, especially the section "THE NEW FRONT". It is
   the authoritative record of every ruling, with my own words quoted.

**The flow now:** onboarding (ZIP, income, miles) → landing ("Thinking about a
big purchase?") → Find your car (`bpFinder`: I know what I want / Help me
choose → the car's real cost beside peers, with two named cheaper cars) → the
original steps 1–4, unchanged.

**How to verify.** No `node`, no `python` on this machine. Start the preview
with the `prototype` launch config (`scripts/serve.ps1`, port 8787) and
navigate straight to `http://localhost:8787/versions/v3.1c/index.html`.
Reloading bounces to onboarding, so drive state with the page's own functions
when you need to (e.g. set `state.profile`, then `bpOpen()`). Check at a
1200x900 viewport so the phone frame is 812 tall. Measure, don't eyeball:
`.journal-body` `scrollHeight - clientHeight` must be 0.

**Standing rules:**

- No financial advice, ever. **Peers are information, never a limit**: no
  "% of income is too high", no thresholds. Legal risk, full stop.
- Never "best for you". Choices are "based on what you told us".
- One money model, `bpBreakdown()`. The same figure on two screens must be the
  same number. Show the difference, we do the maths.
- No em dashes in anything a tester reads. Never call a cost high.
- My copy is verbatim.
- One-handed: primary actions at the bottom of the screen, choices docked.
  Native `<select>`s at the bottom open upward, so use bottom sheets.
- One type system: display face for titles and buttons that act, Inter for
  everything read. No Arial.
- Category icons and the Buddy/car banner are my artwork. Do not redraw them.
- Take space from inside the boxes, never from the gaps between them.

**How I want to work:** build and show me the result rather than describing
options. Direct feedback, no filler. Flag anything L/XL before starting with
one suggested scope reduction. Every visual change gets verified in the
browser and reported with what you measured.

**Open items to know about, not act on unless I say so:** the onboarding ZIP
infinite loop (a one-line fix is offered), the empty band in the middle of
the finder's first view, the pale primary button colour, and the credit-band
default. Next up is **screen 3 of the new front**, which I'll describe.

Start by reading those documents and telling me in a few lines what you
understand the current state to be. Then wait for my changes.
