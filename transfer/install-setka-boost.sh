#!/bin/bash
set -euo pipefail

ROOT="$HOME/.setka"
BIN_DIR="$ROOT/bin"
DESKTOP="$HOME/Desktop"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SRC_DIR/SETKA_BOOST_UPDATE.command"
TARGET="$BIN_DIR/SETKA_BOOST_UPDATE.command"
BUTTON="$DESKTOP/UPDATE_SETKA.command"

if [ ! -f "$SRC" ]; then
  echo "STOP · missing $SRC"
  exit 2
fi

mkdir -p "$BIN_DIR" "$DESKTOP"
cp "$SRC" "$TARGET"
chmod 700 "$TARGET"
ln -sfn "$TARGET" "$BUTTON"
chmod 700 "$BUTTON" 2>/dev/null || true

cat <<EOF
{
  "ok": true,
  "state": "SETKA_BOOST_BUTTON_INSTALLED",
  "button": "$BUTTON",
  "runtimeUpdater": "$TARGET",
  "rootRequired": false,
  "canonMutation": false,
  "next": "DOUBLE_CLICK_UPDATE_SETKA"
}
EOF
