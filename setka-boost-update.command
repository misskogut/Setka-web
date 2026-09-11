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
FULL_SYNC_URL="$BASE_URL/setka-mac-full-sync.py"
SELF_URL="$BASE_URL/setka-boost-update.command"
SETKA_BIN="$HOME/bin/setka"
REPO="${SETKA_REPO:-$HOME/SETKA_LOCAL/WORKSPACE/Setka-web}"
SELF_TARGET="$BIN_DIR/SETKA_BOOST_UPDATE.command"
SELF_NEXT="$BIN_DIR/SETKA_BOOST_UPDATE.command.next"
FRONT_LAUNCHER_TARGET="$BIN_DIR/SETKA_FRONT.command"
FULL_SYNC_TARGET="$BIN_DIR/setka-mac-full-sync.py"
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
stop(){ echo "STOP · $1"; notify "$1"; finish_wait; exit "${2:-2}"; }

echo "============================================================"
echo "SETKA · ONE BUTTON UPDATE · FULL MAC MIRROR V1 · FRONT B2.7.4"
echo "$(date)"
echo "============================================================"
echo "Этот запуск сначала фиксирует полный Git mirror и полный SETKA data mirror на Mac."
echo "Новая версия считается завершённой только после PASS full mirror receipt."
echo

TOOLING_REFRESHED=false

echo "[0/7] TOOLING STAGE"
command -v curl >/dev/null 2>&1 || stop "curl unavailable"
command -v python3 >/dev/null 2>&1 || stop "python3 unavailable"
command -v git >/dev/null 2>&1 || stop "git unavailable"

download_atomic "$FRONT_LAUNCHER_URL" "$FRONT_LAUNCHER_TARGET" 700 || stop "front launcher refresh failed"
ln -sfn "$FRONT_LAUNCHER_TARGET" "$DESKTOP/SETKA_FRONT.command"
download_atomic "$FULL_SYNC_URL" "$FULL_SYNC_TARGET" 700 || stop "full Mac mirror sync script refresh failed"

download_atomic "$OVERLAY_B23_URL" "$OVERLAY_B23" 600 || stop "B2.3 layer refresh failed"
download_atomic "$OVERLAY_B24_URL" "$OVERLAY_B24" 600 || stop "B2.4 layer refresh failed"
download_atomic "$OVERLAY_B25_URL" "$OVERLAY_B25" 600 || stop "B2.5 layer refresh failed"
download_atomic "$OVERLAY_CORE_URL" "$OVERLAY_CORE" 600 || stop "B2.7.4 projection core refresh failed"
download_atomic "$OVERLAY_B271_URL" "$OVERLAY_B271" 600 || stop "B2.7.1 runtime projection UI refresh failed"
download_atomic "$OVERLAY_B274_URL" "$OVERLAY_B274" 600 || stop "B2.7.4 workbench refresh failed"
cat "$OVERLAY_B23" "$OVERLAY_B24" "$OVERLAY_B25" "$OVERLAY_CORE" "$OVERLAY_B271" "$OVERLAY_B274" > "$OVERLAY.tmp" || stop "combined overlay build failed"
mv "$OVERLAY.tmp" "$OVERLAY"
chmod 600 "$OVERLAY" 2>/dev/null || true

download_atomic "$BRIDGE_B23_URL" "$BRIDGE_B23" 700 || stop "bridge B2.3 refresh failed"
download_atomic "$BRIDGE_B24_URL" "$BRIDGE_B24" 700 || stop "bridge B2.4 refresh failed"
download_atomic "$BRIDGE_B25_URL" "$BRIDGE_B25" 700 || stop "bridge B2.5 refresh failed"
download_atomic "$BRIDGE_B27_URL" "$BRIDGE" 700 || stop "bridge B2.7.4 refresh failed"

if curl -fsSL "$SELF_URL" -o "$SELF_NEXT"; then
  chmod 700 "$SELF_NEXT"
  TOOLING_REFRESHED=true
  echo "PASS · next updater staged"
else
  rm -f "$SELF_NEXT"
  echo "HOLD · updater self-refresh unavailable; current updater remains usable"
fi

echo; echo "[1/7] VERIFIED CORE UPDATE"
[ -x "$SETKA_BIN" ] || stop "SETKA CLI NOT FOUND: $SETKA_BIN"
"$SETKA_BIN" update
rc=$?
[ "$rc" -eq 0 ] || stop "CORE UPDATE FAILED · rc=$rc" "$rc"

echo; echo "[2/7] LOCAL FRONT BASE REFRESH"
TMP="$FRONT_DIR/index.html.tmp"; TARGET="$FRONT_DIR/index.html"
curl -fsSL "$FRONT_URL" -o "$TMP" || stop "base front refresh failed"
mv "$TMP" "$TARGET"
chmod 600 "$TARGET" 2>/dev/null || true
echo "PASS · front shell staged"

echo; echo "[3/7] DEVELOPMENT REFS FETCH"
if [ -d "$REPO/.git" ]; then
  if git -C "$REPO" fetch origin --prune; then
    branch="$(git -C "$REPO" branch --show-current 2>/dev/null || true)"
    dirty="$(git -C "$REPO" status --porcelain 2>/dev/null || true)"
    echo "PASS · development refs fetched · branch ${branch:-DETACHED}"
    [ -n "$dirty" ] && echo "SAFE · user working tree has local changes; untouched" || echo "SAFE · user working tree clean; no merge performed"
  else
    stop "development Git refs fetch failed"
  fi
else
  echo "INFO · no development working tree at $REPO; dedicated full Git mirror will still be created"
fi

echo; echo "[4/7] FULL MAC MIRROR"
echo "Это самый длинный шаг. Предыдущий проверенный mirror не удаляется, пока новый не завершён."
python3 "$FULL_SYNC_TARGET"
rc=$?
[ "$rc" -eq 0 ] || stop "FULL MAC MIRROR FAILED · previous verified mirror preserved · rc=$rc" "$rc"
[ -f "$ROOT/mirror/LATEST.json" ] || stop "FULL MAC MIRROR receipt missing"
echo "PASS · full Git history + full SETKA database mirror recorded on Mac"

echo; echo "[5/7] STATUS"
"$SETKA_BIN" status || true
python3 - <<'PY'
import json
from pathlib import Path
p=Path.home()/'.setka/mirror/LATEST.json'
try:
    d=json.loads(p.read_text())
    print('MAC MIRROR:', d.get('state'))
    print('CODE COMMIT:', d.get('codeCommit'))
    print('SOURCE TIP:', d.get('sourceTranscriptTip'))
    print('TABLES:', d.get('tableCount'))
    print('ROWS:', d.get('rowCount'))
    print('SERVER RECEIPT:', d.get('serverReceiptRef'))
except Exception as e:
    print('MAC MIRROR RECEIPT READ FAIL:', e)
PY

echo; echo "[6/7] COMMIT UPDATER + OPEN FRONT"
if [ "$TOOLING_REFRESHED" = true ] && [ -f "$SELF_NEXT" ]; then
  mv "$SELF_NEXT" "$SELF_TARGET"
  chmod 700 "$SELF_TARGET"
  ln -sfn "$SELF_TARGET" "$DESKTOP/UPDATE_SETKA.command"
  echo "PASS · updater refreshed for next one-button run"
else
  echo "HOLD · current updater remains active"
fi

if [ -x "$FRONT_LAUNCHER_TARGET" ]; then
  nohup "$FRONT_LAUNCHER_TARGET" >"$LOG_DIR/front-launch-$STAMP.log" 2>&1 &
  echo "PASS · B2.7.4 front launcher invoked"
fi

cat <<'TXT'
============================================================
SETKA ONE BUTTON UPDATE · COMPLETE
- dedicated bare Git mirror on Mac contains repository history/refs
- all manifested SETKA base-table rows are copied into local compressed SQLite mirror
- mirrored schemas include foundation, diamond, public, setka_private, experiment_* schemas, supabase_migrations, cron and net
- PostgreSQL views/functions/indexes/constraints/triggers/sequences/policies are mirrored as schema objects
- local mirror is promoted atomically only after all table/schema steps pass
- previous verified mirror is kept until replacement succeeds
- each PASS writes a local receipt and a server-side Mac mirror receipt
- auth.users and storage.objects were audited empty before this contract
- provider-managed secret values are not copied into the plain local mirror
- front B2.7.4 remains a projection layer and does not redefine backend truth
- CANON is not promoted by this updater
============================================================
TXT
notify "SETKA full Mac mirror + front update complete"
finish_wait
