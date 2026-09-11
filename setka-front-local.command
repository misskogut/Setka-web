#!/bin/bash
set -u

ROOT="$HOME/.setka"
BIN_DIR="$ROOT/bin"
FRONT_DIR="$ROOT/front"
DESKTOP="$HOME/Desktop"
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
FULL_SYNC_URL="$BASE_URL/setka-mac-full-sync.py"
FULL_SYNC_TARGET="$BIN_DIR/setka-mac-full-sync.py"
MIRROR_LATEST="$ROOT/mirror/LATEST.json"
SELF_TARGET="$BIN_DIR/SETKA_BOOST_UPDATE.command"
SELF_NEXT="$BIN_DIR/SETKA_BOOST_UPDATE.command.next"

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

mkdir -p "$FRONT_DIR" "$BIN_DIR" "$DESKTOP"
echo "SETKA LOCAL FRONT · preparing B2.7.4 single-writer workbench / DATA B1"

notify(){ local msg="$1"; command -v osascript >/dev/null 2>&1 && osascript -e "display notification \"$msg\" with title \"SETKA\"" >/dev/null 2>&1 || true; }

refresh_file() {
  local remote="$1" target="$2" tmp="$2.tmp" attempt
  for attempt in 1 2 3 4 5; do
    rm -f "$tmp"
    if command -v curl >/dev/null 2>&1 && curl -fL --retry 2 --retry-delay 1 --retry-all-errors --connect-timeout 15 --max-time 180 -sS "$remote" -o "$tmp"; then
      mv "$tmp" "$target"
      chmod 600 "$target" 2>/dev/null || true
      return 0
    fi
    sleep "$attempt"
  done
  rm -f "$tmp"
  return 1
}

# Recovery bridge for the pre-full-mirror updater: if an older updater staged
# the new one but died later, promote the staged file before doing anything else.
if [ -f "$SELF_NEXT" ]; then
  chmod 700 "$SELF_NEXT" 2>/dev/null || true
  mv "$SELF_NEXT" "$SELF_TARGET"
  chmod 700 "$SELF_TARGET" 2>/dev/null || true
  ln -sfn "$SELF_TARGET" "$DESKTOP/UPDATE_SETKA.command"
  echo "PASS · staged updater recovered and promoted"
fi

mirror_pass=false
if [ -f "$MIRROR_LATEST" ]; then
  mirror_pass="$(python3 - "$MIRROR_LATEST" <<'PY'
import json,sys
try:
    d=json.load(open(sys.argv[1]))
    print('true' if d.get('state')=='PASS_FULL_SETKA_MIRROR' else 'false')
except Exception:
    print('false')
PY
)"
fi

if [ "$mirror_pass" != "true" ]; then
  echo "SETKA MAC MIRROR · no verified full mirror yet · bootstrap required"
  notify "SETKA: начинаю первый полный перенос системы на Mac"
  command -v curl >/dev/null 2>&1 || { echo "STOP · curl unavailable for Mac mirror bootstrap"; exit 52; }
  command -v python3 >/dev/null 2>&1 || { echo "STOP · python3 unavailable for Mac mirror bootstrap"; exit 53; }
  command -v git >/dev/null 2>&1 || { echo "STOP · git unavailable for Mac mirror bootstrap"; exit 54; }
  refresh_file "$FULL_SYNC_URL" "$FULL_SYNC_TARGET" || { echo "STOP · full mirror sync script unavailable"; exit 55; }
  chmod 700 "$FULL_SYNC_TARGET" 2>/dev/null || true
  python3 "$FULL_SYNC_TARGET"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "STOP · first full Mac mirror failed · previous verified mirror (if any) preserved"
    notify "SETKA: полный перенос на Mac остановлен, старое проверенное состояние сохранено"
    exit "$rc"
  fi
  notify "SETKA: полный Mac mirror подтвержден"
fi

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
