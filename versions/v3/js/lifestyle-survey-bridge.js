// ─── Lifestyle Survey → Baseline Adapter (mechanism) ──────────────────────────
// The Lifestyle Survey's side of the builder seam (js/budget-baseline.js).
// Pure mechanism: ALL content, percentages, prerequisites, and tuning knobs
// live in js/lifestyle-survey-content.js — tune there, never here. The screen
// (screens/lifestyle-survey.js) renders; this file computes. Never touches
// state.budget directly.
//
// THE MATH (sanity-checked three ways — see the harness notes in the commit,
// the cross-builder identity vs the 2MB, and the Explorer's sweep view):
//   baseline(cat) = net × LS_SEG[quintile][cat]% × zipMod(cat)
//     — same gov+modifier convention as the 2 Minute Budget's slider seeding:
//       BLS quintile share of take-home, scaled by the ZIP cost-of-living
//       index per category, household affecting only the tax estimate
//       (BLS shares are household-level already).
//   amount(cat)  = baseline × (1 + notchPct + Σ followupAdj), floored at 0.
//     Unanswered/skipped → exactly baseline (the "average spend" default).
//   savings      = net − Σ spend amounts, floored at 0 — the residual, so the
//     pre-tweak budget always lands on take-home (flooring ⇒ opens overspent,
//     shown honestly, same as the 2MB).

// ── Profile context ───────────────────────────────────────────────────────────
// answers shape (state.lifestyleSurvey.answers):
//   { base:      { housing: 1..4 | "skip", food: ... },
//     followups: { "housing-structure": 0..2, ... } }
// ctx = lsContext(basics): { net, zipMult, quintile, gross, dependents }

function lsEstimateNetMonthly(grossMonthly, dependents) {
  const annual = (grossMonthly || 0) * 12;
  if (annual <= 0) return 0;
  let rate = LS_TAX_BRACKETS[LS_TAX_BRACKETS.length - 1].rate;
  for (const b of LS_TAX_BRACKETS) { if (annual <= b.annual) { rate = b.rate; break; } }
  const tax = Math.max(0, annual * rate - (dependents || 0) * LS_DEPENDENT_DEDUCTION * rate);
  return Math.round((annual - tax) / 12);
}

function lsQuintileFor(net) {
  for (let i = 0; i < LS_SEG.length; i++) if (net <= LS_SEG[i].max) return i + 1; // 1-based
  return LS_SEG.length;
}

function lsContext(basics) {
  const gross = basics.incomeMode === "annual"
    ? (basics.grossIncome || 0) / 12 : (basics.grossIncome || 0);
  const dependents = Math.max(0, (basics.householdSize || 1) - 1);
  const net = lsEstimateNetMonthly(gross, dependents);
  return {
    gross: Math.round(gross),
    dependents,
    net,
    zipMult: getZipIndex(basics.zip || ""),
    quintile: lsQuintileFor(net)
  };
}

function lsZipMod(cat, zipMult) {
  return 1 + (zipMult - 1) * (LS_ZIP_SENSITIVITY[cat] || 0);
}

function lsBaselineFor(cat, ctx) {
  const seg = LS_SEG[ctx.quintile - 1];
  return ctx.net * (seg[cat] || 0) / 100 * lsZipMod(cat, ctx.zipMult);
}

// ── Decision tree runtime ─────────────────────────────────────────────────────
// A follow-up is ARMED when its prerequisites hold against the current answers
// and context. Prereqs are fixed and hand-authored (impact rationale in the
// content table); nothing is computed at runtime beyond evaluating them.
function lsFollowupArmed(fu, answers, ctx) {
  const baseAnswer = answers.base[fu.prereq.cat];
  if (typeof baseAnswer !== "number") return false;          // unanswered or skipped
  if (!fu.prereq.notches.includes(baseAnswer)) return false;
  if (fu.prereq.quintiles && !fu.prereq.quintiles.includes(ctx.quintile)) return false;
  if (fu.prereq.minZipMult && ctx.zipMult < fu.prereq.minZipMult) return false;
  return true;
}

// The full planned question path for the current answers: every base question
// in order, each immediately followed by its armed follow-up(s). Recomputed on
// every answer — this is what makes the steps-remaining count honest (it can
// grow by one when an extreme answer arms a follow-up).
function lsPlannedPath(answers, ctx) {
  const path = [];
  LS_BASE_QUESTIONS.forEach(q => {
    path.push({ kind: "base", id: q.cat, cat: q.cat });
    LS_FOLLOWUPS.forEach(fu => {
      if (fu.cat === q.cat && lsFollowupArmed(fu, answers, ctx)) {
        path.push({ kind: "followup", id: fu.id, cat: fu.cat });
      }
    });
  });
  return path;
}

// ── Amount math ───────────────────────────────────────────────────────────────
function lsCategoryAmount(cat, answers, ctx) {
  const baseline = lsBaselineFor(cat, ctx);
  const notch = answers.base[cat];
  let mult = 1;
  if (typeof notch === "number") {
    const q = LS_BASE_QUESTIONS.find(q => q.cat === cat);
    mult += q.notches[notch - 1].pct;
    LS_FOLLOWUPS.forEach(fu => {
      if (fu.cat !== cat) return;
      const opt = answers.followups[fu.id];
      if (typeof opt === "number" && lsFollowupArmed(fu, answers, ctx)) {
        mult += fu.options[opt].adj;
      }
    });
  }
  return Math.max(0, Math.round(baseline * mult));
}

// All 8 amounts: 7 questioned spend categories + savings as the residual.
function lsComputeAmounts(answers, ctx) {
  const amounts = {};
  let spend = 0;
  LS_BASE_QUESTIONS.forEach(q => {
    amounts[q.cat] = lsCategoryAmount(q.cat, answers, ctx);
    spend += amounts[q.cat];
  });
  amounts.savings = Math.max(0, ctx.net - spend);
  return amounts;
}

// Dollar range a notch means for THIS user — shown under the selected notch.
function lsNotchRange(cat, notchIdx, ctx) {
  const q = LS_BASE_QUESTIONS.find(q => q.cat === cat);
  const amt = lsBaselineFor(cat, ctx) * (1 + q.notches[notchIdx - 1].pct);
  const w = LS_TUNING.rangeWidthPct;
  return [Math.max(0, Math.round(amt * (1 - w) / 10) * 10), Math.round(amt * (1 + w) / 10) * 10];
}

// Per-answer dollar impact vs the category baseline — the admin panel's
// response log and the Explorer's persona lab both read from this.
function lsAnswerImpact(cat, answers, ctx) {
  return lsCategoryAmount(cat, answers, ctx) - Math.round(lsBaselineFor(cat, ctx));
}

// ── Final baseline ────────────────────────────────────────────────────────────
function lsAnswersToBaseline(survey) {
  const basics = survey.basics || {};
  const ctx = lsContext(basics);
  if (ctx.net <= 0) return null;
  return {
    source: "lifestyleSurvey",
    profile: {
      zip:           basics.zip || "",
      gender:        basics.gender || "",
      age:           parseInt(basics.age) || 0,
      householdSize: Math.max(1, parseInt(basics.householdSize) || 1),
      incomeMode:    basics.incomeMode === "monthly" ? "monthly" : "annual",
      grossMonthly:  ctx.gross,
      netMonthly:    ctx.net
    },
    // Review-step tweaks (survey.tweaks) override the computed amounts 1:1.
    amounts: Object.assign(lsComputeAmounts(survey.answers, ctx), survey.tweaks || {})
  };
}
