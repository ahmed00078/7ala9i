"""
Generate every app/logo asset from the single source mark in assets/logo.jpeg.

The source JPEGs have no alpha and their teal is #049588 (off-brand). We do NOT
use that colour: instead we extract a clean anti-aliased *alpha mask* of the mark
from the red channel (white bg has high red, the teal mark has very low red), then
repaint the mark in the exact brand teal / pure white as each target requires.

Re-run after changing a colour/scale:  python assets/scripts/make_logo_assets.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.dirname(HERE)
SRC = os.path.join(ASSETS, "logo.jpeg")

# Brand colours — single source of truth, matches theme/colors.ts `accent`.
TEAL = (15, 122, 108)   # #0F7A6C
WHITE = (255, 255, 255)

# ── 1. Build a clean alpha mask of the mark from the red channel ─────────────
#    teal mark  -> R ~4-15  -> opaque
#    white bg   -> R ~254   -> transparent
#    edge AA    -> ramps between, giving smooth anti-aliased edges (no halo)
im = Image.open(SRC).convert("RGB")
r, _g, _b = im.split()
LO, HI = 40, 250
lut = [255 if i <= LO else (0 if i >= HI else round((HI - i) * 255 / (HI - LO)))
       for i in range(256)]
alpha = r.point(lut)                 # 'L' mask, mark = opaque
bbox = alpha.getbbox()               # tight box around the mark
mark = alpha.crop(bbox)              # cropped alpha, used for every output
MW, MH = mark.size


def colored_mark(n, scale, color):
    """NxN transparent PNG with the mark (longest side = scale*N) centred, painted `color`."""
    target = round(n * scale)
    if MW >= MH:
        nw, nh = target, round(MH * target / MW)
    else:
        nh, nw = target, round(MW * target / MH)
    m = mark.resize((nw, nh), Image.LANCZOS)
    a = Image.new("L", (n, n), 0)
    a.paste(m, ((n - nw) // 2, (n - nh) // 2))
    out = Image.new("RGBA", (n, n), (*color, 0))
    out.putalpha(a)
    return out


def tile(n, scale, bg, fg):
    """NxN solid `bg` square with the `fg` mark composited on top (full-bleed, no rounding)."""
    base = Image.new("RGBA", (n, n), (*bg, 255))
    base.alpha_composite(colored_mark(n, scale, fg))
    return base


def save(img, name):
    path = os.path.join(ASSETS, name)
    img.save(path)
    print(f"  {name:34} {img.size[0]}x{img.size[1]} {img.mode}")


print(f"mark bbox={bbox} cropped={mark.size}")

# ── 2. Emit every target at the right size / format ──────────────────────────
# iOS + fallback icon — OPAQUE (iOS forbids alpha): teal tile, white mark
save(tile(1024, 0.60, TEAL, WHITE).convert("RGB"), "icon.png")
# Splash — transparent white mark (teal bg comes from app.json splash.backgroundColor)
save(colored_mark(1024, 0.42, WHITE), "splash-icon.png")
# Android adaptive foreground — transparent white mark inside the safe zone
save(colored_mark(1024, 0.46, WHITE), "android-icon-foreground.png")
# Android 13+ themed/monochrome — transparent silhouette (system tints it)
save(colored_mark(1024, 0.46, WHITE), "android-icon-monochrome.png")
# Android notification small icon — white + transparent ONLY (system tints w/ color)
save(colored_mark(256, 0.80, WHITE), "notification-icon.png")
# Web favicon — small teal tile, white mark
save(tile(64, 0.62, TEAL, WHITE), "favicon.png")
# In-app LoadingScreen mark — white mark on transparent
save(colored_mark(256, 0.82, WHITE), "logo-mark-white.png")
print("done.")
