#!/usr/bin/env python3
"""Generate Lumenkeeper's transparent PNG sprites with PIL.

Pixel-art sprites, one shared palette (dark bioluminescent: warm amber
lantern light against violet/cyan shadow), drawn on a transparent
background (RGBA, alpha 0 outside the sprite). Run from the entry root:
    python3 tools/generate_assets.py
Output: game/assets/*.png. No network, no external assets.
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "game", "assets")
os.makedirs(OUT, exist_ok=True)

AMBER = (255, 209, 102, 255)
AMBER_HI = (255, 243, 196, 255)
AMBER_DK = (255, 159, 67, 255)
VIOLET = (179, 136, 255, 255)
VIOLET_DK = (124, 93, 220, 255)
CYAN = (125, 211, 252, 255)
PINK = (244, 114, 182, 255)
DARK = (24, 20, 48, 255)
SHADOW = (11, 14, 26, 255)
WHITE = (255, 255, 255, 255)
STONE = (58, 62, 96, 255)
STONE_DK = (38, 42, 68, 255)
MOSS = (110, 231, 183, 255)
LAVA = (251, 113, 133, 255)


def new(w, h):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p, "PNG")
    print(name, img.size, os.path.getsize(p), "bytes")


def keeper():
    img, d = new(64, 64)
    # Cloak: hooded keeper, amber trim.
    d.polygon([(32, 4), (46, 18), (50, 52), (14, 52), (18, 18)], fill=(43, 36, 84, 255))
    d.polygon([(32, 4), (46, 18), (50, 52), (14, 52), (18, 18)], outline=AMBER, width=2)
    # Face: warm glow in the hood.
    d.ellipse([24, 14, 40, 30], fill=AMBER_HI)
    d.rectangle([26, 20, 30, 24], fill=DARK)
    d.rectangle([34, 20, 38, 24], fill=DARK)
    # Lantern held at the chest: frame + bright core + glow halo.
    d.ellipse([22, 30, 42, 50], fill=(255, 209, 102, 90))
    d.rectangle([26, 34, 38, 48], outline=(90, 60, 20, 255), width=2)
    d.rectangle([28, 36, 36, 46], fill=AMBER_HI)
    d.rectangle([28, 32, 36, 35], fill=AMBER_DK)
    d.rectangle([28, 47, 36, 50], fill=AMBER_DK)
    # Feet.
    d.rectangle([20, 52, 28, 58], fill=DARK)
    d.rectangle([36, 52, 44, 58], fill=DARK)
    save(img, "keeper.png")


def mote():
    img, d = new(48, 48)
    # Spiky violet energy orb.
    cx, cy = 24, 24
    for dx, dy in [(0, -18), (13, -13), (18, 0), (13, 13), (0, 18), (-13, 13), (-18, 0), (-13, -13)]:
        d.polygon([(cx, cy), (cx + dx, cy + dy), (cx + dx // 2 + dy // 4, cy + dy // 2 - dx // 4)], fill=VIOLET_DK)
    d.ellipse([10, 10, 38, 38], fill=VIOLET)
    d.ellipse([16, 16, 32, 32], fill=(216, 180, 254, 255))
    d.rectangle([18, 20, 22, 24], fill=WHITE)
    d.rectangle([26, 20, 30, 24], fill=WHITE)
    save(img, "mote.png")


def wisp():
    img, d = new(48, 48)
    # Cyan ghost with an energy tail.
    d.polygon([(24, 46), (14, 26), (20, 30), (24, 46), (28, 30), (34, 26)], fill=CYAN)
    d.ellipse([12, 4, 36, 30], fill=CYAN)
    d.ellipse([16, 8, 32, 26], fill=(224, 242, 254, 255))
    d.rectangle([18, 14, 22, 18], fill=DARK)
    d.rectangle([26, 14, 30, 18], fill=DARK)
    d.rectangle([22, 22, 26, 24], fill=DARK)
    save(img, "wisp.png")


def brute():
    img, d = new(64, 64)
    # Stone monster with lava/energy cracks.
    d.polygon([(32, 4), (52, 14), (58, 36), (48, 58), (16, 58), (6, 36), (12, 14)], fill=STONE)
    d.polygon([(32, 4), (52, 14), (58, 36), (48, 58), (16, 58), (6, 36), (12, 14)], outline=STONE_DK, width=2)
    d.line([(32, 10), (28, 28), (36, 40)], fill=LAVA, width=3)
    d.line([(16, 30), (26, 36)], fill=LAVA, width=2)
    d.line([(48, 30), (40, 38)], fill=LAVA, width=2)
    d.ellipse([18, 18, 28, 26], fill=WHITE)
    d.ellipse([36, 18, 46, 26], fill=WHITE)
    d.rectangle([20, 20, 26, 24], fill=(220, 38, 38, 255))
    d.rectangle([38, 20, 44, 24], fill=(220, 38, 38, 255))
    d.rectangle([24, 44, 40, 48], fill=DARK)
    d.rectangle([28, 44, 32, 48], fill=WHITE)
    d.rectangle([34, 44, 38, 48], fill=WHITE)
    save(img, "brute.png")


def warden():
    img, d = new(96, 96)
    # Hooded Gloom Warden, shadow tentacles, dark lantern.
    d.polygon([(48, 4), (66, 22), (70, 60), (26, 60), (30, 22)], fill=(30, 22, 64, 255))
    d.polygon([(48, 4), (66, 22), (70, 60), (26, 60), (30, 22)], outline=VIOLET, width=2)
    d.ellipse([38, 18, 58, 38], fill=(10, 8, 24, 255))
    d.rectangle([40, 24, 46, 28], fill=VIOLET)
    d.rectangle([50, 24, 56, 28], fill=VIOLET)
    # Shadow tentacles.
    for x0 in (22, 34, 62, 74):
        d.line([(x0, 58), (x0 - 6, 78), (x0 + 4, 90)], fill=VIOLET_DK, width=4)
    # Dark lantern at the chest.
    d.rectangle([42, 44, 54, 58], outline=VIOLET, width=2)
    d.rectangle([44, 46, 52, 56], fill=(60, 30, 120, 255))
    # Crown spikes.
    for x0 in (36, 48, 60):
        d.polygon([(x0 - 4, 10), (x0, 0), (x0 + 4, 10)], fill=VIOLET_DK)
    save(img, "warden.png")


def ember():
    img, d = new(32, 32)
    d.polygon([(16, 2), (24, 14), (26, 22), (16, 30), (6, 22), (8, 14)], fill=AMBER)
    d.polygon([(16, 10), (21, 18), (16, 26), (11, 18)], fill=AMBER_HI)
    save(img, "ember.png")


def tile():
    img, d = new(128, 128)
    # Ancient stone floor tile, opaque (it is the floor, not a sprite).
    d.rectangle([0, 0, 127, 127], fill=(18, 22, 43, 255))
    d.rectangle([0, 0, 127, 127], outline=STONE_DK, width=3)
    d.line([(0, 64), (127, 64)], fill=STONE_DK, width=2)
    d.line([(64, 0), (64, 127)], fill=STONE_DK, width=2)
    for x, y in [(20, 20), (100, 30), (30, 100), (95, 95)]:
        d.ellipse([x, y, x + 10, y + 6], fill=(110, 231, 183, 70))
    d.rectangle([52, 52, 76, 76], fill=(26, 32, 62, 255))
    save(img, "tile.png")


def icon(name, draw_fn):
    img, d = new(48, 48)
    d.rectangle([2, 2, 45, 45], outline=AMBER, width=2)
    draw_fn(d)
    save(img, name)


def icon_lumen(d):
    d.ellipse([14, 14, 34, 34], fill=AMBER_HI)
    d.ellipse([19, 19, 29, 29], fill=AMBER)


def icon_dash(d):
    d.polygon([(10, 34), (30, 14), (38, 22), (22, 38)], fill=CYAN)
    d.polygon([(18, 36), (34, 20), (38, 26), (24, 40)], fill=(224, 242, 254, 255))


def icon_nova(d):
    for dx, dy in [(0, -14), (10, -10), (14, 0), (10, 10), (0, 14), (-10, 10), (-14, 0), (-10, -10)]:
        d.line([(24, 24), (24 + dx, 24 + dy)], fill=AMBER, width=3)
    d.ellipse([18, 18, 30, 30], fill=AMBER_HI)


def icon_combo(d):
    d.rectangle([10, 14, 22, 34], fill=VIOLET)
    d.rectangle([26, 14, 38, 34], fill=VIOLET)
    d.rectangle([22, 20, 26, 28], fill=AMBER_HI)


def heart():
    # Heart icon for lives (nyawa): warm rose heart, amber highlight.
    img, d = new(48, 48)
    d.ellipse([6, 10, 24, 28], fill=LAVA)
    d.ellipse([24, 10, 42, 28], fill=LAVA)
    d.polygon([(6, 20), (42, 20), (24, 44)], fill=LAVA)
    d.ellipse([12, 14, 20, 22], fill=(255, 180, 190, 255))
    d.ellipse([26, 14, 34, 22], fill=(255, 180, 190, 255))
    save(img, "heart.png")


def icon_rapid(d):
    # Rapid Lantern: three fast bolts fanning out.
    for i, (x0, y0, x1, y1) in enumerate([(12, 36, 20, 12), (24, 38, 24, 10), (36, 36, 28, 12)]):
        d.line([(x0, y0), (x1, y1)], fill=AMBER if i != 1 else AMBER_HI, width=4)
    d.ellipse([20, 6, 28, 14], fill=AMBER_HI)


def icon_twin(d):
    # Twin Flame: two flames side by side.
    for cx in (17, 31):
        d.polygon([(cx, 12), (cx + 6, 24), (cx + 4, 32), (cx - 4, 32), (cx - 6, 24)], fill=AMBER)
        d.polygon([(cx, 20), (cx + 3, 27), (cx - 3, 27)], fill=AMBER_HI)


def icon_swift(d):
    # Swift Boots: a boot with motion lines.
    d.polygon([(14, 20), (26, 20), (26, 34), (34, 34), (34, 38), (14, 38)], fill=CYAN)
    d.line([(10, 24), (6, 24)], fill=(224, 242, 254, 255), width=3)
    d.line([(10, 30), (5, 30)], fill=(224, 242, 254, 255), width=3)
    d.line([(10, 36), (6, 36)], fill=(224, 242, 254, 255), width=3)


def icon_wick(d):
    # Thick Wick: a candle with a tall flame, healing cross glow.
    d.rectangle([20, 26, 28, 38], fill=AMBER_HI)
    d.polygon([(24, 10), (30, 22), (24, 26), (18, 22)], fill=AMBER)
    d.rectangle([22, 16, 26, 20], fill=WHITE)
    d.rectangle([14, 34, 18, 38], fill=LAVA)
    d.rectangle([30, 34, 34, 38], fill=LAVA)


def icon_magnet(d):
    # Ember Magnet: a horseshoe magnet pulling embers in.
    d.arc([10, 10, 38, 38], 180, 360, fill=(244, 114, 182, 255), width=7)
    d.rectangle([10, 24, 17, 32], fill=PINK)
    d.rectangle([31, 24, 38, 32], fill=PINK)
    d.ellipse([21, 30, 27, 36], fill=AMBER_HI)
    d.ellipse([14, 36, 18, 40], fill=AMBER)
    d.ellipse([30, 36, 34, 40], fill=AMBER)


def icon_pierce(d):
    # Piercing Light: one bolt passing through two rings.
    d.line([(8, 24), (40, 24)], fill=AMBER_HI, width=4)
    d.polygon([(40, 24), (32, 19), (32, 29)], fill=AMBER_HI)
    d.ellipse([14, 16, 24, 32], outline=CYAN, width=3)
    d.ellipse([26, 16, 36, 32], outline=VIOLET, width=3)


keeper(); mote(); wisp(); brute(); warden(); ember(); tile()
heart()
icon("icon-lumen.png", icon_lumen)
icon("icon-dash.png", icon_dash)
icon("icon-nova.png", icon_nova)
icon("icon-combo.png", icon_combo)
icon("icon-rapid.png", icon_rapid)
icon("icon-twin.png", icon_twin)
icon("icon-swift.png", icon_swift)
icon("icon-wick.png", icon_wick)
icon("icon-magnet.png", icon_magnet)
icon("icon-pierce.png", icon_pierce)
print("done")
