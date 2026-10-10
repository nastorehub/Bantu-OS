"""Regenerate the Bantu OS icons from the master mark. Needs Pillow; the .icns step needs macOS.

    python3 scripts/make-icons.py

Source: apps/desktop/src/assets/brand/nastech-mark.png (the exact NasTech Bantu mark, shared with
the Bantu mobile app). Writes:
  apps/desktop/build/icon.png, icon.icns     app icon (macOS squircle grid: 824 px body on 1024 canvas)
  apps/desktop/public/brand/nastech-icon.png  256 px icon (window icon, favicon)
  linux/plymouth/bantu-os/logo.png     boot splash mark
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps" / "desktop"
MARK = APP / "src" / "assets" / "brand" / "nastech-mark.png"

CANVAS = 1024
BODY = 824
RADIUS = 186
MARK_WIDTH = 0.74


def app_icon(mark: Image.Image) -> Image.Image:
    icon = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    inset = (CANVAS - BODY) // 2
    body = Image.new("RGBA", (BODY, BODY), (0, 0, 0, 0))
    shade = Image.new("RGBA", (BODY, BODY))
    for y in range(BODY):
        level = int(26 - 22 * y / BODY)
        ImageDraw.Draw(shade).line([(0, y), (BODY, y)], fill=(level, level, level + 2, 255))
    mask = Image.new("L", (BODY, BODY), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, BODY - 1, BODY - 1], radius=RADIUS, fill=255)
    body.paste(shade, (0, 0), mask)

    width = int(BODY * MARK_WIDTH)
    scaled = mark.resize((width, round(mark.height * width / mark.width)), Image.LANCZOS)
    body.alpha_composite(scaled, ((BODY - scaled.width) // 2, (BODY - scaled.height) // 2 - BODY // 40))
    icon.alpha_composite(body, (inset, inset))
    return icon


def icns(icon: Image.Image, target: Path) -> None:
    if not shutil.which("iconutil"):
        print("iconutil not found (macOS only): skipped", target)
        return
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        for size in (16, 32, 128, 256, 512):
            icon.resize((size, size), Image.LANCZOS).save(iconset / f"icon_{size}x{size}.png")
            icon.resize((size * 2, size * 2), Image.LANCZOS).save(iconset / f"icon_{size}x{size}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(target)], check=True)


def main() -> int:
    mark = Image.open(MARK).convert("RGBA")
    mark = mark.crop(mark.getbbox())
    icon = app_icon(mark)

    (APP / "build").mkdir(exist_ok=True)
    icon.save(APP / "build" / "icon.png")
    icns(icon, APP / "build" / "icon.icns")
    icon.resize((256, 256), Image.LANCZOS).save(APP / "public" / "brand" / "nastech-icon.png")

    splash = mark.resize((240, round(mark.height * 240 / mark.width)), Image.LANCZOS)
    splash.save(ROOT / "linux" / "plymouth" / "bantu-os" / "logo.png")
    print("icons written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
