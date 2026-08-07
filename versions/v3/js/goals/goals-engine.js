// ─── Goals V2 · Engine ────────────────────────────────────────────────────────
// Feasibility, baseline freeze, milestones, value/progress/pace, and the goal
// mutators. A goal's baseline is FROZEN at creation; everything Phase-2 (tracker)
// shows is derived by comparing append-only events[] against that baseline.
//
// Runtime dependency: debt-paydown feasibility calls runPayoffSimulation() from
// screens/debt-analyzer.js. Time flows through goals-time.js (sim clock).
//
// Verdict scale: ratio = requiredMonthly / capacityMonthly (lower = easier).
//   ≤ comfortableRatio → "comfortable"; ≤ tightRatio → "tight"; else "unrealistic".

var GOALS_DAYS_PER_MONTH = 30.44;

// Checklist step content (checklist feasibilityKind types).
var GOALS_CHECKLIST_STEPS = {
  cardManagement: [
    "List every card balance & limit",
    "Set autopay for at least the minimum on all cards",
    "Target the highest-utilization card first",
    "Get your top card under 30% utilization",
    "Get all cards under 10% utilization"
  ],
  refinance: [
    "Pull your current rate & balance",
    "Check your credit score",
    "Gather income & statement docs",
    "Shop at least 3 refinance offers",
    "Apply to the best offer",
    "Close & redirect the savings"
  ]
};
function goalsChecklistSteps(typeKey) { return GOALS_CHECKLIST_STEPS[typeKey] || []; }

// ── Small math helpers ───────────────────────────────────────────────────────
function goalsClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Solve the level monthly payment to grow PV→FV over n months at annualRate.
function goalsAnnuityPMT(pv, fv, annualRate, months) {
  var r = (annualRate || 0) / 12;
  if (r <= 0 || months <= 0) return (fv - pv) / Math.max(1, months);
  var factor = Math.pow(1 + r, months);
  return (fv - pv * factor) / ((factor - 1) / r);
}

function goalsHorizonMonths(targetDate) {
  var d = goalsDaysBetween(goalsTodayISO(), targetDate);
  return Math.max(1, Math.round(d / GOALS_DAYS_PER_MONTH));
}

// ── Target resolution ────────────────────────────────────────────────────────
// Normalizes a type+inputs into {startValue, targetValue, unit, direction,
// targetDate, horizonMonths, notes[]}. Pure-ish (reads bridge for derived sizes).
function goalsResolveTarget(typeKey, inputs, autofill) {
  var meta = goalsTypeMeta(typeKey) || {};
  var notes = [];
  var targetDate = inputs.targetDate || goalsAddDays(goalsTodayISO(), 365);
  var horizonMonths = goalsHorizonMonths(targetDate);
  var startValue = 0, targetValue = 0;
  var unit = meta.unit || "usd";
  var direction = meta.direction || "up";

  switch (typeKey) {
    case "vehicle":
      targetValue = Math.round((inputs.price || 0) * (inputs.downPct || 0) / 100);
      notes.push("Down payment = price × " + (inputs.downPct || 0) + "%.");
      break;
    case "homeDown":
      targetValue = Math.round((inputs.homePrice || 0) * (inputs.downPct || 0) / 100);
      notes.push("Down payment = home price × " + (inputs.downPct || 0) + "%.");
      break;
    case "vacation":  targetValue = Math.round(inputs.cost || 0); break;
    case "wedding":   targetValue = Math.round(inputs.budget || 0); break;
    case "emergencyFund": {
      var ess = (autofill.essentialMonthlySpend && autofill.essentialMonthlySpend.value) || goalsEssentialMonthlySpend();
      targetValue = Math.round((inputs.months || 0) * ess);
      notes.push((inputs.months || 0) + " months × " + budgetFmt(ess) + " essentials.");
      break;
    }
    case "retirementBoost":
      startValue = Math.round(inputs.currentBalance || 0);
      targetValue = Math.round(inputs.targetBalance || 0);
      break;
    case "collegeFund": targetValue = Math.round(inputs.targetAmount || 0); break;
    case "passiveIncome": {
      var mr = (autofill.marketReturn && autofill.marketReturn.value) || GOALS_MOCK.rates.marketReturn;
      targetValue = Math.round((inputs.monthlyIncomeGoal || 0) * 12 / mr);
      notes.push("Capital needed = annual income ÷ " + Math.round(mr * 100) + "% return.");
      break;
    }
    case "categoryCut":
      targetValue = Math.round((inputs.monthlyReduction || 0) * (inputs.durationMonths || 1));
      targetDate = goalsAddDays(goalsTodayISO(), Math.round((inputs.durationMonths || 1) * GOALS_DAYS_PER_MONTH));
      horizonMonths = Math.max(1, inputs.durationMonths || 1);
      notes.push("Cumulative saved = " + budgetFmt(inputs.monthlyReduction || 0) + "/mo × " + (inputs.durationMonths || 1) + " months.");
      break;
    case "debtPaydown": {
      var debts = goalsSelectedDebts(inputs.debtIds);
      startValue = Math.round(debts.reduce(function(s, d) { return s + d.balance; }, 0));
      targetValue = 0;
      break;
    }
    case "courseCompletion":
      targetValue = Math.round(inputs.lessonCount || 0);
      break;
    case "targetScore": {
      startValue = Math.round((autofill.creditScore && autofill.creditScore.value) || GOALS_MOCK.credit.score);
      targetValue = Math.round(inputs.targetScore || 0);
      break;
    }
    case "cardManagement":
    case "refinance":
      startValue = 0;
      targetValue = goalsChecklistSteps(typeKey).length;
      break;
    default:
      targetValue = Math.round(inputs.amount || 0);
  }

  return { startValue: startValue, targetValue: targetValue, unit: unit, direction: direction,
    targetDate: targetDate, horizonMonths: horizonMonths, notes: notes };
}

// Resolve selected debt objects from an id list (debtPaydown/refinance).
function goalsSelectedDebts(debtIds) {
  var ids = debtIds || [];
  var snap = goalsDebtsSnapshot();
  return snap.filter(function(d) { return ids.indexOf(d.id) !== -1; });
}

// ── Feasibility ──────────────────────────────────────────────────────────────
function goalsVerdictFromRatio(ratio) {
  var t = GOALS_TUNING.feasibility;
  if (!isFinite(ratio) || ratio > t.tightRatio) return "unrealistic";
  if (ratio <= t.comfortableRatio) return "comfortable";
  return "tight";
}

function goalsComputeFeasibility(typeKey, inputs, autofill) {
  var meta = goalsTypeMeta(typeKey) || {};
  var kind = meta.feasibilityKind || "savings";
  var res  = goalsResolveTarget(typeKey, inputs, autofill);
  var cap  = goalsMonthlyCapacity().total;
  var t    = GOALS_TUNING.feasibility;
  var notes = res.notes.slice();
  var adjustments = { extendToDate: null, raiseToMonthly: null, lowerToTarget: null };
  var requiredMonthly = 0, ratio = 0, verdict = "comfortable", payoffCurve = null;
  var capacityMonthly = cap;

  if (kind === "savings") {
    var delta = res.targetValue - res.startValue;
    if (typeKey === "retirementBoost" || typeKey === "passiveIncome") {
      var rate = (autofill.marketReturn && autofill.marketReturn.value) || GOALS_TUNING.feasibility.annualReturnAssumption;
      requiredMonthly = Math.max(0, goalsAnnuityPMT(res.startValue, res.targetValue, rate, res.horizonMonths));
      notes.push("Assumes " + Math.round(rate * 100) + "% annual growth.");
    } else {
      requiredMonthly = delta / res.horizonMonths;
    }
    requiredMonthly = Math.round(requiredMonthly);
    if (cap <= 0) {
      verdict = "unrealistic"; ratio = Infinity;
      notes.push("Your budget has no monthly room — fix the budget first.");
    } else {
      ratio = requiredMonthly / cap;
      verdict = goalsVerdictFromRatio(ratio);
    }
    // Adjustment chips (always computed)
    var tightMonthly = Math.max(1, cap * t.tightRatio);
    adjustments.raiseToMonthly = requiredMonthly;
    adjustments.extendToDate = goalsAddDays(goalsTodayISO(), Math.round((delta / tightMonthly) * GOALS_DAYS_PER_MONTH));
    adjustments.lowerToTarget = Math.round(res.startValue + tightMonthly * res.horizonMonths);

  } else if (kind === "debt") {
    var debts = goalsSelectedDebts(inputs.debtIds);
    if (debts.length === 0) {
      verdict = "unrealistic"; ratio = Infinity;
      notes.push("Pick at least one debt to pay off.");
    } else {
      var desired = res.horizonMonths;
      var requiredExtra = goalsBinarySearchExtra(debts, desired);
      requiredMonthly = Math.round(requiredExtra);
      capacityMonthly = cap;
      if (cap <= 0) { verdict = "unrealistic"; ratio = Infinity; notes.push("No budget room — fix the budget first."); }
      else { ratio = requiredExtra / cap; verdict = goalsVerdictFromRatio(ratio); }
      // Comfortable shortcut: minimums alone clear it well ahead of the date.
      var natural = runPayoffSimulation(debts, 0, "avalanche").monthsToPayoff;
      if (natural !== null && natural <= desired * 0.85) { verdict = "comfortable"; requiredMonthly = 0; ratio = 0; }
      notes.push("Avalanche order (highest APR first).");
      payoffCurve = goalsSamplePayoffCurve(debts, requiredMonthly, res.startValue);
      // chips
      adjustments.raiseToMonthly = requiredMonthly;
      var tightExtra = Math.max(0, cap * t.tightRatio);
      var atTight = runPayoffSimulation(debts, tightExtra, "avalanche").monthsToPayoff;
      adjustments.extendToDate = atTight ? goalsAddDays(goalsTodayISO(), Math.round(atTight * GOALS_DAYS_PER_MONTH)) : null;
      adjustments.lowerToTarget = null; // can't owe less than $0
    }

  } else if (kind === "categoryCut") {
    var cs = goalsCategorySpend(inputs.category);
    var floor = cs.peerAvg * t.spendCutFloorPct;
    var maxCut = Math.max(0, cs.spend - floor);
    requiredMonthly = Math.round(inputs.monthlyReduction || 0);
    capacityMonthly = Math.round(maxCut);
    notes.push("You spend " + budgetFmt(cs.spend) + "; floor is " + budgetFmt(floor) + " (peer × " + Math.round(t.spendCutFloorPct * 100) + "%).");
    if (maxCut <= 0) { verdict = "unrealistic"; ratio = Infinity; notes.push("Already at or below a healthy floor — little to cut."); }
    else { ratio = requiredMonthly / maxCut; verdict = goalsVerdictFromRatio(ratio); }
    adjustments.raiseToMonthly = null;
    adjustments.lowerToTarget = Math.round(Math.min(requiredMonthly, maxCut * t.tightRatio) * (inputs.durationMonths || 1));
    adjustments.extendToDate = null;

  } else if (kind === "learning") {
    var weeks = Math.max(1, goalsDaysBetween(goalsTodayISO(), res.targetDate) / 7);
    var perWeek = res.targetValue / weeks;
    requiredMonthly = Math.round(perWeek * 10) / 10; // lessons/week (kept in this field)
    capacityMonthly = t.lessonsPerWeekTight;
    var pool = goalsLessonPool();
    if (res.targetValue > pool.remaining) notes.push("Only " + pool.remaining + " lessons remain in the library.");
    if (perWeek <= t.lessonsPerWeekComfortable) verdict = "comfortable";
    else if (perWeek <= t.lessonsPerWeekTight) verdict = "tight";
    else verdict = "unrealistic";
    ratio = perWeek / t.lessonsPerWeekTight;
    notes.push("About " + (Math.round(perWeek * 10) / 10) + " lessons/week.");
    adjustments.extendToDate = goalsAddDays(goalsTodayISO(), Math.round((res.targetValue / t.lessonsPerWeekComfortable) * 7));
    adjustments.raiseToMonthly = null;
    adjustments.lowerToTarget = Math.max(1, Math.floor(t.lessonsPerWeekComfortable * weeks));

  } else if (kind === "credit") {
    var gain = (autofill.creditGainPerMonth && autofill.creditGainPerMonth.value) || GOALS_MOCK.creditGainPerMonth;
    var pointsNeeded = Math.max(0, res.targetValue - res.startValue);
    var monthsNeeded = pointsNeeded / Math.max(0.1, gain);
    requiredMonthly = Math.round((pointsNeeded / res.horizonMonths) * 10) / 10; // points/month needed
    capacityMonthly = gain;
    ratio = monthsNeeded / res.horizonMonths;
    if (monthsNeeded <= res.horizonMonths * 0.7) verdict = "comfortable";
    else if (monthsNeeded <= res.horizonMonths) verdict = "tight";
    else verdict = "unrealistic";
    notes.push("Model gain ≈ " + gain + " pts/month with on-time, low-utilization habits.");
    adjustments.extendToDate = goalsAddDays(goalsTodayISO(), Math.round(monthsNeeded * GOALS_DAYS_PER_MONTH));
    adjustments.raiseToMonthly = null;
    adjustments.lowerToTarget = Math.round(res.startValue + gain * res.horizonMonths);

  } else if (kind === "checklist") {
    requiredMonthly = 0; ratio = 0; capacityMonthly = 0;
    if (typeKey === "refinance") {
      var debtsR = goalsSelectedDebts(inputs.debtIds);
      var maxApr = debtsR.reduce(function(m, d) { return Math.max(m, d.apr); }, 0);
      var refiRate = ((autofill.refiRate && autofill.refiRate.value) || GOALS_MOCK.rates.refi) * 100;
      var score = (autofill.creditScore && autofill.creditScore.value) || GOALS_MOCK.credit.score;
      var passes = (debtsR.length > 0) && (refiRate < maxApr) && (score >= 660);
      verdict = passes ? "comfortable" : "unrealistic";
      if (debtsR.length === 0) notes.push("Pick a loan to refinance.");
      else if (refiRate >= maxApr) notes.push("Refi rate " + refiRate.toFixed(1) + "% isn't below your loan APR " + maxApr.toFixed(1) + "%.");
      else if (score < 660) notes.push("Score " + score + " is below the 660 refinance gate.");
      else notes.push("Refi to " + refiRate.toFixed(1) + "% beats your " + maxApr.toFixed(1) + "% loan.");
    } else {
      verdict = "comfortable";
      notes.push("A " + res.targetValue + "-step checklist — claim each step as you go.");
    }
    adjustments = { extendToDate: null, raiseToMonthly: null, lowerToTarget: null };
  }

  return {
    verdict: verdict, ratio: ratio, requiredMonthly: requiredMonthly, capacityMonthly: Math.round(capacityMonthly),
    notes: notes, adjustments: adjustments, payoffCurve: payoffCurve,
    startValue: res.startValue, targetValue: res.targetValue, unit: res.unit, direction: res.direction,
    targetDate: res.targetDate, horizonMonths: res.horizonMonths
  };
}

// Smallest extra payment (≤14 sims) that clears the debts by desiredMonths.
function goalsBinarySearchExtra(debts, desiredMonths) {
  var lo = 0, hi = debts.reduce(function(s, d) { return s + d.balance; }, 0);
  var feasibleAtHi = runPayoffSimulation(debts, hi, "avalanche").monthsToPayoff;
  if (feasibleAtHi === null || feasibleAtHi > desiredMonths) return hi; // even paying it all isn't fast enough
  var best = hi;
  for (var i = 0; i < 14; i++) {
    var mid = (lo + hi) / 2;
    var m = runPayoffSimulation(debts, mid, "avalanche").monthsToPayoff;
    if (m !== null && m <= desiredMonths) { best = mid; hi = mid; } else { lo = mid; }
  }
  return Math.round(best);
}

// Sample a monthly payoff curve (month 0 = full balance) for the baseline freeze.
function goalsSamplePayoffCurve(debts, extra, startValue) {
  var sim = runPayoffSimulation(debts, extra, "avalanche");
  var curve = [{ month: 0, balance: Math.round(startValue) }];
  sim.timeline.forEach(function(pt) { curve.push({ month: pt.month, balance: Math.round(pt.totalBalance) }); });
  return curve;
}

// ── Baseline freeze ──────────────────────────────────────────────────────────
function goalsBuildBaseline(typeKey, inputs, autofill, feas) {
  var startDate = goalsTodayISO();
  var baseline = {
    startDate: startDate, targetDate: feas.targetDate,
    startValue: feas.startValue, targetValue: feas.targetValue,
    unit: feas.unit, direction: feas.direction,
    monthlyCommitment: feas.requiredMonthly,
    feasibility: { verdict: feas.verdict, ratio: feas.ratio, requiredMonthly: feas.requiredMonthly,
      capacityMonthly: feas.capacityMonthly, notes: feas.notes },
    milestones: [],
    payoffCurve: feas.payoffCurve || null
  };
  baseline.milestones = goalsBuildMilestones(baseline);
  return baseline;
}

function goalsBuildMilestones(baseline) {
  var anchors = [ { days: 30, kind: "1mo", label: "1 month" }, { days: 90, kind: "3mo", label: "3 months" },
                  { days: 180, kind: "6mo", label: "6 months" }, { days: 365, kind: "1yr", label: "1 year" } ];
  var total = goalsDaysBetween(baseline.startDate, baseline.targetDate);
  var out = [];
  anchors.forEach(function(a) {
    if (a.days >= total - 14) return;            // skip anchors within 14d of the finish
    var due = goalsAddDays(baseline.startDate, a.days);
    out.push({ id: "ms_" + a.kind, kind: a.kind, label: a.label, dueDate: due,
      targetValue: Math.round(goalsExpectedAt(baseline, due)) });
  });
  out.push({ id: "ms_final", kind: "final", label: "Goal complete", dueDate: baseline.targetDate,
    targetValue: baseline.targetValue });
  return out;
}

// Expected value along the frozen baseline at an arbitrary date (curve or linear).
function goalsExpectedAt(baseline, iso) {
  var clamped = iso < baseline.startDate ? baseline.startDate
              : iso > baseline.targetDate ? baseline.targetDate : iso;
  if (baseline.payoffCurve && baseline.payoffCurve.length > 1) {
    var monthsIn = goalsDaysBetween(baseline.startDate, clamped) / GOALS_DAYS_PER_MONTH;
    var c = baseline.payoffCurve;
    for (var i = 0; i < c.length - 1; i++) {
      if (monthsIn <= c[i + 1].month) {
        var span = (c[i + 1].month - c[i].month) || 1;
        var frac = (monthsIn - c[i].month) / span;
        return c[i].balance + (c[i + 1].balance - c[i].balance) * frac;
      }
    }
    return c[c.length - 1].balance;
  }
  var totalDays = goalsDaysBetween(baseline.startDate, baseline.targetDate) || 1;
  var frac2 = goalsDaysBetween(baseline.startDate, clamped) / totalDays;
  return baseline.startValue + (baseline.targetValue - baseline.startValue) * frac2;
}

// Public wrapper used by the tracker/timeline (takes a goal).
function goalsBaselineExpectedValue(goal, iso) { return goalsExpectedAt(goal.baseline, iso); }

// ── Live value / progress / pace ─────────────────────────────────────────────
// Current value = baseline start ± the sum of check-in amounts up to asOf.
function goalsCurrentValue(goal, asOf) {
  var cutoff = asOf || goalsTodayISO();
  var sum = 0;
  goal.events.forEach(function(e) {
    if (e.type === "checkin" && e.at <= cutoff) sum += (e.payload && e.payload.amount) || 0;
  });
  var b = goal.baseline;
  return b.direction === "down" ? b.startValue - sum : b.startValue + sum;
}

function goalsProgressPct(goal, asOf) {
  var b = goal.baseline;
  var total = Math.abs(b.targetValue - b.startValue) || 1;
  var done = Math.abs(goalsCurrentValue(goal, asOf) - b.startValue);
  return goalsClamp(Math.round(done / total * 100), 0, 100);
}

// Remaining distance to target (always ≥ 0).
function goalsRemaining(goal, asOf) {
  var b = goal.baseline;
  var cur = goalsCurrentValue(goal, asOf);
  return Math.max(0, b.direction === "down" ? cur - b.targetValue : b.targetValue - cur);
}

function goalsIsComplete(goal, asOf) { return goalsRemaining(goal, asOf) <= 0; }

// Pace = actual progress fraction vs the baseline's expected fraction at asOf.
function goalsPaceStatus(goal, asOf) {
  var iso = asOf || goalsTodayISO();
  var b = goal.baseline;
  var total = Math.abs(b.targetValue - b.startValue) || 1;
  var expectedVal = goalsExpectedAt(b, iso);
  var actualVal = goalsCurrentValue(goal, iso);
  var expectedFrac = Math.abs(expectedVal - b.startValue) / total;
  var actualFrac = Math.abs(actualVal - b.startValue) / total;
  var deltaPct = Math.round((actualFrac - expectedFrac) * 100);
  var status = deltaPct > 2 ? "ahead" : deltaPct < -2 ? "behind" : "onTrack";
  return { expected: expectedVal, actual: actualVal, expectedFrac: expectedFrac, actualFrac: actualFrac,
    deltaPct: deltaPct, status: status };
}

// ── Formatting ───────────────────────────────────────────────────────────────
function goalsFmtValue(value, unit) {
  var v = Math.round(value);
  if (unit === "usd")    return budgetFmt(v);
  if (unit === "score")  return String(v);
  if (unit === "lessons") return v + (v === 1 ? " lesson" : " lessons");
  if (unit === "steps")  return v + (v === 1 ? " step" : " steps");
  return String(v);
}

// ── Creation + mutators ──────────────────────────────────────────────────────
function goalsCreateFromDraft(draft) {
  var feas = goalsComputeFeasibility(draft.typeKey, draft.inputs, draft.autofill);
  var baseline = goalsBuildBaseline(draft.typeKey, draft.inputs, draft.autofill, feas);
  var meta = goalsTypeMeta(draft.typeKey) || {};
  var id = generateId("gv2");
  return {
    id: id,
    createdAt: goalsTodayISO(),
    categoryKey: draft.categoryKey,
    typeKey: draft.typeKey,
    title: draft.title || meta.title || "Goal",
    inputs: JSON.parse(JSON.stringify(draft.inputs || {})),
    autofill: JSON.parse(JSON.stringify(draft.autofill || {})),
    baseline: baseline,
    events: [],
    status: "active",
    cohortSeed: (typeof goalsHashString === "function" ? goalsHashString(id) : 0) >>> 0
  };
}

function recordGoalCreation(goal) {
  state.goalsV2.goals.push(goal);
  state.goalsV2.selectedGoalId = goal.id;
  state.goalsV2.draft = null;
}

function recordGoalEvent(goalId, type, payload) {
  var goal = goalsById(goalId);
  if (!goal) return null;
  var ev = { id: generateId("gev"), at: goalsTodayISO(), type: type, payload: payload || {} };
  goal.events.push(ev);
  return ev;
}

function goalsActive() { return state.goalsV2.goals.filter(function(g) { return g.status === "active"; }); }
function goalsById(id) { return state.goalsV2.goals.find(function(g) { return g.id === id; }) || null; }
