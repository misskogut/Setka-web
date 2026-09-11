#!/usr/bin/env python3
import argparse
import importlib.util
import urllib.parse
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B25_PATH = FRONT_DIR / "setka-front-bridge-b25.py"
OVERLAY_PATH = FRONT_DIR / "setka-b2.js"
B272_REMOTE = "https://raw.githubusercontent.com/misskogut/Setka-web/main/setka-front-b272-workbench.js"

if not B25_PATH.exists():
    raise RuntimeError("SETKA_B25_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b25_base", B25_PATH)
b25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b25)


def load_b272_patch():
    try:
        with urllib.request.urlopen(B272_REMOTE, timeout=12) as r:
            raw = r.read()
            if not raw or b"SETKA_VISUAL_WORKBENCH" not in raw:
                return b""
            return raw
    except Exception as e:
        print(f"SETKA B2.7.2 · visual patch fetch unavailable · {e}")
        return b""


class Handler(b25.Handler):
    server_version = "SETKAFrontB2.7.2/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            return self._json(200, {
                "ok": True,
                "state": "SETKA_LOCAL_FRONT_B272_READY",
                "frontVersion": "B2.7.2",
                "dataBaseline": "B1",
                "eventContext": "B2.5",
                "workspace": "B2.7.2",
                "runtimeProjectionBridge": True,
                "systemGeneratedProjectionTruthGate": True,
                "visualWorkbench": {
                    "flowerRole": "ELEMENT_VAULT_ONLY",
                    "layoutDirectSelection": True,
                    "layoutDirectDrag": True,
                    "renameSelectedProjection": True,
                    "hideSelectedProjection": True,
                    "candidateStagingBeforeAdd": True,
                },
                "projectionSources": [
                    "foundation.capability_command_catalog",
                    "foundation.capability_recipe_registry_v1",
                    "foundation.entity_card_registry_v1",
                    "foundation.entity_relation_registry_v2",
                ],
                "projectionInvocation": "READ_ONLY_BINDING_INSPECTION",
                "commandExecution": False,
                "commandTokenExposed": False,
                "canonMutation": False,
            })

        if path == "/setka-b2.js":
            if not OVERLAY_PATH.exists():
                self.send_error(404)
                return
            base = OVERLAY_PATH.read_bytes()
            patch = load_b272_patch()
            data = base + (b"\n\n/* SETKA B2.7.2 visual workbench */\n" + patch if patch else b"")
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-SETKA-FRONT", "B2.7.2")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

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
                device_ref, token = b25.b24.base.load_device()
                result = b25.b24.base.rpc("setka_minimal_front_b27_projection_context_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_intent": intent,
                    "p_entity_type": entity_type,
                    "p_entity_ref": entity_ref,
                    "p_mode": mode,
                    "p_limit": limit,
                })
                if result.get("ok") is False:
                    return self._json(422, result)
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {
                    "ok": False,
                    "state": "B272_RUNTIME_PROJECTION_BRIDGE_ERROR",
                    "message": str(e),
                    "frontVersion": "B2.7.2",
                })

        if path == "/api/b27/binding":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                binding_kind = q.get("kind", [""])[0]
                binding_ref = q.get("ref", [""])[0]
                entity_type = q.get("entity_type", [None])[0]
                entity_ref = q.get("entity_ref", [None])[0]
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
                return self._json(500, {
                    "ok": False,
                    "state": "B272_BINDING_BRIDGE_ERROR",
                    "message": str(e),
                    "frontVersion": "B2.7.2",
                })

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.7.2 · http://127.0.0.1:{args.port}/")
    print("SETKA B2.7.2 · flower is an element vault, never a layout-mode switch")
    print("SETKA B2.7.2 · layout selects and moves the chosen projection itself")
    print("SETKA B2.7.2 · removed projections remain system-bound and restorable")
    print("SETKA B2.7.2 · candidates stay in the vault until explicitly added")
    print("SETKA B2.7.2 · system-generated projections still require proven backend sourceRef")
    print("SETKA B2.7.2 · command bindings are inspect-only; no mutating command execution")
    print("SETKA B2.7.2 · device token stays in macOS Keychain; CANON mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
