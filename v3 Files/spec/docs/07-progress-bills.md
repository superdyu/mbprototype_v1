# My Progress and Bills

The review surface. Most of it is views over data other phases produce, which
is why it's built late.

## Contents, in order (A3)

1. **Spend trend chart** — daily totals across the six seeded days, with the
   current month-to-date summary above it.
2. **Three-layer comparison** — plan, journal, peers, across twelve categories.
   Same data as the budget tab, framed for review rather than editing.
3. **Bills calendar** — upcoming payments with due dates.
4. **Subscription usage flags** — what they're paying for versus what they
   mention.
5. **Badge and buddy level** — lesson badges and overall level.
6. **Kibble balance.**

## Bills calendar

Tracks when payments are due. Two input paths at full scope: manual entry, or
automatic detection of recurring payment dates from a bank connection. In the
prototype, manual only, seeded from `persona.json`.

A bill outside the budget is flagged. The seeded car insurance — $187, due in
four days, not budgeted — is one of the four observations and must be reachable
here and from home.

Recording bills happens in Money Journal. Reviewing them happens here.

## Subscription flags

The engagement signal from journal entries drives this. A user says they
watched Netflix; that's a mention. Three weeks without a Hulu mention while
paying $18.99 a month is a flag.

Frame it as a question, never an instruction. "Haven't heard about Hulu in a
while" — not "cancel Hulu." The app has no idea whether they still want it.

## Trend depth

Six days of journal detail sits inside fabricated month-to-date totals (D19).
The chart must never render empty or near-empty. Where six days is too thin to
show a trend, show the month.

**Done when:** all six sections render with data, the bills calendar shows the
flagged insurance payment, and Hulu appears as a usage flag.
