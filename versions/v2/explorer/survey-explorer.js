// ─── Survey Explorer UI ───────────────────────────────────────────────────────
// Renders survey-explorer.html's four views from the live content table + bridge
// math (loaded by the page; nothing here duplicates them). Standalone page —
// its own tiny render loop, no app engine. See the header note in the HTML.

const $x = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = n => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString();
const pctFmt = p => (p >= 0 ? "+" : "−") + Math.round(Math.abs(p) * 100) + "%";

// Persona controls state (Persona Lab + Tree + Sweep all read from this).
const persona = { grossAnnual: 120000, zip: "95126", householdSize: 1 };
const labAnswers = { base: {}, followups: {} };

const ZIP_CHOICES = ["95126", "95014", "90210", "10001", "60601", "77001", "30301", "72712", "00000"];

function personaCtx() {
  return lsContext({ gender: "", age: 0, householdSize: persona.householdSize,
    zip: persona.zip, incomeMode: "annual", grossIncome: persona.grossAnnual });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [["table", "Content Table"], ["tree", "Decision Tree"], ["lab", "Persona Lab"], ["sweep", "Sweep"]];
let activeTab = "lab";

function renderTabs() {
  $x("tabs").innerHTML = TABS.map(([id, label]) =>
    `<button class="${activeTab === id ? "active" : ""}" onclick="setTab('${id}')">${label}</button>`).join("");
  TABS.forEach(([id]) => $x("view-" + id).classList.toggle("active", activeTab === id));
}
function setTab(id) { activeTab = id; renderAll(); }

// ── Shared persona controls ───────────────────────────────────────────────────
function personaControls() {
  const ctx = personaCtx();
  return `
    <div class="card">
      <span class="k">Persona</span>&nbsp;&nbsp;
      Income <input type="number" style="width:110px" value="${persona.grossAnnual}"
        onchange="persona.grossAnnual=+this.value||0;renderAll()"> /yr
      &nbsp; ZIP <select onchange="persona.zip=this.value;renderAll()">
        ${ZIP_CHOICES.map(z => `<option ${persona.zip === z ? "selected" : ""}>${z}</option>`).join("")}
      </select>
      &nbsp; Household <select onchange="persona.householdSize=+this.value;renderAll()">
        ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${persona.householdSize === n ? "selected" : ""}>${n}</option>`).join("")}
      </select>
      <div class="muted" style="margin-top:8px;">
        net <b>${fmt(ctx.net)}/mo</b> · quintile <b>${ctx.quintile}</b> · zip ×<b>${ctx.zipMult}</b>
      </div>
    </div>`;
}

// ── View: Content Table ───────────────────────────────────────────────────────
function renderTable() {
  const ctx = personaCtx();
  $x("view-table").innerHTML = personaControls() + LS_BASE_QUESTIONS.map(q => `
    <div class="card">
      <span class="k">${esc(q.cat)}</span> — <b>${esc(q.title)}</b>
      <span class="muted">· baseline for persona: ${fmt(lsBaselineFor(q.cat, ctx))}/mo</span>
      <table style="margin-top:8px;">
        <tr><th style="width:110px">Notch</th><th style="width:60px">Lean</th><th style="width:130px">$ for persona</th><th>Description</th></tr>
        ${q.notches.map((n, i) => {
          const r = lsNotchRange(q.cat, i + 1, ctx);
          return `<tr>
            <td><b>${esc(n.label)}</b></td>
            <td class="${n.pct >= 0 ? "pos" : "neg"}">${pctFmt(n.pct)}</td>
            <td>${fmt(r[0])}–${fmt(r[1])}</td>
            <td class="muted">${esc(n.desc)} <span style="opacity:.5">(${n.desc.length} ch)</span></td>
          </tr>`;
        }).join("")}
      </table>
    </div>`).join("") + LS_FOLLOWUPS.map(fu => `
    <div class="card">
      <span class="k">follow-up · ${esc(fu.cat)}</span> — <b>${esc(fu.title)}</b> <code>${esc(fu.id)}</code>
      <div class="muted" style="margin:6px 0;"><b>Why it earns a tap:</b> ${esc(fu.impactRationale)}</div>
      <div class="muted" style="margin:0 0 6px;"><b>Prereq:</b> ${esc(fu.prereq.cat)} ∈ [${fu.prereq.notches.join(", ")}]${fu.prereq.quintiles ? " · quintile ∈ [" + fu.prereq.quintiles.join(", ") + "]" : ""}${fu.prereq.minZipMult ? " · zip ≥ ×" + fu.prereq.minZipMult : ""}</div>
      <table>
        <tr><th style="width:220px">Option</th><th style="width:60px">Adj</th><th>Meaning</th></tr>
        ${fu.options.map(o => `<tr>
          <td><b>${esc(o.label)}</b></td>
          <td class="${o.adj > 0 ? "pos" : o.adj < 0 ? "neg" : "muted"}">${o.adj === 0 ? "0%" : pctFmt(o.adj)}</td>
          <td class="muted">${esc(o.desc)}</td>
        </tr>`).join("")}
      </table>
    </div>`).join("");
}

// ── View: Decision Tree ───────────────────────────────────────────────────────
function renderTree() {
  const ctx = personaCtx();
  $x("view-tree").innerHTML = personaControls() + `
    <div class="card">
      <span class="k">Path rule</span>
      <div class="muted" style="margin-top:6px;">7 base questions in magnitude order; each armed follow-up slots in
      right after its category. Skipping a base question sets it to the peer average AND disarms its follow-ups.
      Savings is never asked — it's the residual.</div>
    </div>` +
    LS_BASE_QUESTIONS.map(q => {
      const fus = LS_FOLLOWUPS.filter(f => f.cat === q.cat);
      return `<div class="card">
        <b>${esc(q.title)}</b> <span class="k">${esc(q.cat)}</span>
        ${fus.length === 0 ? `<div class="muted" style="margin-top:4px;">no follow-ups — one tap covers this category</div>`
        : fus.map(fu => {
          const gateQ = fu.prereq.quintiles ? (fu.prereq.quintiles.includes(ctx.quintile) ? "" : ` <span class="warn">gated OFF for this persona (quintile ${ctx.quintile})</span>`) : "";
          const gateZ = fu.prereq.minZipMult ? (ctx.zipMult >= fu.prereq.minZipMult ? "" : ` <span class="warn">gated OFF for this persona (zip ×${ctx.zipMult})</span>`) : "";
          return `<div style="margin:8px 0 0 14px;border-left:2px solid var(--line);padding-left:12px;">
            └ answers <b>[${fu.prereq.notches.map(n => q.notches[n - 1].label).join(" | ")}]</b>
              → <code>${esc(fu.id)}</code>${gateQ}${gateZ}
            <div class="muted" style="margin-top:2px;">${fu.options.map(o =>
              `${esc(o.label)} <span class="${o.adj > 0 ? "pos" : o.adj < 0 ? "neg" : "muted"}">${o.adj === 0 ? "0%" : pctFmt(o.adj)}</span>`).join(" · ")}</div>
          </div>`;
        }).join("")}
      </div>`;
    }).join("");
}

// ── View: Persona Lab ─────────────────────────────────────────────────────────
function renderLab() {
  const ctx = personaCtx();
  const amounts = lsComputeAmounts(labAnswers, ctx);
  const total = Object.values(amounts).reduce((s, v) => s + v, 0);
  const spend = total - amounts.savings;
  const maxAmt = Math.max(...Object.values(amounts), 1);

  $x("view-lab").innerHTML = personaControls() + `
    <div class="grid">
      <div>
        ${LS_BASE_QUESTIONS.map(q => {
          const cur = labAnswers.base[q.cat];
          const fus = LS_FOLLOWUPS.filter(f => f.cat === q.cat && lsFollowupArmed(f, labAnswers, ctx));
          return `<div class="card">
            <b>${esc(q.title)}</b> <span class="k">${esc(q.cat)}</span><br>
            <span class="chip skipchip ${cur === "skip" ? "on" : ""}" onclick="labSet('${q.cat}','skip')">skip</span>
            ${q.notches.map((n, i) => `<span class="chip ${cur === i + 1 ? "on" : ""}"
              onclick="labSet('${q.cat}',${i + 1})">${esc(n.label)}</span>`).join("")}
            ${fus.map(fu => `<div style="margin-top:8px;">
              <span class="k">↳ ${esc(fu.id)}</span><br>
              ${fu.options.map((o, i) => `<span class="chip ${labAnswers.followups[fu.id] === i ? "on" : ""}"
                onclick="labSetFu('${fu.id}',${i})">${esc(o.label)}</span>`).join("")}
            </div>`).join("")}
          </div>`;
        }).join("")}
      </div>
      <div>
        <div class="card">
          <span class="k">Resulting budget</span>
          <table style="margin-top:6px;">
            ${BASELINE_AMOUNT_LABELS.map(([key, label]) => {
              const base = key === "savings" ? null : Math.round(lsBaselineFor(key, ctx));
              const delta = base === null ? null : amounts[key] - base;
              return `<tr>
                <td style="width:130px"><b>${esc(label)}</b></td>
                <td style="width:80px">${fmt(amounts[key])}</td>
                <td class="muted" style="width:110px">${base === null ? "residual" :
                  delta === 0 ? "on average" : `<span class="${delta > 0 ? "pos" : "neg"}">${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta)).slice(1)}</span> vs avg`}</td>
                <td><div class="bar" style="width:120px"><i style="width:${Math.round(amounts[key] / maxAmt * 100)}%"></i></div></td>
              </tr>`;
            }).join("")}
          </table>
          <div style="margin-top:10px;">
            Spend <b>${fmt(spend)}</b> · Savings <b>${fmt(amounts.savings)}</b> · Net <b>${fmt(ctx.net)}</b>
            ${spend > ctx.net ? `<div class="bad" style="margin-top:4px;">Overspent by ${fmt(spend - ctx.net)} — savings floored at $0</div>` : ""}
          </div>
        </div>
        <div class="card">
          <span class="k">Path for these answers</span>
          <div style="margin-top:6px;">${lsPlannedPath(labAnswers, ctx).map((p, i) =>
            `<div>${i + 1}. ${p.kind === "base" ? "" : "↳ "}<code>${esc(p.id)}</code></div>`).join("")}
          </div>
          <div class="muted" style="margin-top:6px;">${lsPlannedPath(labAnswers, ctx).length} questions + basics + review</div>
        </div>
      </div>
    </div>`;
}

function labSet(cat, v) { labAnswers.base[cat] = (labAnswers.base[cat] === v ? undefined : v); renderAll(); }
function labSetFu(id, i) { labAnswers.followups[id] = (labAnswers.followups[id] === i ? undefined : i); renderAll(); }

// ── View: Sweep ───────────────────────────────────────────────────────────────
// Enumerates every base-answer combination (4^7 = 16,384) for the current
// persona, with each armed follow-up tried at EVERY option. Flags follow-ups
// that never fire or whose options barely move dollars — the time-waster check.
function renderSweep() {
  $x("view-sweep").innerHTML = personaControls() + `
    <div class="card"><button class="chip on" style="font-size:13px;padding:8px 16px;" onclick="runSweep()">Run sweep (16,384 combos)</button>
    <span class="muted"> runs in-page, ~1s</span></div>
    <div id="sweepOut"></div>`;
}

function runSweep() {
  const ctx = personaCtx();
  const cats = LS_BASE_QUESTIONS.map(q => q.cat);
  const pathLen = {}; let totMin = Infinity, totMax = -Infinity, totSum = 0, over = 0;
  const catMin = {}, catMax = {}; cats.concat(["savings"]).forEach(c => { catMin[c] = Infinity; catMax[c] = -Infinity; });
  const fuStats = {}; LS_FOLLOWUPS.forEach(f => fuStats[f.id] = { fired: 0, minMove: Infinity, maxMove: -Infinity });

  for (let mask = 0; mask < Math.pow(4, 7); mask++) {
    const base = {}; let m = mask;
    cats.forEach(cat => { base[cat] = (m % 4) + 1; m = Math.floor(m / 4); });
    const answers = { base, followups: {} };
    const path = lsPlannedPath(answers, ctx);
    pathLen[path.length] = (pathLen[path.length] || 0) + 1;
    const amounts = lsComputeAmounts(answers, ctx);
    const spend = cats.reduce((s, c) => s + amounts[c], 0);
    totMin = Math.min(totMin, spend); totMax = Math.max(totMax, spend); totSum += spend;
    if (spend > ctx.net) over++;
    cats.concat(["savings"]).forEach(c => { catMin[c] = Math.min(catMin[c], amounts[c]); catMax[c] = Math.max(catMax[c], amounts[c]); });

    LS_FOLLOWUPS.forEach(fu => {
      if (!lsFollowupArmed(fu, answers, ctx)) return;
      fuStats[fu.id].fired++;
      const without = lsCategoryAmount(fu.cat, answers, ctx);
      fu.options.forEach((o, i) => {
        const a2 = { base, followups: { [fu.id]: i } };
        const move = Math.abs(lsCategoryAmount(fu.cat, a2, ctx) - without);
        fuStats[fu.id].minMove = Math.min(fuStats[fu.id].minMove, move);
        fuStats[fu.id].maxMove = Math.max(fuStats[fu.id].maxMove, move);
      });
    });
  }

  const n = Math.pow(4, 7);
  $x("sweepOut").innerHTML = `
    <div class="card">
      <span class="k">Totals across ${n.toLocaleString()} combos</span>
      <div style="margin-top:6px;">Spend range <b>${fmt(totMin)}–${fmt(totMax)}</b> · mean ${fmt(totSum / n)} · net ${fmt(ctx.net)}
      · <span class="${over > 0 ? "warn" : "muted"}">${Math.round(over / n * 100)}% of combos open overspent</span></div>
      <table style="margin-top:8px;"><tr><th>Questions on path</th><th>Combos</th></tr>
        ${Object.keys(pathLen).sort((a, b) => a - b).map(k =>
          `<tr><td>${k}</td><td>${pathLen[k].toLocaleString()} (${Math.round(pathLen[k] / n * 100)}%)</td></tr>`).join("")}
      </table>
    </div>
    <div class="card">
      <span class="k">Per-category spread</span>
      <table style="margin-top:6px;"><tr><th>Category</th><th>Min</th><th>Max</th></tr>
        ${cats.concat(["savings"]).map(c => `<tr><td><b>${c}</b></td><td>${fmt(catMin[c])}</td><td>${fmt(catMax[c])}</td></tr>`).join("")}
      </table>
    </div>
    <div class="card">
      <span class="k">Follow-up earn-your-tap check</span>
      <table style="margin-top:6px;"><tr><th>Follow-up</th><th>Fires</th><th>$ move (min–max across options)</th><th>Verdict</th></tr>
        ${LS_FOLLOWUPS.map(fu => {
          const s = fuStats[fu.id];
          const never = s.fired === 0;
          const weak = !never && s.maxMove < 25;
          return `<tr><td><code>${esc(fu.id)}</code></td>
            <td>${never ? '<span class="bad">never</span>' : s.fired.toLocaleString() + " (" + Math.round(s.fired / n * 100) + "%)"}</td>
            <td>${never ? "—" : fmt(s.minMove) + "–" + fmt(s.maxMove)}</td>
            <td>${never ? '<span class="bad">DEAD for this persona — check gates</span>'
                 : weak ? '<span class="warn">WEAK — moves < $25, consider retuning</span>'
                 : '<span class="neg">earns its tap</span>'}</td></tr>`;
        }).join("")}
      </table>
      <div class="muted" style="margin-top:6px;">"never" can be correct — income/urban gates are supposed to
      switch follow-ups off for some personas. Check across a few personas before deleting anything.</div>
    </div>`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function renderAll() {
  renderTabs();
  if (activeTab === "table") renderTable();
  if (activeTab === "tree")  renderTree();
  if (activeTab === "lab")   renderLab();
  if (activeTab === "sweep") renderSweep();
}
renderAll();
