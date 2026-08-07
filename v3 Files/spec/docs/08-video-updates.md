# Daily Update and Share

The payoff moment, and the riskiest piece technically. Daily only (D27).

## What it is

A personalized read on how the week is going — the tone of a financial podcast
made for one person. Script plus synchronized visuals. In the prototype it's an
animated DOM sequence, not an encoded video (A9).

Three engagement variants recorded: slightly behind (default, matches the
persona), on track, slightly ahead (A10). Make them selectable so testers can
see more than one.

## The script/visual split

**Scripts stay generalized. Visuals carry the numbers** (D30).

The script says "you're spending more on eating out than most households like
yours." The visual shows $429 against $370 in an animating bar. This is
deliberate: it means one recorded script serves every user, and the figures stay
accurate without rewriting audio.

## Timing — read this before building

The production pipeline is: script text → TTS → extract timings → write timings
back → visuals resync. Timings get rewritten repeatedly; script text does not.

So they never share an object. Segments carry ids. Timings are keyed by segment
id in a separate block. Visual cues reference segment ids, never timestamps —
when a timing shifts, visuals follow with no further edits.

In the prototype, Web Speech API `boundary` events populate the timing map live
at playback. Static timings in `daily-scripts.json` are the fallback for
browsers that don't fire them.

Segments without a timing entry estimate duration from word count at 165 wpm.

## Completion and share

A summary screen: the observations, stacked, in plain language.

Then share. A sheet offering copy link, and platform buttons that don't connect
to anything real. **Anonymization is on by default.**

The part worth building properly is the expansion view: a preview showing
exactly what would be posted, with every financial figure anonymized. That
transparency is the trust mechanic, and it's testable in a way the platform
integrations aren't (A11).

Done → streak registers → home.

**Done when:** the update plays with synchronized speech and visuals, all three
variants are selectable, and the anonymization preview shows the real output.
