#!/usr/bin/env python3
"""Trace the original Omen emblem PNG into the master SVG (Blueprint §1 / §5 Stage 1).

Corrected version of the draft tracer:
  * The brand PNGs have no alpha channel — they sit on near-black (#070707); the emblem is
    isolated by HSV color classes (gold / verdigris / crimson), not by alpha.
  * Holes are grouped under their parent contour in a single path with fill-rule="evenodd"
    (naively filling every contour would paint holes solid).
  * Contours are simplified with approxPolyDP (sub-pixel epsilon) instead of raw pixel steps.
  * The traced silhouette is scaled and positioned so its area centroid lands on the
    Blueprint §1.2 target (50.0%, 48.5%) of the 1024 canvas — Gate G1 — with bounds checks
    for apex clearance and side clearspace.

Usage: python3 scripts/trace-logo.py [input.png] [output.svg]
"""
import sys
import cv2
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else 'logos/omen-primary-emblem.png'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'Brand/masters/emblem-master.svg'
CANVAS = 1024
TARGET_CX, TARGET_CY = 512.0, 496.6          # G1: (50.0%, 48.5%)
G1_BAND = (48.10, 48.90)                     # percent of canvas, y
FIT_BOX = (768.0, 816.0)                     # max silhouette w, h on canvas
BOUNDS = (128.0, 896.0, 64.0, 928.0)         # x0, x1, y0, y1 (clearspace + apex floor)
MIN_AREA = 30.0                              # px², drop specks
EPS_FRAC = 0.0022                            # approxPolyDP epsilon as fraction of arc length

# Brand hexes (Brand/brand-system.md §8) per color class
CLASSES = [
    ('gold',      '#A67C2E'),
    ('verdigris', '#2F7D5B'),
    ('crimson',   '#7E1717'),
]

img = cv2.imread(SRC, cv2.IMREAD_COLOR)
if img is None:
    sys.exit(f"Error: cannot read {SRC}")
h, w = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]

# Exclusive assignment, strictest first (crimson > verdigris > gold). Gold needs a
# highlight branch: the spear/rim highlights are near-white champagne (S~25-40, V>200)
# and a plain saturation gate silently deletes the whole central spear.
red_m   = (((H < 8) | (H > 168)) & (S > 80) & (V > 40))
green_m = ((H >= 45) & (H <= 110) & (S > 40) & (V > 32)) & ~red_m
gold_m  = (((H >= 8) & (H <= 45) & (V > 45) & ((S > 45) | (V > 150)))
           | ((S < 25) & (V > 200))) & ~red_m & ~green_m
masks = {'gold': gold_m, 'verdigris': green_m, 'crimson': red_m}
kernel = np.ones((3, 3), np.uint8)
for k in masks:
    m = masks[k].astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, kernel)
    masks[k] = m

# ---- fit transform from the union silhouette ----
union = np.zeros((h, w), np.uint8)
for m in masks.values():
    union = cv2.bitwise_or(union, m)
ys, xs = np.nonzero(union)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
bw, bh = float(x1 - x0), float(y1 - y0)
scale = min(FIT_BOX[0] / bw, FIT_BOX[1] / bh)
mom = cv2.moments(union, binaryImage=True)
cx, cy = mom['m10'] / mom['m00'], mom['m01'] / mom['m00']

def make_tx(scale):
    return lambda x, y: (TARGET_CX + (x - cx) * scale, TARGET_CY + (y - cy) * scale)

# shrink until the placed silhouette respects clearspace + apex floor
for _ in range(30):
    tx = make_tx(scale)
    (fx0, fy0), (fx1, fy1) = tx(x0, y0), tx(x1, y1)
    if fx0 >= BOUNDS[0] and fx1 <= BOUNDS[1] and fy0 >= BOUNDS[2] and fy1 <= BOUNDS[3]:
        break
    scale *= 0.98
tx = make_tx(scale)

# ---- trace each class into evenodd paths (outer contour + its holes) ----
def class_paths(mask):
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    if hier is None:
        return []
    hier = hier[0]
    paths = []
    for i, c in enumerate(contours):
        if hier[i][3] != -1 or cv2.contourArea(c) < MIN_AREA:
            continue                                   # holes handled with their parent
        subpaths = [c]
        child = hier[i][2]
        while child != -1:
            if cv2.contourArea(contours[child]) >= MIN_AREA:
                subpaths.append(contours[child])
            child = hier[child][0]
        d = []
        for sp in subpaths:
            eps = EPS_FRAC * cv2.arcLength(sp, True)
            sp = cv2.approxPolyDP(sp, eps, True)
            pts = [tx(float(p[0][0]), float(p[0][1])) for p in sp]
            if len(pts) < 3:
                continue
            d.append('M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z')
        if d:
            paths.append(' '.join(d))
    return paths

svg_groups, counts = [], {}
for name, hexcolor in CLASSES:
    paths = class_paths(masks[name])
    counts[name] = len(paths)
    body = '\n'.join(f'      <path d="{d}"/>' for d in paths)
    svg_groups.append(f'    <g id="{name}" fill="{hexcolor}" fill-rule="evenodd">\n{body}\n    </g>')

# ---- G1 verification on the OUTPUT geometry (polygon shoelace, holes negative) ----
def poly_area_centroid(pts):
    a = sx = sy = 0.0
    for i in range(len(pts)):
        xA, yA = pts[i]; xB, yB = pts[(i + 1) % len(pts)]
        cr = xA * yB - xB * yA
        a += cr; sx += (xA + xB) * cr; sy += (yA + yB) * cr
    return a / 2.0, sx / 6.0, sy / 6.0

tot_a = tot_sx = tot_sy = 0.0
for name, _ in CLASSES:
    contours, hier = cv2.findContours(masks[name], cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    if hier is None:
        continue
    for i, c in enumerate(contours):
        if cv2.contourArea(c) < MIN_AREA:
            continue
        pts = [tx(float(p[0][0]), float(p[0][1])) for p in c]
        a, sx, sy = poly_area_centroid(pts)
        sign = 1.0 if hier[0][i][3] == -1 else -1.0    # holes subtract
        tot_a += sign * abs(a); tot_sx += sign * abs(a) * (sx / a); tot_sy += sign * abs(a) * (sy / a)
g1x, g1y = tot_sx / tot_a / CANVAS * 100, tot_sy / tot_a / CANVAS * 100
g1 = 'PASS' if G1_BAND[0] <= g1y <= G1_BAND[1] else 'FAIL'

header = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}" width="{CANVAS}" height="{CANVAS}">
  <!-- Omen shield emblem — MASTER, traced from the original brand mark ({SRC}).
       Generated by scripts/trace-logo.py — do not hand-edit; re-run the tracer to regenerate.
       Blueprint: Blueprints/specs/design/omen-master-design-blueprint-v1.md §1.
       Fit: scale {scale:.4f} from source {w}x{h}; silhouette centroid placed at Gate G1 target.
       Measured output centroid: ({g1x:.3f}%, {g1y:.3f}%) — G1 {g1} (band {G1_BAND[0]}-{G1_BAND[1]}%). -->
  <g id="emblem">
'''
with open(OUT, 'w') as f:
    f.write(header + '\n'.join(svg_groups) + '\n  </g>\n</svg>\n')

print(f"source {w}x{h}, bbox {bw:.0f}x{bh:.0f}, scale {scale:.4f}")
print(f"paths: {counts}")
print(f"output centroid ({g1x:.3f}%, {g1y:.3f}%)  G1 {g1}")
print(f"placed bbox: ({tx(x0,y0)[0]:.0f},{tx(x0,y0)[1]:.0f})-({tx(x1,y1)[0]:.0f},{tx(x1,y1)[1]:.0f})")
print(f"written: {OUT}")
