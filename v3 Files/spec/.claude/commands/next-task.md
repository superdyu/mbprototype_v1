---
description: Read PROGRESS.md and continue the build from the first unchecked item
---

Read `PROGRESS.md` and find the first unchecked item.

Before implementing:
1. Read `docs/DECISIONS.md` — it overrides every other doc.
2. Read the feature doc for the phase you're in (the file map is in `CLAUDE.md`).
3. Check `docs/ASSUMPTIONS.md` for anything relevant that was assumed rather
   than decided.

Then implement that item and everything after it in the same phase, unless the
phase is large enough that stopping at a natural boundary makes more sense.

As you complete each item, check it off in `PROGRESS.md`. If your implementation
diverged from the spec, add a one-line note beneath the item saying how and why.

Do not skip ahead to a later phase. Do not build anything in the Non-goals list
in `CLAUDE.md`.
