#!/usr/bin/env bash
set -euo pipefail

# Google Maps Scraper binary installer/checker for CWP shared hosting.
# Docker kullanılmaz; Node/Astro uygulaması Go binary'yi subprocess olarak çağırır.

APP_ROOT="${APP_ROOT:-/home/sanliur/public_html}"
BIN_DIR="${GMAPS_BIN_DIR:-$HOME/tools}"
BIN_PATH="${GMAPS_SCRAPER_BIN:-$BIN_DIR/google-maps-scraper}"
REPO_API="https://api.github.com/repos/gosom/google-maps-scraper/releases/latest"

cmd="${1:-check}"

detect_asset_url() {
  node --input-type=module <<'NODE'
const api = 'https://api.github.com/repos/gosom/google-maps-scraper/releases/latest';
const res = await fetch(api, { headers: { 'User-Agent': 'sanliurfa-cwp-gmaps-installer' } });
if (!res.ok) throw new Error(`GitHub release okunamadı: HTTP ${res.status}`);
const data = await res.json();
const assets = data.assets || [];
const asset = assets.find((a) => /linux/i.test(a.name) && /(amd64|x86_64)/i.test(a.name) && /\.(zip|tar\.gz|tgz|gz)$/i.test(a.name))
  || assets.find((a) => /linux/i.test(a.name) && /(amd64|x86_64)/i.test(a.name));
if (!asset?.browser_download_url) {
  console.error('Linux amd64 release asset bulunamadı.');
  console.error(assets.map((a) => a.name).join('\n'));
  process.exit(2);
}
console.log(asset.browser_download_url);
NODE
}

check_binary() {
  local candidates=(
    "$BIN_PATH"
    "$APP_ROOT/tools/google-maps-scraper"
    "$APP_ROOT/scripts/google-maps-scraper"
    "$HOME/tools/google-maps-scraper"
    "/home/sanliur/tools/google-maps-scraper"
    "/mnt/d/sanliurfa.com/tools/google-maps-scraper.exe"
  )
  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      "$candidate" -version >/dev/null 2>&1 || "$candidate" -h >/dev/null
      echo "gmaps: OK $candidate"
      return 0
    fi
  done
  echo "gmaps: MISSING $BIN_PATH"
  return 1
}

install_binary() {
  mkdir -p "$BIN_DIR"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  url="$(detect_asset_url)"
  archive="$tmp_dir/gmaps-download"
  echo "gmaps: downloading $url"
  curl -fsSL "$url" -o "$archive"

  if file "$archive" | grep -qi 'zip'; then
    unzip -o "$archive" -d "$tmp_dir/unpack" >/dev/null
  elif file "$archive" | grep -Eqi 'gzip|tar'; then
    mkdir -p "$tmp_dir/unpack"
    tar -xzf "$archive" -C "$tmp_dir/unpack" 2>/dev/null || gunzip -c "$archive" > "$tmp_dir/unpack/google-maps-scraper"
  else
    mkdir -p "$tmp_dir/unpack"
    cp "$archive" "$tmp_dir/unpack/google-maps-scraper"
  fi

  found="$(find "$tmp_dir/unpack" -type f -name 'google-maps-scraper*' | head -n 1)"
  if [[ -z "$found" ]]; then
    echo "gmaps: unpack içinde binary bulunamadı" >&2
    exit 3
  fi

  cp "$found" "$BIN_PATH"
  chmod 755 "$BIN_PATH"
  check_binary
}

case "$cmd" in
  install)
    install_binary
    ;;
  check)
    check_binary
    ;;
  path)
    echo "$BIN_PATH"
    ;;
  *)
    echo "Usage: $0 {install|check|path}" >&2
    exit 64
    ;;
esac
