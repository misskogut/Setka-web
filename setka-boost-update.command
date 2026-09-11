#!/bin/bash
set -u

ROOT="$HOME/.setka"
BIN_DIR="$ROOT/bin"
LOG_DIR="$ROOT/logs"
FRONT_DIR="$ROOT/front"
DESKTOP="$HOME/Desktop"
BASE_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main"
FRONT_URL="$BASE_URL/setka-minimal-front-b1.html"
FRONT_LAUNCHER_URL="$BASE_URL/setka-front-local.command"
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
SELF_URL="$BASE_URL/setka-boost-update.command"
SETKA_BIN="$HOME/bin/setka"
REPO="${SETKA_REPO:-$HOME/SETKA_LOCAL/WORKSPACE/Setka-web}"
SELF_TARGET="$BIN_DIR/SETKA_BOOST_UPDATE.command"
SELF_NEXT="$BIN_DIR/SETKA_BOOST_UPDATE.command.next"
FRONT_LAUNCHER_TARGET="$BIN_DIR/SETKA_FRONT.command"
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
STAMP="$(date '+%Y%m%d-%H%M%S')"
LOG="$LOG_DIR/update-$STAMP.log"

mkdir -p "$BIN_DIR" "$LOG_DIR" "$FRONT_DIR" "$DESKTOP"
exec > >(tee -a "$LOG") 2>&1

notify(){ local msg="$1"; command -v osascript >/dev/null 2>&1 && osascript -e "display notification \"$msg\" with title \"SETKA\"" >/dev/null 2>&1 || true; }
finish_wait(){ echo; echo "Log: $LOG"; echo; read -r -p "Нажми Enter, чтобы закрыть окно... " _ || true; }
download_atomic(){ local url="$1" target="$2" mode="${3:-600}" tmp="$2.tmp"; if curl -fsSL "$url" -o "$tmp"; then mv "$tmp" "$target"; chmod "$mode" "$target" 2>/dev/null || true; return 0; fi; rm -f "$tmp"; return 1; }

echo "============================================"
echo "SETKA · BOOST UPDATE · FRONT B2.7.4 · DATA B1"
echo "$(date)"
echo "============================================"

echo "[0/5] TOOLING REFRESH"
TOOLING_REFRESHED=false
if command -v curl >/dev/null 2>&1; then
  if download_atomic "$FRONT_LAUNCHER_URL" "$FRONT_LAUNCHER_TARGET" 700; then
    ln -sfn "$FRONT_LAUNCHER_TARGET" "$DESKTOP/SETKA_FRONT.command"
    echo "PASS · B2.7.4 launcher refreshed"
  else echo "HOLD · launcher refresh unavailable"; fi

  download_atomic "$OVERLAY_B23_URL" "$OVERLAY_B23" 600 && echo "PASS · B2.3" || echo "HOLD · B2.3"
  download_atomic "$OVERLAY_B24_URL" "$OVERLAY_B24" 600 && echo "PASS · B2.4" || echo "HOLD · B2.4"
  download_atomic "$OVERLAY_B25_URL" "$OVERLAY_B25" 600 && echo "PASS · B2.5" || echo "HOLD · B2.5"
  download_atomic "$OVERLAY_CORE_URL" "$OVERLAY_CORE" 600 && echo "PASS · B2.7.4 projection core" || echo "HOLD · B2.7.4 projection core"
  download_atomic "$OVERLAY_B271_URL" "$OVERLAY_B271" 600 && echo "PASS · B2.7.1 runtime projection UI" || echo "HOLD · B2.7.1 runtime projection UI"
  download_atomic "$OVERLAY_B274_URL" "$OVERLAY_B274" 600 && echo "PASS · B2.7.4 workbench" || echo "HOLD · B2.7.4 workbench"

  if [ -f "$OVERLAY_B23" ] && [ -f "$OVERLAY_B24" ] && [ -f "$OVERLAY_B25" ] && [ -f "$OVERLAY_CORE" ] && [ -f "$OVERLAY_B271" ] && [ -f "$OVERLAY_B274" ]; then
    cat "$OVERLAY_B23" "$OVERLAY_B24" "$OVERLAY_B25" "$OVERLAY_CORE" "$OVERLAY_B271" "$OVERLAY_B274" > "$OVERLAY.tmp" && mv "$OVERLAY.tmp" "$OVERLAY"
    chmod 600 "$OVERLAY" 2>/dev/null || true
    echo "PASS · B2.7.4 combined overlay · legacy position writers excluded"
  fi

  download_atomic "$BRIDGE_B23_URL" "$BRIDGE_B23" 700 && echo "PASS · bridge B2.3" || echo "HOLD · bridge B2.3"
  download_atomic "$BRIDGE_B24_URL" "$BRIDGE_B24" 700 && echo "PASS · bridge B2.4" || echo "HOLD · bridge B2.4"
  download_atomic "$BRIDGE_B25_URL" "$BRIDGE_B25" 700 && echo "PASS · bridge B2.5" || echo "HOLD · bridge B2.5"
  download_atomic "$BRIDGE_B27_URL" "$BRIDGE" 700 && echo "PASS · bridge B2.7.4" || echo "HOLD · bridge B2.7.4"

  if curl -fsSL "$SELF_URL" -o "$SELF_NEXT"; then chmod 700 "$SELF_NEXT"; TOOLING_REFRESHED=true; echo "PASS · next updater staged"; else rm -f "$SELF_NEXT"; echo "HOLD · updater self-refresh unavailable"; fi
else
  echo "HOLD · curl unavailable; tooling refresh skipped"
fi

if [ ! -x "$SETKA_BIN" ]; then
  echo "STOP · SETKA CLI NOT FOUND: $SETKA_BIN"
  notify "Обновление остановлено: SETKA CLI не найден"
  finish_wait
  exit 2
fi

echo; echo "[1/5] VERIFIED CORE UPDATE"
"$SETKA_BIN" update
rc=$?
if [ "$rc" -ne 0 ]; then echo "STOP · CORE UPDATE FAILED · rc=$rc"; notify "Обновление SETKA остановлено: core update failed"; finish_wait; exit "$rc"; fi

echo; echo "[2/5] LOCAL FRONT BASE REFRESH"
TMP="$FRONT_DIR/index.html.tmp"; TARGET="$FRONT_DIR/index.html"
if curl -fsSL "$FRONT_URL" -o "$TMP"; then mv "$TMP" "$TARGET"; chmod 600 "$TARGET" 2>/dev/null || true; echo "PASS · base shell refreshed"; else rm -f "$TMP"; echo "HOLD · base refresh unavailable; cached shell preserved"; fi

echo; echo "[3/5] DEVELOPMENT REFS SYNC"
if [ -d "$REPO/.git" ]; then
  if git -C "$REPO" fetch origin --prune; then branch="$(git -C "$REPO" branch --show-current 2>/dev/null || true)"; dirty="$(git -C "$REPO" status --porcelain 2>/dev/null || true)"; echo "PASS · Git refs fetched · branch ${branch:-DETACHED}"; [ -n "$dirty" ] && echo "SAFE HOLD · local changes detected; no merge" || echo "SAFE · working tree clean; no merge"; else echo "HOLD · Git refs fetch failed"; fi
else echo "SKIP · development repository not found"; fi

echo; echo "[4/5] STATUS"
"$SETKA_BIN" status || true

echo; echo "[5/5] COMMIT TOOLING REFRESH"
if [ "$TOOLING_REFRESHED" = true ] && [ -f "$SELF_NEXT" ]; then mv "$SELF_NEXT" "$SELF_TARGET"; chmod 700 "$SELF_TARGET"; ln -sfn "$SELF_TARGET" "$DESKTOP/UPDATE_SETKA.command"; echo "PASS · updater refreshed"; else echo "HOLD · current updater remains active"; fi

if [ -x "$FRONT_LAUNCHER_TARGET" ]; then nohup "$FRONT_LAUNCHER_TARGET" >"$LOG_DIR/front-launch-$STAMP.log" 2>&1 & echo "PASS · B2.7.4 front launcher invoked"; fi

cat <<'TXT'
============================================
SETKA BOOST UPDATE · COMPLETE · FRONT B2.7.4 / DATA B1
- one layout position authority: B2.7.4 only
- legacy B2.6/B2.7 layout writers are not loaded
- moved element positions save on drop and on DONE
- saved positions restore on next front launch
- moving one element cannot re-apply old coordinates to other elements
- rename/hide remain presentation-only
- flower remains the container for hidden and backend-proven candidate elements
- backend binding is independent from screen coordinates
- B2.5 event-time context remains unchanged
- no CANON promotion performed
============================================
TXT
notify "SETKA FRONT B2.7.4 layout persistence update complete"
finish_wait
