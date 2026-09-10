#!/usr/bin/env python3
import json, os, sys
from pathlib import Path

VERSION = "SETKA-SYS-20260910-B1"
HERE = Path(__file__).resolve().parent
ANCHOR_PATH = HERE / "SETKA-SYS-20260910-B1__CONTINUATION_ANCHOR_V1.json"
TRANSFER_DIR = Path.home() / ".setka" / "transfers" / VERSION
RUNTIME_DIR = Path.home() / ".setka" / "runtime" / VERSION
PACKAGE_PATH = TRANSFER_DIR / "SETKA-SYS-20260910-B1__MAC_TRANSFER_V2.json"
BOOT_RECEIPT_PATH = RUNTIME_DIR / "boot-receipt.json"

EXPECTED_DIGEST_HASH = "36d075832ae12af225a8b05f3ef5201e022f174bcf721fb3b2e111c22ecb6945"
EXPECTED_STATE_REF = "STATE-20260910-125428.947"
EXPECTED_DIGEST_REF = "DIGEST-20260910-125441.908"
EXPECTED_FORK_EVENT = 6766


def load(path):
    return json.loads(path.read_text())


def write(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True))
    os.chmod(path, 0o600)

required = [ANCHOR_PATH, PACKAGE_PATH, BOOT_RECEIPT_PATH]
missing = [str(p) for p in required if not p.exists()]
if missing:
    print(json.dumps({"ok": False, "state": "CONTINUATION_INPUT_MISSING", "missing": missing}, ensure_ascii=False, indent=2))
    sys.exit(2)

anchor = load(ANCHOR_PATH)
package = load(PACKAGE_PATH)
boot = load(BOOT_RECEIPT_PATH)

checks = {}
checks["version"] = anchor.get("versionRef") == VERSION == package.get("version", {}).get("versionRef") == boot.get("versionRef")
checks["prior_stages"] = all(boot.get("stages", {}).get(k) == "PASS" for k in [
    "stage1_verify_transfer_hash",
    "stage2_rehydrate_pocket_core_without_source_tables",
    "stage3_verify_identity_mission_capabilities_duties_memory_protocol",
    "stage4_verify_branch_lineage_and_baseline_hashes",
])
checks["state_ref"] = anchor.get("state", {}).get("snapshotRef") == EXPECTED_STATE_REF == package.get("systemState", {}).get("stateSnapshotRef")
checks["digest_ref"] = anchor.get("digest", {}).get("digestRef") == EXPECTED_DIGEST_REF == package.get("systemState", {}).get("digestRef")
checks["digest_hash"] = anchor.get("digest", {}).get("digestHash") == EXPECTED_DIGEST_HASH == package.get("systemState", {}).get("digestHash")
checks["fork_event"] = anchor.get("forkEventNo") == EXPECTED_FORK_EVENT == package.get("version", {}).get("forkEventNo")
checks["state_event"] = anchor.get("state", {}).get("sourceEventNo") == 6764
checks["digest_event"] = anchor.get("digest", {}).get("sourceEventNo") == EXPECTED_FORK_EVENT
checks["transcript_tip"] = anchor.get("digest", {}).get("transcriptTip") == EXPECTED_FORK_EVENT - 1

events = anchor.get("transcriptTail", [])
nums = [e.get("eventNo") for e in events]
checks["tail_contiguous"] = nums == list(range(6761, 6767))
by_no = {e.get("eventNo"): e for e in events}
checks["snapshot_event_matches"] = (
    by_no.get(6764, {}).get("eventType") == "system_state_snapshot_captured"
    and by_no.get(6764, {}).get("entityRef") == EXPECTED_STATE_REF
)
checks["digest_event_matches"] = (
    by_no.get(6766, {}).get("eventType") == "system_state_digest_captured"
    and by_no.get(6766, {}).get("entityRef") == EXPECTED_DIGEST_REF
)
checks["scope_bounded"] = anchor.get("truth", {}).get("scope") == "PORTABLE_CORE_PLUS_CHECKPOINT_CONTINUATION"
checks["no_full_dump_claim"] = anchor.get("truth", {}).get("fullDatabaseDumpIncluded") is False
checks["no_body_payload_claim"] = anchor.get("truth", {}).get("bodyPayloadIncluded") is False

failed = [k for k, v in checks.items() if not v]
if failed:
    print(json.dumps({"ok": False, "state": "TRANSCRIPT_STATE_CONTINUATION_FAIL", "failed": failed}, ensure_ascii=False, indent=2))
    sys.exit(3)

write(RUNTIME_DIR / "system-state-anchor.json", anchor["state"])
write(RUNTIME_DIR / "system-digest-anchor.json", anchor["digest"])
write(RUNTIME_DIR / "transcript-tail.json", events)

boot.setdefault("stages", {})["stage5_verify_transcript_and_state_continuation"] = "PASS"
boot["stages"]["stage6_declare_fresh_machine_cold_boot"] = "PASS_BOUNDED_PORTABLE_CORE_CONTINUATION"
boot["runtimeState"] = "FRESH_MACHINE_COLD_BOOT_PASS_PORTABLE_CORE_CONTINUATION"
boot["freshMachineColdBootPass"] = True
boot["freshMachineColdBootScope"] = "PORTABLE_CORE_PLUS_CHECKPOINT_CONTINUATION"
boot["fullBranchRuntimeRestored"] = False
boot["bodyPayloadRestored"] = False
boot["fullHistoricalTranscriptRestored"] = False
boot["continuationAnchorVerified"] = True
boot["checks"].update({f"continuation_{k}": v for k, v in checks.items()})
write(BOOT_RECEIPT_PATH, boot)

(Path.home()/".setka"/"CURRENT_CORE_VERSION").write_text(VERSION + "\n")
os.chmod(Path.home()/".setka"/"CURRENT_CORE_VERSION", 0o600)

print(json.dumps({
    "ok": True,
    "state": boot["runtimeState"],
    "versionRef": VERSION,
    "stage5": "PASS",
    "stage6": "PASS_BOUNDED_PORTABLE_CORE_CONTINUATION",
    "continuationTail": f"{nums[0]}..{nums[-1]}",
    "stateSnapshotRef": EXPECTED_STATE_REF,
    "digestRef": EXPECTED_DIGEST_REF,
    "digestHash": EXPECTED_DIGEST_HASH,
    "fullBranchRuntimeRestored": False,
    "bodyPayloadRestored": False,
    "fullHistoricalTranscriptRestored": False,
    "next": "CREATE_PERSISTENT_SETKA_UPDATE_AND_BRANCH_BASELINES"
}, ensure_ascii=False, indent=2))
