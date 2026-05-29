#!/usr/bin/env python3
"""
Baby Budget build script.
Edit bb_template.html to change the wizard, then run: python3 build_bb.py
Writes screens/baby-budget.js with an updated base64 HTML payload.
"""
import base64, re, sys

with open('screens/baby-budget.js') as f:
    orig_js = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([^"]+)"', orig_js)
if not m:
    sys.exit("ERROR: base64 not found in screens/baby-budget.js")

with open('bb_template.html') as f:
    new_html = f.read()

# ── Encode and write ──────────────────────────────────────────────────────────
encoded = base64.b64encode(new_html.encode('utf-8')).decode('ascii')
after_b64 = orig_js[orig_js.index(m.group(0)) + len(m.group(0)):]
new_js = 'const babyBudgetEmbeddedBase64 = "' + encoded + '"' + after_b64

with open('screens/baby-budget.js', 'w') as f:
    f.write(new_js)

print(f"Done. HTML: {len(new_html):,} chars  Base64: {len(encoded):,} chars")
