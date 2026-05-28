#!/usr/bin/env python3
"""Three fixes: debt-button spacing, name placeholders, tier track style."""
import base64, re, sys

def require(html, needle, label):
    if needle not in html:
        print(f"ERROR: could not find '{label}'")
        sys.exit(1)
    return html

with open("screens/baby-budget.js") as f:
    src = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=]+)";', src)
assert m, "Could not find base64 blob"
html = base64.b64decode(m.group(1)).decode("utf-8")

# ── Fix 1: Add bottom margin to .add-row so button has symmetric gap ─────────
old_addrow_css = ".add-row{display:flex;gap:10px;margin-top:10px}"
new_addrow_css = ".add-row{display:flex;gap:10px;margin-top:16px;margin-bottom:16px}"
require(html, old_addrow_css, "add-row CSS")
html = html.replace(old_addrow_css, new_addrow_css, 1)
print("✓ add-row spacing fixed")

# ── Fix 2: Type-specific name/nickname placeholders ───────────────────────────
# Insert namePH lookup just before the return` in the map callback,
# and swap the hardcoded placeholder.
old_return_start = (
    'const csOpts=CSUBS.map(s=>`<option value="${s}" ${d.customSubtype===s?"selected":""}>'
    '${s}</option>`).join("");return`<div class="debt-item">'
)
new_return_start = (
    'const csOpts=CSUBS.map(s=>`<option value="${s}" ${d.customSubtype===s?"selected":""}>'
    '${s}</option>`).join("");'
    'const namePH={creditCard:"e.g. Chase Sapphire",storeCard:"e.g. Target RedCard",'
    'studentLoan:"e.g. Sallie Mae Loan",autoLoan:"e.g. Toyota Auto Loan",'
    'personalLoan:"e.g. LendingClub Personal",mortgage:"e.g. Primary Mortgage",'
    'medicalDebt:"e.g. Hospital Payment Plan",informal:"e.g. Loan from Family",'
    'custom:"e.g. Buy Now Pay Later"}[type]||"e.g. Account Name";'
    'return`<div class="debt-item">'
)
require(html, old_return_start, "debt map return start")
html = html.replace(old_return_start, new_return_start, 1)

old_ph = 'placeholder="e.g. Chase Sapphire"'
new_ph = 'placeholder="${namePH}"'
require(html, old_ph, "Chase Sapphire placeholder")
html = html.replace(old_ph, new_ph, 1)
print("✓ name placeholders fixed")

# ── Fix 3: Replace pill buttons with tier-track notch style ──────────────────
old_tier = (
    'function renderTierSingle(stepNum){'
    'const subs=STEP_SUBS[stepNum];const key=subs[subStep];'
    'const cat=categories.find(c=>c.key===key);'
    'const mount=$("tierMount"+stepNum);if(!cat||!mount)return;'
    'const sectionNames={5:"Food",6:"Lifestyle",7:"Planning"};'
    'const sName=sectionNames[stepNum];'
    'const coords=imageCoordsForStep(stepNum);'
    'const tierKeys=["low","normal","high","priority"];'
    'const cur=tierState[key]||null;'
    'const pills=tierKeys.map(k=>`<button type="button" class="tier-pill${cur===k?" active":""}" '
    'onclick="tierState[\'${key}\']=\'${k}\';renderTierSingle(${stepNum})">${cat.labels[k]}</button>`).join("");'
    'mount.innerHTML=`'
    '<div class="lifestyle-img-box">'
    '<span class="lifestyle-img-section">${sName}</span>'
    '<span class="lifestyle-img-coords">${coords}</span>'
    '<span class="lifestyle-img-subprog">${subStep+1} of ${subs.length}</span>'
    '</div>'
    '<div class="card">'
    '<div class="card-title">${cat.name}</div>'
    '<div class="helper">${cat.desc}</div>'
    '<div class="tier-pill-row">${pills}</div>'
    '${cur?`<div class="helper" style="margin-top:6px;font-style:italic;">${cat.activity[cur]}</div>`:""}'
    '</div>`;'
    'renderSummary();}'
)

new_tier = (
    'function renderTierSingle(stepNum){'
    'const subs=STEP_SUBS[stepNum];const key=subs[subStep];'
    'const cat=categories.find(c=>c.key===key);'
    'const mount=$("tierMount"+stepNum);if(!cat||!mount)return;'
    'const sectionNames={5:"Food",6:"Lifestyle",7:"Planning"};'
    'const sName=sectionNames[stepNum];'
    'const coords=imageCoordsForStep(stepNum);'
    'const tierKeys=["low","normal","high","priority"];'
    'const tierLabels={low:"Minimal",normal:"Everyday",high:"Elevated",priority:"Full-focus"};'
    'const cur=tierState[key]||"normal";'
    'const selIdx=tierKeys.indexOf(cur);'
    "const trackHTML=tierKeys.map((k,i)=>`"
    '<div class="tier-dot-wrap${cur===k?\' active\':\'\'}" '
    "onclick=\"tierState['${key}']='${k}';seeded=false;renderTierSingle(${stepNum})\">"
    '<div class="tier-dot${cur===k?\' active\':\'\'}">'
    '</div>'
    '<div class="tier-dot-label">${tierLabels[k]}</div>'
    '</div>'
    "${i<tierKeys.length-1?`"
    '<div class="tier-connector${i<selIdx?\' filled\':\'\'}">'
    '</div>'
    "`:''}`.join('');"
    'mount.innerHTML=`'
    '<div class="lifestyle-img-box">'
    '<span class="lifestyle-img-section">${sName}</span>'
    '<span class="lifestyle-img-coords">${coords}</span>'
    '<span class="lifestyle-img-subprog">${subStep+1} of ${subs.length}</span>'
    '</div>'
    '<div class="card tier-category">'
    '<div style="margin-bottom:8px;">'
    '<div class="tier-cat-name">${cat.name}</div>'
    '<div class="helper">${cat.desc}</div>'
    '</div>'
    '<div class="tier-track">${trackHTML}</div>'
    '<div class="tier-selected-desc">${cat.activity[cur]}</div>'
    '</div>`;'
    'renderSummary();}'
)

require(html, old_tier, "renderTierSingle function")
html = html.replace(old_tier, new_tier, 1)
print("✓ tier selector replaced with notch track style")

# ── Re-encode and write ───────────────────────────────────────────────────────
new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]

with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)

print("✓ baby-budget.js written")
