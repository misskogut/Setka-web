#!/usr/bin/env python3
import argparse
import importlib.util
import urllib.parse
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B24_PATH = FRONT_DIR / "setka-front-bridge-b24.py"

if not B24_PATH.exists():
    raise RuntimeError("SETKA_B24_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b24_base", B24_PATH)
b24 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b24)


class Handler(b24.Handler):
    server_version = "SETKAFrontB2.5/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            return self._json(200, {
                "ok": True,
                "state": "SETKA_LOCAL_FRONT_B25_READY",
                "frontVersion": "B2.5",
                "dataBaseline": "B1",
                "commandTokenExposed": False,
                "semanticSpotlight": True,
                "eventInspector": "EVENT_TIME_CONTEXT",
                "eventContextAutoSnapshot": True,
                "eventTrace": "EXPLICIT_RECORDED_ONLY",
                "snapshotNavigation": ["BEFORE", "EVENT", "AFTER", "RETURN"],
                "graphMutation": False,
                "canonMutation": False,
            })

        if path == "/api/b25/event":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                stream = q.get("stream", ["SYSTEM"])[0]
                mode = q.get("mode", ["INTEGRATION"])[0]
                event_no = int(q.get("event_no", [""])[0])
                device_ref, token = b24.base.load_device()
                result = b24.base.rpc("setka_minimal_front_b25_event_context_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_stream": stream,
                    "p_event_no": event_no,
                    "p_mode": mode,
                })
                if result.get("ok") is False:
                    return self._json(422, result)
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {
                    "ok": False,
                    "state": "EVENT_CONTEXT_BRIDGE_ERROR",
                    "message": str(e),
                    "frontVersion": "B2.5",
                })

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.5 · http://127.0.0.1:{args.port}/")
    print("SETKA B2.5 · event click enters real frozen time context")
    print("SETKA B2.5 · trace remains explicit-recorded-only; no path inference")
    print("SETKA B2.5 · device token stays in macOS Keychain; CANON mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
