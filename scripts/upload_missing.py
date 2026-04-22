#!/usr/bin/env python3
"""Legacy remote deploy script disabled.

Active deployment source of truth:
docs/ACTIVE_DEPLOYMENT_CWP_4321.md
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "ACTIVE_DEPLOYMENT_CWP_4321.md"

print("Bu legacy remote deploy scripti devre disi.")
print("Aktif CWP/Astro runtime: PORT=4321, pm2 start ecosystem.config.cjs --env production")
print(f"Dokuman: {DOC}")
sys.exit(1)
