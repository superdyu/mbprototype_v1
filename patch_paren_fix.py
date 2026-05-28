#!/usr/bin/env python3
"""Fix missing ) in renderTierSingle trackHTML .map().join() call."""
import base64, re, sys

with open("screens/baby-budget.js") as f:
    src = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=]+)";', src)
assert m
html = base64.b64decode(m.group(1)).decode("utf-8")

# The outer template literal of the .map() arrow fn closes just before .join('').
# Currently: `:''}`.join('')   ← missing ) to close .map(
# Correct:   `:''}` ).join('')
old = "`:''}`.join('');"
new = "`:''}` ).join('');"

if old not in html:
    print("ERROR: could not find target string")
    sys.exit(1)

html = html.replace(old, new, 1)

# Verify balance
script = html[html.find('<script>'):html.rfind('</script>')]
fn_idx = script.find('function renderTierSingle')
fn_end = script.find('\nfunction renderTiers(', fn_idx)
fn = script[fn_idx:fn_end]
balance = fn.count('(') - fn.count(')')
print(f"renderTierSingle paren balance after fix: {balance}  (should be 0)")

new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]
with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)
print("✓ baby-budget.js written")
