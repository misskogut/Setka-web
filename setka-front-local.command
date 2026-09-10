#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
BASE_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main"
FRONT_URL="$BASE_URL/setka-minimal-front-b1.html"
OVERLAY_BASE_URL="$BASE_URL/setka-front-b23.js"
OVERLAY_EXT_URL="$BASE_URL/setka-front-b24.js"
BRIDGE_BASE_URL="$BASE_URL/setka-front-bridge-b23.py"
BRIDGE_URL="$BASE_URL/setka-front-bridge-b24.py"
TARGET="$FRONT_DIR/index.html"
OVERLAY_BASE="$FRONT_DIR/setka-b23-base.js"
OVERLAY_EXT="$FRONT_DIR/setka-b24.js"
OVERLAY="$FRONT_DIR/setka-b2.js"
BRIDGE_BASE="$FRONT_DIR/setka-front-bridge-b23.py"
BRIDGE="$FRONT_DIR/setka-front-bridge.py"
URL="http://127.0.0.1:$PORT/"
HEALTH="$URL/api/b2/health"
EXPECTED_HEALTH="SETKA_LOCAL_FRONT_B24_READY"

mkdir -p "$FRONT_DIR"

echo "SETKA LOCAL FRONT · preparing B2.4"
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
refresh_file "$OVERLAY_BASE_URL" "$OVERLAY_BASE" && echo "SETKA LOCAL FRONT · B2.3 human layer refreshed" || echo "SETKA LOCAL FRONT · B2.3 layer cache preserved"
refresh_file "$OVERLAY_EXT_URL" "$OVERLAY_EXT" && echo "SETKA LOCAL FRONT · B2.4 inspector layer refreshed" || echo "SETKA LOCAL FRONT · B2.4 layer cache preserved"
refresh_file "$BRIDGE_BASE_URL" "$BRIDGE_BASE" && echo "SETKA LOCAL FRONT · B2.3 base bridge refreshed" || echo "SETKA LOCAL FRONT · B2.3 bridge cache preserved"
refresh_file "$BRIDGE_URL" "$BRIDGE" && echo "SETKA LOCAL FRONT · B2.4 trace bridge refreshed" || echo "SETKA LOCAL FRONT · B2.4 bridge cache preserved"
chmod 700 "$BRIDGE_BASE" "$BRIDGE" 2>/dev/null || true

if [ -f "$OVERLAY_BASE" ] && [ -f "$OVERLAY_EXT" ]; then
  cat "$OVERLAY_BASE" "$OVERLAY_EXT" > "$OVERLAY.tmp" && mv "$OVERLAY.tmp" "$OVERLAY"
  chmod 600 "$OVERLAY" 2>/dev/null || true
  echo "SETKA LOCAL FRONT · B2.4 combined overlay ready"
fi

if [ ! -f "$TARGET" ] || [ ! -f "$OVERLAY" ] || [ ! -f "$BRIDGE_BASE" ] || [ ! -f "$BRIDGE" ]; then
  echo "STOP · SETKA LOCAL FRONT · B2.4 files incomplete"
  exit 2
fi

if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$HEALTH" 2>/dev/null | grep -q "$EXPECTED_HEALTH"; then
  echo "SETKA LOCAL FRONT · ALREADY RUNNING · B2.4 · $URL"
  (open "$URL" >/dev/null 2>&1 &) || true
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  PID="$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
  CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
  if printf '%s' "$CMD" | grep -Eq "python3 -m http.server $PORT|setka-front-bridge.py"; then
    echo "SETKA LOCAL FRONT · upgrading existing SETKA localhost process to B2.4"
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

echo "SETKA LOCAL FRONT · STARTING B2.4 · $URL"
(sleep 0.35; open "$URL" >/dev/null 2>&1) &
exec python3 "$BRIDGE" --port "$PORT"
