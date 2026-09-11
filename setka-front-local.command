#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
BASE_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main"
FRONT_URL="$BASE_URL/setka-minimal-front-b1.html"
OVERLAY_B23_URL="$BASE_URL/setka-front-b23.js"
OVERLAY_B24_URL="$BASE_URL/setka-front-b24.js"
OVERLAY_B25_URL="$BASE_URL/setka-front-b25.js"
OVERLAY_B26_URL="$BASE_URL/setka-front-b26.js"
OVERLAY_B261_URL="$BASE_URL/setka-front-b261-recovery.js"
BRIDGE_B23_URL="$BASE_URL/setka-front-bridge-b23.py"
BRIDGE_B24_URL="$BASE_URL/setka-front-bridge-b24.py"
BRIDGE_B25_URL="$BASE_URL/setka-front-bridge-b25.py"
TARGET="$FRONT_DIR/index.html"
OVERLAY_B23="$FRONT_DIR/setka-b23-base.js"
OVERLAY_B24="$FRONT_DIR/setka-b24-trace.js"
OVERLAY_B25="$FRONT_DIR/setka-b25-context.js"
OVERLAY_B26="$FRONT_DIR/setka-b26-workspace.js"
OVERLAY_B261="$FRONT_DIR/setka-b261-recovery.js"
OVERLAY="$FRONT_DIR/setka-b2.js"
BRIDGE_B23="$FRONT_DIR/setka-front-bridge-b23.py"
BRIDGE_B24="$FRONT_DIR/setka-front-bridge-b24.py"
BRIDGE="$FRONT_DIR/setka-front-bridge.py"
URL="http://127.0.0.1:$PORT/"
OPEN_URL="${URL}?front=B2.6.1"
HEALTH="${URL}api/b2/health"
EXPECTED_HEALTH="SETKA_LOCAL_FRONT_B25_READY"

mkdir -p "$FRONT_DIR"

echo "SETKA LOCAL FRONT · preparing B2.6.1 workspace over B2.5 data bridge"
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

refresh_file "$FRONT_URL" "$TARGET" && echo "SETKA LOCAL FRONT · base data shell refreshed" || echo "SETKA LOCAL FRONT · base shell cache preserved"
refresh_file "$OVERLAY_B23_URL" "$OVERLAY_B23" && echo "SETKA LOCAL FRONT · B2.3 human/color layer refreshed" || echo "SETKA LOCAL FRONT · B2.3 layer cache preserved"
refresh_file "$OVERLAY_B24_URL" "$OVERLAY_B24" && echo "SETKA LOCAL FRONT · B2.4 trace layer refreshed" || echo "SETKA LOCAL FRONT · B2.4 layer cache preserved"
refresh_file "$OVERLAY_B25_URL" "$OVERLAY_B25" && echo "SETKA LOCAL FRONT · B2.5 event-context layer refreshed" || echo "SETKA LOCAL FRONT · B2.5 layer cache preserved"
refresh_file "$OVERLAY_B26_URL" "$OVERLAY_B26" && echo "SETKA LOCAL FRONT · B2.6 workspace layer refreshed" || echo "SETKA LOCAL FRONT · B2.6 workspace cache preserved"
refresh_file "$OVERLAY_B261_URL" "$OVERLAY_B261" && echo "SETKA LOCAL FRONT · B2.6.1 sensor recovery layer refreshed" || echo "SETKA LOCAL FRONT · B2.6.1 recovery cache preserved"
refresh_file "$BRIDGE_B23_URL" "$BRIDGE_B23" && echo "SETKA LOCAL FRONT · B2.3 bridge refreshed" || echo "SETKA LOCAL FRONT · B2.3 bridge cache preserved"
refresh_file "$BRIDGE_B24_URL" "$BRIDGE_B24" && echo "SETKA LOCAL FRONT · B2.4 bridge refreshed" || echo "SETKA LOCAL FRONT · B2.4 bridge cache preserved"
refresh_file "$BRIDGE_B25_URL" "$BRIDGE" && echo "SETKA LOCAL FRONT · B2.5 data bridge refreshed" || echo "SETKA LOCAL FRONT · B2.5 bridge cache preserved"
chmod 700 "$BRIDGE_B23" "$BRIDGE_B24" "$BRIDGE" 2>/dev/null || true

if [ -f "$OVERLAY_B23" ] && [ -f "$OVERLAY_B24" ] && [ -f "$OVERLAY_B25" ] && [ -f "$OVERLAY_B26" ] && [ -f "$OVERLAY_B261" ]; then
  cat "$OVERLAY_B23" "$OVERLAY_B24" "$OVERLAY_B25" "$OVERLAY_B26" "$OVERLAY_B261" > "$OVERLAY.tmp" && mv "$OVERLAY.tmp" "$OVERLAY"
  chmod 600 "$OVERLAY" 2>/dev/null || true
  echo "SETKA LOCAL FRONT · B2.6.1 combined overlay ready"
fi

if [ ! -f "$TARGET" ] || [ ! -f "$OVERLAY" ] || [ ! -f "$BRIDGE_B23" ] || [ ! -f "$BRIDGE_B24" ] || [ ! -f "$BRIDGE" ]; then
  echo "STOP · SETKA LOCAL FRONT · B2.6.1 files incomplete"
  exit 2
fi

if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$HEALTH" 2>/dev/null | grep -q "$EXPECTED_HEALTH"; then
  echo "SETKA LOCAL FRONT · ALREADY RUNNING · B2.6.1 UI / B2.5 DATA · $URL"
  (open "$OPEN_URL" >/dev/null 2>&1 &) || true
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  PID="$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
  CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
  if printf '%s' "$CMD" | grep -Eq "python3 -m http.server $PORT|setka-front-bridge.py"; then
    echo "SETKA LOCAL FRONT · refreshing existing SETKA localhost process"
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

echo "SETKA LOCAL FRONT · STARTING B2.6.1 UI / B2.5 DATA · $URL"
(sleep 0.35; open "$OPEN_URL" >/dev/null 2>&1) &
exec python3 "$BRIDGE" --port "$PORT"