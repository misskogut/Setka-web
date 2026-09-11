#!/usr/bin/env python3
import hashlib
import importlib.util
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.home() / ".setka"
BIN_DIR = ROOT / "bin"
MIRROR_ROOT = ROOT / "mirror"
CURRENT = MIRROR_ROOT / "current"
LATEST = MIRROR_ROOT / "LATEST.json"
FULL_SYNC_PATH = BIN_DIR / "setka-mac-full-sync.py"
DELTA_EDGE_URL = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-mac-delta-v1"


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_full_module():
    if not FULL_SYNC_PATH.exists():
        raise RuntimeError("FULL_SYNC_HELPER_MISSING")
    spec = importlib.util.spec_from_file_location("setka_full_sync", FULL_SYNC_PATH)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod


def delta_call(device_ref, token, payload, timeout=240, attempts=5):
    data = json.dumps({"deviceRef": device_ref, **payload}, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    last = None
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(
            DELTA_EDGE_URL,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "SETKA-Mac-Delta-Mirror/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                result = json.loads(raw.decode("utf-8")) if raw else {}
                if result.get("ok") is False:
                    raise RuntimeError(f"DELTA_EDGE_STATE:{result.get('state')}:{result.get('detail')}")
                return result
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            last = RuntimeError(f"DELTA_EDGE_HTTP_{e.code}:{raw[:1600]}")
        except Exception as e:
            last = e
        if attempt < attempts:
            time.sleep(min(10, 1.5 * (2 ** (attempt - 1))))
    raise RuntimeError(f"DELTA_EDGE_CALL_FAILED:{last}")


def clone_file(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.run(["/bin/cp", "-c", str(src), str(dst)], capture_output=True, text=True)
    if p.returncode != 0:
        shutil.copy2(src, dst)


def read_latest():
    if not LATEST.exists():
        raise RuntimeError("VERIFIED_BASELINE_RECEIPT_MISSING")
    data = json.loads(LATEST.read_text(encoding="utf-8"))
    if data.get("state") not in ("PASS_FULL_SETKA_MIRROR", "PASS_DELTA_SETKA_MIRROR"):
        raise RuntimeError(f"BASELINE_NOT_VERIFIED:{data.get('state')}")
    return data


def main():
    started = utc_now()
    mod = load_full_module()
    latest = read_latest()
    if not CURRENT.exists() or not (CURRENT / "setka-full-mirror.sqlite3").exists():
        raise RuntimeError("CURRENT_VERIFIED_MIRROR_MISSING")

    device_ref, token = mod.load_device()
    after_event_id = int(latest.get("deltaToEventId") or 0)
    print("SETKA MAC DELTA MIRROR · START", flush=True)
    print(f"DEVICE · {device_ref}", flush=True)
    print(f"BASELINE · {latest.get('state')} · delta after {after_event_id}", flush=True)

    code_commit = mod.sync_git_mirror()
    print(f"CODE · FULL GIT MIRROR REFRESH PASS · main {code_commit}", flush=True)

    delta = delta_call(device_ref, token, {"action": "delta_manifest", "afterEventId": after_event_id})
    if delta.get("format") != "SETKA_MAC_DELTA_V1":
        raise RuntimeError(f"DELTA_MANIFEST_FORMAT_UNEXPECTED:{delta.get('format')}")
    high_water = int(delta.get("highWaterEventId") or 0)
    source_tip = int(delta.get("sourceTranscriptTip") or 0)
    dirty = delta.get("dirtyRelations") or []
    if not isinstance(dirty, list):
        raise RuntimeError("DELTA_DIRTY_RELATIONS_NOT_LIST")

    full_manifest = mod.edge_call(device_ref, token, {"action": "mirror_manifest"})
    if full_manifest.get("format") != "SETKA_MAC_FULL_MIRROR_V1":
        raise RuntimeError("FULL_MANIFEST_UNAVAILABLE_DURING_DELTA")
    tables = full_manifest.get("tables") or []
    table_map = {(t["schemaName"], t["tableName"]): t for t in tables}

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    staging_root = MIRROR_ROOT / "delta-staging"
    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging = staging_root / f"{stamp}-D{high_water}"
    staging.mkdir(parents=True, exist_ok=True)
    db_path = staging / "setka-full-mirror.sqlite3"
    clone_file(CURRENT / "setka-full-mirror.sqlite3", db_path)
    for name in ("receipt.json", "manifest.json", "code-main-commit.txt"):
        src = CURRENT / name
        if src.exists():
            shutil.copy2(src, staging / name)

    conn = mod.configure_db(sqlite3.connect(db_path))
    try:
        existing = {(r[0], r[1]): r[2] for r in conn.execute("SELECT schema_name,table_name,sqlite_name FROM relations").fetchall()}
        dirty_keys = {(str(d.get("schemaName")), str(d.get("tableName"))) for d in dirty if d.get("relationExists") is not False}

        # These operational schemas do not receive SETKA DML triggers; refresh them every delta.
        for key in table_map:
            if key[0] in ("cron", "net", "supabase_migrations"):
                dirty_keys.add(key)
        # Mirror bookkeeping tables are intentionally trigger-excluded to prevent recursion.
        for key in (
            ("foundation", "mac_mirror_delta_events_v1"),
            ("foundation", "mac_mirror_delta_sync_receipts_v1"),
            ("foundation", "mac_full_mirror_sync_receipts_v1"),
        ):
            if key in table_map:
                dirty_keys.add(key)

        # Schema inventory difference is a real delta even without DML triggers.
        dirty_keys.update(set(table_map) - set(existing))
        removed = set(existing) - set(table_map)
        if removed:
            print(f"SCHEMA · {len(removed)} removed relation(s) will be pruned", flush=True)

        mod.prune_stale_relations(conn, tables)

        changed_receipts = []
        ordered = sorted(k for k in dirty_keys if k in table_map)
        total_changed = len(ordered)
        if after_event_id == 0:
            print("RECONCILE · first delta after tracker install · all pre-tracker gaps are being closed", flush=True)
        print(f"DELTA · high-water {high_water} · {total_changed} relation(s) to resync", flush=True)

        for i, key in enumerate(ordered, start=1):
            table = table_map[key]
            rec = mod.mirror_table(conn, device_ref, token, table, i, total_changed)
            changed_receipts.append(rec)

        schema_counts = mod.mirror_schema_objects(conn, device_ref, token, full_manifest.get("schemaObjectKinds") or mod.SCHEMA_KINDS)
        total_rows = int(conn.execute("SELECT coalesce(sum(fetched_total),0) FROM relations WHERE state='PASS'").fetchone()[0] or 0)
        table_count = int(conn.execute("SELECT count(*) FROM relations WHERE state='PASS'").fetchone()[0] or 0)
        manifest_bytes = mod.canonical_json(full_manifest).encode("utf-8")
        manifest_sha = mod.sha256_bytes(manifest_bytes)
        source_generated_at = full_manifest.get("generatedAt")
        meta = {
            "format": "SETKA_MAC_FULL_MIRROR_SQLITE_V1",
            "deviceRef": device_ref,
            "codeCommit": code_commit,
            "manifestSha256": manifest_sha,
            "sourceTranscriptTip": str(source_tip),
            "sourceGeneratedAt": str(source_generated_at),
            "tableCount": str(table_count),
            "rowCount": str(total_rows),
            "schemaObjectCounts": mod.canonical_json(schema_counts),
            "deltaToEventId": str(high_water),
            "deltaMigrationVersion": str(delta.get("migrationVersion") or ""),
        }
        for key, value in meta.items():
            conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", (key, value))
        conn.commit()
    finally:
        conn.close()

    (staging / "manifest.json").write_bytes(mod.canonical_json(full_manifest).encode("utf-8"))
    (staging / "code-main-commit.txt").write_text(code_commit + "\n", encoding="utf-8")
    db_sha = mod.sha256_file(db_path)
    local_bytes = db_path.stat().st_size
    local_receipt = {
        "format": "SETKA_MAC_DELTA_RECEIPT_V1",
        "state": "PASS_DELTA_SETKA_MIRROR",
        "deviceRef": device_ref,
        "branchRef": delta.get("branchRef"),
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "sourceGeneratedAt": full_manifest.get("generatedAt"),
        "tableCount": table_count,
        "rowCount": total_rows,
        "schemaObjectCounts": schema_counts,
        "manifestSha256": manifest_sha,
        "localDbSha256": db_sha,
        "localBytes": local_bytes,
        "deltaFromEventId": after_event_id,
        "deltaToEventId": high_water,
        "changedRelationCount": total_changed,
        "startedAt": started,
        "completedAt": utc_now(),
        "truth": {
            "baselinePlusDelta": True,
            "dirtyRelationJournalHighWater": high_water,
            "writesAfterHighWaterDeferredToNextDelta": True,
            "fullRelationResyncForEachDirtyRelation": True,
            "schemaInventoryCompared": True,
            "schemaDefinitionsRefreshed": True,
            "gitHistoryMirrored": True,
            "providerManagedSecretsCopied": False,
        },
    }
    (staging / "receipt.json").write_text(json.dumps(local_receipt, ensure_ascii=False, indent=2), encoding="utf-8")

    current = mod.rotate_verified(staging)
    print(f"LOCAL · DELTA ATOMIC PROMOTION PASS · {current}", flush=True)

    server_receipt = delta_call(device_ref, token, {
        "action": "delta_receipt",
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "sourceGeneratedAt": full_manifest.get("generatedAt"),
        "tableCount": table_count,
        "rowCount": total_rows,
        "localBytes": local_bytes,
        "manifestSha256": manifest_sha,
        "localDbSha256": db_sha,
        "deltaFromEventId": after_event_id,
        "deltaToEventId": high_water,
        "changedRelationCount": total_changed,
        "state": "PASS_DELTA_SETKA_MIRROR",
        "details": {
            "format": "SETKA_MAC_DELTA_RECEIPT_V1",
            "schemaObjectCounts": schema_counts,
            "gitHistoryMirrored": True,
            "baselinePlusDelta": True,
            "firstTrackerReconciliation": after_event_id == 0,
        },
    })
    local_receipt["serverReceiptRef"] = server_receipt.get("receiptRef")
    (current / "receipt.json").write_text(json.dumps(local_receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    LATEST.write_text(json.dumps({
        "state": local_receipt["state"],
        "current": str(current),
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "tableCount": table_count,
        "rowCount": total_rows,
        "localBytes": local_bytes,
        "manifestSha256": manifest_sha,
        "localDbSha256": db_sha,
        "deltaFromEventId": after_event_id,
        "deltaToEventId": high_water,
        "changedRelationCount": total_changed,
        "serverReceiptRef": local_receipt.get("serverReceiptRef"),
        "completedAt": local_receipt["completedAt"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print("============================================", flush=True)
    print("SETKA MAC DELTA MIRROR · PASS", flush=True)
    print(f"Git main: {code_commit}", flush=True)
    print(f"Delta events: {after_event_id} -> {high_water}", flush=True)
    print(f"Changed relations: {total_changed}", flush=True)
    print(f"Tables current: {table_count:,}", flush=True)
    print(f"Rows current: {total_rows:,}", flush=True)
    print(f"SQLite: {local_bytes/(1024*1024):.1f} MiB", flush=True)
    print(f"Transcript tip: {source_tip}", flush=True)
    print(f"Server receipt: {local_receipt.get('serverReceiptRef')}", flush=True)
    print("============================================", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("SETKA MAC DELTA MIRROR · INTERRUPTED", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"SETKA MAC DELTA MIRROR · FAIL · {e}", file=sys.stderr)
        sys.exit(1)
