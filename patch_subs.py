#!/usr/bin/env python3
"""Patch baby-budget.js: subscription modal two-screen flow + fixes."""
import base64, re, sys

def require(html, needle, label):
    if needle not in html:
        print(f"ERROR: could not find '{label}'")
        sys.exit(1)
    return html

with open("screens/baby-budget.js") as f:
    src = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=\s]+)";', src)
assert m, "Could not find base64 blob"
b64 = m.group(1).replace('\n','').replace(' ','')
html = base64.b64decode(b64).decode('utf-8')

# ── 1. Replace subscription modal HTML ───────────────────────────────────────

old_modal = (
    '<div id="subModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;align-items:flex-end;justify-content:center;">'
    '<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:20px;max-height:85vh;overflow-y:auto;">'
    '<div style="font-size:16px;font-weight:850;margin-bottom:12px;">Subscriptions</div>'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">'
    '<div style="padding:10px;border:2px solid var(--accent);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><div>Enter Manually</div><div class="helper">Add them one by one</div></div>'
    '<div style="padding:10px;border:1.5px solid var(--line);border-radius:10px;font-size:12px;font-weight:700;opacity:.45;cursor:not-allowed;"><div>Automatic — $9.99/mo</div><div class="helper">Connect and auto-detect</div></div>'
    '</div>'
    '<div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:10px;flex-wrap:wrap;">'
    '<div style="flex:2;min-width:80px;"><label style="font-size:10px;color:var(--muted);">Name</label><input id="subName" type="text" placeholder="Netflix" style="width:100%;margin-top:2px;"></div>'
    '<div style="flex:2;min-width:80px;"><label style="font-size:10px;color:var(--muted);">Type</label><select id="subType" style="width:100%;margin-top:2px;"><option>Streaming (Video)</option><option>Streaming (Music/Audio)</option><option>Software / Productivity</option><option>AI Services</option><option>Gaming & Entertainment</option><option>News & Reading</option><option>Fitness & Health</option><option>Food & Grocery Delivery</option><option>Cloud Storage</option><option>Other</option></select></div>'
    '<div style="flex:1;min-width:50px;"><label style="font-size:10px;color:var(--muted);">Price</label><input id="subPrice" type="number" min="0" placeholder="0" style="width:100%;margin-top:2px;"></div>'
    '<div style="flex:1;min-width:50px;"><label style="font-size:10px;color:var(--muted);">Period</label><select id="subFreq" style="width:100%;margin-top:2px;"><option value="monthly">Mo</option><option value="annual">Yr</option></select></div>'
    '<button type="button" onclick="addSubscription()" style="padding:8px 10px;border:1.5px solid var(--accent);border-radius:8px;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;">+ Add</button>'
    '</div>'
    '<div id="subList"></div>'
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">'
    '<div style="font-size:13px;font-weight:850;">Total: <span id="subModalTotal" style="color:var(--accent);">$0/mo</span></div>'
    '<button type="button" onclick="closeSubModal()" style="padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">Done</button>'
    '</div></div></div>'
)

new_modal = (
    '<div id="subModal" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:200;align-items:flex-end;justify-content:center;">'
    '<div style="background:#fff;width:100%;border-radius:24px 24px 0 0;max-height:92%;display:flex;flex-direction:column;overflow:hidden;">'
    # Page 1 — choose method
    '<div id="subP1">'
    '<div style="padding:18px 20px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;">'
    '<div style="font-size:17px;font-weight:850;">Add Subscriptions</div>'
    '<button type="button" onclick="closeSubModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);line-height:1;padding:0;">&#215;</button>'
    '</div>'
    '<div style="padding:20px;">'
    '<div style="font-size:13px;color:var(--muted);margin-bottom:14px;">How would you like to add them?</div>'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    '<div onclick="subGoManual()" style="padding:16px;border:2px solid var(--accent);border-radius:14px;background:var(--accent-soft);cursor:pointer;">'
    '<div style="font-size:14px;font-weight:850;color:var(--accent);">Enter Manually</div>'
    '<div style="font-size:11px;color:var(--muted);margin-top:5px;">Add them one by one</div>'
    '</div>'
    '<div style="padding:16px;border:1.5px solid var(--line);border-radius:14px;opacity:.4;cursor:not-allowed;">'
    '<div style="font-size:14px;font-weight:850;">Auto-Detect</div>'
    '<div style="font-size:11px;color:var(--muted);margin-top:5px;">$9.99/mo — coming soon</div>'
    '</div>'
    '</div>'
    '</div>'
    '</div>'
    # Page 2 — add manually
    '<div id="subP2" style="display:none;flex:1;flex-direction:column;overflow:hidden;">'
    '<div style="padding:14px 20px 12px;border-bottom:1px solid var(--line);flex-shrink:0;display:flex;align-items:center;gap:10px;">'
    '<button type="button" onclick="subGoBack()" style="background:none;border:none;font-size:13px;font-weight:700;cursor:pointer;color:var(--accent);padding:0 6px 0 0;">← Back</button>'
    '<div style="font-size:17px;font-weight:850;flex:1;">Subscriptions</div>'
    '<button type="button" onclick="closeSubModal()" style="padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Done</button>'
    '</div>'
    '<div style="padding:14px 20px;border-bottom:1px solid var(--line);flex-shrink:0;">'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
    '<div><label style="font-size:10px;font-weight:700;color:var(--muted);">NAME</label><input id="subName" type="text" placeholder="e.g. Netflix" style="width:100%;margin-top:3px;"></div>'
    '<div><label style="font-size:10px;font-weight:700;color:var(--muted);">TYPE</label><select id="subType" style="width:100%;margin-top:3px;"><option>Streaming (Video)</option><option>Streaming (Music/Audio)</option><option>Software / Productivity</option><option>AI Services</option><option>Gaming & Entertainment</option><option>News & Reading</option><option>Fitness & Health</option><option>Food & Grocery Delivery</option><option>Cloud Storage</option><option>Other</option></select></div>'
    '</div>'
    '<div style="display:flex;gap:8px;align-items:flex-end;">'
    '<div style="flex:2;"><label style="font-size:10px;font-weight:700;color:var(--muted);">PRICE ($)</label><input id="subPrice" type="number" min="0" step="0.01" placeholder="0" oninput="updateSubModalTotal()" style="width:100%;margin-top:3px;"></div>'
    '<div style="flex:1;"><label style="font-size:10px;font-weight:700;color:var(--muted);">PERIOD</label><select id="subFreq" onchange="updateSubModalTotal()" style="width:100%;margin-top:3px;"><option value="monthly">Monthly</option><option value="annual">Yearly</option></select></div>'
    '<button type="button" onclick="addSubscription()" style="padding:9px 14px;border:1.5px solid var(--accent);border-radius:8px;background:var(--accent-soft);color:var(--accent);font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;margin-bottom:1px;">+ Add</button>'
    '</div>'
    '</div>'
    '<div id="subList" style="flex:1;overflow-y:auto;padding:0 20px;"></div>'
    '<div style="padding:14px 20px;border-top:1px solid var(--line);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;">'
    '<div style="font-size:13px;color:var(--muted);font-weight:700;">Monthly total</div>'
    '<div style="font-size:18px;font-weight:850;color:var(--accent);" id="subModalTotal">$0/mo</div>'
    '</div>'
    '</div>'
    '</div>'
    '</div>'
)

require(html, old_modal, "subscription modal HTML")
html = html.replace(old_modal, new_modal, 1)
print("✓ modal HTML replaced")

# ── 2. Replace subscription JS functions ─────────────────────────────────────

old_js = (
    'function openSubModal(){$("subModal").style.display="flex";}\n'
    'function closeSubModal(){$("subModal").style.display="none";updateSubsTotal();}\n'
    'function subscriptionMonthly(sub){return sub.frequency==="annual"?sub.price/12:sub.price;}\n'
    'function renderSubscriptionList(){const box=$("subList");if(!box)return;box.innerHTML=subscriptions.length===0?\'<div class="helper" style="text-align:center;padding:8px 0;">No subscriptions added yet.</div>\':subscriptions.map((sub,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12px;"><div style="flex:1;"><span style="font-weight:700;">${sub.name}</span> \xb7 <span style="color:var(--muted);">${sub.type}</span></div><div style="white-space:nowrap;font-weight:850;">$${Math.round(subscriptionMonthly(sub))+"/mo"}</div><button type="button" onclick="removeSubscription(${i})" style="border:none;background:none;font-size:14px;cursor:pointer;color:var(--muted);padding:0 4px;">\xd7</button></div>`).join("");const tot=$("subModalTotal");if(tot)tot.textContent="$"+Math.round(subscriptionTotal()).toLocaleString()+"/mo";}\n'
    'function addSubscription(){const name=($("subName")?.value||"").trim()||"Subscription";const type=$("subType")?.value||"Other";const price=parseFloat($("subPrice")?.value)||0;const freq=$("subFreq")?.value||"monthly";if(!price)return;subscriptions.push({name,type,price,frequency:freq});if($("subName"))$("subName").value="";if($("subPrice"))$("subPrice").value="";renderSubscriptionList();}\n'
    'function removeSubscription(i){subscriptions.splice(i,1);renderSubscriptionList();}\n'
    'function updateSubsTotal(){if($("subsTotal"))$("subsTotal").textContent="$"+Math.round(subscriptionTotal()).toLocaleString()+"/mo";}'
)

new_js = (
    'function openSubModal(){$("subModal").style.display="flex";$("subP1").style.display="block";$("subP2").style.display="none";renderSubscriptionList();}\n'
    'function subGoManual(){$("subP1").style.display="none";$("subP2").style.cssText="display:flex;flex:1;flex-direction:column;overflow:hidden;";}  \n'
    'function subGoBack(){$("subP2").style.display="none";$("subP1").style.display="block";}\n'
    'function closeSubModal(){$("subModal").style.display="none";updateSubsTotal();}\n'
    'function subscriptionMonthly(sub){return sub.frequency==="annual"?sub.price/12:sub.price;}\n'
    'function updateSubModalTotal(){const cur=parseFloat($("subPrice")?.value)||0;const freq=$("subFreq")?.value||"monthly";const curMo=freq==="annual"?cur/12:cur;const tot=$("subModalTotal");if(tot)tot.textContent="$"+Math.round(subscriptionTotal()+curMo).toLocaleString()+"/mo";}\n'
    'function renderSubscriptionList(){const box=$("subList");if(!box)return;box.innerHTML=subscriptions.length===0?\'<div style="text-align:center;padding:20px 0;font-size:13px;color:var(--muted);">No subscriptions yet — add one above.</div>\':subscriptions.map((sub,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);"><div style="flex:1;"><div style="font-size:13px;font-weight:700;">${sub.name}</div><div style="font-size:11px;color:var(--muted);">${sub.type}</div></div><div style="font-weight:850;color:var(--accent);font-size:13px;white-space:nowrap;">$${Math.round(subscriptionMonthly(sub))}/mo</div><button type="button" onclick="removeSubscription(${i})" style="border:none;background:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0 4px;flex-shrink:0;line-height:1;">\xd7</button></div>`).join("");updateSubModalTotal();}\n'
    'function addSubscription(){const name=($("subName")?.value||"").trim()||"Subscription";const type=$("subType")?.value||"Other";const price=parseFloat($("subPrice")?.value)||0;const freq=$("subFreq")?.value||"monthly";if(!price)return;subscriptions.push({name,type,price,frequency:freq});$("subName").value="";$("subPrice").value="";renderSubscriptionList();}\n'
    'function removeSubscription(i){subscriptions.splice(i,1);renderSubscriptionList();}\n'
    'function updateSubsTotal(){if($("subsTotal"))$("subsTotal").textContent="$"+Math.round(subscriptionTotal()).toLocaleString()+"/mo";}'
)

require(html, old_js, "subscription JS functions")
html = html.replace(old_js, new_js, 1)
print("✓ subscription JS functions replaced")

# ── Re-encode and write back ──────────────────────────────────────────────────
new_b64 = base64.b64encode(html.encode('utf-8')).decode('ascii')
# wrap at 76 chars to match original formatting
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]

with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)

print("✓ baby-budget.js written")
