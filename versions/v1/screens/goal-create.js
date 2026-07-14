// ─── Goal Create (Goals V2 · Phase 1 wizard) ──────────────────────────────────
// TAB: About Me (sub-screen) | NAV BAR: Visible — About Me highlighted
//
// Four-step wizard driven by state.goalsV2.draft:
//   category → type → inputs (with autofill context cards) → feasibility
// Feasibility recomputes live from goalsComputeFeasibility(); adjustment chips
// (extend the date / lower the target) re-run the verdict. Confirm freezes the
// baseline (goalsCreateFromDraft) and jumps to the tracker.
//
// Inputs use onchange (commit-on-blur) so typing never triggers a re-render and
// never loses focus — the mistake this codebase already fixed once in Baby Budget.

function gcDraft() {
  if (!state.goalsV2.draft) state.goalsV2.draft = { step: "category", categoryKey: null, typeKey: null, inputs: {}, autofill: {}, title: "" };
  return state.goalsV2.draft;
}

function renderGoalCreate() {
  var d = gcDraft();
  if (d.step === "type")        return gcShell(gcStepType(d));
  if (d.step === "inputs")      return gcShell(gcStepInputs(d));
  if (d.step === "feasibility") return gcShell(gcStepFeasibility(d));
  return gcShell(gcStepCategory(d));
}

function gcShell(inner) {
  return `
    <div class="card" style="margin-bottom:14px;">
      <button class="button secondary" style="font-size:12px;padding:8px 14px;margin-bottom:14px;"
              type="button" onclick="gcBack()">← Back</button>
      <h1 class="title" style="margin:0;font-size:20px;">New Goal</h1>
      <p class="subtitle" style="margin:4px 0 0;">Money Buddy breaks it into bite-size sprints.</p>
    </div>
    ${inner}
  `;
}

// Polished, tappable choice card: icon tile · title + description · circular
// chevron affordance, all vertically centered. Inline flex (the global
// .item-card is a block, so its trailing children would otherwise stack).
function gcChoiceCard(icon, title, desc, onclick) {
  return `
    <div class="item-card" style="display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="${onclick}">
      <div style="flex:0 0 auto;width:44px;height:44px;border-radius:12px;background:var(--soft);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:22px;">${h(icon)}</div>
      <div style="flex:1;min-width:0;">
        <div class="task-title">${h(title)}</div>
        <p class="task-desc">${h(desc)}</p>
      </div>
      <div style="flex:0 0 auto;width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;line-height:1;">&#8250;</div>
    </div>`;
}

// ── Step 1: category ─────────────────────────────────────────────────────────
function gcStepCategory() {
  return `
    <div class="section-title" style="margin:4px 0 8px;">What kind of goal?</div>
    ${GOALS_CATEGORIES.map(function(c) {
      return gcChoiceCard(c.icon, c.label, c.blurb, "gcSelectCategory('" + h(c.key) + "')");
    }).join("")}
  `;
}

// ── Step 2: type ─────────────────────────────────────────────────────────────
function gcStepType(d) {
  var cat = goalsCategoryMeta(d.categoryKey);
  var types = goalsTypesForCategory(d.categoryKey);
  return `
    <div class="section-title" style="margin:4px 0 8px;">${cat ? h(cat.icon + " " + cat.label) : "Pick a goal"}</div>
    ${types.map(function(t) {
      return gcChoiceCard(t.icon, t.title, t.blurb, "gcSelectType('" + h(t.key) + "')");
    }).join("")}
  `;
}

// ── Step 3: inputs + autofill context cards ──────────────────────────────────
function gcStepInputs(d) {
  var t = goalsTypeMeta(d.typeKey);
  if (!t) return `<div class="card"><p class="helper">Unknown goal type.</p></div>`;
  var fields = t.fields.map(function(f) { return gcRenderField(f, d.inputs[f.key]); }).join("");
  var cards = Object.keys(d.autofill).map(function(k) { return gcRenderAutofillCard(k, d.autofill[k]); }).join("");
  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="section-title" style="margin-bottom:4px;">${h(t.icon)} ${h(t.title)}</div>
      <p class="helper" style="margin-bottom:14px;">${h(t.blurb)}</p>
      ${fields}
    </div>
    ${cards ? `
      <div class="section-title" style="margin:6px 0 8px;">What Money Buddy filled in</div>
      <p class="helper" style="margin-bottom:10px;">Estimated for you — tap “Override” to change any of these.</p>
      ${cards}` : ""}
    <button class="button primary full" type="button" onclick="gcToFeasibility()" style="margin-top:8px;">See if it's doable →</button>
  `;
}

function gcRenderField(f, val) {
  var lbl = `<label style="display:block;font-size:12px;font-weight:700;margin:12px 0 4px;">${h(f.label)}</label>`;
  if (f.type === "select") {
    return lbl + `<select class="goal-field" onchange="gcSetInput('${h(f.key)}', this.value, 'select')">
      ${f.options.map(function(o) { return `<option value="${h(o.value)}" ${val === o.value ? "selected" : ""}>${h(o.label)}</option>`; }).join("")}
    </select>`;
  }
  if (f.type === "date") {
    return lbl + `<input type="date" class="goal-field" value="${h(val || "")}" onchange="gcSetInput('${h(f.key)}', this.value, 'date')">`;
  }
  if (f.type === "debtPicker") {
    var debts = goalsDebtsSnapshot();
    var chosen = val || [];
    if (debts.length === 0) return lbl + `<p class="helper">No debts on file — add debts in My Debts first.</p>`;
    return lbl + debts.map(function(dbt) {
      var on = chosen.indexOf(dbt.id) !== -1;
      return `<label class="item-card" style="display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:6px;">
        <div style="flex:1;min-width:0;">
          <div class="task-title">${h(dbt.name)}</div>
          <p class="task-desc">${budgetFmt(dbt.balance)} · ${h(String(dbt.apr))}% APR</p>
        </div>
        <input type="checkbox" style="accent-color:var(--accent);width:18px;height:18px;flex:0 0 auto;" ${on ? "checked" : ""} onchange="gcToggleDebt('${h(dbt.id)}', this.checked)">
      </label>`;
    }).join("");
  }
  // usd / int / pct — numeric, commit on blur
  var prefix = f.type === "usd" ? "$" : "";
  var suffix = f.type === "pct" ? "%" : "";
  return lbl + `<div class="row" style="align-items:center;gap:4px;">
    ${prefix ? `<span style="font-weight:700;">${prefix}</span>` : ""}
    <input type="number" class="goal-field" style="flex:1;" value="${h(val == null ? "" : val)}" ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.step != null ? `step="${f.step}"` : ""}
           onchange="gcSetInput('${h(f.key)}', this.value, '${h(f.type)}')">
    ${suffix ? `<span style="font-weight:700;">${suffix}</span>` : ""}
  </div>`;
}

function gcFmtAutofill(key, value) {
  if (key === "savingsAPY" || key === "mortgageRate" || key === "autoRate" || key === "refiRate" || key === "marketReturn" || key === "taxBracket")
    return (Math.round(value * 1000) / 10) + "%";
  if (key === "essentialMonthlySpend" || key === "borrowingPower") return budgetFmt(value);
  if (key === "creditScore") return String(Math.round(value));
  if (key === "creditGainPerMonth") return Math.round(value) + " pts/mo";
  return String(value);
}

function gcRenderAutofillCard(key, a) {
  return `
    <div class="card" style="margin-bottom:8px;padding:14px;">
      <div class="row" style="margin-bottom:4px;">
        <span style="font-weight:800;">${gcFmtAutofill(key, a.value)}</span>
        <button class="button secondary small" type="button" onclick="gcStartOverride('${h(key)}')">${a.overridden ? "Edit" : "Override"}</button>
      </div>
      <p class="helper" style="margin:0;">${h(a.explanation)} <em style="opacity:.7;">(${h(a.source)}${a.overridden ? ", overridden" : ""})</em></p>
      ${a._editing ? `<div class="row" style="align-items:center;gap:6px;margin-top:8px;">
        <input type="number" class="goal-field" style="flex:1;" step="any" value="${h(a.value)}" onchange="gcOverrideAutofill('${h(key)}', this.value)">
        <button class="button secondary small" type="button" onclick="gcCancelOverride('${h(key)}')">Done</button>
      </div>` : ""}
    </div>
  `;
}

// ── Step 4: feasibility ──────────────────────────────────────────────────────
function gcStepFeasibility(d) {
  var feas = goalsComputeFeasibility(d.typeKey, d.inputs, d.autofill);
  var t = goalsTypeMeta(d.typeKey);
  var vMeta = {
    comfortable: { label: "Comfortable", css: "on-track", emoji: "✅", note: "This fits your budget with room to spare." },
    tight:       { label: "Tight",        css: "intentional", emoji: "⚠️", note: "Doable, but it'll take discipline." },
    unrealistic: { label: "A stretch",    css: "worth-a-look", emoji: "🚧", note: "As set, this is hard to hit — try an adjustment." }
  }[feas.verdict] || { label: feas.verdict, css: "", emoji: "", note: "" };

  var monthlyLine = (feas.unit === "usd" && feas.requiredMonthly > 0)
    ? `<div class="row" style="margin-bottom:6px;"><span class="helper">Needs about</span><span style="font-weight:700;">${budgetFmt(feas.requiredMonthly)}/mo</span></div>
       <div class="row" style="margin-bottom:6px;"><span class="helper">Your monthly capacity</span><span style="font-weight:700;">${budgetFmt(feas.capacityMonthly)}/mo</span></div>`
    : "";

  var chips = [];
  if (feas.adjustments.extendToDate)
    chips.push(`<button class="button secondary small" type="button" onclick="gcApplyAdjustment('extend')">Extend to ${h(feas.adjustments.extendToDate)}</button>`);
  if (feas.adjustments.lowerToTarget != null)
    chips.push(`<button class="button secondary small" type="button" onclick="gcApplyAdjustment('lower')">Lower target to ${h(goalsFmtValue(feas.adjustments.lowerToTarget, feas.unit))}</button>`);

  return `
    <div class="card" style="margin-bottom:12px;">
      <div class="row" style="margin-bottom:8px;">
        <span style="font-weight:850;font-size:16px;">${vMeta.emoji} ${vMeta.label}</span>
        <span class="signal ${vMeta.css}" style="font-size:11px;">${h(goalsFmtValue(feas.targetValue, feas.unit))} by ${h(feas.targetDate)}</span>
      </div>
      <p class="helper" style="margin-bottom:12px;">${vMeta.note}</p>
      ${monthlyLine}
      ${feas.notes.length ? `<ul class="helper" style="margin:8px 0 0;padding-left:18px;">${feas.notes.map(function(n) { return "<li>" + h(n) + "</li>"; }).join("")}</ul>` : ""}
    </div>
    ${chips.length ? `<div class="section-title" style="margin:6px 0 8px;">Make it easier</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:14px;">${chips.join("")}</div>` : ""}
    <button class="button primary full" type="button" onclick="gcConfirmCreate()">Start this goal →</button>
  `;
}

// ── Handlers ─────────────────────────────────────────────────────────────────
function gcSelectCategory(key) { var d = gcDraft(); d.categoryKey = key; d.typeKey = null; d.step = "type"; render(); }

function gcSelectType(key) {
  var d = gcDraft();
  d.typeKey = key;
  var t = goalsTypeMeta(key);
  d.inputs = {};
  t.fields.forEach(function(f) {
    if (f.type === "date") d.inputs[f.key] = goalsAddDays(goalsTodayISO(), Math.round((f.defaultMonths || 12) * 30.44));
    else if (f.type === "debtPicker") d.inputs[f.key] = [];
    else if (f.type === "select") d.inputs[f.key] = f.options[0].value;
    else if (f.default != null) d.inputs[f.key] = f.default;
  });
  d.autofill = goalsAutofillFor(key);
  d.step = "inputs";
  render();
}

function gcSetInput(key, value, type) {
  var d = gcDraft();
  if (type === "usd" || type === "int" || type === "pct") d.inputs[key] = parseFloat(value) || 0;
  else d.inputs[key] = value;
  // No render — numeric/select/date use onchange; avoids focus loss while typing.
}

function gcToggleDebt(debtId, on) {
  var d = gcDraft();
  var t = goalsTypeMeta(d.typeKey);
  var picker = t.fields.find(function(f) { return f.type === "debtPicker"; });
  if (!picker) return;
  var arr = d.inputs[picker.key] || [];
  var i = arr.indexOf(debtId);
  if (on && i === -1) arr.push(debtId);
  if (!on && i !== -1) arr.splice(i, 1);
  d.inputs[picker.key] = arr;
}

function gcStartOverride(key) { var d = gcDraft(); if (d.autofill[key]) d.autofill[key]._editing = true; render(); }
function gcCancelOverride(key) { var d = gcDraft(); if (d.autofill[key]) d.autofill[key]._editing = false; render(); }
function gcOverrideAutofill(key, value) {
  var d = gcDraft();
  if (!d.autofill[key]) return;
  d.autofill[key].value = parseFloat(value);
  d.autofill[key].overridden = true;
  d.autofill[key]._editing = false;
  render();
}

function gcToFeasibility() { var d = gcDraft(); d.step = "feasibility"; render(); }

function gcApplyAdjustment(kind) {
  var d = gcDraft();
  var feas = goalsComputeFeasibility(d.typeKey, d.inputs, d.autofill);
  if (kind === "extend" && feas.adjustments.extendToDate) {
    var t = goalsTypeMeta(d.typeKey);
    var dateField = t.fields.find(function(f) { return f.type === "date"; });
    if (dateField) d.inputs[dateField.key] = feas.adjustments.extendToDate;
  } else if (kind === "lower" && feas.adjustments.lowerToTarget != null) {
    gcApplyLower(d, feas.adjustments.lowerToTarget);
  }
  render();
}

// Map a desired targetValue back onto the type's driving input field(s).
function gcApplyLower(d, lowerTarget) {
  var inp = d.inputs;
  switch (d.typeKey) {
    case "vehicle":         inp.price = Math.round(lowerTarget / ((inp.downPct || 1) / 100)); break;
    case "homeDown":        inp.homePrice = Math.round(lowerTarget / ((inp.downPct || 1) / 100)); break;
    case "vacation":        inp.cost = lowerTarget; break;
    case "wedding":         inp.budget = lowerTarget; break;
    case "collegeFund":     inp.targetAmount = lowerTarget; break;
    case "retirementBoost": inp.targetBalance = lowerTarget; break;
    case "emergencyFund": {
      var ess = (d.autofill.essentialMonthlySpend && d.autofill.essentialMonthlySpend.value) || goalsEssentialMonthlySpend();
      inp.months = Math.max(1, Math.round(lowerTarget / Math.max(1, ess))); break;
    }
    case "passiveIncome": {
      var mr = (d.autofill.marketReturn && d.autofill.marketReturn.value) || GOALS_MOCK.rates.marketReturn;
      inp.monthlyIncomeGoal = Math.max(50, Math.round(lowerTarget * mr / 12)); break;
    }
    case "categoryCut":     inp.monthlyReduction = Math.max(25, Math.round(lowerTarget / (inp.durationMonths || 1))); break;
    case "courseCompletion": inp.lessonCount = Math.max(1, lowerTarget); break;
    case "targetScore":     inp.targetScore = lowerTarget; break;
  }
}

function gcConfirmCreate() {
  var d = gcDraft();
  var goal = goalsCreateFromDraft(d);
  recordGoalCreation(goal);
  go("goalTracker");
}

function gcBack() {
  var d = gcDraft();
  if (d.step === "feasibility") { d.step = "inputs"; render(); return; }
  if (d.step === "inputs")      { d.step = "type"; render(); return; }
  if (d.step === "type")        { d.step = "category"; render(); return; }
  gcCancel();
}

function gcCancel() { state.goalsV2.draft = null; go("aboutMe"); }

function renderGoalCreateAdmin() {
  return (typeof renderGoalsDevPanel === "function") ? renderGoalsDevPanel() : "";
}
