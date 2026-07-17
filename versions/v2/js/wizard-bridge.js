// ─── 2 Minute Budget → Baseline Adapter ───────────────────────────────────────
// The 2 Minute Budget's side of the builder seam: translates the wizard's
// bb-complete postMessage payload into the normalized BASELINE shape that
// js/budget-baseline.js consumes. This file is the ONLY host-side code that
// understands the wizard's payload — redesign the wizard freely and only this
// adapter changes. The Lifestyle Survey has its own adapter
// (js/lifestyle-survey-bridge.js); neither builder touches state.budget
// directly.
//
// PAYLOAD → BASELINE MAPPING (documented for production handoff):
//   inputs.zip / gender / age / householdSize / incomeMode → baseline.profile.*
//   inputs.preIncome  (monthly gross)                      → profile.grossMonthly
//   inputs.netIncome  (monthly take-home)                  → profile.netMonthly
//   inputs.dependents                                      → householdSize = dependents+1
//                                                            (fallback for old payloads)
//   inputs.adjustVals.{housing,bills,food,transport,health,lifestyle,debt,savings}
//                                                          → baseline.amounts (the 8 sliders)
//   inputs.{housing,housingExtras,utilities,medical,transportFixed,phone,
//           internet,otherFixed}                           → baseline.details — the wizard
//     splits its rolled-up Housing/Bills sliders into per-cost lines before
//     posting (HOUSING_SPLIT / BILLS_SPLIT in bb_template.html, same ratios as
//     budget-baseline.js's canonical splits), so the budget model keeps its
//     separate rent / utilities / phone / … lines exactly as the user saved.
//   e.data.debts → My Debts via applyDebtDataFromWizard (current wizard sends [])
//
// How baseline fields land on state.budget (categories, overhead, stamps) is
// budget-baseline.js's contract, not this file's.

function bbPayloadToBaseline(inputs) {
  if (!inputs) return null;
  const av = inputs.adjustVals || {};
  return {
    source: "2min",
    profile: {
      zip:           inputs.zip ? String(inputs.zip) : "",
      gender:        inputs.gender || "",
      age:           parseInt(inputs.age) || 0,
      householdSize: inputs.householdSize > 0
                       ? Math.max(1, parseInt(inputs.householdSize))
                       : Math.max(1, (parseInt(inputs.dependents) || 0) + 1),
      incomeMode:    inputs.incomeMode === "monthly" ? "monthly" : "annual",
      grossMonthly:  Math.round(inputs.preIncome || 0),
      netMonthly:    Math.round(inputs.netIncome || 0)
    },
    amounts: {
      housing:   Math.round(av.housing   || 0),
      bills:     Math.round(av.bills     || 0),
      food:      Math.round(av.food      || 0),
      transport: Math.round(av.transport || 0),
      health:    Math.round(av.health    || 0),
      lifestyle: Math.round(av.lifestyle || 0),
      debt:      Math.round(av.debt      || 0),
      savings:   Math.round(av.savings   || 0)
    },
    details: {
      housing:        Math.round(inputs.housing        || 0),
      housingExtras:  Math.round(inputs.housingExtras  || 0),
      utilities:      Math.round(inputs.utilities      || 0),
      medical:        Math.round(inputs.medical        || 0),
      transportFixed: Math.round(inputs.transportFixed || 0),
      phone:          Math.round(inputs.phone          || 0),
      internet:       Math.round(inputs.internet       || 0),
      otherFixed:     Math.round(inputs.otherFixed     || 0)
    }
  };
}
