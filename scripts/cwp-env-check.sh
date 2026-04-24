#!/usr/bin/env bash
# CWP production env check (domain user)
# Usage: bash scripts/cwp-env-check.sh

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/public_html}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

required_keys=(
  "NODE_ENV"
  "DATABASE_URL"
  "JWT_SECRET"
  "SESSION_SECRET"
)

forbidden_values=(
  "changeme"
  "default"
  "default-secret"
  "test"
  "123456"
)

if [ ! -f "$ENV_FILE" ]; then
  echo "[FAIL] .env bulunamadı: $ENV_FILE"
  exit 1
fi

fail=0

for key in "${required_keys[@]}"; do
  if ! grep -Eq "^${key}=" "$ENV_FILE"; then
    echo "[FAIL] Eksik key: $key"
    fail=1
  fi
done

node_env="$(grep -E '^NODE_ENV=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r' || true)"
if [ "$node_env" != "production" ]; then
  echo "[FAIL] NODE_ENV production olmalı (current: ${node_env:-<empty>})"
  fail=1
else
  echo "[OK] NODE_ENV=production"
fi

check_secret_strength() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r' || true)"
  if [ -z "$value" ]; then
    echo "[FAIL] $key boş"
    fail=1
    return
  fi
  if [ "${#value}" -lt 32 ]; then
    echo "[FAIL] $key en az 32 karakter olmalı"
    fail=1
  else
    echo "[OK] $key uzunluğu yeterli"
  fi
  local lower
  lower="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  for bad in "${forbidden_values[@]}"; do
    if [ "$lower" = "$bad" ]; then
      echo "[FAIL] $key zayıf/değer yasaklı: $bad"
      fail=1
      return
    fi
  done
}

check_secret_strength "JWT_SECRET"
check_secret_strength "SESSION_SECRET"

db_url="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '\r' || true)"
if ! printf '%s' "$db_url" | grep -Eq '^postgres(ql)?://'; then
  echo "[FAIL] DATABASE_URL postgres:// veya postgresql:// ile başlamalı"
  fail=1
else
  echo "[OK] DATABASE_URL formatı uygun"
fi

if [ "$fail" -eq 1 ]; then
  echo "Env check FAILED"
  exit 1
fi

echo "Env check PASSED"
