// ─── Goals V2 · Simulated Clock ───────────────────────────────────────────────
// The module's ONLY time source. Multi-month goals with no backend can only be
// demoed via time travel, so every date the goals module computes flows through
// goalsTodayISO() = real-now + state.goalsV2.clockOffsetDays. The rest of the app
// keeps real time (todayISO() in js/utils.js). Per the spec, todayISO() is BANNED
// inside js/goals/ and the goal screens — enforced by grep in the final commit.
//
// All ISO strings are YYYY-MM-DD. Day math is done in UTC to avoid DST drift.

// Current simulated moment as a Date (midnight UTC of the sim day).
function goalsNow() {
  var base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + (state.goalsV2.clockOffsetDays || 0));
  return base;
}

// Simulated "today" as YYYY-MM-DD.
function goalsTodayISO() {
  return goalsNow().toISOString().slice(0, 10);
}

// Add n days to an ISO date → ISO date (n may be negative).
function goalsAddDays(iso, n) {
  var d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Whole days from a → b (b − a). Positive when b is later.
function goalsDaysBetween(aIso, bIso) {
  var a = new Date(aIso + "T00:00:00Z").getTime();
  var b = new Date(bIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// Advance (or rewind) the simulated clock and re-render. Admin time travel.
function goalsAdvanceClock(days) {
  state.goalsV2.clockOffsetDays = (state.goalsV2.clockOffsetDays || 0) + days;
  render();
}

// Reset the simulated clock back to real time.
function goalsResetClock() {
  state.goalsV2.clockOffsetDays = 0;
  render();
}
