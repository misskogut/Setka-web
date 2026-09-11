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
stop(){ echo "STOP · $1"; notify "$1"; finish_wait; exit "${2:-2}"; }

retry_download(){
  local url="$1" target="$2" mode="${3:-600}" tmp="$2.tmp"
  local attempt
  for attempt in 1 2 3 4 5; do
    rm -f "$tmp"
    if curl -fL --retry 2 --retry-delay 1 --retry-all-errors --connect-timeout 15 --max-time 180 -sS "$url" -o "$tmp"; then
      mv "$tmp" "$target"
      chmod "$mode" "$target" 2>/dev/null || true
      return 0
    fi
    echo "RETRY · download $attempt/5 · $url"
    sleep "$attempt"
  done
  rm -f "$tmp"
  return 1
}

retry_cmd(){
  local label="$1"; shift
  local attempt rc=1
  for attempt in 1 2 3; do
    "$@" && return 0
    rc=$?
    echo "RETRY · $label · $attempt/3 · rc=$rc"
    sleep $((attempt*3))
  done
  return "$rc"
}

echo "================================================================"
echo "SETKA · ONE BUTTON UPDATE · FULL MAC MIRROR V1 · FRONT B2.7.4"
echo "$(date)"
echo "================================================================"
echo "Порядок: tooling → полный Mac mirror → core → front → PASS receipt."
echo "Сетевой сбой не уничтожает предыдущий проверенный mirror."
echo

command -v curl >/dev/null 2>&1 || stop "curl unavailable"
command -v python3 >/dev/null 2>&1 || stop "python3 unavailable"
command -v git >/dev/null 2>&1 || stop "git unavailable"

# 0. Tooling + immediate self-heal. New updater is promoted before any network-heavy work.
echo "[0/7] TOOLING + SELF-HEAL"
retry_download "$SELF_URL" "$SELF_NEXT" 700 || stop "updater self-refresh failed"
mv "$SELF_NEXT" "$SELF_TARGET"
chmod 700 "$SELF_TARGET"
ln -sfn "$SELF_TARGET" "$DESKTOP/UPDATE_SETKA.command"
echo "PASS · updater self-healed before long operations"

retry_download "$FRONT_LAUNCHER_URL" "$FRONT_LAUNCHER_TARGET" 700 || stop "front launcher refresh failed"
ln -sfn "$FRONT_LAUNCHER_TARGET" "$DESKTOP/SETKA_FRONT.command"
retry_download "$FULL_SYNC_URL" "$FULL_SYNC_TARGET" 700 || stop "full Mac mirror sync script refresh failed"

retry_download "$OVERLAY_B23_URL" "$OVERLAY_B23" 600 || stop "B2.3 layer refresh failed"
retry_download "$OVERLAY_B24_URL" "$OVERLAY_B24" 600 || stop "B2.4 layer refresh failed"
retry_download "$OVERLAY_B25_URL" "$OVERLAY_B25" 600 || stop "B2.5 layer refresh failed"
retry_download "$OVERLAY_CORE_URL" "$OVERLAY_CORE" 600 || stop "B2.7.4 projection core refresh failed"
retry_download "$OVERLAY_B271_URL" "$OVERLAY_B271" 600 || stop "B2.7.1 runtime projection UI refresh failed"
retry_download "$OVERLAY_B274_URL" "$OVERLAY_B274" 600 || stop "B2.7.4 workbench refresh failed"
cat "$OVERLAY_B23" "$OVERLAY_B24" "$OVERLAY_B25" "$OVERLAY_CORE" "$OVERLAY_B271" "$OVERLAY_B274" > "$OVERLAY.tmp" || stop "combined overlay build failed"
mv "$OVERLAY.tmp" "$OVERLAY"
chmod 600 "$OVERLAY" 2>/dev/null || true

retry_download "$BRIDGE_B23_URL" "$BRIDGE_B23" 700 || stop "bridge B2.3 refresh failed"
retry_download "$BRIDGE_B24_URL" "$BRIDGE_B24" 700 || stop "bridge B2.4 refresh failed"
retry_download "$BRIDGE_B25_URL" "$BRIDGE_B25" 700 || stop "bridge B2.5 refresh failed"
retry_download "$BRIDGE_B27_URL" "$BRIDGE" 700 || stop "bridge B2.7.4 refresh failed"

# 1. Full mirror FIRST. This is the durable truth boundary.
echo; echo "[1/7] FULL MAC MIRROR"
echo "Первый запуск длинный. Новый mirror собирается в staging; current не заменяется до полного PASS."
retry_cmd "full Mac mirror" python3 "$FULL_SYNC_TARGET"
rc=$?
[ "$rc" -eq 0 ] || stop "FULL MAC MIRROR FAILED · previous verified mirror preserved · rc=$rc" "$rc"
[ -f "$ROOT/mirror/LATEST.json" ] || stop "FULL MAC MIRROR receipt missing"
echo "PASS · full Git history + full SETKA database mirror recorded on Mac"

# 2. Legacy/core updater is useful but is no longer allowed to block data preservation.
echo; echo "[2/7] VERIFIED CORE UPDATE"
[ -x "$SETKA_BIN" ] || stop "SETKA CLI NOT FOUND: $SETKA_BIN"
retry_cmd "verified core update" "$SETKA_BIN" update
rc=$?
[ "$rc" -eq 0 ] || stop "CORE UPDATE FAILED AFTER MIRROR PASS · mirror preserved · rc=$rc" "$rc"
echo "PASS · verified core update"

# 3. Front shell
echo; echo "[3/7] LOCAL FRONT BASE REFRESH"
TMP="$FRONT_DIR/index.html.tmp"; TARGET="$FRONT_DIR/index.html"
retry_download "$FRONT_URL" "$TMP" 600 || stop "base front refresh failed"
mv "$TMP" "$TARGET"
chmod 600 "$TARGET" 2>/dev/null || true
echo "PASS · front shell staged"

# 4. Optional development working-tree refs. Dedicated Git mirror already contains full repo history.
echo; echo "[4/7] DEVELOPMENT REFS FETCH"
if [ -d "$REPO/.git" ]; then
  if retry_cmd "development refs fetch" git -C "$REPO" fetch origin --prune; then
    branch="$(git -C "$REPO" branch --show-current 2>/dev/null || true)"
    dirty="$(git -C "$REPO" status --porcelain 2>/dev/null || true)"
    echo "PASS · development refs fetched · branch ${branch:-DETACHED}"
    [ -n "$dirty" ] && echo "SAFE · user working tree has local changes; untouched" || echo "SAFE · user working tree clean; no merge performed"
  else
    echo "HOLD · development working-tree fetch failed; full dedicated Git mirror remains PASS"
  fi
else
  echo "INFO · no development working tree; dedicated full Git mirror is authoritative for transfer"
fi

# 5. Status and receipt
echo; echo "[5/7] VERIFIED RECEIPT"
"$SETKA_BIN" status || true
python3 - <<'PY'
import json
from pathlib import Path
p=Path.home()/'.setka/mirror/LATEST.json'
d=json.loads(p.read_text())
required=['state','codeCommit','sourceTranscriptTip','tableCount','rowCount','manifestSha256','localDbSha256','serverReceiptRef']
missing=[k for k in required if not d.get(k) and d.get(k)!=0]
if d.get('state')!='PASS_FULL_SETKA_MIRROR' or missing:
    raise SystemExit('RECEIPT_FAIL missing='+','.join(missing))
print('MAC MIRROR:', d['state'])
print('CODE COMMIT:', d['codeCommit'])
print('SOURCE TIP:', d['sourceTranscriptTip'])
print('TABLES:', d['tableCount'])
print('ROWS:', d['rowCount'])
print('SERVER RECEIPT:', d['serverReceiptRef'])
PY
rc=$?
[ "$rc" -eq 0 ] || stop "LOCAL MIRROR RECEIPT VERIFICATION FAILED" "$rc"

# 6. Open front only after transfer + core + receipt all passed.
echo; echo "[6/7] OPEN VERIFIED FRONT"
if [ -x "$FRONT_LAUNCHER_TARGET" ]; then
  nohup "$FRONT_LAUNCHER_TARGET" >"$LOG_DIR/front-launch-$STAMP.log" 2>&1 &
  echo "PASS · B2.7.4 front launcher invoked"
fi

cat <<'TXT'
================================================================
SETKA ONE BUTTON UPDATE · COMPLETE
- updater self-heals before long network operations
- full Mac mirror runs before legacy/core update
- transient downloads/core calls retry automatically
- dedicated bare Git mirror contains full repository history/refs
- all manifested SETKA base-table rows are copied into compressed local SQLite
- PostgreSQL schema objects are mirrored separately
- new mirror becomes current only after complete verification
- previous verified mirror survives any failed update
- PASS requires local receipt + server-side Mac receipt
- provider-managed secret values are not copied into plaintext mirror
- front opens only after verified transfer boundary
- CANON is not promoted by this updater
================================================================
TXT
notify "SETKA full Mac mirror + front update complete"
finish_wait
