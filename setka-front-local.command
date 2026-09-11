#!/bin/bash
set -u

FRONT_DIR="$HOME/.setka/front"
PORT="${SETKA_FRONT_PORT:-8765}"
BASE_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main"
FRONT_URL="$BASE_URL/setka-minimal-front-b1.html"
OVERLAY_B23_URL="$BASE_URL/setka-front-b23.js"
OVERLAY_B24_URL="$BASE_URL/setka-front-b24.js"
OVERLAY_B25_URL="$BASE_URL/setka-front-b25.js"
OVERLAY_CORE_URL="$BASE_URL/setka-front-b274-projection-core.js"
OVERLAY_B271_URL="$BASE_URL/setka-front-b271-runtime.js"
OVERLAY_B274_URL="$BASE_URL/setka-front-b274-workbench.js"
BRIDGE_B23_URL="$BASE_URL/setka-front-bridge-b23.py"
BRIDGE_B24_URL="$BASE_URL/setka-front-bridge-b24.py"
BRIDGE_B25_URL="$BASE_URL/setka-front-bridge-b25.py"
BRIDGE_B27_URL="$BASE_URL/setka-front-bridge-b27.py"

TARGET="$FRONT_DIR/index.html"
OVERLAY_B23="$FRONT_DIR/setka-b23-base.js"
OVERLAY_B24="$FRONT_DIR/setka-b24-trace.js"
OVERLAY_B25="$FRONT_DIR/setka-b25-context.js"
OVERLAY_CORE="$FRONT_DIR/setka-b274-projection-core.js"
OVERLAY_B271="$FRONT_DIR/setka-b271-runtime.js"
OVERLAY_B274="$FRONT_DIR/setka-b274-workbench.js"
OVERLAY="$FRONT_DIR/setka-b2.js"
BRIDGE_B23="$FRONT_DIR/setka-front-bridge-b23.py"
BRIDGE_B24="$FRONT_DIR/setka-front-bridge-b24.py"
BRIDGE_B25="$FRONT_DIR/setka-front-bridge-b25.py"
BRIDGE="$FRONT_DIR/setka-front-bridge.py"

URL="http://127.0.0.1:$PORT/"
OPEN_URL="${URL}?front=B2.7.4"
HEALTH="${URL}api/b2/health"
EXPECTED_HEALTH="SETKA_LOCAL_FRONT_B274_READY"

mkdir -p "$FRONT_DIR"
echo "SETKA LOCAL FRONT · preparing B2.7.4 single-writer workbench / DATA B1"

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

refresh_file "$FRONT_URL" "$TARGET" && echo "PASS · base shell" || echo "HOLD · base shell cache"
refresh_file "$OVERLAY_B23_URL" "$OVERLAY_B23" && echo "PASS · B2.3" || echo "HOLD · B2.3 cache"
refresh_file "$OVERLAY_B24_URL" "$OVERLAY_B24" && echo "PASS · B2.4" || echo "HOLD · B2.4 cache"
refresh_file "$OVERLAY_B25_URL" "$OVERLAY_B25" && echo "PASS · B2.5" || echo "HOLD · B2.5 cache"
refresh_file "$OVERLAY_CORE_URL" "$OVERLAY_CORE" && echo "PASS · B2.7.4 projection core" || echo "HOLD · B2.7.4 core cache"
refresh_file "$OVERLAY_B271_URL" "$OVERLAY_B271" && echo "PASS · B2.7.1 runtime projection bridge UI" || echo "HOLD · B2.7.1 runtime cache"
refresh_file "$OVERLAY_B274_URL" "$OVERLAY_B274" && echo "PASS · B2.7.4 workbench" || echo "HOLD · B2.7.4 workbench cache"
refresh_file "$BRIDGE_B23_URL" "$BRIDGE_B23" && echo "PASS · bridge B2.3" || echo "HOLD · bridge B2.3 cache"
refresh_file "$BRIDGE_B24_URL" "$BRIDGE_B24" && echo "PASS · bridge B2.4" || echo "HOLD · bridge B2.4 cache"
refresh_file "$BRIDGE_B25_URL" "$BRIDGE_B25" && echo "PASS · bridge B2.5" || echo "HOLD · bridge B2.5 cache"
refresh_file "$BRIDGE_B27_URL" "$BRIDGE" && echo "PASS · bridge B2.7.4" || echo "HOLD · bridge B2.7.4 cache"
chmod 700 "$BRIDGE_B23" "$BRIDGE_B24" "$BRIDGE_B25" "$BRIDGE" 2>/dev/null || true

if [ -f "$OVERLAY_B23" ] && [ -f "$OVERLAY_B24" ] && [ -f "$OVERLAY_B25" ] && [ -f "$OVERLAY_CORE" ] && [ -f "$OVERLAY_B271" ] && [ -f "$OVERLAY_B274" ]; then
  cat "$OVERLAY_B23" "$OVERLAY_B24" "$OVERLAY_B25" "$OVERLAY_CORE" "$OVERLAY_B271" "$OVERLAY_B274" > "$OVERLAY.tmp" && mv "$OVERLAY.tmp" "$OVERLAY"
  chmod 600 "$OVERLAY" 2>/dev/null || true
  echo "PASS · B2.7.4 combined overlay ready · legacy layout writers excluded"
fi

if [ ! -f "$TARGET" ] || [ ! -f "$OVERLAY" ] || [ ! -x "$BRIDGE" ]; then
  echo "STOP · SETKA LOCAL FRONT · B2.7.4 files incomplete"
  exit 2
fi

if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$HEALTH" 2>/dev/null | grep -q "$EXPECTED_HEALTH"; then
  echo "SETKA LOCAL FRONT · ALREADY RUNNING · B2.7.4 · $URL"
  (open "$OPEN_URL" >/dev/null 2>&1 &) || true
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  PID="$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
  CMD="$(ps -p "$PID" -o command= 2>/dev/null || true)"
  if printf '%s' "$CMD" | grep -Eq "python3 -m http.server $PORT|setka-front-bridge.py"; then
    echo "SETKA LOCAL FRONT · replacing previous SETKA front process"
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

echo "SETKA LOCAL FRONT · STARTING B2.7.4 UI / B1 DATA · $URL"
(sleep 0.35; open "$OPEN_URL" >/dev/null 2>&1) &
exec python3 "$BRIDGE" --port "$PORT"
