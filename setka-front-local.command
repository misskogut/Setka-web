#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
REMOTE="https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-minimal-front-b1.html"
TMP="$FRONT_DIR/index.html.tmp"
TARGET="$FRONT_DIR/index.html"

mkdir -p "$FRONT_DIR"

echo "SETKA LOCAL FRONT · preparing"
if command -v curl >/dev/null 2>&1; then
  if curl -fsSL "$REMOTE" -o "$TMP"; then
    mv "$TMP" "$TARGET"
    echo "SETKA LOCAL FRONT · source refreshed"
  else
    rm -f "$TMP"
    if [ -f "$TARGET" ]; then
      echo "SETKA LOCAL FRONT · network unavailable, using cached source"
    else
      echo "SETKA LOCAL FRONT · no source available"
      exit 1
    fi
  fi
elif [ ! -f "$TARGET" ]; then
  echo "SETKA LOCAL FRONT · curl missing and no cached source"
  exit 1
fi

cd "$FRONT_DIR"
URL="http://127.0.0.1:$PORT/"

echo "SETKA LOCAL FRONT · $URL"
(open "$URL" >/dev/null 2>&1 &) || true
exec python3 -m http.server "$PORT" --bind 127.0.0.1
