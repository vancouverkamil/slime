"""Draw the Slimeverse's own town buildings (HAT SHOP, FINAL 4) in the style of
the Money Radar town, using Money Radar's pixel-art library READ-ONLY.

    python scripts/town_buildings.py [path-to-MoneyRadar]

Writes js/slimeverse/town/assets/buildings/{hat_shop,final4}{,_lights,_neon}.png
and their entries in js/slimeverse/town/assets/manifest.json. Nothing is ever
written into the Money Radar folder.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "MoneyRadar"
sys.path.insert(0, str(MR / "scripts" / "life"))

from life_art import building_zen  # noqa: E402
from life_art.building_parts import Facade, disk, ring  # noqa: E402
from life_art.buildings import _small  # noqa: E402
from life_art.palette import with_alpha  # noqa: E402

ASSETS = ROOT / "js" / "slimeverse" / "town" / "assets"


# ---------------------------------------------------------------- HAT SHOP
def _top_hat(f, cx, cy):
    """The gable emblem: a big top hat with a violet band and a gold buckle."""
    c = f.c
    c.box(cx - 7, cy - 9, 14, 12, "ink", "ink")          # crown
    c.rect(cx - 6, cy - 8, 12, 10, "slate_dark")
    c.vline(cx - 5, cy - 8, 10, "slate")                  # sheen
    c.rect(cx - 6, cy - 1, 12, 3, "neon_violet")          # band
    c.rect(cx - 1, cy - 1, 3, 3, "gold_hi")               # buckle
    c.box(cx - 11, cy + 2, 22, 3, "slate_dark", "ink")    # brim
    for dx in range(-12, 13):                             # the soft pool of light under it
        a = max(0, 120 - abs(dx) * 9)
        f.l.set(cx + dx, cy + 6, with_alpha("pink_hi", a))
        f.l.set(cx + dx, cy + 7, with_alpha("cyan_hi", a // 2))
    f.l.rect(cx - 1, cy - 1, 3, 3, "window_lit_hi")


def _shelf_hat(c, l, x, y, kind):
    """A tiny hat on a lit display shelf (4 prestige looks)."""
    if kind == 0:    # crown
        c.rect(x, y + 2, 7, 3, "gold"), c.set(x, y + 1, "gold_hi"), c.set(x + 3, y, "gold_hi"), c.set(x + 6, y + 1, "gold_hi")
        c.set(x + 3, y + 3, "pink_hi")
    elif kind == 1:  # devil horns
        c.rect(x + 1, y + 3, 5, 2, "red"), c.set(x, y + 1, "red"), c.set(x, y + 2, "red"), c.set(x + 6, y + 1, "red"), c.set(x + 6, y + 2, "red")
    elif kind == 2:  # halo
        ring(c, x + 3, y + 2, 3, "gold_hi")
    else:            # top hat
        c.rect(x + 1, y, 5, 4, "slate_dark"), c.hline(x, y + 4, 7, "slate_dark"), c.hline(x + 1, y + 3, 5, "neon_violet")
    l.hline(x - 1, y + 6, 9, with_alpha("window_lit_hi", 140))


def hat_shop():
    day, lights, neon = _small("HAT SHOP", "bldg_lilac", "bldg_lilac_lo", "purple", "purple_lo", "purple_lo",
                               _top_hat, tube="pink", border="cyan", scale=1.5)
    # The arched side windows become lit display windows, a hat on each shelf.
    for i, wx in enumerate((12, 30, 84, 102)):
        day.rect(wx + 1, 65, 12, 16, "window_lit")
        lights.rect(wx + 1, 65, 12, 16, with_alpha("window_lit", 200))
        day.hline(wx + 1, 77, 12, "wood_lo")
        _shelf_hat(day, lights, wx + 3, 70, i)
    return day, lights, neon


# ---------------------------------------------------------------- FINAL 4 tower
def _trophy(f, cx, cy):
    """A golden cup on the roof with a 4 on it."""
    c = f.c
    c.box(cx - 8, cy - 10, 16, 11, "gold_lo", "ink")
    c.rect(cx - 7, cy - 9, 14, 9, "gold")
    c.vline(cx - 5, cy - 9, 8, "gold_hi")
    ring(c, cx - 10, cy - 5, 3, "gold_lo"), ring(c, cx + 10, cy - 5, 3, "gold_lo")   # handles
    c.box(cx - 2, cy + 1, 4, 4, "gold_lo", "ink")       # stem
    c.box(cx - 6, cy + 5, 12, 3, "gold", "ink")         # base
    for y, row in enumerate(("1.1", "1.1", "111", "..1", "..1")):  # the 4
        for x, ch in enumerate(row):
            if ch == "1":
                c.set(cx - 1 + x, cy - 8 + y, "verm")
    for dy in range(-14, 6):
        for dx in range(-14, 15):
            a = max(0, 90 - int((dx * dx + dy * dy) ** 0.5) * 7)
            if a:
                f.l.set(cx + dx, cy - 3 + dy, with_alpha("gold_hi", a))


def final4():
    f = Facade(144, 176)
    c = f.c
    # Stepped tower: a narrow crown on top of the main block.
    c.box(40, 20, 64, 30, "verm_lo", "ink")
    c.hline(41, 21, 62, "verm_hi")
    f.wall(42, 24, 60, 26, "wall_coral", "wall_coral_lo", "white")
    for wx in (48, 66, 84):
        f.window(wx, 30, 10, 14, lit=True, arch=True)
    _trophy(f, 72, 12)
    f.roof(4, 50, 136, 10, "verm", "verm_lo", "gold", "gold_lo")
    f.wall(6, 60, 132, 116, "wall_coral", "wall_coral_lo", "white")
    f.neon(72, 62, [("FINAL 4", "gold", 2)], border="pink", pad=(3, 2))
    # Three floors of windows; a gold band between floors.
    for fy in (88, 112):
        for wx in (12, 30, 98, 116):
            f.window(wx, fy, 14, 16, lit=(wx + fy) % 3 != 1, mullion=True)
        c.box(6, fy + 18, 132, 3, "gold_lo", "ink")
        c.hline(7, fy + 19, 130, "gold")
    # Grand arched entrance with lit doors.
    c.box(46, 130, 52, 46, "verm_lo", "ink")
    c.box(48, 132, 48, 8, "gold", "ink")
    f.window(50, 134, 44, 4, lit=True)
    f.double_door(54, 144, 36, 32, lit=True)
    for px in (40, 98):   # torch pillars
        f.column(px, 128, 6, 48, "gold", "gold_lo", "gold_hi")
        disk(c, px + 3, 126, 2, "lantern_hi")
        disk(f.l, px + 3, 126, 3, "window_lit_hi")
    c.box(2, 172, 140, 4, "wall_coral_lo", "ink")
    f.planter_palm(10, 151)
    f.planter_palm(118, 151)
    return f.c, f.l, f.n


# name, stem, draw, collision box, door box (building px), rim colour
BUILDINGS = (
    ("bld_hat_shop", "hat_shop", hat_shop, [6, 22, 116, 106], [48, 100, 32, 28], "neon_violet"),
    ("bld_final4", "final4", final4, [4, 50, 136, 126], [54, 148, 36, 28], "neon_pink"),
)


def main():
    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for name, stem, draw, collision, door, rim in BUILDINGS:
        building_zen.RIM[stem] = rim
        day, lights, neon = building_zen.apply(stem, *draw(), door)
        for suffix, canvas, meta in (("", day, {"collision": collision, "door": door}), ("_lights", lights, {}), ("_neon", neon, {})):
            rel = f"buildings/{stem}{suffix}.png"
            (ASSETS / rel).write_bytes(canvas.to_png())
            manifest["assets"][name + suffix] = {"file": rel, "width": canvas.width, "height": canvas.height, **meta}
        print("drew", name, day.width, "x", day.height)
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
