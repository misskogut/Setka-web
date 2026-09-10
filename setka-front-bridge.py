#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import urllib.parse
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SUPABASE_URL = "https://gfchgaphzhxufwdhrcis.supabase.co"
SUPABASE_KEY = "sb_publishable_1jL-x9_kp6rpfGghpSp_OA_OiXDnvsv"
ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
INDEX = FRONT_DIR / "index.html"
OVERLAY = FRONT_DIR / "setka-b2.js"
DEVICE_FILE = ROOT / "device.json"


def load_device():
    if not DEVICE_FILE.exists():
        raise RuntimeError("SETKA_DEVICE_FILE_MISSING")
    device = json.loads(DEVICE_FILE.read_text())
    device_ref = device.get("deviceRef")
    if not device_ref:
        raise RuntimeError("SETKA_DEVICE_REF_MISSING")
    user = os.environ.get("USER", "")
    proc = subprocess.run([
        "security", "find-generic-password", "-a", user,
        "-s", "SETKA_MAC_DEVICE_TOKEN", "-w"
    ], capture_output=True, text=True)
    token = proc.stdout.strip() if proc.returncode == 0 else ""
    if not token:
        raise RuntimeError("SETKA_DEVICE_TOKEN_MISSING")
    return device_ref, token


def rpc(name, payload):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"SUPABASE_HTTP_{e.code}: {raw[:800]}")


class Handler(BaseHTTPRequestHandler):
    server_version = "SETKAFrontB2/1.0"

    def log_message(self, fmt, *args):
        print(f"SETKA FRONT · {self.address_string()} · {fmt % args}")

    def _json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _local_origin_ok(self):
        origin = self.headers.get("Origin")
        if not origin:
            return True
        allowed = {
            f"http://127.0.0.1:{self.server.server_port}",
            f"http://localhost:{self.server.server_port}",
        }
        return origin in allowed

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/b2/health":
            return self._json(200, {
                "ok": True,
                "state": "SETKA_LOCAL_FRONT_B2_READY",
                "commandTokenExposed": False,
                "canonMutation": False,
            })
        if path == "/api/b2/transcript":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                stream = q.get("stream", ["SYSTEM"])[0]
                mode = q.get("mode", ["INTEGRATION"])[0]
                before_raw = q.get("before", [""])[0]
                limit_raw = q.get("limit", ["100"])[0]
                before = int(before_raw) if before_raw.strip() else None
                limit = max(1, min(int(limit_raw), 200))
                device_ref, token = load_device()
                result = rpc("setka_minimal_front_b2_transcript_page_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_stream": stream,
                    "p_mode": mode,
                    "p_before_no": before,
                    "p_limit": limit,
                })
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {"ok": False, "state": "TRANSCRIPT_BRIDGE_ERROR", "message": str(e)})
        if path == "/setka-b2.js":
            if not OVERLAY.exists():
                self.send_error(404)
                return
            data = OVERLAY.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if path in ("/", "/index.html"):
            if not INDEX.exists():
                self.send_error(404, "SETKA front source missing")
                return
            html = INDEX.read_text(errors="replace")
            marker = '<script src="/setka-b2.js" defer></script>'
            if marker not in html:
                html = html.replace("</body>", f"  {marker}\n</body>")
            data = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/api/b2/command":
            self.send_error(404)
            return
        if not self._local_origin_ok():
            return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            return self._json(415, {"ok": False, "state": "JSON_REQUIRED"})
        try:
            length = min(int(self.headers.get("Content-Length", "0") or 0), 32768)
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            command = str(payload.get("command", "")).strip()
            mode = str(payload.get("mode", "INTEGRATION")).strip()
            if not command:
                return self._json(400, {"ok": False, "state": "EMPTY_COMMAND"})
            device_ref, token = load_device()
            result = rpc("setka_minimal_front_b2_command_v1", {
                "p_device_ref": device_ref,
                "p_token": token,
                "p_command": command,
                "p_mode": mode,
            })
            return self._json(200, result)
        except Exception as e:
            return self._json(500, {"ok": False, "state": "COMMAND_BRIDGE_ERROR", "message": str(e)})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(os.environ.get("SETKA_FRONT_PORT", "8765")))
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2 · http://127.0.0.1:{args.port}/")
    print("SETKA LOCAL FRONT B2 · device token stays in macOS Keychain")
    print("SETKA LOCAL FRONT B2 · CANON mutation unavailable through B2 ingress")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
