#!/usr/bin/env python3
"""
Slice a 3x2 buddy character sheet into six individual PNGs.

    pip install pillow
    python3 scripts/slice-sheet.py assets/buddy-golden-cream.png

Writes buddy-golden-cream-pose1.png ... -pose6.png alongside the input.

Optional: --key removes a flat background color, giving transparency.
    python3 scripts/slice-sheet.py sheet.png --key "#FBF7F0" --tolerance 18
"""
import argparse, os, sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow required:  pip install pillow")

COLS, ROWS = 3, 2

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def key_out(img, rgb, tol):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r-rgb[0]) <= tol and abs(g-rgb[1]) <= tol and abs(b-rgb[2]) <= tol:
                px[x, y] = (r, g, b, 0)
    return img

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--key", help="flat background hex to make transparent")
    ap.add_argument("--tolerance", type=int, default=16)
    ap.add_argument("--outdir", default=None)
    a = ap.parse_args()

    img = Image.open(a.sheet)
    w, h = img.size
    if w % COLS or h % ROWS:
        print(f"warning: {w}x{h} does not divide evenly into {COLS}x{ROWS}; "
              f"cells will be {w//COLS}x{h//ROWS} and edges may clip")

    cw, ch = w // COLS, h // ROWS
    base = os.path.splitext(os.path.basename(a.sheet))[0]
    outdir = a.outdir or os.path.dirname(a.sheet) or "."
    os.makedirs(outdir, exist_ok=True)

    n = 0
    for row in range(ROWS):
        for col in range(COLS):
            n += 1
            cell = img.crop((col*cw, row*ch, (col+1)*cw, (row+1)*ch))
            if a.key:
                cell = key_out(cell, hex_to_rgb(a.key), a.tolerance)
            out = os.path.join(outdir, f"{base}-pose{n}.png")
            cell.save(out)
            print("wrote", out, f"({cw}x{ch})")

    print(f"\nCSS background-size for the whole sheet: {w}px {h}px")
    print(f"Cell size: {cw}px {ch}px")

if __name__ == "__main__":
    main()
