#!/usr/bin/env python3
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zlib
from datetime import datetime, timezone
from pathlib import Path

EDGE_URL = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-mac-transfer-v1"
ROOT = Path.home() / ".setka"
DEVICE_FILE = ROOT / "device.json"
MIRROR_ROOT = ROOT / "mirror"
CODE_ROOT = MIRROR_ROOT / "code"
CODE_MIRROR = CODE_ROOT / "Setka-web.git"
GIT_URL = "https://github.com/misskogut/Setka-web.git"
KEYCHAIN_SERVICE = "SETKA_MAC_DEVICE_TOKEN"
SCHEMA_KINDS = ["VIEW", "FUNCTION", "INDEX", "CONSTRAINT", "TRIGGER", "SEQUENCE", "POLICY"]
TARGET_PAGE_BYTES = 2_000_000


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def run(cmd, *, cwd=None, check=True):
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if check and p.returncode != 0:
        raise RuntimeError(f"COMMAND_FAILED[{p.returncode}] {' '.join(cmd)}\n{p.stderr[-2000:]}")
    return p


def load_device():
    if not DEVICE_FILE.exists():
        raise RuntimeError("SETKA_DEVICE_FILE_MISSING")
    device = json.loads(DEVICE_FILE.read_text(encoding="utf-8"))
    device_ref = str(device.get("deviceRef") or "").strip()
    if not device_ref:
        raise RuntimeError("SETKA_DEVICE_REF_MISSING")
    user = os.environ.get("USER", "")
    p = run(["security", "find-generic-password", "-a", user, "-s", KEYCHAIN_SERVICE, "-w"], check=False)
    token = p.stdout.strip() if p.returncode == 0 else ""
    if len(token) < 32:
        raise RuntimeError("SETKA_DEVICE_TOKEN_MISSING")
    return device_ref, token


def edge_call(device_ref, token, payload, *, timeout=240, attempts=5):
    body = {"deviceRef": device_ref, **payload}
    data = canonical_json(body).encode("utf-8")
    last = None
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(
            EDGE_URL,
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "SETKA-Mac-Full-Mirror/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                result = json.loads(raw.decode("utf-8")) if raw else {}
                if result.get("ok") is False:
                    raise RuntimeError(f"EDGE_STATE:{result.get('state')}:{result.get('detail')}")
                return result
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", errors="replace")
            last = RuntimeError(f"EDGE_HTTP_{e.code}:{raw[:1200]}")
        except Exception as e:
            last = e
        if attempt < attempts:
            time.sleep(min(8, 1.25 * (2 ** (attempt - 1))))
    raise RuntimeError(f"EDGE_CALL_FAILED:{last}")


def sync_git_mirror():
    CODE_ROOT.mkdir(parents=True, exist_ok=True)
    if not CODE_MIRROR.exists():
        print("CODE · cloning full Git history mirror…", flush=True)
        run(["git", "clone", "--mirror", GIT_URL, str(CODE_MIRROR)])
    else:
        print("CODE · refreshing all Git refs/history…", flush=True)
        run(["git", f"--git-dir={CODE_MIRROR}", "remote", "update", "--prune"])
    fsck = run(["git", f"--git-dir={CODE_MIRROR}", "fsck", "--no-progress"], check=False)
    if fsck.returncode != 0:
        raise RuntimeError(f"GIT_MIRROR_FSCK_FAIL:{fsck.stderr[-1200:]}")
    commit = run(["git", f"--git-dir={CODE_MIRROR}", "rev-parse", "refs/heads/main"]).stdout.strip()
    if len(commit) != 40:
        raise RuntimeError("GIT_MAIN_COMMIT_INVALID")
    return commit


def page_limit(table):
    est = int(table.get("estimatedRows") or 0)
    total = int(table.get("totalBytes") or 0)
    if est <= 0:
        return 1000
    avg = max(256.0, total / max(est, 1))
    return max(1, min(3000, int(TARGET_PAGE_BYTES / avg)))


def relation_sqlite_name(schema_name, table_name):
    key = f"{schema_name}.{table_name}".encode("utf-8")
    return "r_" + hashlib.sha256(key).hexdigest()[:20]


def init_db(path: Path):
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=OFF")
    conn.execute("PRAGMA synchronous=OFF")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.execute("PRAGMA locking_mode=EXCLUSIVE")
    conn.execute("CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    conn.execute("""
      CREATE TABLE relations(
        schema_name TEXT NOT NULL,
        table_name TEXT NOT NULL,
        sqlite_name TEXT NOT NULL UNIQUE,
        pk_columns_json TEXT NOT NULL,
        cursor_kind TEXT,
        expected_total INTEGER,
        fetched_total INTEGER NOT NULL DEFAULT 0,
        pages INTEGER NOT NULL DEFAULT 0,
        estimated_bytes INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL,
        PRIMARY KEY(schema_name, table_name)
      )
    """)
    conn.execute("""
      CREATE TABLE schema_objects(
        kind TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        object_sha256 TEXT NOT NULL,
        object_zlib BLOB NOT NULL,
        PRIMARY KEY(kind, ordinal)
      )
    """)
    conn.commit()
    return conn


def insert_relation_row(conn, sqlite_name, pk_json, row):
    raw = canonical_json(row).encode("utf-8")
    packed = zlib.compress(raw, 6)
    conn.execute(f'INSERT INTO "{sqlite_name}"(pk_json,row_zlib) VALUES(?,?)', (pk_json, packed))


def mirror_table(conn, device_ref, token, table, table_index, table_total):
    schema_name = table["schemaName"]
    table_name = table["tableName"]
    sqlite_name = relation_sqlite_name(schema_name, table_name)
    pk_cols = list(table.get("pkColumns") or [])
    limit = page_limit(table)
    est_bytes = int(table.get("totalBytes") or 0)

    conn.execute(f'DROP TABLE IF EXISTS "{sqlite_name}"')
    conn.execute(f'CREATE TABLE "{sqlite_name}"(pk_json TEXT PRIMARY KEY, row_zlib BLOB NOT NULL)')
    conn.execute(
        "INSERT OR REPLACE INTO relations(schema_name,table_name,sqlite_name,pk_columns_json,estimated_bytes,state) VALUES(?,?,?,?,?,?)",
        (schema_name, table_name, sqlite_name, canonical_json(pk_cols), est_bytes, "SYNCING"),
    )
    conn.commit()

    cursor = None
    offset = 0
    fetched = 0
    pages = 0
    expected = None
    cursor_kind = None
    ordinal = 0

    while True:
        payload = {
            "action": "mirror_chunk",
            "schemaName": schema_name,
            "tableName": table_name,
            "cursor": cursor,
            "offset": offset,
            "limit": limit,
            "includeCount": pages == 0,
        }
        result = edge_call(device_ref, token, payload)
        rows = result.get("rows") or []
        if not isinstance(rows, list):
            raise RuntimeError(f"ROWS_NOT_LIST:{schema_name}.{table_name}")
        if pages == 0:
            expected = result.get("exactTotal")
            expected = int(expected) if expected is not None else None
            cursor_kind = result.get("cursorKind")
        for row in rows:
            if pk_cols:
                pk = {col: row.get(col) for col in pk_cols}
                pk_json = canonical_json(pk)
            else:
                pk_json = canonical_json({"__ordinal": ordinal})
                ordinal += 1
            insert_relation_row(conn, sqlite_name, pk_json, row)
        fetched += len(rows)
        pages += 1
        cursor = result.get("nextCursor")
        offset = int(result.get("nextOffset") or (offset + len(rows)))
        if pages % 25 == 0:
            conn.commit()
        if result.get("done") is True:
            break
        if not rows:
            raise RuntimeError(f"NON_TERMINAL_EMPTY_PAGE:{schema_name}.{table_name}")

    conn.commit()
    if expected is not None and fetched < expected:
        raise RuntimeError(f"ROW_COUNT_UNDERRUN:{schema_name}.{table_name}:{fetched}<{expected}")

    conn.execute(
        "UPDATE relations SET cursor_kind=?,expected_total=?,fetched_total=?,pages=?,state='PASS' WHERE schema_name=? AND table_name=?",
        (cursor_kind, expected, fetched, pages, schema_name, table_name),
    )
    conn.commit()
    print(f"DATA · {table_index:03d}/{table_total:03d} · {schema_name}.{table_name} · {fetched:,} rows · {pages} page(s)", flush=True)
    return {
        "schemaName": schema_name,
        "tableName": table_name,
        "expectedAtStart": expected,
        "fetched": fetched,
        "pages": pages,
        "cursorKind": cursor_kind,
        "estimatedBytes": est_bytes,
    }


def mirror_schema_objects(conn, device_ref, token, kinds):
    counts = {}
    for kind in kinds:
        offset = 0
        ordinal = 0
        while True:
            result = edge_call(device_ref, token, {
                "action": "mirror_schema",
                "kind": kind,
                "offset": offset,
                "limit": 50,
            })
            items = result.get("items") or []
            for item in items:
                raw = canonical_json(item).encode("utf-8")
                conn.execute(
                    "INSERT INTO schema_objects(kind,ordinal,object_sha256,object_zlib) VALUES(?,?,?,?)",
                    (kind, ordinal, sha256_bytes(raw), zlib.compress(raw, 6)),
                )
                ordinal += 1
            conn.commit()
            offset += len(items)
            if result.get("done") is True:
                break
            if not items:
                raise RuntimeError(f"SCHEMA_NON_TERMINAL_EMPTY_PAGE:{kind}")
        counts[kind] = ordinal
        print(f"SCHEMA · {kind} · {ordinal:,} object(s)", flush=True)
    return counts


def rotate_verified(staging: Path):
    current = MIRROR_ROOT / "current"
    previous = MIRROR_ROOT / "previous"
    if previous.exists():
        shutil.rmtree(previous)
    if current.exists():
        current.rename(previous)
    try:
        staging.rename(current)
    except Exception:
        if not current.exists() and previous.exists():
            previous.rename(current)
        raise
    return current


def main():
    started = utc_now()
    MIRROR_ROOT.mkdir(parents=True, exist_ok=True)
    device_ref, token = load_device()

    print("SETKA FULL MAC MIRROR · START", flush=True)
    print(f"DEVICE · {device_ref}", flush=True)

    code_commit = sync_git_mirror()
    print(f"CODE · FULL GIT MIRROR PASS · main {code_commit}", flush=True)

    manifest = edge_call(device_ref, token, {"action": "mirror_manifest"})
    if manifest.get("format") != "SETKA_MAC_FULL_MIRROR_V1":
        raise RuntimeError(f"MIRROR_MANIFEST_FORMAT_UNEXPECTED:{manifest.get('format')}")
    manifest_bytes = canonical_json(manifest).encode("utf-8")
    manifest_sha = sha256_bytes(manifest_bytes)
    source_tip = int(manifest.get("sourceTranscriptTip") or 0)
    source_generated_at = manifest.get("generatedAt")
    tables = manifest.get("tables") or []
    if not isinstance(tables, list) or not tables:
        raise RuntimeError("MIRROR_TABLE_INVENTORY_EMPTY")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    staging_root = MIRROR_ROOT / "staging"
    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging = staging_root / f"{stamp}-E{source_tip}"
    staging.mkdir(parents=True, exist_ok=True)
    db_path = staging / "setka-full-mirror.sqlite3"
    (staging / "manifest.json").write_bytes(manifest_bytes)
    (staging / "code-main-commit.txt").write_text(code_commit + "\n", encoding="utf-8")

    conn = init_db(db_path)
    conn.execute("INSERT INTO meta(key,value) VALUES('format','SETKA_MAC_FULL_MIRROR_SQLITE_V1')")
    conn.execute("INSERT INTO meta(key,value) VALUES('deviceRef',?)", (device_ref,))
    conn.execute("INSERT INTO meta(key,value) VALUES('codeCommit',?)", (code_commit,))
    conn.execute("INSERT INTO meta(key,value) VALUES('manifestSha256',?)", (manifest_sha,))
    conn.execute("INSERT INTO meta(key,value) VALUES('sourceTranscriptTip',?)", (str(source_tip),))
    conn.execute("INSERT INTO meta(key,value) VALUES('sourceGeneratedAt',?)", (str(source_generated_at),))
    conn.commit()

    table_receipts = []
    total_rows = 0
    try:
        for i, table in enumerate(tables, start=1):
            rec = mirror_table(conn, device_ref, token, table, i, len(tables))
            table_receipts.append(rec)
            total_rows += rec["fetched"]
        schema_counts = mirror_schema_objects(conn, device_ref, token, manifest.get("schemaObjectKinds") or SCHEMA_KINDS)
        conn.execute("INSERT INTO meta(key,value) VALUES('tableCount',?)", (str(len(tables)),))
        conn.execute("INSERT INTO meta(key,value) VALUES('rowCount',?)", (str(total_rows),))
        conn.execute("INSERT INTO meta(key,value) VALUES('schemaObjectCounts',?)", (canonical_json(schema_counts),))
        conn.commit()
    finally:
        conn.close()

    db_sha = sha256_file(db_path)
    local_bytes = db_path.stat().st_size
    local_receipt = {
        "format": "SETKA_MAC_FULL_MIRROR_RECEIPT_V1",
        "state": "PASS_FULL_SETKA_MIRROR",
        "deviceRef": device_ref,
        "branchRef": manifest.get("branchRef"),
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "sourceGeneratedAt": source_generated_at,
        "tableCount": len(tables),
        "rowCount": total_rows,
        "schemaObjectCounts": schema_counts,
        "manifestSha256": manifest_sha,
        "localDbSha256": db_sha,
        "localBytes": local_bytes,
        "startedAt": started,
        "completedAt": utc_now(),
        "tableReceipts": table_receipts,
        "truth": {
            "allManifestedBaseTablesCopied": True,
            "allManifestedRowsAtStartCoveredByCount": all((r["expectedAtStart"] is None or r["fetched"] >= r["expectedAtStart"]) for r in table_receipts),
            "schemaDefinitionsCopied": True,
            "gitHistoryMirrored": True,
            "localPromotionAtomic": True,
            "providerManagedSecretsCopied": False,
            "authUsersAtDesignAudit": 0,
            "storageObjectsAtDesignAudit": 0,
        },
    }
    (staging / "receipt.json").write_text(json.dumps(local_receipt, ensure_ascii=False, indent=2), encoding="utf-8")

    current = rotate_verified(staging)
    print(f"LOCAL · ATOMIC PROMOTION PASS · {current}", flush=True)

    server_receipt = edge_call(device_ref, token, {
        "action": "mirror_receipt",
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "sourceGeneratedAt": source_generated_at,
        "tableCount": len(tables),
        "rowCount": total_rows,
        "localBytes": local_bytes,
        "manifestSha256": manifest_sha,
        "localDbSha256": db_sha,
        "state": "PASS_FULL_SETKA_MIRROR",
        "details": {
            "format": "SETKA_MAC_FULL_MIRROR_RECEIPT_V1",
            "schemaObjectCounts": schema_counts,
            "gitHistoryMirrored": True,
            "allManifestedBaseTablesCopied": True,
            "providerManagedSecretsCopied": False,
        },
    })
    local_receipt["serverReceiptRef"] = server_receipt.get("receiptRef")
    (current / "receipt.json").write_text(json.dumps(local_receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    (MIRROR_ROOT / "LATEST.json").write_text(json.dumps({
        "state": local_receipt["state"],
        "current": str(current),
        "codeCommit": code_commit,
        "sourceTranscriptTip": source_tip,
        "tableCount": len(tables),
        "rowCount": total_rows,
        "localDbSha256": db_sha,
        "serverReceiptRef": local_receipt.get("serverReceiptRef"),
        "completedAt": local_receipt["completedAt"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print("============================================", flush=True)
    print("SETKA FULL MAC MIRROR · PASS", flush=True)
    print(f"Git main: {code_commit}", flush=True)
    print(f"Tables: {len(tables):,}", flush=True)
    print(f"Rows: {total_rows:,}", flush=True)
    print(f"SQLite: {local_bytes / (1024*1024):.1f} MiB", flush=True)
    print(f"Transcript tip at manifest: {source_tip}", flush=True)
    print(f"Server receipt: {local_receipt.get('serverReceiptRef')}", flush=True)
    print("============================================", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("SETKA FULL MAC MIRROR · INTERRUPTED", file=sys.stderr)
        sys.exit(130)
    except Exception as e:
        print(f"SETKA FULL MAC MIRROR · FAIL · {e}", file=sys.stderr)
        sys.exit(1)
