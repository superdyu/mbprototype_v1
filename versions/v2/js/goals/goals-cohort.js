// ─── Goals V2 · Cohort ────────────────────────────────────────────────────────
// A simulated "pace group" that makes a solo goal feel social. Bots are a PURE
// function of (goal.cohortSeed, dayIndex) via seeded PRNG, so the same goal shows
// the identical cohort on every render, forever — and any past day's standing is
// replayable (achievements need this) without storing rank history.
//
// ETHICS (decided): the board is explicitly labeled SIMULATED in the UI. The
// guardrails below clamp the USER's rank only (never bot scores) so a discouraged
// user is nudged, not buried. If a production build ever uses REAL people, these
// clamps must be removed or disclosed — clamped ranks + real people is the worst
// of both worlds. See docs/goals-module-plan.md §Cohort.

// FNV-1a 32-bit hash → uint32 (goal seed + per-day jitter seeds).
function goalsHashString(str) {
  var h = 0x811c9dc5;
  str = String(str);
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

// mulberry32 — fast seeded PRNG. Returns a function producing floats in [0,1).
function goalsMulberry32(seed) {
  var a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

var GOALS_BOT_NAMES = ["Ava","Liam","Noah","Maya","Ethan","Zoe","Kai","Nina","Omar","Leah",
  "Diego","Priya","Sam","Tess","Ravi","Cora","Jude","Mira","Theo","Yara",
  "Finn","Ines","Cole","Remy","Asha","Vik","Lena","Beau","Nadia","Reed",
  "Quinn","Esme","Hugo","Talia","Marco","Dee"];

// Deterministic bot roster for a goal (stable forever).
function goalsCohortBots(goal) {
  var seed = goal.cohortSeed || goalsHashString(goal.id);
  var rand = goalsMulberry32(seed);
  var size = GOALS_TUNING.cohort.size;
  var mix = GOALS_TUNING.cohort.archetypeMix;
  var order = ["leader", "steady", "sporadic", "laggard"];
  var bots = [];
  for (var i = 0; i < size; i++) {
    var r = rand();
    var acc = 0, archetype = "steady";
    for (var k = 0; k < order.length; k++) { acc += mix[order[k]]; if (r <= acc) { archetype = order[k]; break; } }
    var range = GOALS_TUNING.cohort.dailyGain[archetype];
    var dailyGain = range[0] + rand() * (range[1] - range[0]);
    var name = GOALS_BOT_NAMES[Math.floor(rand() * GOALS_BOT_NAMES.length)] + " " + String.fromCharCode(65 + Math.floor(rand() * 26)) + ".";
    bots.push({ name: name, archetype: archetype, dailyGain: dailyGain, jitterSeed: Math.floor(rand() * 1e9) });
  }
  return bots;
}

// Deterministic cumulative score for a bot through dayIndex (a day-walk with
// per-day jitter; sporadic skips days, laggard half-steps).
function goalsBotScore(bot, dayIndex) {
  var score = 0;
  var cap = Math.min(dayIndex, GOALS_TUNING.cohort.replayCapDays);
  for (var d = 0; d <= cap; d++) {
    var jr = goalsMulberry32((bot.jitterSeed + d) >>> 0)();
    var gain = bot.dailyGain * (0.6 + 0.8 * jr);
    if (bot.archetype === "sporadic" && jr < 0.35) gain = 0;
    if (bot.archetype === "laggard" && jr < 0.5) gain *= 0.3;
    score += gain;
  }
  return score;
}

// User engagement signals as of a sim date → drives both ranking and tier.
function goalsUserEngagement(goal, asOf) {
  var iso = asOf || goalsTodayISO();
  var dayIndex = Math.max(0, goalsDaysBetween(goal.createdAt, iso));
  var acts = goal.events.filter(function(e) { return (e.type === "checkin" || e.type === "sprintDone") && e.at <= iso; });
  var plan = goalsSprintPlan(goal, iso);
  var doneCount = plan.past.filter(function(p) { return p.done; }).length + (plan.current.done ? 1 : 0);
  var elapsedWindows = plan.past.length + 1;
  var sprintRate = elapsedWindows > 0 ? doneCount / elapsedWindows : 0;

  var pace = goalsPaceStatus(goal, iso);
  var onPace = pace.actualFrac >= pace.expectedFrac * GOALS_TUNING.cohort.engagement.onPaceRatio;

  var lastAt = goal.createdAt;
  acts.forEach(function(e) { if (e.at > lastAt) lastAt = e.at; });
  var daysSinceLastAction = goalsDaysBetween(lastAt, iso);

  var tier;
  if (acts.length === 0) tier = "new";
  else if (sprintRate >= GOALS_TUNING.cohort.engagement.minSprintRate && onPace) tier = "engaged";
  else if (daysSinceLastAction > GOALS_TUNING.cohort.engagement.lapseAfterDays) tier = "lapsed";
  else tier = "active";

  return { actions: acts.length, sprintRate: sprintRate, onPace: onPace, daysSinceLastAction: daysSinceLastAction, tier: tier, dayIndex: dayIndex };
}

// Guardrailed standing. Bot scores are never touched; only the user's RANK is
// clamped (first matching clause wins), then the board is assembled around it.
function goalsCohortStanding(goal, asOf) {
  var iso = asOf || goalsTodayISO();
  var c = GOALS_TUNING.cohort;
  var bots = goalsCohortBots(goal);
  var dayIndex = Math.max(0, Math.min(c.replayCapDays, goalsDaysBetween(goal.createdAt, iso)));
  var scored = bots.map(function(b) { return { name: b.name, archetype: b.archetype, score: goalsBotScore(b, dayIndex) }; });
  scored.sort(function(a, b) { return b.score - a.score; });

  var eng = goalsUserEngagement(goal, iso);
  var userRaw = eng.actions * c.pointsPerAction + eng.sprintRate * c.sprintRateWeight + (eng.onPace ? c.onPaceBonus : 0);
  var totalN = bots.length + 1;

  function pctToRank(pct) { return goalsClamp(Math.round((1 - pct / 100) * totalN), 1, totalN); }
  var naturalRank = scored.filter(function(s) { return s.score > userRaw; }).length + 1;

  var rank, guardrail;
  if (dayIndex === 0 || eng.actions === 0) { rank = Math.round(totalN / 2); guardrail = "neutral"; }
  else if (eng.tier === "engaged") { rank = 1; guardrail = "top"; }
  else if (eng.tier === "lapsed") { rank = pctToRank(c.lapsedFloorPct); guardrail = "lapsedFloor"; }
  else {
    var floorRank = pctToRank(c.firstActionFloorPct);
    rank = Math.min(naturalRank, floorRank);
    guardrail = rank < naturalRank ? "floor" : null;
  }
  rank = goalsClamp(rank, 1, totalN);
  var percentile = Math.round((totalN - rank) / (totalN - 1) * 100);

  // Assemble a ranked list (bots in score order, user spliced in at `rank`).
  var ranked = [];
  var bi = 0;
  for (var r = 1; r <= totalN; r++) {
    if (r === rank) ranked.push({ rank: r, isUser: true, name: "You", archetype: "you" });
    else { var s = scored[bi++]; ranked.push({ rank: r, isUser: false, name: s.name, archetype: s.archetype }); }
  }

  // Board = top 5 + a 3-row window around the user (deduped, rank order).
  var picked = {};
  var board = [];
  function add(row) { if (row && !picked[row.rank]) { picked[row.rank] = true; board.push(row); } }
  ranked.slice(0, 5).forEach(add);
  var ui = rank - 1;
  ranked.slice(Math.max(0, ui - 1), ui + 2).forEach(add);
  board.sort(function(a, b) { return a.rank - b.rank; });

  return { rank: rank, percentile: percentile, tier: eng.tier, guardrailApplied: guardrail, board: board, totalN: totalN };
}

// ── Board UI (explicitly labeled simulated) ──────────────────────────────────
function renderCohortBoard(goal) {
  var st = goalsCohortStanding(goal);
  var rows = "";
  var prevRank = 0;
  st.board.forEach(function(row) {
    if (row.rank - prevRank > 1) rows += `<div class="helper" style="text-align:center;font-size:11px;opacity:.6;margin:2px 0;">⋯</div>`;
    prevRank = row.rank;
    var medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : "#" + row.rank;
    rows += `
      <div class="item-card" style="margin-bottom:6px;${row.isUser ? "border:2px solid var(--accent);background:var(--bar);" : "opacity:.85;"}">
        <div class="row" style="gap:8px;align-items:center;">
          <span style="font-weight:800;width:30px;">${medal}</span>
          <span style="font-weight:${row.isUser ? "850" : "600"};">${h(row.name)}${row.isUser ? " (you)" : ""}</span>
        </div>
        ${row.isUser ? "" : `<span class="helper" style="font-size:10px;text-transform:capitalize;">${h(row.archetype)}</span>`}
      </div>`;
  });
  return `
    <div class="section-title" style="margin:18px 0 4px;">Pace group</div>
    <p class="helper" style="margin-bottom:10px;font-size:11px;">A <strong>simulated</strong> cohort of typical savers on a goal like yours — here to show what steady pace looks like, not real people. You're <strong>#${st.rank}</strong> of ${st.totalN} (${st.percentile}th pct).</p>
    ${rows}
  `;
}
