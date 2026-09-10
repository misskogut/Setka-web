#!/bin/bash
set -euo pipefail

ROOT="$HOME/.setka"
BIN_DIR="$ROOT/bin"
DESKTOP="$HOME/Desktop"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_UPDATER="$SRC_DIR/SETKA_BOOST_UPDATE.command"
UPDATER_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-boost-update.command"
FRONT_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-front-local.command"
UPDATER_TARGET="$BIN_DIR/SETKA_BOOST_UPDATE.command"
FRONT_TARGET="$BIN_DIR/SETKA_FRONT.command"
UPDATE_BUTTON="$DESKTOP/UPDATE_SETKA.command"
FRONT_BUTTON="$DESKTOP/SETKA_FRONT.command"

mkdir -p "$BIN_DIR" "$DESKTOP"

updater_source="LOCAL_BOOTSTRAP"
if command -v curl >/dev/null 2>&1 && curl -fsSL "$UPDATER_URL" -o "$UPDATER_TARGET.tmp"; then
  mv "$UPDATER_TARGET.tmp" "$UPDATER_TARGET"
  updater_source="MAIN_TOOLING_CHANNEL"
elif [ -f "$LOCAL_UPDATER" ]; then
  cp "$LOCAL_UPDATER" "$UPDATER_TARGET"
else
  echo "STOP · updater source unavailable"
  exit 2
fi
chmod 700 "$UPDATER_TARGET"
ln -sfn "$UPDATER_TARGET" "$UPDATE_BUTTON"

front_installed=false
if command -v curl >/dev/null 2>&1 && curl -fsSL "$FRONT_URL" -o "$FRONT_TARGET.tmp"; then
  mv "$FRONT_TARGET.tmp" "$FRONT_TARGET"
  chmod 700 "$FRONT_TARGET"
  ln -sfn "$FRONT_TARGET" "$FRONT_BUTTON"
  front_installed=true
else
  rm -f "$FRONT_TARGET.tmp" 2>/dev/null || true
fi

cat <<EOF
{
  "ok": true,
  "state": "SETKA_DESKTOP_TOOLING_INSTALLED_V2",
  "updateButton": "$UPDATE_BUTTON",
  "frontButton": "$FRONT_BUTTON",
  "updaterSource": "$updater_source",
  "frontLauncherInstalled": $front_installed,
  "selfRefreshEnabled": true,
  "idempotentFrontLaunch": true,
  "rootRequired": false,
  "canonMutation": false,
  "next": "DOUBLE_CLICK_UPDATE_SETKA_OR_SETKA_FRONT"
}
EOF
