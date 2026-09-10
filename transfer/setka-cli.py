#!/usr/bin/env python3
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://gfchgaphzhxufwdhrcis.supabase.co/functions/v1/setka-mac-transfer-v1"
KEYCHAIN_SERVICE = "SETKA_MAC_DEVICE_TOKEN"
ROOT = Path.home() / ".setka"
DEVICE_FILE = ROOT / "device.json"
CURRENT_FILE = ROOT / "CURRENT_CORE_VERSION"


def jdump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True)


def sha256_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def atomic_write(path, text, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text)
    os.chmod(tmp, mode)
    os.replace(tmp, path)
    os.chmod(path, mode)


def fail(state, message=None, details=None, code=2):
    out = {"ok": False, "state": state}
    if message:
        out["message"] = message
    if details:
        out["details"] = details
    print(jdump(out))
    raise SystemExit(code)


def load_device():
    if not DEVICE_FILE.exists():
        fail("MAC_DEVICE_NOT_PAIRED", "Missing ~/.setka/device.json")
    try:
        device = json.loads(DEVICE_FILE.read_text())
    except Exception as exc:
        fail("MAC_DEVICE_FILE_INVALID", str(exc))
    ref = str(device.get("deviceRef", "")).strip()
    if not ref.startswith("MAC-"):
        fail("MAC_DEVICE_REF_INVALID")
    return device


def keychain_token():
    user = os.environ.get("USER", "")
    try:
        token = subprocess.check_output(
            ["security", "find-generic-password", "-a", user, "-s", KEYCHAIN_SERVICE, "-w"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        token = ""
    if len(token) < 32:
        fail("MAC_DEVICE_TOKEN_MISSING", "Scoped SETKA Mac token was not found in macOS Keychain")
    return token


def fetch_active(device_ref, token):
    body = json.dumps({"action": "read_active", "deviceRef": device_ref}).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(text)
        except Exception:
            payload = {"httpStatus": exc.code, "body": text[:500]}
        fail("MAC_UPDATE_GATEWAY_REJECTED", details=payload, code=3)
    except Exception as exc:
        fail("MAC_UPDATE_NETWORK_ERROR", str(exc), code=3)


def verify_payload(payload, device):
    if payload.get("ok") is not True:
        fail(str(payload.get("state") or "MAC_UPDATE_PAYLOAD_REJECTED"), details=payload, code=4)

    manifest_text = payload.get("canonicalManifestText")
    pocket_text = payload.get("canonicalPocketManifestText")
    state_material = payload.get("canonicalPocketStateMaterialText")
    anchor = payload.get("continuationAnchor")
    if not all(isinstance(x, str) and x for x in [manifest_text, pocket_text, state_material]):
        fail("MAC_UPDATE_CANONICAL_MATERIAL_MISSING", code=4)
    if not isinstance(anchor, dict):
        fail("MAC_UPDATE_DYNAMIC_CONTINUATION_ANCHOR_MISSING", code=4)

    manifest = json.loads(manifest_text)
    version_ref = manifest.get("version", {}).get("versionRef") or payload.get("versionRef")
    package_ref = payload.get("packageRef")
    package_sha = payload.get("packageSha256")
    pocket = manifest.get("pocketCore", {})

    checks = {
        "deviceRef": payload.get("deviceRef") == device.get("deviceRef"),
        "scope": payload.get("scope") == "READ_ACTIVE_MAC_TRANSFER",
        "credentialKind": payload.get("credentialKind") == "SCOPED_DEVICE_TOKEN",
        "branchRef": payload.get("branchRef") == device.get("branchRef"),
        "packageSha256": sha256_text(manifest_text) == package_sha,
        "pocketManifestSha256": sha256_text(pocket_text) == payload.get("pocketManifestSha256"),
        "pocketStateHash": sha256_text(state_material) == payload.get("pocketStateHash"),
        "pocketCoreRef": payload.get("pocketCoreRef") == pocket.get("pocketCoreRef"),
        "versionRef": payload.get("versionRef") == version_ref,
        "anchorVersion": anchor.get("versionRef") == version_ref,
        "anchorStateRef": anchor.get("state", {}).get("snapshotRef") == manifest.get("systemState", {}).get("stateSnapshotRef"),
        "anchorDigestRef": anchor.get("digest", {}).get("digestRef") == manifest.get("systemState", {}).get("digestRef"),
        "anchorDigestHash": anchor.get("digest", {}).get("digestHash") == manifest.get("systemState", {}).get("digestHash"),
        "anchorForkEvent": str(anchor.get("forkEventNo")) == str(manifest.get("version", {}).get("forkEventNo")),
        "anchorScopeBounded": anchor.get("truth", {}).get("scope") == "PORTABLE_CORE_PLUS_DYNAMIC_CHECKPOINT_CONTINUATION",
        "noFullDbClaim": anchor.get("truth", {}).get("fullDatabaseDumpIncluded") is False,
        "noFullHistoryClaim": anchor.get("truth", {}).get("fullHistoricalTranscriptIncluded") is False,
        "noBodyPayloadClaim": anchor.get("truth", {}).get("bodyPayloadIncluded") is False,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        fail("MAC_UPDATE_INTEGRITY_FAIL", details={"failed": failed}, code=5)

    return manifest, anchor, checks, version_ref, package_ref, package_sha


def install_verified(payload, manifest, anchor, checks, version_ref, package_ref, package_sha):
    portable_filename = payload.get("portableFilename") or f"{version_ref}__MAC_TRANSFER.json"
    transfer_dir = ROOT / "transfers" / version_ref
    runtime_dir = ROOT / "runtime" / version_ref
    transfer_dir.mkdir(parents=True, exist_ok=True)
    runtime_dir.mkdir(parents=True, exist_ok=True)

    package_path = transfer_dir / portable_filename
    anchor_path = runtime_dir / "continuation-anchor.json"
    pocket_path = runtime_dir / "pocket-core.json"
    receipt_path = runtime_dir / "update-receipt.json"

    atomic_write(package_path, payload["canonicalManifestText"])
    atomic_write(anchor_path, jdump(anchor))
    atomic_write(pocket_path, jdump(manifest.get("pocketCore", {}).get("manifest", {})))

    tail = anchor.get("transcriptTail", [])
    tail_events = [e.get("eventNo") for e in tail if isinstance(e, dict) and e.get("eventNo") is not None]
    receipt = {
        "format": "SETKA_MAC_PERSISTENT_UPDATE_RECEIPT_V1",
        "ok": True,
        "state": "PERSISTENT_SCOPED_UPDATE_PASS",
        "versionRef": version_ref,
        "branchRef": payload.get("branchRef"),
        "packageRef": package_ref,
        "packageSha256": package_sha,
        "pocketCoreRef": payload.get("pocketCoreRef"),
        "stateSnapshotRef": anchor.get("state", {}).get("snapshotRef"),
        "digestRef": anchor.get("digest", {}).get("digestRef"),
        "digestHash": anchor.get("digest", {}).get("digestHash"),
        "forkEventNo": anchor.get("forkEventNo"),
        "transcriptTail": tail_events,
        "checks": checks,
        "credentialScope": "READ_ACTIVE_MAC_TRANSFER",
        "serviceRoleRequiredOnMac": False,
        "fullBranchRuntimeRestored": False,
        "bodyPayloadRestored": False,
        "fullHistoricalTranscriptRestored": False,
        "truthBoundary": "PORTABLE_CORE_PLUS_DYNAMIC_CHECKPOINT_CONTINUATION",
    }
    atomic_write(receipt_path, jdump(receipt))
    atomic_write(CURRENT_FILE, version_ref + "\n")
    return receipt, package_path, receipt_path


def cmd_update():
    device = load_device()
    token = keychain_token()
    payload = fetch_active(device["deviceRef"], token)
    manifest, anchor, checks, version_ref, package_ref, package_sha = verify_payload(payload, device)

    prior = CURRENT_FILE.read_text().strip() if CURRENT_FILE.exists() else None
    receipt, package_path, receipt_path = install_verified(
        payload, manifest, anchor, checks, version_ref, package_ref, package_sha
    )
    out = {
        "ok": True,
        "state": "ALREADY_CURRENT_VERIFIED" if prior == version_ref else "PERSISTENT_SCOPED_UPDATE_PASS",
        "previousVersionRef": prior,
        "versionRef": version_ref,
        "packageRef": package_ref,
        "packageSha256": package_sha,
        "stateSnapshotRef": receipt["stateSnapshotRef"],
        "digestRef": receipt["digestRef"],
        "forkEventNo": receipt["forkEventNo"],
        "credentialScope": receipt["credentialScope"],
        "serviceRoleRequiredOnMac": False,
        "packagePath": str(package_path),
        "receiptPath": str(receipt_path),
        "fullBranchRuntimeRestored": False,
        "bodyPayloadRestored": False,
        "fullHistoricalTranscriptRestored": False,
    }
    print(jdump(out))


def cmd_status():
    device = load_device()
    current = CURRENT_FILE.read_text().strip() if CURRENT_FILE.exists() else None
    receipt = None
    if current:
        path = ROOT / "runtime" / current / "update-receipt.json"
        if path.exists():
            try:
                receipt = json.loads(path.read_text())
            except Exception:
                receipt = None
    print(jdump({
        "ok": True,
        "state": "MAC_DEVICE_READY",
        "deviceRef": device.get("deviceRef"),
        "branchRef": device.get("branchRef"),
        "credentialScope": device.get("scope"),
        "currentVersionRef": current,
        "lastUpdateReceipt": receipt,
    }))


def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    if command == "update":
        cmd_update()
    elif command == "status":
        cmd_status()
    else:
        fail("UNKNOWN_SETKA_COMMAND", f"Supported: setka update | setka status", code=1)


if __name__ == "__main__":
    main()
