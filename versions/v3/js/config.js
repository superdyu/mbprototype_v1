// ─── Build configuration ──────────────────────────────────────────────────────
// Loads FIRST, before any data or app file. Nothing here depends on anything.

// D06/D07 — two entry variants, one flag. Flipping it must not require touching
// anything else; if you find yourself unwinding logic to make skip work, the
// wiring is wrong (01-onboarding.md is explicit about this).
//
//   false → onboarding runs → streak shows 1  (PERSONA.state.streakDaysIfOnboarded)
//   true  → straight to home → streak shows 6  (PERSONA.state.streakDays)
//
// Default is false per the spec. For a testing session aimed at the Money
// Journal, true gets there faster — the eight onboarding steps sit in front of
// the thing being measured.
const SKIP_ONBOARDING = false;
