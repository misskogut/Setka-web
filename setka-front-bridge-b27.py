#!/usr/bin/env python3
import argparse
import importlib.util
import urllib.parse
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B25_PATH = FRONT_DIR / "setka-front-bridge-b25.py"

if not B25_PATH.exists():
    raise RuntimeError("SETKA_B25_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b25_base", B25_PATH)
b25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b25)


class Handler(b25.Handler):
    server_version = "SETKAFrontB2.7.1/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            return self._json(200, {
                "ok": True,
                "state": "SETKA_LOCAL_FRONT_B271_READY",
                "frontVersion": "B2.7.1",
                "dataBaseline": "B1",
                "eventContext": "B2.5",
                "workspace": "B2.7",
                "runtimeProjectionBridge": True,
                "systemGeneratedProjectionTruthGate": True,
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
                    "state": "B271_RUNTIME_PROJECTION_BRIDGE_ERROR",
                    "message": str(e),
                    "frontVersion": "B2.7.1",
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
                    "state": "B271_BINDING_BRIDGE_ERROR",
                    "message": str(e),
                    "frontVersion": "B2.7.1",
                })

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.7.1 · http://127.0.0.1:{args.port}/")
    print("SETKA B2.7.1 · runtime projections are emitted only from proven backend objects")
    print("SETKA B2.7.1 · projection position/name/visibility do not mutate system binding")
    print("SETKA B2.7.1 · command bindings are inspect-only; no mutating command execution")
    print("SETKA B2.7.1 · device token stays in macOS Keychain; CANON mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
