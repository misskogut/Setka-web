#!/usr/bin/env python3
import hashlib, json, os, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE / 'SETKA-SYS-20260910-B1__MAC_TRANSFER_INDEX_V2.json'


def sha256_text(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def key_from_keychain():
    try:
        return subprocess.check_output([
            'security','find-generic-password','-a',os.environ.get('USER',''),
            '-s','SETKA_SUPABASE_SERVICE_ROLE_KEY','-w'
        ], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ''


def get_service_key():
    return os.environ.get('SETKA_SUPABASE_SERVICE_ROLE_KEY','').strip() or key_from_keychain()

index = json.loads(INDEX.read_text())
url = os.environ.get('SETKA_SUPABASE_URL','https://gfchgaphzhxufwdhrcis.supabase.co').rstrip('/')
key = get_service_key()
if not key:
    print(json.dumps({
        'ok': False,
        'state': 'LOCAL_SECRET_MISSING',
        'message': 'SETKA_SUPABASE_SERVICE_ROLE_KEY not found in environment or macOS Keychain',
        'next': 'STORE_SECRET_IN_MACOS_KEYCHAIN'
    }, ensure_ascii=False, indent=2))
    sys.exit(2)

body = json.dumps({'p_package_ref': index['privatePackageRef']}).encode('utf-8')
req = urllib.request.Request(
    f"{url}/rest/v1/rpc/setka_mac_transfer_package_read_v1",
    data=body,
    method='POST',
    headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
)
with urllib.request.urlopen(req, timeout=60) as r:
    payload = json.loads(r.read().decode('utf-8'))
if isinstance(payload, list): payload = payload[0]
if isinstance(payload, dict) and isinstance(payload.get('result'), dict): payload = payload['result']
if not payload.get('ok'):
    raise SystemExit(f"transfer unavailable: {payload.get('state')}")

pkg_text = payload['canonicalManifestText']
pocket_text = payload['canonicalPocketManifestText']
state_material = payload['canonicalPocketStateMaterialText']

checks = {
    'packageRef': payload['packageRef'] == index['privatePackageRef'],
    'versionRef': payload['versionRef'] == index['versionRef'],
    'packageSha256': sha256_text(pkg_text) == index['privatePackageSha256'] == payload['packageSha256'],
    'pocketCoreRef': payload['pocketCoreRef'] == index['pocketCore']['ref'],
    'pocketManifestSha256': sha256_text(pocket_text) == index['pocketCore']['manifestSha256'] == payload['pocketManifestSha256'],
    'pocketStateHash': sha256_text(state_material) == index['pocketCore']['stateHash'] == payload['pocketStateHash'],
}
manifest = json.loads(pkg_text)
pocket = manifest.get('pocketCore',{}).get('manifest',{})
checks.update({
    'identity': bool(pocket.get('identity',{}).get('setkaId')),
    'mission': bool(pocket.get('mission',{}).get('missionCode')),
    'capabilities': bool(pocket.get('capabilities')),
    'memoryLayers': bool(pocket.get('memoryLayers')),
    'experimentalProtocol': bool(pocket.get('experimentalProtocol',{}).get('protocolCode')),
    'agiProgress': bool(pocket.get('agiProgress')),
    'bodySnapshot': manifest.get('body',{}).get('snapshotRef') == index['body']['snapshotRef'],
    'experimentArchive': manifest.get('experiments',{}).get('archiveSnapshotRef') == index['experiments']['archiveSnapshotRef'],
    'systemDigest': manifest.get('systemState',{}).get('digestRef') == index['systemState']['digestRef'],
})
failed = [k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('verification FAIL: ' + ', '.join(failed))

target = Path.home()/'.setka'/'transfers'/index['versionRef']
target.mkdir(parents=True, exist_ok=True)
pkg_path = target/payload['portableFilename']
pkg_path.write_text(pkg_text)
os.chmod(pkg_path, 0o600)
receipt = {
    'format':'SETKA_MAC_TRANSFER_LOCAL_RECEIPT_V1',
    'versionRef':index['versionRef'],
    'branchRef':index['branchRef'],
    'packageRef':index['privatePackageRef'],
    'packageSha256':sha256_text(pkg_text),
    'pocketCoreRef':index['pocketCore']['ref'],
    'pocketManifestSha256':sha256_text(pocket_text),
    'pocketStateHash':sha256_text(state_material),
    'bodySnapshotRef':index['body']['snapshotRef'],
    'experimentArchiveSnapshotRef':index['experiments']['archiveSnapshotRef'],
    'systemStateSnapshotRef':index['systemState']['snapshotRef'],
    'systemDigestRef':index['systemState']['digestRef'],
    'checks':checks,
    'state':'PACKAGE_FETCH_AND_MANIFEST_REHYDRATION_PASS',
    'freshMachinePackageVerified':True,
    'fullBranchRuntimeRestored':False,
    'transcriptStateContinuationVerified':False,
    'bootBoundary':'NEXT_STAGE_REQUIRED_FOR_FULL_FRESH_MACHINE_COLD_BOOT'
}
receipt_path = target/'receipt.json'
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2))
os.chmod(receipt_path, 0o600)
print(json.dumps({
    'ok':True,
    'state':receipt['state'],
    'versionRef':receipt['versionRef'],
    'packagePath':str(pkg_path),
    'receiptPath':str(receipt_path),
    'capabilityCount':len(pocket.get('capabilities',[])),
    'dutyCount':len(pocket.get('duties',[])),
    'memoryLayerCount':len(pocket.get('memoryLayers',[])),
    'next':receipt['bootBoundary']
}, ensure_ascii=False, indent=2))
