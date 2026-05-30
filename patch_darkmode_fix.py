#!/usr/bin/env python3
"""
Patch baby-budget.js: add body.dark-mode .topbar rule so the BB topbar
background goes dark when dark mode is active.
"""
import base64, sys

with open("screens/baby-budget.js") as f:
    src = f.read()

import re
m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=]+)";', src)
assert m, "Could not find base64 blob"
html = base64.b64decode(m.group(1)).decode("utf-8")

# The body.dark-mode{...} block is the last CSS rule before </style>.
# Append the topbar override immediately after its closing brace.
old = "}</style>"
new = "}body.dark-mode .topbar{background:rgba(30,33,40,.96)}</style>"

count = html.count(old)
if count != 1:
    print(f"ERROR: expected exactly 1 occurrence of '}}</style>', found {count}")
    sys.exit(1)

html = html.replace(old, new, 1)
print("✓ body.dark-mode .topbar rule inserted")

new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]
with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)
print("✓ baby-budget.js written")
