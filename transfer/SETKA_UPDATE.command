#!/bin/bash
set -u

ROOT="$HOME/.setka"
LOG_DIR="$ROOT/logs"
FRONT_DIR="$ROOT/front"
FRONT_URL="https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-minimal-front-b1.html"
SETKA_BIN="$HOME/bin/setka"
REPO="${SETKA_REPO:-$HOME/SETKA_LOCAL/WORKSPACE/Setka-web}"
STAMP="$(date '+%Y%m%d-%H%M%S')"
LOG="$LOG_DIR/update-$STAMP.log"

mkdir -p "$LOG_DIR" "$FRONT_DIR"

# Mirror the full run into a durable local log while keeping it visible.
exec > >(tee -a "$LOG") 2>&1

echo "============================================"
echo "SETKA · BOOST UPDATE"
echo "$(date)"
echo "============================================"
echo

notify() {
  local msg="$1"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$msg\" with title \"SETKA\"" >/dev/null 2>&1 || true
  fi
}

finish_wait() {
  echo
  echo "Log: $LOG"
  echo
  read -r -p "Нажми Enter, чтобы закрыть окно... " _ || true
}

if [ ! -x "$SETKA_BIN" ]; then
  echo "STOP · SETKA CLI NOT FOUND: $SETKA_BIN"
  notify "Обновление остановлено: SETKA CLI не найден"
  finish_wait
  exit 2
fi

echo "[1/4] VERIFIED CORE UPDATE"
if ! "$SETKA_BIN" update; then
  rc=$?
  echo "STOP · CORE UPDATE FAILED · rc=$rc"
  notify "Обновление SETKA остановлено: core update failed"
  finish_wait
  exit "$rc"
fi

echo
echo "[2/4] LOCAL FRONT MIRROR REFRESH"
TMP="$FRONT_DIR/index.html.tmp"
TARGET="$FRONT_DIR/index.html"
if command -v curl >/dev/null 2>&1 && curl -fsSL "$FRONT_URL" -o "$TMP"; then
  mv "$TMP" "$TARGET"
  chmod 600 "$TARGET" 2>/dev/null || true
  echo "PASS · local front cache refreshed"
else
  rm -f "$TMP"
  if [ -f "$TARGET" ]; then
    echo "HOLD · front refresh unavailable; existing cached front preserved"
  else
    echo "HOLD · front refresh unavailable; no cached front yet"
  fi
fi

echo
echo "[3/4] DEVELOPMENT REFS SYNC"
if [ -d "$REPO/.git" ]; then
  if git -C "$REPO" fetch origin --prune; then
    echo "PASS · Git refs fetched"
    branch="$(git -C "$REPO" branch --show-current 2>/dev/null || true)"
    dirty="$(git -C "$REPO" status --porcelain 2>/dev/null || true)"
    echo "branch: ${branch:-DETACHED}"
    if [ -n "$dirty" ]; then
      echo "SAFE HOLD · working tree has local changes; no merge performed"
    else
      echo "SAFE · working tree clean; updater intentionally performs no merge/promotion"
    fi
  else
    echo "HOLD · Git refs fetch failed; verified core update remains valid"
  fi
else
  echo "SKIP · development repository not found at $REPO"
fi

echo
echo "[4/4] STATUS"
"$SETKA_BIN" status || true

echo
cat <<'TXT'
============================================
SETKA BOOST UPDATE · COMPLETE
- scoped update path used
- no service_role required on Mac
- no CANON promotion performed
- no Git merge performed
- local front cache refreshed when network allowed
============================================
TXT

notify "SETKA update complete"
finish_wait
