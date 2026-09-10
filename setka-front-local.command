#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
BASE_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main"
FRONT_URL="$BASE_URL/setka-minimal-front-b1.html"
OVERLAY_URL="$BASE_URL/setka-front-b2.js"
BRIDGE_URL="$BASE_URL/setka-front-bridge.py"
TARGET="$FRONT_DIR/index.html"
OVERLAY="$FRONT_DIR/setka-b2.js"
BRIDGE="$FRONT_DIR/setka-front-bridge.py"
URL="http://127.0.0.1:$PORT/"
HEALTH="$URL/api/b2/health"
EXPECTED_HEALTH="SETKA_LOCAL_FRONT_B21_READY"

mkdir -p "$FRONT_DIR"

echo "SETKA LOCAL FRONT · preparing B2.1"
refresh_file() {
  local remote="$1" target="$2" tmp="$2.tmp"
  if command -v curl >/dev/null 2>&1 && curl -fsSL "$remote" -o "$tmp"; then
    mv "$tmp" "$target"
    chmod 600 "$target" 2>/dev/null || true
    return 0
  fi
  rm -f "$tmp"
  return 1
}

refresh_file "$FRONT_URL" "$TARGET" && echo "SETKA LOCAL FRONT · base refreshed" || echo "SETKA LOCAL FRONT · base cache preserved"
refresh_file "$OVERLAY_URL" "$OVERLAY" && echo "SETKA LOCAL FRONT · B2.1 overlay refreshed" || echo "SETKA LOCAL FRONT · overlay cache preserved"
refresh_file "$BRIDGE_URL" "$BRIDGE" && echo "SETKA LOCAL FRONT · B2.1 bridge refreshed" || echo "SETKA LOCAL FRONT · bridge cache preserved"
chmod 700 "$BRIDGE" 2>/dev/null || true

if [ ! -f "$TARGET" ] || [ ! -f "$OVERLAY" ] || [ ! -f "$BRIDGE" ]; then
  echo "STOP · SETKA LOCAL FRONT · B2.1 files incomplete"
  exit 2
fi

# Current B2.1 server already alive: simply reopen it.
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$HEALTH" 2>/dev/null | grep -q "$EXPECTED_HEALTH"; then
  echo "SETKA LOCAL FRONT · ALREADY RUNNING · B2.1 · $URL"
  (open "$URL" >/dev/null 2>&1 &) || true
  exit 0
fi

# If the port belongs to our previous SETKA server/bridge, upgrade it in place.
# Never kill an unknown owner of the port.
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  PID="$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
  CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
  if printf '%s' "$CMD" | grep -Eq "python3 -m http.server $PORT|setka-front-bridge.py"; then
    echo "SETKA LOCAL FRONT · upgrading existing SETKA localhost process to B2.1"
    kill "$PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
      sleep 0.2
    done
  else
    echo "STOP · SETKA LOCAL FRONT · PORT $PORT IS OWNED BY ANOTHER PROCESS"
    echo "$CMD"
    exit 48
  fi
fi

echo "SETKA LOCAL FRONT · STARTING B2.1 · $URL"
(sleep 0.35; open "$URL" >/dev/null 2>&1) &
exec python3 "$BRIDGE" --port "$PORT"
