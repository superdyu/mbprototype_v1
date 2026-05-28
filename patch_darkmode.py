#!/usr/bin/env python3
"""
Patch baby-budget.js for light/dark mode:
  1. Add 8 new semantic tokens to :root (light values)
  2. Insert body.dark-mode CSS block with all dark token overrides
  3. Insert postMessage listener to toggle body.dark-mode class
  4. Replace all hardcoded hex color values with var(--token) references
"""
import base64, re, sys

def require(html, needle, label):
    if needle not in html:
        print(f"ERROR: could not find '{label}'")
        sys.exit(1)

with open("screens/baby-budget.js") as f:
    src = f.read()

m = re.search(r'const babyBudgetEmbeddedBase64 = "([A-Za-z0-9+/=]+)";', src)
assert m, "Could not find base64 blob"
html = base64.b64decode(m.group(1)).decode("utf-8")

# ── 1. Add new semantic tokens to :root ──────────────────────────────────────
old_root = (
    ":root{--bg:#eef1f7;--phone:#101828;--screen:#f8fafc;--card:#fff;"
    "--text:#172033;--muted:#667085;--line:#d9dee8;--accent:#315efb;"
    "--accent-soft:#edf1ff;--danger:#b42318;--good:#087443;--warn:#a15c07;"
    "--bar:#d0d5dd;--soft:#f2f4f7}"
)
new_root = (
    ":root{--bg:#eef1f7;--phone:#101828;--screen:#f8fafc;--card:#fff;"
    "--text:#172033;--muted:#667085;--line:#d9dee8;--accent:#315efb;"
    "--accent-soft:#edf1ff;--accent-border:#c7d4ff;"
    "--danger:#b42318;--danger-bg:#fef3f2;--danger-border:#fecdca;"
    "--good:#087443;--good-bg:#eefaf4;--good-border:#b7e4ce;"
    "--warn:#a15c07;--warn-bg:#fff8ec;--warn-border:#f5d78e;"
    "--bar:#d0d5dd;--soft:#f2f4f7;--progress-bg:#e8ebf0;--tier-copper:#b87333}"
)
require(html, old_root, ":root block")
html = html.replace(old_root, new_root, 1)
print("✓ :root updated with new semantic tokens")

# ── 2. Insert body.dark-mode CSS block before </style> ────────────────────────
dark_css = (
    "body.dark-mode{"
    "--bg:#111318;--screen:#1e2128;--card:#282c35;--text:#e3e6ef;"
    "--muted:#8b95a8;--line:#343844;--accent:#4f76fc;--accent-soft:#1a2347;"
    "--accent-border:#1f3080;"
    "--danger:#f04438;--danger-bg:#2d0a08;--danger-border:#5c1a17;"
    "--good:#2dbd6e;--good-bg:#0d2616;--good-border:#1a5232;"
    "--warn:#f5a623;--warn-bg:#2d1800;--warn-border:#5c3600;"
    "--bar:#3d4251;--soft:#23272f;--progress-bg:#2a2d35}"
)
require(html, "</style>", "</style> tag")
html = html.replace("</style>", dark_css + "</style>", 1)
print("✓ body.dark-mode CSS block inserted")

# ── 3. Insert postMessage listener before let step=0 ─────────────────────────
pm_listener = (
    "window.addEventListener('message',function(e){"
    "if(!e.data)return;"
    "if(e.data.type==='bb-theme')"
    "{document.body.classList.toggle('dark-mode',e.data.colorMode==='dark');}"
    "});"
)
anchor = "let step=0"
require(html, anchor, "let step=0 anchor")
html = html.replace(anchor, pm_listener + anchor, 1)
print("✓ postMessage listener inserted")

# ── 4. Replace hardcoded hex color values ─────────────────────────────────────
replacements = [
    # CSS class style rules (outside :root)
    ("color:#667085",         "color:var(--muted)"),
    ("background:#e8ebf0",    "background:var(--progress-bg)"),
    ("background:#fafbff",    "background:var(--soft)"),
    ("background:#d99016",    "background:var(--warn)"),
    ("background:#d92d20",    "background:var(--danger)"),
    ("background:#b42318;",   "background:var(--danger);"),
    # Status/state badge colors
    ("#eefaf4",               "var(--good-bg)"),
    ("#b7e4ce",               "var(--good-border)"),
    ("#fff7ed",               "var(--warn-bg)"),
    ("#fed7aa",               "var(--warn-border)"),
    ("#fff1f0",               "var(--danger-bg)"),
    ("#fecdca",               "var(--danger-border)"),
    ("#d8e0ff",               "var(--accent-border)"),
    # Card/surface backgrounds (exact match with semicolon to avoid prefix collision)
    ("background:#fff;",      "background:var(--card);"),
]

for old, new in replacements:
    count = html.count(old)
    if count == 0:
        print(f"WARNING: '{old}' not found")
    else:
        html = html.replace(old, new)
        print(f"✓ replaced {count}x  {old}  →  {new}")

# ── Re-encode and write ───────────────────────────────────────────────────────
new_b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
new_src = src[:m.start(1)] + new_b64 + src[m.end(1):]
with open("screens/baby-budget.js", "w") as f:
    f.write(new_src)
print("✓ baby-budget.js written")
