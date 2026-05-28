#!/usr/bin/env python3
"""Add slide-in/slide-out animation to Food/Lifestyle/Planning tier steps."""
import base64, re, sys

def require(html, needle, label):
    if needle not in html:
        print(f"ERROR: could not find '{label}'")
        sys.exit(1)

with open("screens/baby-budget.js") as f:
    src = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=]+)";', src)
assert m
html = base64.b64decode(m.group(1)).decode("utf-8")

# ── 1. renderTierSingle: add dir param + animation ────────────────────────────
old_sig = "function renderTierSingle(stepNum){"
new_sig = "function renderTierSingle(stepNum,dir){"
require(html, old_sig, "renderTierSingle signature")
html = html.replace(old_sig, new_sig, 1)

# Replace the static mount.innerHTML assignment with animated version
old_mount = (
    "mount.innerHTML=`"
    '<div class="lifestyle-img-box">'
    '<span class="lifestyle-img-section">${sName}</span>'
    '<span class="lifestyle-img-coords">${coords}</span>'
    '<span class="lifestyle-img-subprog">${subStep+1} of ${subs.length}</span>'
    "</div>"
    '<div class="card tier-category">'
    '<div style="margin-bottom:8px;">'
    '<div class="tier-cat-name">${cat.name}</div>'
    '<div class="helper">${cat.desc}</div>'
    "</div>"
    '<div class="tier-track">${trackHTML}</div>'
    '<div class="tier-selected-desc">${cat.activity[cur]}</div>'
    "</div>`;"
    "renderSummary();}"
)
new_mount = (
    "const html=`"
    '<div class="lifestyle-img-box">'
    '<span class="lifestyle-img-section">${sName}</span>'
    '<span class="lifestyle-img-coords">${coords}</span>'
    '<span class="lifestyle-img-subprog">${subStep+1} of ${subs.length}</span>'
    "</div>"
    '<div class="card tier-category">'
    '<div style="margin-bottom:8px;">'
    '<div class="tier-cat-name">${cat.name}</div>'
    '<div class="helper">${cat.desc}</div>'
    "</div>"
    '<div class="tier-track">${trackHTML}</div>'
    '<div class="tier-selected-desc">${cat.activity[cur]}</div>'
    "</div>`;"
    # No animation: first render, no direction, or mount not yet visible
    "if(!dir||!mount.firstElementChild||!mount.offsetHeight){mount.innerHTML=html;renderSummary();return;}"
    # Snapshot outgoing
    "const h=mount.offsetHeight;"
    "const out=document.createElement('div');"
    "out.style.cssText='position:absolute;top:0;left:0;right:0;bottom:0;';"
    "while(mount.firstChild)out.appendChild(mount.firstChild);"
    # Container holds both cards during transition
    "mount.style.cssText='position:relative;overflow:hidden;min-height:'+h+'px;';"
    "mount.appendChild(out);"
    # Incoming card starts off-screen
    "const inn=document.createElement('div');"
    "inn.style.cssText='position:absolute;top:0;left:0;right:0;transform:translateX('+(dir==='forward'?'100%':'-100%')+');';"
    "inn.innerHTML=html;"
    "mount.appendChild(inn);"
    # Trigger reflow so the initial transform is painted before transition starts
    "inn.getBoundingClientRect();"
    # Slide both
    "const T='transform 280ms cubic-bezier(.4,0,.2,1)';"
    "out.style.transition=T;"
    "out.style.transform='translateX('+(dir==='forward'?'-100%':'100%')+')';"
    "inn.style.transition=T;"
    "inn.style.transform='translateX(0)';"
    # Lock nav during transition, update summary immediately
    "renderSummary();"
    "$('nextBtn').disabled=true;$('backBtn').disabled=true;"
    "setTimeout(()=>{"
      "mount.style.cssText='';"
      "mount.innerHTML=html;"
      "$('nextBtn').disabled=false;$('backBtn').disabled=false;"
    "},290);}"
)
require(html, old_mount, "renderTierSingle mount.innerHTML block")
html = html.replace(old_mount, new_mount, 1)
print("✓ renderTierSingle animated")

# ── 2. renderStep: add dir param, pass to renderTierSingle ───────────────────
old_rs = "function renderStep(){document.querySelectorAll"
new_rs = "function renderStep(dir){document.querySelectorAll"
require(html, old_rs, "renderStep signature")
html = html.replace(old_rs, new_rs, 1)

old_rs2 = "if(step===5)renderTierSingle(5);if(step===6)renderTierSingle(6);if(step===7)renderTierSingle(7);"
new_rs2 = "if(step===5)renderTierSingle(5,dir);if(step===6)renderTierSingle(6,dir);if(step===7)renderTierSingle(7,dir);"
require(html, old_rs2, "renderStep tierSingle calls")
html = html.replace(old_rs2, new_rs2, 1)
print("✓ renderStep updated")

# ── 3. next(): pass 'forward' for subStep/step advances within 5-7 ───────────
old_next_block = (
    "if([5,6,7].includes(step)){const subs=STEP_SUBS[step];"
    "if(subStep<subs.length-1){subStep++;renderStep();return;}"
    "if(step<7){subStep=0;step++;renderStep();return;}"
    "if(step===7){seedAmounts();step++;subStep=0;renderStep();return;}}"
)
new_next_block = (
    "if([5,6,7].includes(step)){const subs=STEP_SUBS[step];"
    "if(subStep<subs.length-1){subStep++;renderStep('forward');return;}"
    "if(step<7){subStep=0;step++;renderStep('forward');return;}"
    "if(step===7){seedAmounts();step++;subStep=0;renderStep();return;}}"
)
require(html, old_next_block, "next() 5-7 block")
html = html.replace(old_next_block, new_next_block, 1)
print("✓ next() updated")

# ── 4. back(): pass 'back' for subStep retreat within 5-7 ────────────────────
old_back = "if([5,6,7].includes(step)&&subStep>0){subStep--;renderStep();return;}"
new_back = "if([5,6,7].includes(step)&&subStep>0){subStep--;renderStep('back');return;}"
require(html, old_back, "back() subStep retreat")
html = html.replace(old_back, new_back, 1)
print("✓ back() updated")

# ── Re-encode and write ───────────────────────────────────────────────────────
new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]
with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)
print("✓ baby-budget.js written")
