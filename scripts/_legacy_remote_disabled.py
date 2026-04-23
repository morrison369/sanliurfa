"""Shared guard for disabled legacy remote operation scripts."""

from pathlib import Path
import sys


def main(script_file: str) -> None:
    root = Path(script_file).resolve().parents[1]
    doc = root / "docs" / "ACTIVE_DEPLOYMENT_CWP_4321.md"
    print(f"{Path(script_file).name} devre disi: legacy remote operasyon scripti.")
    print("Aktif runtime: Astro SSR + PM2 + PORT=4321 + ecosystem.config.cjs")
    print(f"Kaynak dokuman: {doc}")
    sys.exit(1)
