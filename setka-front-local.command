#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
REMOTE="https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-minimal-front-b1.html"
TMP="$FRONT_DIR/index.html.tmp"
TARGET="$FRONT_DIR/index.html"
URL="http://127.0.0.1:$PORT/"

mkdir -p "$FRONT_DIR"

echo "SETKA LOCAL FRONT · preparing"
if command -v curl >/dev/null 2>&1; then
  if curl -fsSL "$REMOTE" -o "$TMP"; then
    mv "$TMP" "$TARGET"
    chmod 600 "$TARGET" 2>/dev/null || true
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

# Idempotent launch: a second double-click must never spawn a second server.
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$URL" 2>/dev/null | grep -qi "SETKA"; then
  echo "SETKA LOCAL FRONT · ALREADY RUNNING · $URL"
  (open "$URL" >/dev/null 2>&1 &) || true
  exit 0
fi

# If something else owns the port, stop explicitly instead of printing a Python traceback.
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "STOP · SETKA LOCAL FRONT · PORT $PORT IS ALREADY IN USE BY ANOTHER PROCESS"
  echo "No second server was started."
  exit 48
fi

cd "$FRONT_DIR"
echo "SETKA LOCAL FRONT · STARTING · $URL"
(sleep 0.25; open "$URL" >/dev/null 2>&1) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
