#!/usr/bin/env python3
import hashlib, json, os, sys
from pathlib import Path

VERSION = "SETKA-SYS-20260910-B1"
HERE = Path(__file__).resolve().parent
INDEX_PATH = HERE / "SETKA-SYS-20260910-B1__MAC_TRANSFER_INDEX_V2.json"
TRANSFER_DIR = Path.home() / ".setka" / "transfers" / VERSION
RUNTIME_DIR = Path.home() / ".setka" / "runtime" / VERSION
RECEIPT_PATH = TRANSFER_DIR / "receipt.json"


def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def write_json(path: Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True))
    os.chmod(path, 0o600)

index = json.loads(INDEX_PATH.read_text())
receipt = json.loads(RECEIPT_PATH.read_text())
package_path = TRANSFER_DIR / index["portableFilename"]
package_text = package_path.read_text()
package = json.loads(package_text)

checks = {}
checks["receipt_package_verified"] = receipt.get("freshMachinePackageVerified") is True
checks["receipt_state"] = receipt.get("state") == "PACKAGE_FETCH_AND_MANIFEST_REHYDRATION_PASS"
checks["version_ref"] = receipt.get("versionRef") == VERSION == index.get("versionRef") == package.get("version",{}).get("versionRef")
checks["package_sha256"] = sha256_text(package_text) == receipt.get("packageSha256") == index.get("privatePackageSha256")
checks["version_integrity_hash"] = package.get("version",{}).get("integrityHash") == index.get("versionIntegrityHash")
checks["parent_version"] = package.get("version",{}).get("parentVersionRef") == index.get("parentVersionRef")
checks["branch_head"] = package.get("branch",{}).get("headVersionRef") == VERSION
checks["canon_version"] = package.get("canon",{}).get("canonVersion") == index.get("canon",{}).get("version")

pocket_wrapper = package.get("pocketCore",{})
pocket = pocket_wrapper.get("manifest",{})
checks["pocket_ref"] = pocket_wrapper.get("pocketCoreRef") == index.get("pocketCore",{}).get("ref")
checks["identity"] = bool(pocket.get("identity",{}).get("setkaId"))
checks["mission"] = bool(pocket.get("mission",{}).get("missionCode"))
checks["capabilities"] = isinstance(pocket.get("capabilities"), list) and len(pocket["capabilities"]) == 69
checks["duties"] = isinstance(pocket.get("duties"), list) and len(pocket["duties"]) == 96
checks["memory_layers"] = isinstance(pocket.get("memoryLayers"), list) and len(pocket["memoryLayers"]) == 47
checks["experimental_protocol"] = bool(pocket.get("experimentalProtocol",{}).get("protocolCode"))

failed = [name for name, ok in checks.items() if not ok]
if failed:
    print(json.dumps({"ok": False, "state": "LOCAL_COLD_BOOT_PRECHECK_FAIL", "failed": failed}, ensure_ascii=False, indent=2))
    sys.exit(2)

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
os.chmod(RUNTIME_DIR, 0o700)

write_json(RUNTIME_DIR / "pocket-core.json", pocket)
write_json(RUNTIME_DIR / "identity.json", pocket.get("identity",{}))
write_json(RUNTIME_DIR / "mission.json", pocket.get("mission",{}))
write_json(RUNTIME_DIR / "capabilities.json", pocket.get("capabilities",[]))
write_json(RUNTIME_DIR / "duties.json", pocket.get("duties",[]))
write_json(RUNTIME_DIR / "memory-layers.json", pocket.get("memoryLayers",[]))
write_json(RUNTIME_DIR / "experimental-protocol.json", pocket.get("experimentalProtocol",{}))
write_json(RUNTIME_DIR / "version-lineage.json", package.get("version",{}))
write_json(RUNTIME_DIR / "canon-baseline.json", package.get("canon",{}))
write_json(RUNTIME_DIR / "system-state-reference.json", package.get("systemState",{}))
write_json(RUNTIME_DIR / "experiment-archive-reference.json", package.get("experiments",{}))
write_json(RUNTIME_DIR / "body-reference.json", package.get("body",{}))

branch_topology = {
    "format": "SETKA_MAC_BRANCH_TOPOLOGY_V1",
    "versionRef": VERSION,
    "canon": {"role": "FROZEN_BASELINE", "canonVersion": package.get("canon",{}).get("canonVersion"), "autoPromotion": False},
    "linear": {"gitBranch": "setka/linear", "role": "SEQUENTIAL_DEVELOPMENT", "promotionToCanon": "PRESIDENT_DECISION_REQUIRED"},
    "selfOrganized": {"gitBranch": "setka/self-organized", "role": "SELF_ORGANIZED_BODY_UNFOLD", "autoPromotion": False},
    "motorwayLab": {"gitBranch": "setka/motorway-lab", "role": "LOCAL_OPTIMIZATION_AND_MOTORWAY_A_B", "autoCrystallization": False},
    "integration": {"gitBranch": "setka/integration", "role": "VALIDATED_RESULT_ASSEMBLY_BEFORE_CANON"}
}
write_json(RUNTIME_DIR / "branch-topology.json", branch_topology)

boot_receipt = {
    "format": "SETKA_MAC_LOCAL_BOOT_RECEIPT_V1",
    "versionRef": VERSION,
    "sourcePackage": str(package_path),
    "sourcePackageSha256": sha256_text(package_text),
    "checks": checks,
    "stages": {
        "stage1_verify_transfer_hash": "PASS",
        "stage2_rehydrate_pocket_core_without_source_tables": "PASS",
        "stage3_verify_identity_mission_capabilities_duties_memory_protocol": "PASS",
        "stage4_verify_branch_lineage_and_baseline_hashes": "PASS",
        "stage5_verify_transcript_and_state_continuation": "PENDING",
        "stage6_declare_fresh_machine_cold_boot": "PENDING"
    },
    "runtimeState": "LOCAL_CORE_REHYDRATED_TRANSCRIPT_CONTINUATION_PENDING",
    "fullBranchRuntimeRestored": False,
    "freshMachineColdBootPass": False,
    "canonAutoMutated": False,
    "motorwayAutoCrystallized": False
}
write_json(RUNTIME_DIR / "boot-receipt.json", boot_receipt)

staged_pointer = Path.home()/".setka"/"STAGED_VERSION"
staged_pointer.write_text(VERSION + "\n")
os.chmod(staged_pointer, 0o600)

print(json.dumps({
    "ok": True,
    "state": boot_receipt["runtimeState"],
    "versionRef": VERSION,
    "runtimeDir": str(RUNTIME_DIR),
    "stage1": "PASS",
    "stage2": "PASS",
    "stage3": "PASS",
    "stage4": "PASS",
    "stage5": "PENDING",
    "stage6": "PENDING",
    "capabilityCount": len(pocket.get("capabilities",[])),
    "dutyCount": len(pocket.get("duties",[])),
    "memoryLayerCount": len(pocket.get("memoryLayers",[])),
    "next": "VERIFY_TRANSCRIPT_AND_STATE_CONTINUATION"
}, ensure_ascii=False, indent=2))
