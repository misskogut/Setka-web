#!/usr/bin/env python3
"""Publish original SETKA WAV/MP3 files to GitHub Release assets (not Git LFS pointers).

Every byte is copied unmodified and checked against the Yandex sha256 + size.
Designed to run as a one-shot GitHub Actions upload; safely resumes if interrupted.
"""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "docs/SETKA_MUSIC_GITHUB_ASSETS_20261107.json").read_text())
SOURCE = MANIFEST["source"]
TAG = MANIFEST["release_tag"]
REPO = os.environ.get("GITHUB_REPOSITORY", "misskogut/Setka-web")
OUT = pathlib.Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "setka-original-audio"
OUT.mkdir(parents=True, exist_ok=True)
FILES = MANIFEST["files"]
assert len(FILES) == 28
assert sum(x["bytes"] for x in FILES) == 2687247923

def gh(*args):
    return subprocess.run(["gh", *args], check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True, timeout=120).stdout

def release_assets():
    try:
        o = json.loads(gh("api", f"repos/{REPO}/releases/tags/{TAG}"))
        return {x["name"]: x for x in o.get("assets", [])}
    except subprocess.CalledProcessError:
        return None

def ensure_release():
    assets = release_assets()
    if assets is not None:
        print(f"GitHub Release {TAG}: already exists, {len(assets)} assets", flush=True)
        return assets
    print(f"Creating GitHub Release {TAG} for original uncompressed SETKA audio", flush=True)
    note = ("The original 28 WAV/MP3 audio recordings supplied by SETKA's owner. "
            "No compression, resampling or modification. File-to-name mapping, "
            "sha256 and byte sizes: docs/SETKA_MUSIC_GITHUB_ASSETS_20261107.json. "
            "Files are held by this GitHub repository as Release assets because "
            "several exceed GitHub's regular Git 100 MB per-file limit.")
    gh("release", "create", TAG, "--repo", REPO, "--target", "main",
       "--title", "SETKA — Original Music Collection", "--notes", note)
    return release_assets() or {}

def trusted_metadata(entry):
    qs = urllib.parse.urlencode({"public_key": SOURCE, "path": entry["path"]})
    endpoint = "https://cloud-api.yandex.net/v1/disk/public/resources?" + qs
    request = urllib.request.Request(endpoint, headers={"User-Agent": "SETKA-GitHub-Original-Audio-Import/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        obj = json.load(response)
    if obj.get("sha256", "").lower() != entry["sha256"].lower():
        raise ValueError("Yandex sha256 mismatch for " + entry["path"])
    if int(obj.get("size", -1)) != entry["bytes"]:
        raise ValueError("Yandex source size changed for " + entry["path"])
    url = obj.get("file", "")
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "downloader.disk.yandex.ru":
        raise ValueError("unexpected media host for " + entry["path"])
    return url

def download(entry):
    dest = OUT / entry["asset_name"]
    for attempt in range(1, 6):
        stage = "metadata"
        try:
            link = trusted_metadata(entry)
            stage = "download"
            request = urllib.request.Request(link, headers={"User-Agent": "SETKA-GitHub-Original-Audio-Import/1.0"})
            sha = hashlib.sha256()
            seen = 0
            start = time.monotonic()
            with urllib.request.urlopen(request, timeout=180) as response, dest.open("wb") as file:
                if response.status != 200:
                    raise ValueError("expected full body status 200; got " + str(response.status))
                while True:
                    chunk = response.read(2 * 1024 * 1024)
                    if not chunk:
                        break
                    sha.update(chunk)
                    seen += len(chunk)
                    if seen > entry["bytes"]:
                        raise ValueError("source exceeded expected size")
                    file.write(chunk)
            if seen != entry["bytes"] or sha.hexdigest().lower() != entry["sha256"].lower():
                raise ValueError("source size/sha256 verification failed")
            print(f"Downloaded & sha256-verified {entry['asset_name']} "
                  f"{seen:,} bytes in {time.monotonic()-start:.1f}s", flush=True)
            return dest
        except Exception as error:
            dest.unlink(missing_ok=True)
            # Do not log signed Yandex URLs or credentials.
            http_code = getattr(error, "code", None)
            print(f"Download attempt {attempt}/5 failed at {stage} for {entry['asset_name']}: "
                  f"{type(error).__name__}, HTTP={http_code}", flush=True)
            if attempt == 5:
                raise
            time.sleep(5 * attempt)
    raise RuntimeError("unreachable")

def main():
    if not os.environ.get("GH_TOKEN"):
        raise RuntimeError("GH_TOKEN is needed from GitHub Actions permission contents:write")
    existing = ensure_release()
    failures=[]
    for index, entry in enumerate(FILES, 1):
        name = entry["asset_name"]
        previous = existing.get(name)
        if previous and previous.get("size") == entry["bytes"] and (
                not previous.get("digest") or previous["digest"].lower() == "sha256:"+entry["sha256"].lower()):
            print(f"[{index}/{len(FILES)}] Already verified on GitHub: {name}", flush=True)
            continue
        if previous:
            # Stale/partial upload: remove it before retransferring.
            gh("api", "-X", "DELETE", f"repos/{REPO}/releases/assets/{previous['id']}")
        print(f"[{index}/{len(FILES)}] Importing {entry['path']} "
              f"({entry['bytes']:,} bytes)", flush=True)
        try:
            dest = download(entry)
            try:
                subprocess.run(["gh", "release", "upload", TAG, f"{dest}#{name}",
                                "--repo", REPO], check=True, timeout=1800)
            finally:
                dest.unlink(missing_ok=True)
            uploaded = release_assets() or {}
            final = uploaded.get(name)
            if not final or final.get("size") != entry["bytes"]:
                raise RuntimeError("GitHub asset missing or wrong byte count after upload: "+name)
            if final.get("digest") and final["digest"].lower() != "sha256:"+entry["sha256"].lower():
                raise RuntimeError("GitHub asset sha256 mismatch: "+name)
            existing = uploaded
            print(f"Verified on GitHub: {name}, {entry['bytes']:,} bytes", flush=True)
        except Exception as error:
            failures.append(name)
            print(f"Deferring {name} to next retry pass: {type(error).__name__}", flush=True)
    final = release_assets() or {}
    missing=[x["asset_name"] for x in FILES if x["asset_name"] not in final or final[x["asset_name"]]["size"] != x["bytes"]]
    if failures or missing:
        raise RuntimeError(f"Partial transfer: {len(final)}/28 assets, {len(missing)} missing; run again to resume")
    print("IMPORT COMPLETE: all 28 unchanged original audio assets verified on GitHub release.", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("IMPORT FAILED:", type(exc).__name__, str(exc).split("https://")[0][:200], file=sys.stderr)
        sys.exit(1)
