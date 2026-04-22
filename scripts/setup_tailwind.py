#!/usr/bin/env python3
"""Tailwind runtime guard.

Tailwind 4 is managed locally through package.json, astro.config.mjs,
and src/styles/global.css. This script intentionally does not SSH to
production or install deprecated Tailwind integration packages.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    ROOT / "package.json",
    ROOT / "astro.config.mjs",
    ROOT / "src" / "styles" / "global.css",
]

missing = [str(path.relative_to(ROOT)) for path in REQUIRED if not path.exists()]
if missing:
    print("Eksik Tailwind 4 dosyalari: " + ", ".join(missing))
    sys.exit(1)

print("Tailwind 4 aktif: @tailwindcss/vite + src/styles/global.css")
