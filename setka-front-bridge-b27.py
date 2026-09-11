#!/usr/bin/env python3
import argparse
import importlib.util
import urllib.parse
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B25_PATH = FRONT_DIR / "setka-front-bridge-b25.py"
OVERLAY_PATH = FRONT_DIR / "setka-b2.js"

if not B25_PATH.exists():
    raise RuntimeError("SETKA_B25_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b25_base", B25_PATH)
b25 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b25)


class Handler(b25.Handler):
    server_version = "SETKAFrontB2.7.4/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            overlay_ok = False
            legacy_writer_present = False
            try:
                raw = OVERLAY_PATH.read_bytes() if OVERLAY_PATH.exists() else b""
                overlay_ok = b"B2.7.4-SINGLE-WRITER-LAYOUT" in raw and b"B2.7.4" in raw
                legacy_writer_present = b"setka.front.b26.workspace.v1" in raw
            except Exception:
                overlay_ok = False
            ok = overlay_ok and not legacy_writer_present
            return self._json(200 if ok else 503, {
                "ok": ok,
                "state": "SETKA_LOCAL_FRONT_B274_READY" if ok else "B274_LAYOUT_ISOLATION_FAILED",
                "frontVersion": "B2.7.4",
                "dataBaseline": "B1",
                "eventContext": "B2.5",
                "workspace": "B2.7.4",
                "positionAuthority": "B2.7.4_ONLY",
                "legacyLayoutWriterPresent": legacy_writer_present,
                "projectionCore": "B2.7.4",
                "runtimeProjectionBridge": True,
                "systemGeneratedProjectionTruthGate": True,
                "visualWorkbench": {
                    "flowerRole": "ELEMENT_VAULT_ONLY",
                    "layoutDirectSelection": True,
                    "layoutDirectDrag": True,
                    "renameSelectedProjection": True,
                    "hideSelectedProjection": True,
                    "candidateStagingBeforeAdd": True,
                    "positionsPersistOnDrop": True,
                    "positionsPersistOnDone": True,
                    "positionsRestoreOnBoot": True,
                    "layoutActivationMutatesDom": False,
                    "legacyLayoutWriterExcluded": True,
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
            data = OVERLAY_PATH.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-SETKA-FRONT", "B2.7.4")
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
                return self._json(500, {"ok": False, "state": "B274_RUNTIME_PROJECTION_BRIDGE_ERROR", "message": str(e), "frontVersion": "B2.7.4"})

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
                return self._json(500, {"ok": False, "state": "B274_BINDING_BRIDGE_ERROR", "message": str(e), "frontVersion": "B2.7.4"})

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.7.4 · http://127.0.0.1:{args.port}/")
    print("SETKA B2.7.4 · position authority is single-writer: B2.7.4 only")
    print("SETKA B2.7.4 · legacy B2.6/B2.7 layout writers are excluded from overlay")
    print("SETKA B2.7.4 · positions persist on drop and DONE and restore on boot")
    print("SETKA B2.7.4 · system binding is independent from screen coordinates")
    print("SETKA B2.7.4 · device token stays in macOS Keychain; CANON mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
