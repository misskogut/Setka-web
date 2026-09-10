#!/bin/bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/setka-cli.py"
ROOT="$HOME/.setka"
BIN_DIR="$HOME/bin"
TARGET="$ROOT/bin/setka"
LINK="$BIN_DIR/setka"
PROFILE="$HOME/.bash_profile"

if [ ! -f "$SRC" ]; then
  echo '{"ok":false,"state":"SETKA_CLI_SOURCE_MISSING"}'
  exit 2
fi

mkdir -p "$ROOT/bin" "$BIN_DIR"
cp "$SRC" "$TARGET"
chmod 700 "$TARGET"
ln -sfn "$TARGET" "$LINK"

PATH_LINE='export PATH="$HOME/bin:$PATH"'
if [ ! -f "$PROFILE" ] || ! grep -Fq '$HOME/bin' "$PROFILE"; then
  printf '\n# SETKA CLI\n%s\n' "$PATH_LINE" >> "$PROFILE"
fi

printf '%s\n' '{'
printf '%s\n' '  "ok": true,'
printf '%s\n' '  "state": "PERSISTENT_SETKA_CLI_INSTALLED",'
printf '  "command": "%s",\n' "$LINK"
printf '%s\n' '  "scope": "READ_ACTIVE_MAC_TRANSFER",'
printf '%s\n' '  "serviceRoleRequiredOnMac": false,'
printf '%s\n' '  "next": "RUN_SETKA_UPDATE"'
printf '%s\n' '}'
