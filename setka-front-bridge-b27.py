#!/usr/bin/env python3
import argparse
import importlib.util
import json
import sqlite3
import threading
import urllib.parse
import zlib
from collections import Counter, defaultdict
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B25_PATH = FRONT_DIR / "setka-front-bridge-b25.py"
OVERLAY_PATH = FRONT_DIR / "setka-b2.js"
MIRROR_DB = ROOT / "mirror" / "current" / "setka-full-mirror.sqlite3"
MIRROR_LATEST = ROOT / "mirror" / "LATEST.json"

if not B25_PATH.exists():
    raise RuntimeError("SETKA_B25_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b25_base", B25_PATH)
b25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b25)


class LocalMirror:
    def __init__(self):
        self._lock = threading.RLock()
        self._key = None
        self._cache = {}

    def _stat_key(self):
        if not MIRROR_DB.exists():
            return None
        s = MIRROR_DB.stat()
        return (s.st_mtime_ns, s.st_size)

    def _refresh(self):
        key = self._stat_key()
        if key != self._key:
            self._key = key
            self._cache = {}
        if key is None:
            raise RuntimeError("SETKA_LOCAL_MIRROR_MISSING")

    def receipt(self):
        self._refresh()
        if not MIRROR_LATEST.exists():
            return {}
        try:
            return json.loads(MIRROR_LATEST.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def relation_rows(self, schema, table):
        cache_key = f"{schema}.{table}"
        with self._lock:
            self._refresh()
            if cache_key in self._cache:
                return self._cache[cache_key]
            conn = sqlite3.connect(f"file:{MIRROR_DB}?mode=ro", uri=True)
            try:
                meta = conn.execute(
                    "SELECT sqlite_name,state,fetched_total FROM relations WHERE schema_name=? AND table_name=?",
                    (schema, table),
                ).fetchone()
                if not meta or meta[1] != "PASS":
                    rows = []
                else:
                    sqlite_name = meta[0]
                    rows = []
                    for (packed,) in conn.execute(f'SELECT row_zlib FROM "{sqlite_name}"'):
                        try:
                            rows.append(json.loads(zlib.decompress(packed).decode("utf-8")))
                        except Exception:
                            continue
            finally:
                conn.close()
            self._cache[cache_key] = rows
            return rows

    def relation_inventory(self):
        with self._lock:
            self._refresh()
            conn = sqlite3.connect(f"file:{MIRROR_DB}?mode=ro", uri=True)
            try:
                rows = conn.execute(
                    "SELECT schema_name,table_name,fetched_total,state FROM relations ORDER BY schema_name,table_name"
                ).fetchall()
                return [
                    {"schema": r[0], "table": r[1], "rows": int(r[2] or 0), "state": r[3]}
                    for r in rows
                ]
            finally:
                conn.close()


mirror = LocalMirror()


def _norm(value):
    return " ".join(str(value or "").lower().replace("_", " ").replace(":", " ").replace("/", " ").split())


def _compact_object(row):
    return {
        "kind": row.get("object_kind"),
        "ref": row.get("object_ref"),
        "label": row.get("display_name_ru") or row.get("object_ref"),
        "subtype": row.get("subtype"),
        "state": row.get("state"),
        "parentRef": row.get("parent_ref"),
        "scopeRef": row.get("scope_ref"),
        "sourceRelation": row.get("source_relation"),
        "occurredAt": row.get("occurred_at"),
    }


def _object_map(objects):
    return {(str(o.get("object_kind") or ""), str(o.get("object_ref") or "")): o for o in objects}


def _overview():
    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    relations = mirror.relation_rows("foundation", "setka_system_relation_index_v1")
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    baselines = mirror.relation_rows("foundation", "setka_branch_baselines_v1")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    body_cache = mirror.relation_rows("foundation", "front_body_snapshot_cache_v1")
    index_state = mirror.relation_rows("foundation", "setka_system_index_state_v1")
    exclusions = mirror.relation_rows("foundation", "mac_mirror_exclusion_policy_v1")
    deploy = mirror.relation_rows("foundation", "edge_function_deployment_inventory_v1")
    git_sources = mirror.relation_rows("foundation", "edge_function_git_source_receipts_v1")
    front_catalog = mirror.relation_rows("foundation", "front_backend_catalog_v1")
    lineages = mirror.relation_rows("foundation", "setka_version_lineage_registry")
    receipt = mirror.receipt()

    by_kind = Counter(str(x.get("object_kind") or "UNKNOWN") for x in objects)
    rel_by_kind = Counter(str(x.get("relation_kind") or "UNKNOWN") for x in relations)
    git_by_slug = {str(x.get("slug")): x for x in git_sources}
    source_current = 0
    for d in deploy:
        g = git_by_slug.get(str(d.get("slug")))
        if g and int(g.get("deployed_version") or -1) == int(d.get("deployed_version") or -2) and str(g.get("deployed_ezbr_sha256") or "") == str(d.get("ezbr_sha256") or ""):
            source_current += 1

    baseline_by_mode = {str(x.get("mode_ref")): x for x in baselines}
    branch_by_ref = {str(x.get("branch_ref")): x for x in branches}
    version_by_ref = {str(x.get("version_ref")): x for x in versions}
    modes = []
    for mode in ["CANON", "LINEAR", "SELF_ORGANIZED", "MOTORWAY_LAB", "INTEGRATION"]:
        b = baseline_by_mode.get(mode) or {}
        br = branch_by_ref.get(str(b.get("branch_ref"))) or {}
        v = version_by_ref.get(str(b.get("version_ref"))) or {}
        modes.append({
            "modeRef": mode,
            "modeDisplay": mode.replace("_", "-"),
            "branchRef": b.get("branch_ref"),
            "branchName": br.get("display_name_ru"),
            "branchKind": br.get("branch_kind"),
            "runtimeState": br.get("runtime_state"),
            "isolationState": br.get("isolation_state"),
            "executionEnvironment": br.get("execution_environment"),
            "versionRef": b.get("version_ref"),
            "headVersionRef": br.get("head_version_ref"),
            "stateSnapshotRef": b.get("state_snapshot_ref"),
            "digestRef": b.get("digest_ref"),
            "bodySnapshotRef": b.get("body_snapshot_ref"),
            "versionState": v.get("version_state"),
            "baselineState": b.get("baseline_state"),
            "backendComplete": bool(b and br and v),
        })

    branch_rows = [{
        "branchRef": x.get("branch_ref"),
        "name": x.get("display_name_ru"),
        "kind": x.get("branch_kind"),
        "runtimeState": x.get("runtime_state"),
        "isolationState": x.get("isolation_state"),
        "environment": x.get("execution_environment"),
        "baseVersionRef": x.get("base_version_ref"),
        "headVersionRef": x.get("head_version_ref"),
        "forkEventNo": x.get("fork_event_no"),
        "metadata": x.get("metadata") or {},
    } for x in branches]

    body_by_snapshot = {str(x.get("snapshot_ref")): x for x in body_cache}
    version_rows = [{
        "versionRef": x.get("version_ref"),
        "label": x.get("version_label"),
        "parentVersionRef": x.get("parent_version_ref"),
        "state": x.get("version_state"),
        "canonVersion": x.get("canon_version"),
        "bodySnapshotRef": x.get("body_snapshot_ref"),
        "bodyCachedOnMac": str(x.get("body_snapshot_ref")) in body_by_snapshot,
        "bodyNodes": (body_by_snapshot.get(str(x.get("body_snapshot_ref"))) or {}).get("grown_nodes"),
        "bodyEdges": (body_by_snapshot.get(str(x.get("body_snapshot_ref"))) or {}).get("internal_edges"),
        "bodyPayloadBytes": (body_by_snapshot.get(str(x.get("body_snapshot_ref"))) or {}).get("payload_bytes"),
        "bodyLawStatus": (body_by_snapshot.get(str(x.get("body_snapshot_ref"))) or {}).get("law_status"),
        "stateSnapshotRef": x.get("system_state_snapshot_ref"),
        "digestRef": x.get("system_digest_ref"),
        "integrityHash": x.get("integrity_hash"),
        "createdAt": x.get("created_at"),
        "truth": x.get("truth") or {},
    } for x in versions]

    return {
        "ok": True,
        "state": "SETKA_LOCAL_BACKEND_OVERVIEW_READY",
        "frontVersion": "B2.9",
        "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
        "mirror": receipt,
        "systemIndex": {
            "objects": len(objects),
            "relations": len(relations),
            "objectKinds": dict(sorted(by_kind.items())),
            "relationKindsTop": [{"kind": k, "count": n} for k, n in rel_by_kind.most_common(30)],
            "state": index_state[0] if index_state else {},
        },
        "versions": version_rows,
        "modes": modes,
        "branches": branch_rows,
        "versionLineageMembers": len(lineages),
        "frontBackendCatalogCount": len(front_catalog),
        "edgeSources": {
            "deployed": len(deploy),
            "gitCurrent": source_current,
            "coveragePct": round((100.0 * source_current / len(deploy)), 2) if deploy else 100.0,
        },
        "coldExcluded": [{
            "schema": x.get("schema_name"),
            "table": x.get("table_name"),
            "storageClass": x.get("storage_class"),
            "reason": x.get("reason"),
            "sourceRetention": x.get("source_retention"),
            "rehydrationPolicy": x.get("rehydration_policy"),
        } for x in exclusions if x.get("include_in_mac") is False],
        "truthBoundary": "B2.8 READS THE VERIFIED LOCAL MAC MIRROR. UI LAYOUT NEVER DEFINES BACKEND TRUTH.",
        "canonMutation": False,
        "runtimeMutation": False,
    }


def _search(query, limit=40):
    q = _norm(query)
    if not q:
        return {"ok": True, "state": "EMPTY_QUERY", "results": []}
    tokens = [x for x in q.split() if len(x) >= 2]
    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    relations = mirror.relation_rows("foundation", "setka_system_relation_index_v1")
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    degrees_out = Counter((str(r.get("source_kind")), str(r.get("source_ref"))) for r in relations)
    degrees_in = Counter((str(r.get("target_kind")), str(r.get("target_ref"))) for r in relations)
    results = []

    for o in objects:
        ref = str(o.get("object_ref") or "")
        label = str(o.get("display_name_ru") or "")
        hay = _norm(" ".join([
            ref, label, str(o.get("object_kind") or ""), str(o.get("subtype") or ""),
            str(o.get("state") or ""), str(o.get("search_text") or "")
        ]))
        if q not in hay and not all(t in hay for t in tokens):
            continue
        score = 0
        if _norm(ref) == q: score += 500
        if _norm(label) == q: score += 420
        if _norm(ref).startswith(q): score += 220
        if _norm(label).startswith(q): score += 180
        if q in _norm(ref): score += 120
        if q in _norm(label): score += 100
        score += sum(12 for t in tokens if t in hay)
        key = (str(o.get("object_kind")), ref)
        item = _compact_object(o)
        item.update({"score": score, "outbound": degrees_out[key], "inbound": degrees_in[key], "source": "SYSTEM_INDEX"})
        results.append(item)

    for b in branches:
        ref = str(b.get("branch_ref") or "")
        label = str(b.get("display_name_ru") or "")
        hay = _norm(" ".join([ref,label,str(b.get("branch_kind") or ""),str(b.get("runtime_state") or ""),json.dumps(b.get("metadata") or {}, ensure_ascii=False)]))
        if q in hay or all(t in hay for t in tokens):
            score = (500 if _norm(ref)==q else 0) + (400 if _norm(label)==q else 0) + (140 if q in _norm(ref) else 0) + (110 if q in _norm(label) else 0)
            results.append({
                "kind":"BRANCH","ref":ref,"label":label or ref,"subtype":b.get("branch_kind"),"state":b.get("runtime_state"),
                "parentRef":None,"scopeRef":b.get("lineage_ref"),"sourceRelation":"setka_branches_v1","score":score,"outbound":0,"inbound":0,"source":"BRANCH_REGISTRY"
            })

    for v in versions:
        ref = str(v.get("version_ref") or "")
        label = str(v.get("version_label") or "")
        hay = _norm(" ".join([ref,label,str(v.get("version_state") or ""),str(v.get("canon_version") or "")]))
        if q in hay or all(t in hay for t in tokens):
            score = (500 if _norm(ref)==q else 0) + (400 if _norm(label)==q else 0) + (140 if q in _norm(ref) else 0)
            results.append({
                "kind":"VERSION","ref":ref,"label":label or ref,"subtype":v.get("canon_version"),"state":v.get("version_state"),
                "parentRef":v.get("parent_version_ref"),"scopeRef":v.get("lineage_ref"),"sourceRelation":"setka_version_nodes_v1","score":score,"outbound":0,"inbound":0,"source":"VERSION_REGISTRY"
            })

    results.sort(key=lambda x: (-int(x.get("score") or 0), str(x.get("kind")), str(x.get("ref"))))
    return {
        "ok": True,
        "state": "SETKA_LOCAL_BACKEND_SEARCH_READY" if results else "NO_BACKEND_MATCH",
        "query": query,
        "results": results[:max(1,min(int(limit),80))],
        "totalMatched": len(results),
        "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
    }


def _local_projection_specs(intent, limit=8):
    data = _search(intent, max(1, min(int(limit or 8), 12)))
    specs = []
    for x in (data.get("results") or [])[:max(1, min(int(limit or 8), 12))]:
        kind = str(x.get("kind") or "OBJECT")
        ref = str(x.get("ref") or "")
        if not ref:
            continue
        source_relation = str(x.get("sourceRelation") or "setka_system_object_index_v1")
        source_table = "foundation." + source_relation
        specs.append({
            "projectionRef": "runtime:system-index:" + kind.lower() + ":" + ref.replace(" ", "_"),
            "kind": "card",
            "label": x.get("label") or ref,
            "content": " · ".join([
                "REAL BACKEND OBJECT", kind, ref,
                "state " + str(x.get("state") or "—"),
                "OUT " + str(x.get("outbound") or 0),
                "IN " + str(x.get("inbound") or 0),
            ]),
            "systemGenerated": True,
            "renameable": True,
            "persistence": "ephemeral",
            "binding": {
                "bindingKind": "SYSTEM_INDEX_OBJECT",
                "sourceTable": source_table,
                "sourceRef": ref,
                "entityType": kind,
                "entityRef": ref,
                "invokePolicy": "INSPECT_LOCAL_BACKEND_B28",
            },
            "context": {"intent": intent, "source": x.get("source")},
            "evidence": {
                "exists": True,
                "sourceTable": source_table,
                "sourceRef": ref,
                "objectKind": kind,
                "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
            },
        })
    return specs


def _inspect_projection(kind, ref):
    d = _inspect(kind, ref)
    if not d.get("ok"):
        return d
    rec = d.get("record") or {}
    label = rec.get("display_name_ru") or rec.get("version_label") or rec.get("displayNameRu") or ref
    if d.get("kind") == "BRANCH":
        content = f"REAL BRANCH · {ref} · {rec.get('runtime_state') or '—'} · events {d.get('eventCount') or 0}"
        source_table = "foundation.setka_branches_v1"
    elif d.get("kind") == "VERSION":
        content = f"REAL VERSION · {ref} · {rec.get('version_state') or '—'} · branches {len(d.get('branches') or [])}"
        source_table = "foundation.setka_version_nodes_v1"
    else:
        content = f"REAL BACKEND · {d.get('kind')} · {ref} · OUT {d.get('outgoingCount') or 0} · IN {d.get('incomingCount') or 0} · metrics {len(d.get('metrics') or [])}"
        source_table = "foundation." + str(rec.get("source_relation") or "setka_system_object_index_v1")
    return {
        "ok": True,
        "state": "PROVEN_LOCAL_BACKEND_BINDING_READY",
        "frontVersion": "B2.8",
        "bindingKind": "SYSTEM_INDEX_OBJECT",
        "bindingRef": ref,
        "record": d,
        "projection": {
            "projectionRef": "runtime:detail:system-index:" + str(d.get("kind") or kind).lower() + ":" + ref.replace(" ", "_"),
            "kind": "card",
            "label": label,
            "content": content,
            "systemGenerated": True,
            "renameable": True,
            "persistence": "ephemeral",
            "binding": {
                "bindingKind": "SYSTEM_INDEX_OBJECT",
                "sourceTable": source_table,
                "sourceRef": ref,
                "entityType": d.get("kind") or kind,
                "entityRef": ref,
                "invokePolicy": "INSPECT_LOCAL_BACKEND_B28",
            },
            "evidence": {
                "exists": True,
                "sourceTable": source_table,
                "sourceRef": ref,
                "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
            },
        },
        "executionPerformed": False,
        "truthBoundary": "B2.8 INSPECTS THE VERIFIED LOCAL MAC BACKEND MIRROR; NO MUTATING COMMAND IS EXECUTED.",
        "canonMutation": False,
        "runtimeMutation": False,
    }



_KIND_PRIORITY = {
    "ENTITY": 0,
    "SHIP": 1,
    "EXPERIMENT": 2,
    "EXPERIMENT_CAPSULE": 3,
    "RUN": 4,
    "VISUALIZATION": 5,
    "SNAPSHOT": 6,
    "WORLD_NODE": 7,
    "METRIC": 8,
    "EVENT": 9,
}

def _context_graph(kind, ref, max_depth=3, max_nodes=90):
    kind = str(kind or "").upper().strip()
    ref = str(ref or "").strip()
    if not ref:
        return {"ok": False, "state": "CONTEXT_REF_REQUIRED"}

    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    relations = mirror.relation_rows("foundation", "setka_system_relation_index_v1")
    obj_map = {(str(o.get("object_kind") or ""), str(o.get("object_ref") or "")): o for o in objects}
    by_ref = defaultdict(list)
    for key, obj in obj_map.items():
        by_ref[key[1]].append((key[0], obj))

    root_key = (kind, ref)
    root = obj_map.get(root_key)
    if root is None:
        matches = by_ref.get(ref, [])
        if len(matches) == 1:
            kind, root = matches[0]
            root_key = (kind, ref)
        else:
            return {
                "ok": False,
                "state": "CONTEXT_OBJECT_NOT_FOUND" if not matches else "CONTEXT_REF_AMBIGUOUS",
                "kind": kind,
                "ref": ref,
                "choices": [{"kind": k, "ref": ref, "label": o.get("display_name_ru") or ref} for k, o in matches[:20]],
            }

    rels = [r for r in relations if not bool(r.get("historical_only"))]
    adjacency = defaultdict(list)
    for idx, r in enumerate(rels):
        sk = (str(r.get("source_kind") or ""), str(r.get("source_ref") or ""))
        tk = (str(r.get("target_kind") or ""), str(r.get("target_ref") or ""))
        adjacency[sk].append((idx, tk))
        adjacency[tk].append((idx, sk))

    depth_by_key = {root_key: 0}
    queue = [root_key]
    cursor = 0
    while cursor < len(queue) and len(depth_by_key) < max_nodes:
        current = queue[cursor]
        cursor += 1
        depth = depth_by_key[current]
        if depth >= max_depth:
            continue
        neighbors = []
        for idx, other in adjacency.get(current, []):
            if other not in obj_map or other in depth_by_key:
                continue
            other_obj = obj_map[other]
            neighbors.append((idx, other, other_obj))
        neighbors.sort(key=lambda x: (
            _KIND_PRIORITY.get(x[1][0], 50),
            str(x[2].get("display_name_ru") or x[1][1]).lower(),
            x[1][1],
        ))
        for _, other, _ in neighbors:
            if len(depth_by_key) >= max_nodes:
                break
            depth_by_key[other] = depth + 1
            queue.append(other)

    included = set(depth_by_key)
    node_rows = []
    for key, depth in sorted(depth_by_key.items(), key=lambda kv: (kv[1], _KIND_PRIORITY.get(kv[0][0], 50), kv[0][1])):
        o = obj_map[key]
        node_rows.append({
            "kind": key[0],
            "ref": key[1],
            "label": o.get("display_name_ru") or key[1],
            "subtype": o.get("subtype"),
            "state": o.get("state"),
            "parentRef": o.get("parent_ref"),
            "scopeRef": o.get("scope_ref"),
            "sourceRelation": o.get("source_relation"),
            "depth": depth,
            "isRoot": key == root_key,
        })

    edge_rows = []
    seen_edges = set()
    for r in rels:
        sk = (str(r.get("source_kind") or ""), str(r.get("source_ref") or ""))
        tk = (str(r.get("target_kind") or ""), str(r.get("target_ref") or ""))
        if sk not in included or tk not in included:
            continue
        ek = (sk, tk, str(r.get("relation_kind") or "RELATION"), str(r.get("evidence_ref") or ""))
        if ek in seen_edges:
            continue
        seen_edges.add(ek)
        edge_rows.append({
            "sourceKind": sk[0],
            "sourceRef": sk[1],
            "targetKind": tk[0],
            "targetRef": tk[1],
            "relationKind": r.get("relation_kind") or "RELATION",
            "relationState": r.get("relation_state"),
            "sourceRelation": r.get("source_relation"),
            "evidenceRef": r.get("evidence_ref"),
        })

    counts = Counter(x["kind"] for x in node_rows)
    return {
        "ok": True,
        "state": "SETKA_LOCAL_CONTEXT_GRAPH_READY",
        "frontVersion": "B2.9",
        "root": {
            "kind": root_key[0],
            "ref": root_key[1],
            "label": root.get("display_name_ru") or root_key[1],
            "subtype": root.get("subtype"),
            "state": root.get("state"),
            "sourceRelation": root.get("source_relation"),
        },
        "nodes": node_rows,
        "edges": edge_rows,
        "nodeCount": len(node_rows),
        "edgeCount": len(edge_rows),
        "depth": max(depth_by_key.values()) if depth_by_key else 0,
        "kindCounts": dict(sorted(counts.items())),
        "truncated": len(depth_by_key) >= max_nodes,
        "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
        "truthBoundary": "Only indexed backend objects and indexed non-historical relations are shown. Coordinates are presentation only.",
    }


def _collect_exact_refs(value, known_refs, out, budget):
    if budget[0] <= 0:
        return
    budget[0] -= 1
    if isinstance(value, dict):
        for v in value.values():
            _collect_exact_refs(v, known_refs, out, budget)
            if budget[0] <= 0:
                break
    elif isinstance(value, list):
        for v in value:
            _collect_exact_refs(v, known_refs, out, budget)
            if budget[0] <= 0:
                break
    elif isinstance(value, str):
        s = value.strip()
        if s in known_refs:
            out.add(s)


def _local_transcript(stream="SYSTEM", mode="INTEGRATION", limit=60):
    stream = str(stream or "SYSTEM").upper()
    mode_norm = str(mode or "INTEGRATION").upper().replace("-", "_")
    limit = max(1, min(int(limit or 60), 120))

    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    by_ref = defaultdict(list)
    for o in objects:
        by_ref[str(o.get("object_ref") or "")].append(o)
    known_refs = set(by_ref)

    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    version_refs = {str(v.get("version_ref") or "") for v in versions}
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    branch_refs = {str(b.get("branch_ref") or "") for b in branches}

    if stream == "BRANCH":
        baselines = mirror.relation_rows("foundation", "setka_branch_baselines_v1")
        baseline = next((b for b in baselines if str(b.get("mode_ref") or "") == mode_norm), None)
        if not baseline:
            return {"ok": False, "state": "UNKNOWN_MODE", "mode": mode_norm}
        branch_ref = str(baseline.get("branch_ref") or "")
        rows = [x for x in mirror.relation_rows("foundation", "setka_branch_events_v1") if str(x.get("branch_ref") or "") == branch_ref]
        rows.sort(key=lambda x: int(x.get("branch_event_no") or 0), reverse=True)
        out = []
        for r in rows[:limit]:
            payload = r.get("payload") or {}
            refs = set()
            _collect_exact_refs(payload, known_refs, refs, [300])
            candidates = []
            for ref in sorted(refs):
                for o in by_ref.get(ref, [])[:3]:
                    candidates.append({"kind": o.get("object_kind"), "ref": ref, "label": o.get("display_name_ru") or ref})
            vr = str(r.get("version_ref") or "")
            out.append({
                "stream": "BRANCH",
                "eventNo": r.get("branch_event_no"),
                "eventId": r.get("branch_event_ref"),
                "occurredAt": r.get("occurred_at"),
                "eventKind": r.get("event_kind"),
                "summary": payload.get("summary") or r.get("event_kind"),
                "version": vr or None,
                "branchRef": branch_ref,
                "details": payload,
                "contextCandidates": candidates[:12],
                "versionKnown": vr in version_refs if vr else False,
            })
        return {"ok": True, "state": "SETKA_LOCAL_BRANCH_TRANSCRIPT_READY", "stream": "BRANCH", "mode": mode_norm, "branchRef": branch_ref, "rows": out, "total": len(rows)}

    rows = mirror.relation_rows("foundation", "system_transcript_events")
    rows.sort(key=lambda x: int(x.get("event_no") or 0), reverse=True)
    out = []
    for r in rows[:limit]:
        refs = set()
        entity_ref = str(r.get("entity_ref") or "").strip()
        if entity_ref in known_refs:
            refs.add(entity_ref)
        details = r.get("details") or {}
        _collect_exact_refs(details, known_refs, refs, [400])
        candidates = []
        for ref in sorted(refs):
            for o in by_ref.get(ref, [])[:3]:
                candidates.append({"kind": o.get("object_kind"), "ref": ref, "label": o.get("display_name_ru") or ref})
        vr = str(r.get("version") or "")
        out.append({
            "stream": "SYSTEM",
            "eventNo": r.get("event_no"),
            "eventId": r.get("source_key"),
            "occurredAt": r.get("occurred_at"),
            "surface": r.get("surface"),
            "eventKind": r.get("event_type"),
            "entityType": r.get("entity_type"),
            "entityRef": entity_ref or None,
            "version": vr or None,
            "summary": r.get("summary"),
            "details": details,
            "contextCandidates": candidates[:12],
            "versionKnown": vr in version_refs if vr else False,
        })
    return {"ok": True, "state": "SETKA_LOCAL_SYSTEM_TRANSCRIPT_READY", "stream": "SYSTEM", "rows": out, "total": len(rows)}


def _json_contains_exact(value, needle, budget=None):
    if budget is None:
        budget = [500]
    if budget[0] <= 0:
        return False
    budget[0] -= 1
    if isinstance(value, dict):
        return any(_json_contains_exact(v, needle, budget) for v in value.values())
    if isinstance(value, list):
        return any(_json_contains_exact(v, needle, budget) for v in value)
    if isinstance(value, str):
        return value.strip() == needle
    return False


def _visualizations_for_refs(refs, limit=20):
    refs = {str(x or "").strip() for x in refs if str(x or "").strip()}
    if not refs:
        return []
    packets = mirror.relation_rows("foundation", "system_visualization_packets_v1")
    out = []
    for p in packets:
        source_ref = str(p.get("source_ref") or "")
        payload = p.get("payload") or {}
        score = 0
        matches = []
        if source_ref in refs:
            score += 500
            matches.append(source_ref)
        for ref in refs:
            if ref == source_ref:
                continue
            if _json_contains_exact(payload, ref, [350]):
                score += 120
                matches.append(ref)
        if not score:
            continue
        scene = str(p.get("scene_kind") or "")
        if "MORPHOLOGY" in scene:
            score += 90
        if "SOLAR_FOCUS" in scene or "LOCAL_WORLD" in scene:
            score += 70
        if "PROCESS" in scene or "TRACE" in scene:
            score += 60
        out.append({
            "packetRef": p.get("packet_ref"),
            "sourceKind": p.get("source_kind"),
            "sourceRef": p.get("source_ref"),
            "sceneKind": p.get("scene_kind"),
            "snapshotRef": p.get("snapshot_ref"),
            "state": p.get("state"),
            "payloadBytes": p.get("payload_bytes"),
            "createdAt": p.get("created_at"),
            "score": score,
            "matchedRefs": sorted(set(matches)),
            "supportsReplay": isinstance(payload.get("stages"), list) and len(payload.get("stages") or []) > 0,
            "hasRecordedGraph": isinstance(payload.get("graph"), dict) or isinstance(payload.get("localGraph"), dict),
            "viewer": payload.get("viewer") or {},
            "truth": payload.get("truth") or {},
        })
    out.sort(key=lambda x: (-int(x.get("score") or 0), str(x.get("createdAt") or "")), reverse=False)
    return out[:max(1, min(int(limit or 20), 50))]


def _universal_card(kind=None, ref=None, event_no=None):
    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    by_ref = defaultdict(list)
    obj_map = {}
    for o in objects:
        k = str(o.get("object_kind") or "")
        r = str(o.get("object_ref") or "")
        obj_map[(k, r)] = o
        by_ref[r].append(o)

    transcripts = mirror.relation_rows("foundation", "system_transcript_events")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    provenance_rows = mirror.relation_rows("foundation", "system_transcript_effective_provenance_v018")
    event_prov_links = mirror.relation_rows("foundation", "event_provenance_links")
    replays = mirror.relation_rows("foundation", "body_update_assimilation_replays_v1")

    if event_no is not None:
        try:
            event_no = int(event_no)
        except Exception:
            return {"ok": False, "state": "INVALID_EVENT_NO"}
        ev = next((x for x in transcripts if int(x.get("event_no") or -1) == event_no), None)
        if not ev:
            return {"ok": False, "state": "EVENT_NOT_FOUND", "eventNo": event_no}

        refs = set()
        for v in [ev.get("source_key"), ev.get("entity_ref"), ev.get("version")]:
            if str(v or "").strip():
                refs.add(str(v).strip())
        known_refs = set(by_ref)
        _collect_exact_refs(ev.get("details") or {}, known_refs, refs, [600])

        candidates = []
        for rr in sorted(refs):
            for o in by_ref.get(rr, [])[:4]:
                candidates.append(_compact_object(o))

        prov = next((x for x in provenance_rows if int(x.get("event_no") or -1) == event_no), None)
        prov_links = [x for x in event_prov_links if int(x.get("event_no") or -1) == event_no]

        neighbors = sorted(transcripts, key=lambda x: int(x.get("event_no") or 0))
        pos = next((i for i,x in enumerate(neighbors) if int(x.get("event_no") or -1)==event_no), None)
        before = neighbors[max(0,(pos or 0)-3):(pos or 0)] if pos is not None else []
        after = neighbors[(pos+1):(pos+4)] if pos is not None else []

        visualizations = _visualizations_for_refs(refs, 30)

        replay_options = []
        for rp in replays:
            lo = int(rp.get("event_from") or 0)
            hi = int(rp.get("event_to") or 0)
            if lo <= event_no <= hi:
                replay_options.append({
                    "kind": "BODY_UPDATE_ASSIMILATION_REPLAY",
                    "replayRef": rp.get("replay_ref"),
                    "snapshotRef": rp.get("snapshot_ref"),
                    "label": rp.get("label"),
                    "eventFrom": lo,
                    "eventTo": hi,
                    "eventCount": rp.get("event_count"),
                    "mappedCount": rp.get("mapped_count"),
                    "createdAt": rp.get("created_at"),
                })

        version_ref = str(ev.get("version") or "")
        version = next((x for x in versions if str(x.get("version_ref") or "") == version_ref), None)
        branch_hits = [x for x in branches if version_ref and (str(x.get("base_version_ref") or "") == version_ref or str(x.get("head_version_ref") or "") == version_ref)]

        return {
            "ok": True,
            "state": "UNIVERSAL_EVENT_CARD_READY",
            "cardKind": "EVENT",
            "title": ev.get("summary") or ev.get("event_type") or f"Событие {event_no}",
            "ref": f"EVENT:{event_no}",
            "event": ev,
            "provenance": prov,
            "provenanceLinks": prov_links,
            "relatedObjects": candidates,
            "version": version,
            "branches": branch_hits,
            "before": [{
                "eventNo": x.get("event_no"), "occurredAt": x.get("occurred_at"),
                "eventKind": x.get("event_type"), "summary": x.get("summary")
            } for x in before],
            "after": [{
                "eventNo": x.get("event_no"), "occurredAt": x.get("occurred_at"),
                "eventKind": x.get("event_type"), "summary": x.get("summary")
            } for x in after],
            "visualizations": visualizations,
            "replays": replay_options,
            "truthBoundary": "Card is assembled from recorded transcript, provenance, version/branch registries, indexed refs and recorded visualization/replay packets. Missing causal edges are not invented.",
        }

    kind = str(kind or "").upper().strip()
    ref = str(ref or "").strip()
    if not ref:
        return {"ok": False, "state": "CARD_REF_REQUIRED"}

    obj = obj_map.get((kind, ref))
    if obj is None:
        matches = by_ref.get(ref, [])
        if len(matches) == 1:
            obj = matches[0]
            kind = str(obj.get("object_kind") or kind)
        elif len(matches) > 1:
            return {"ok": True, "state": "AMBIGUOUS_REF", "cardKind": "CHOICES", "choices": [_compact_object(x) for x in matches[:20]]}
        elif kind == "VERSION":
            v = next((x for x in versions if str(x.get("version_ref") or "") == ref), None)
            if v:
                viz = _visualizations_for_refs({ref, str(v.get("body_snapshot_ref") or "")}, 30)
                return {
                    "ok": True, "state": "UNIVERSAL_OBJECT_CARD_READY", "cardKind": "VERSION",
                    "title": v.get("version_label") or ref, "ref": ref, "record": v,
                    "visualizations": viz,
                    "relatedTranscript": [],
                    "truthBoundary": "Version card is backed by setka_version_nodes_v1."
                }
        return {"ok": False, "state": "CARD_OBJECT_NOT_FOUND", "kind": kind, "ref": ref}

    inspect = _inspect(kind, ref)
    related_transcript = []
    for ev in transcripts:
        direct = str(ev.get("entity_ref") or "") == ref
        detail_hit = _json_contains_exact(ev.get("details") or {}, ref, [180])
        if direct or detail_hit:
            related_transcript.append({
                "eventNo": ev.get("event_no"),
                "occurredAt": ev.get("occurred_at"),
                "eventKind": ev.get("event_type"),
                "summary": ev.get("summary"),
                "version": ev.get("version"),
            })
    related_transcript.sort(key=lambda x: int(x.get("eventNo") or 0), reverse=True)

    refs = {ref}
    if obj.get("parent_ref"):
        refs.add(str(obj.get("parent_ref")))
    if obj.get("scope_ref"):
        refs.add(str(obj.get("scope_ref")))
    visualizations = _visualizations_for_refs(refs, 30)

    return {
        "ok": True,
        "state": "UNIVERSAL_OBJECT_CARD_READY",
        "cardKind": kind,
        "title": obj.get("display_name_ru") or ref,
        "ref": ref,
        "record": obj,
        "outgoing": inspect.get("outgoing") or [],
        "incoming": inspect.get("incoming") or [],
        "outgoingCount": inspect.get("outgoingCount") or 0,
        "incomingCount": inspect.get("incomingCount") or 0,
        "metrics": inspect.get("metrics") or [],
        "relatedTranscript": related_transcript[:40],
        "visualizations": visualizations,
        "truthBoundary": "Object card is backed by the indexed backend record, indexed relations, matching recorded transcript events and recorded visualization packets.",
    }


def _visualization_packet(packet_ref):
    packet_ref = str(packet_ref or "").strip()
    packets = mirror.relation_rows("foundation", "system_visualization_packets_v1")
    p = next((x for x in packets if str(x.get("packet_ref") or "") == packet_ref), None)
    if not p:
        return {"ok": False, "state": "VISUALIZATION_PACKET_NOT_FOUND", "packetRef": packet_ref}

    snapshot_ref = str(p.get("snapshot_ref") or "").strip()
    cached_snapshot = None
    if snapshot_ref:
        rows = mirror.relation_rows("foundation", "front_visualization_snapshot_cache_v1")
        cached = next((x for x in rows if str(x.get("snapshot_ref") or "") == snapshot_ref), None)
        if cached:
            cached_snapshot = {
                "snapshotRef": cached.get("snapshot_ref"),
                "payload": cached.get("payload") or {},
                "payloadBytes": cached.get("payload_bytes"),
                "grownNodes": cached.get("grown_nodes"),
                "internalEdges": cached.get("internal_edges"),
                "lawStatus": cached.get("law_status"),
            }

    return {
        "ok": True,
        "state": "VISUALIZATION_PACKET_READY",
        "packetRef": p.get("packet_ref"),
        "sourceKind": p.get("source_kind"),
        "sourceRef": p.get("source_ref"),
        "sceneKind": p.get("scene_kind"),
        "snapshotRef": p.get("snapshot_ref"),
        "packetState": p.get("state"),
        "payloadBytes": p.get("payload_bytes"),
        "createdAt": p.get("created_at"),
        "payload": p.get("payload") or {},
        "cachedSnapshot": cached_snapshot,
        "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
        "truthBoundary": "Recorded visualization packet plus exact cached frozen body snapshot when the packet references one. Snapshot cache is selective front evidence, not the full experimental RAW family.",
    }


def _replay_packet(replay_ref):
    replay_ref = str(replay_ref or "").strip()
    rows = mirror.relation_rows("foundation", "body_update_assimilation_replays_v1")
    r = next((x for x in rows if str(x.get("replay_ref") or "") == replay_ref), None)
    if not r:
        return {"ok": False, "state": "REPLAY_NOT_FOUND", "replayRef": replay_ref}
    return {
        "ok": True,
        "state": "BODY_REPLAY_READY",
        "replayRef": r.get("replay_ref"),
        "snapshotRef": r.get("snapshot_ref"),
        "eventFrom": r.get("event_from"),
        "eventTo": r.get("event_to"),
        "label": r.get("label"),
        "eventCount": r.get("event_count"),
        "mappedCount": r.get("mapped_count"),
        "payload": r.get("payload") or {},
        "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
    }


def _body_snapshot(mode=None, version_ref=None, snapshot_ref=None):
    baselines = mirror.relation_rows("foundation", "setka_branch_baselines_v1")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    cache = mirror.relation_rows("foundation", "front_body_snapshot_cache_v1")
    cache_by_snapshot = {str(x.get("snapshot_ref")): x for x in cache}

    selected_version = None
    selected_mode = None
    target_snapshot = str(snapshot_ref or "").strip() or None

    if version_ref:
        selected_version = next((x for x in versions if str(x.get("version_ref")) == str(version_ref)), None)
        if selected_version:
            target_snapshot = str(selected_version.get("body_snapshot_ref") or "")
    elif mode:
        normalized = str(mode).replace("-", "_").upper()
        selected_mode = next((x for x in baselines if str(x.get("mode_ref")) == normalized), None)
        if selected_mode:
            target_snapshot = str(selected_mode.get("body_snapshot_ref") or "")
            vr = str(selected_mode.get("version_ref") or "")
            selected_version = next((x for x in versions if str(x.get("version_ref")) == vr), None)

    if not target_snapshot:
        return {"ok": False, "state": "BODY_SNAPSHOT_NOT_RESOLVED", "mode": mode, "versionRef": version_ref}

    cached = cache_by_snapshot.get(target_snapshot)
    if not cached:
        return {
            "ok": False,
            "state": "BODY_SNAPSHOT_NOT_CACHED_ON_MAC",
            "snapshotRef": target_snapshot,
            "mode": mode,
            "versionRef": (selected_version or {}).get("version_ref") or version_ref,
            "truthBoundary": "The requested snapshot exists in backend metadata but is not present in the local front-required snapshot cache."
        }

    payload = cached.get("payload") or {}
    if not isinstance(payload, dict):
        return {"ok": False, "state": "BODY_SNAPSHOT_CACHE_PAYLOAD_INVALID", "snapshotRef": target_snapshot}

    result = dict(payload)
    result["ok"] = True
    result["state"] = "SETKA_LOCAL_VERSION_BODY_SNAPSHOT_READY"
    result["snapshotRef"] = target_snapshot
    result["mode"] = str((selected_mode or {}).get("mode_ref") or mode or "").replace("_","-")
    result["versionRef"] = (selected_version or {}).get("version_ref") or cached.get("version_ref")
    result["versionLabel"] = (selected_version or {}).get("version_label") or cached.get("version_label")
    result["branchRef"] = (selected_mode or {}).get("branch_ref")
    result["dataSource"] = "MAC_VERIFIED_SQLITE_MIRROR::front_body_snapshot_cache_v1"
    result["payloadBytes"] = cached.get("payload_bytes")
    result["bodyNodes"] = cached.get("grown_nodes")
    result["bodyEdges"] = cached.get("internal_edges")
    result["bodyLawStatus"] = cached.get("law_status")
    result["truthBoundary"] = "Exact selected version body payload cached on Mac. The five B1 mode baselines currently resolve to the same B1 body snapshot; the front does not fabricate differences."
    return result


def _inspect(kind, ref):
    kind = str(kind or "").upper().strip()
    ref = str(ref or "").strip()
    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    relations = mirror.relation_rows("foundation", "setka_system_relation_index_v1")
    obj_map = _object_map(objects)
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    baselines = mirror.relation_rows("foundation", "setka_branch_baselines_v1")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")
    branch_events = mirror.relation_rows("foundation", "setka_branch_events_v1")

    if kind == "BRANCH":
        b = next((x for x in branches if str(x.get("branch_ref")) == ref), None)
        if not b:
            return {"ok": False, "state": "BRANCH_NOT_FOUND", "kind": kind, "ref": ref}
        events = [x for x in branch_events if str(x.get("branch_ref")) == ref]
        events.sort(key=lambda x: int(x.get("branch_event_no") or 0), reverse=True)
        base = next((x for x in baselines if str(x.get("branch_ref")) == ref), None)
        return {
            "ok":True,"state":"SETKA_LOCAL_BACKEND_INSPECT_READY","kind":"BRANCH","ref":ref,
            "record":b,"baseline":base,"latestEvents":events[:30],"eventCount":len(events),
            "dataSource":"MAC_VERIFIED_SQLITE_MIRROR"
        }

    if kind == "VERSION":
        v = next((x for x in versions if str(x.get("version_ref")) == ref), None)
        if not v:
            return {"ok": False, "state": "VERSION_NOT_FOUND", "kind": kind, "ref": ref}
        linked = [x for x in branches if str(x.get("base_version_ref")) == ref or str(x.get("head_version_ref")) == ref]
        return {
            "ok":True,"state":"SETKA_LOCAL_BACKEND_INSPECT_READY","kind":"VERSION","ref":ref,
            "record":v,"branches":linked,"dataSource":"MAC_VERIFIED_SQLITE_MIRROR"
        }

    o = obj_map.get((kind, ref))
    if o is None:
        same_ref = [x for (k,r),x in obj_map.items() if r == ref]
        if len(same_ref) == 1:
            o = same_ref[0]
            kind = str(o.get("object_kind"))
        elif same_ref:
            return {
                "ok":True,"state":"AMBIGUOUS_REF","kind":kind,"ref":ref,
                "choices":[_compact_object(x) for x in same_ref],
                "dataSource":"MAC_VERIFIED_SQLITE_MIRROR"
            }
        else:
            return {"ok": False, "state": "INDEX_OBJECT_NOT_FOUND", "kind": kind, "ref": ref}

    outgoing = [r for r in relations if str(r.get("source_kind")) == kind and str(r.get("source_ref")) == ref]
    incoming = [r for r in relations if str(r.get("target_kind")) == kind and str(r.get("target_ref")) == ref]
    outgoing.sort(key=lambda x:(str(x.get("relation_kind")),str(x.get("target_kind")),str(x.get("target_ref"))))
    incoming.sort(key=lambda x:(str(x.get("relation_kind")),str(x.get("source_kind")),str(x.get("source_ref"))))

    def relation_item(r, direction):
        other_kind = str(r.get("target_kind") if direction=="OUT" else r.get("source_kind"))
        other_ref = str(r.get("target_ref") if direction=="OUT" else r.get("source_ref"))
        other = obj_map.get((other_kind,other_ref))
        return {
            "direction": direction,
            "relationKind": r.get("relation_kind"),
            "relationState": r.get("relation_state"),
            "historicalOnly": bool(r.get("historical_only")),
            "evidenceRef": r.get("evidence_ref"),
            "sourceRelation": r.get("source_relation"),
            "otherKind": other_kind,
            "otherRef": other_ref,
            "otherLabel": (other or {}).get("display_name_ru") or other_ref,
            "indexedEndpoint": other is not None,
            "evidence": r.get("evidence") or {},
        }

    query_tokens = [t for t in _norm(" ".join([ref,str(o.get("display_name_ru") or "")])).split() if len(t)>=3]
    context = []
    for x in objects:
        if x is o: continue
        hay = _norm(str(x.get("search_text") or ""))
        if query_tokens and all(t in hay for t in query_tokens[:2]):
            context.append(_compact_object(x))
        if len(context)>=40: break

    metrics = [
        _compact_object(x) | {"payload": x.get("payload") or {}}
        for x in objects
        if x.get("object_kind")=="METRIC" and (
            str(x.get("scope_ref") or "")==ref or ref in str(x.get("search_text") or "")
        )
    ][:30]

    return {
        "ok":True,
        "state":"SETKA_LOCAL_BACKEND_INSPECT_READY",
        "kind":kind,
        "ref":ref,
        "record":o,
        "outgoing":[relation_item(r,"OUT") for r in outgoing[:150]],
        "incoming":[relation_item(r,"IN") for r in incoming[:150]],
        "outgoingCount":len(outgoing),
        "incomingCount":len(incoming),
        "metrics":metrics,
        "contextMatches":context,
        "dataSource":"MAC_VERIFIED_SQLITE_MIRROR",
        "truthBoundary":"Relations are emitted from the mirrored backend index. Missing indexed endpoints remain explicit references and are not invented by the front."
    }


def _graph(include_events=False):
    objects = mirror.relation_rows("foundation", "setka_system_object_index_v1")
    relations = mirror.relation_rows("foundation", "setka_system_relation_index_v1")
    branches = mirror.relation_rows("foundation", "setka_branches_v1")
    baselines = mirror.relation_rows("foundation", "setka_branch_baselines_v1")
    versions = mirror.relation_rows("foundation", "setka_version_nodes_v1")

    graph_objects = [o for o in objects if include_events or str(o.get("object_kind")) != "EVENT"]
    node_keys = {(str(o.get("object_kind")),str(o.get("object_ref"))) for o in graph_objects}
    nodes = [[
        str(o.get("object_kind") or "OBJECT"),
        str(o.get("object_ref") or ""),
        str(o.get("display_name_ru") or o.get("object_ref") or ""),
        str(o.get("subtype") or ""),
        str(o.get("state") or ""),
        str(o.get("parent_ref") or ""),
        str(o.get("scope_ref") or ""),
        str(o.get("source_relation") or ""),
    ] for o in graph_objects]

    for v in versions:
        nodes.append(["VERSION",str(v.get("version_ref") or ""),str(v.get("version_label") or v.get("version_ref") or ""),"SYSTEM_VERSION",str(v.get("version_state") or ""),str(v.get("parent_version_ref") or ""),str(v.get("lineage_ref") or ""),"setka_version_nodes_v1"])
        node_keys.add(("VERSION",str(v.get("version_ref") or "")))
    for b in branches:
        nodes.append(["BRANCH",str(b.get("branch_ref") or ""),str(b.get("display_name_ru") or b.get("branch_ref") or ""),str(b.get("branch_kind") or ""),str(b.get("runtime_state") or ""),"",str(b.get("lineage_ref") or ""),"setka_branches_v1"])
        node_keys.add(("BRANCH",str(b.get("branch_ref") or "")))
    for b in baselines:
        mode = str(b.get("mode_ref") or "")
        ref = f"MODE:{mode}"
        nodes.append(["MODE",ref,mode.replace("_","-"),"OBSERVATION_MODE",str(b.get("baseline_state") or ""),"",str(b.get("branch_ref") or ""),"setka_branch_baselines_v1"])
        node_keys.add(("MODE",ref))

    edges = []
    unresolved = 0
    historical = 0
    for r in relations:
        if r.get("historical_only"):
            historical += 1
            continue
        sk,sr = str(r.get("source_kind") or ""),str(r.get("source_ref") or "")
        tk,tr = str(r.get("target_kind") or ""),str(r.get("target_ref") or "")
        if (sk,sr) in node_keys and (tk,tr) in node_keys:
            edges.append([sk,sr,tk,tr,str(r.get("relation_kind") or "RELATION"),str(r.get("relation_state") or "")])
        else:
            unresolved += 1

    version_refs={str(v.get("version_ref")) for v in versions}
    branch_refs={str(b.get("branch_ref")) for b in branches}
    for b in branches:
        br=str(b.get("branch_ref") or "")
        for relation,vr in [("BASE_VERSION",str(b.get("base_version_ref") or "")),("HEAD_VERSION",str(b.get("head_version_ref") or ""))]:
            if br in branch_refs and vr in version_refs:
                edges.append(["BRANCH",br,"VERSION",vr,relation,str(b.get("runtime_state") or "")])
    for v in versions:
        child=str(v.get("version_ref") or ""); parent=str(v.get("parent_version_ref") or "")
        if parent and parent in version_refs:
            edges.append(["VERSION",child,"VERSION",parent,"PARENT_VERSION",str(v.get("version_state") or "")])
    for b in baselines:
        mode=str(b.get("mode_ref") or ""); br=str(b.get("branch_ref") or "")
        if br in branch_refs:
            edges.append(["MODE",f"MODE:{mode}","BRANCH",br,"OBSERVES_BRANCH",str(b.get("baseline_state") or "")])

    receipt = mirror.receipt()
    return {
        "ok":True,
        "state":"SETKA_LOCAL_BACKEND_GRAPH_READY",
        "frontVersion":"B2.8",
        "snapshotRef":f"LOCAL-MAC-BACKEND::{receipt.get('serverReceiptRef') or receipt.get('completedAt') or 'CURRENT'}",
        "nodes":nodes,
        "edges":edges,
        "indexedObjectCount":len(graph_objects),
        "edgeCount":len(edges),
        "unresolvedExternalRelationCount":unresolved,
        "historicalRelationCount":historical,
        "includeEvents":bool(include_events),
        "dataSource":"MAC_VERIFIED_SQLITE_MIRROR",
        "geometryTruth":"DETERMINISTIC_PRESENTATION_LAYOUT_ONLY",
        "topologyTruth":"NODES_AND_EDGES_DERIVE_FROM_MIRRORED_BACKEND_REGISTRIES_AND_INDEXES",
    }


class Handler(b25.Handler):
    server_version = "SETKAFrontB2.9/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            overlay_ok = False
            legacy_writer_present = False
            mirror_ok = False
            mirror_state = None
            try:
                raw = OVERLAY_PATH.read_bytes() if OVERLAY_PATH.exists() else b""
                overlay_ok = b"B2.8-BACKEND-TRUTH" in raw and b"B2.7.4-SINGLE-WRITER-LAYOUT" in raw and b"B2.9-SIMPLE-FRONT" in raw
                legacy_writer_present = b"setka.front.b26.workspace.v1" in raw
                receipt = mirror.receipt()
                mirror_state = receipt.get("state")
                mirror_ok = mirror_state in ("PASS_FULL_SETKA_MIRROR","PASS_DELTA_SETKA_MIRROR") and MIRROR_DB.exists()
            except Exception:
                overlay_ok = False
            ok = overlay_ok and not legacy_writer_present and mirror_ok
            return self._json(200 if ok else 503, {
                "ok": ok,
                "state": "SETKA_LOCAL_FRONT_B29_READY" if ok else "B29_SIMPLE_FRONT_NOT_READY",
                "frontVersion": "B2.9",
                "dataSource": "MAC_VERIFIED_SQLITE_MIRROR",
                "mirrorState": mirror_state,
                "workspace": "B2.7.4",
                "positionAuthority": "B2.7.4_ONLY",
                "legacyLayoutWriterPresent": legacy_writer_present,
                "simpleSurface": ["GRAPH","ONBOARD","TRANSCRIPT","BRANCHES"],
                "backendTruthExplorer": True,
                "systemIndexGraph": True,
                "versionBodyGraph": True,
                "versionBodySource": "front_body_snapshot_cache_v1",
                "versionBranchMatrix": True,
                "deepLocalSearch": True,
                "contextGraph": True,
                "universalCards": True,
                "recordedVisualizationPackets": True,
                "recordedProcessReplay": True,
                "localTranscriptDetails": True,
                "commandExecution": False,
                "commandTokenExposed": False,
                "canonMutation": False,
            })

        if path == "/setka-b2.js":
            if not OVERLAY_PATH.exists():
                self.send_error(404)
                return
            data = OVERLAY_PATH.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-SETKA-FRONT", "B2.9")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if path.startswith("/api/b28/") or path.startswith("/api/b29/") or path.startswith("/api/b210/"):
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                if path == "/api/b28/overview":
                    return self._json(200, _overview())
                if path == "/api/b28/search":
                    query = q.get("q", [""])[0]
                    try: limit = int(q.get("limit", ["40"])[0])
                    except Exception: limit = 40
                    return self._json(200, _search(query, limit))
                if path == "/api/b28/inspect":
                    kind = q.get("kind", [""])[0]
                    ref = q.get("ref", [""])[0]
                    result = _inspect(kind, ref)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b28/graph":
                    include_events = q.get("events", ["0"])[0] in ("1","true","yes")
                    return self._json(200, _graph(include_events))
                if path == "/api/b28/body":
                    mode = q.get("mode", [None])[0]
                    version_ref = q.get("version", [None])[0]
                    snapshot_ref = q.get("snapshot", [None])[0]
                    result = _body_snapshot(mode=mode, version_ref=version_ref, snapshot_ref=snapshot_ref)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b28/inventory":
                    return self._json(200, {"ok":True,"state":"LOCAL_MIRROR_INVENTORY_READY","relations":mirror.relation_inventory()})
                if path == "/api/b29/context":
                    kind = q.get("kind", [""])[0]
                    ref = q.get("ref", [""])[0]
                    try: max_depth = max(1, min(int(q.get("depth", ["3"])[0]), 4))
                    except Exception: max_depth = 3
                    try: max_nodes = max(10, min(int(q.get("max", ["90"])[0]), 140))
                    except Exception: max_nodes = 90
                    result = _context_graph(kind, ref, max_depth=max_depth, max_nodes=max_nodes)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b29/transcript":
                    stream = q.get("stream", ["SYSTEM"])[0]
                    mode = q.get("mode", ["INTEGRATION"])[0]
                    try: limit = int(q.get("limit", ["60"])[0])
                    except Exception: limit = 60
                    result = _local_transcript(stream=stream, mode=mode, limit=limit)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b210/card":
                    event_no = q.get("event", [None])[0]
                    kind = q.get("kind", [None])[0]
                    ref = q.get("ref", [None])[0]
                    result = _universal_card(kind=kind, ref=ref, event_no=event_no)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b210/visualization":
                    packet_ref = q.get("packet", [""])[0]
                    result = _visualization_packet(packet_ref)
                    return self._json(200 if result.get("ok") else 404, result)
                if path == "/api/b210/replay":
                    replay_ref = q.get("replay", [""])[0]
                    result = _replay_packet(replay_ref)
                    return self._json(200 if result.get("ok") else 404, result)
                return self._json(404, {"ok":False,"state":"B28_ENDPOINT_NOT_FOUND"})
            except Exception as e:
                return self._json(500, {"ok":False,"state":"B28_LOCAL_BACKEND_ERROR","message":str(e),"frontVersion":"B2.8"})

        if path == "/api/b27/project":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                intent = q.get("intent", [""])[0]
                mode = q.get("mode", ["INTEGRATION"])[0]
                entity_type = q.get("entity_type", [None])[0]
                entity_ref = q.get("entity_ref", [None])[0]
                try:
                    limit = max(1, min(int(q.get("limit", ["8"])[0]), 12))
                except Exception:
                    limit = 8
                local_specs = _local_projection_specs(intent or entity_ref or "", limit)
                remote_specs = []
                remote_state = None
                try:
                    device_ref, token = b25.b24.base.load_device()
                    remote = b25.b24.base.rpc("setka_minimal_front_b27_projection_context_v1", {
                        "p_device_ref": device_ref,
                        "p_token": token,
                        "p_intent": intent,
                        "p_entity_type": entity_type,
                        "p_entity_ref": entity_ref,
                        "p_mode": mode,
                        "p_limit": limit,
                    })
                    remote_state = remote.get("state")
                    if remote.get("ok") is not False:
                        remote_specs = list(remote.get("projections") or [])
                except Exception:
                    remote_state = "REMOTE_RUNTIME_PROJECTION_UNAVAILABLE"
                seen = set()
                merged = []
                for spec in local_specs + remote_specs:
                    ref = str(spec.get("projectionRef") or "")
                    if not ref or ref in seen:
                        continue
                    seen.add(ref)
                    merged.append(spec)
                    if len(merged) >= limit:
                        break
                return self._json(200, {
                    "ok": True,
                    "state": "B28_LOCAL_AND_RUNTIME_PROJECTIONS_READY" if merged else "NO_PROVEN_PROJECTION_FOR_CONTEXT",
                    "frontVersion": "B2.8",
                    "mode": mode,
                    "intent": intent,
                    "projections": merged,
                    "counts": {
                        "localBackend": len(local_specs),
                        "runtimeLegacy": len(remote_specs),
                        "total": len(merged),
                    },
                    "remoteState": remote_state,
                    "truthBoundary": "LOCAL BACKEND RESULTS COME FROM THE VERIFIED MAC MIRROR; REMOTE COMMAND/RECIPE RESULTS RETAIN THEIR EXISTING PROVENANCE.",
                    "canonMutation": False,
                    "runtimeMutation": False,
                })
            except Exception as e:
                return self._json(500, {"ok": False, "state": "B28_RUNTIME_PROJECTION_BRIDGE_ERROR", "message": str(e), "frontVersion": "B2.8"})

        if path == "/api/b27/binding":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                binding_kind = q.get("kind", [""])[0]
                binding_ref = q.get("ref", [""])[0]
                entity_type = q.get("entity_type", [None])[0]
                entity_ref = q.get("entity_ref", [None])[0]
                if binding_kind.upper() == "SYSTEM_INDEX_OBJECT":
                    result = _inspect_projection(entity_type or "", entity_ref or binding_ref)
                    return self._json(200 if result.get("ok") else 404, result)
                device_ref, token = b25.b24.base.load_device()
                result = b25.b24.base.rpc("setka_minimal_front_b27_projection_binding_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_binding_kind": binding_kind,
                    "p_binding_ref": binding_ref,
                    "p_entity_type": entity_type,
                    "p_entity_ref": entity_ref,
                })
                if result.get("ok") is False:
                    return self._json(422, result)
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {"ok": False, "state": "B28_BINDING_BRIDGE_ERROR", "message": str(e), "frontVersion": "B2.8"})

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.9 · http://127.0.0.1:{args.port}/")
    print("SETKA B2.9 · simple surface over verified local Mac SQLite mirror")
    print("SETKA B2.9 · visible surface: graph + onboard + transcript + branches")
    print("SETKA B2.9 · BODY is default; object context shows only real nearby relations")
    print("SETKA B2.7.4 · layout authority remains single-writer")
    print("SETKA B2.9 · CANON/runtime mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
