#!/usr/bin/env python3
import argparse
import importlib.util
from http.server import ThreadingHTTPServer
from pathlib import Path
import urllib.parse

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
B24_CORE_PATH = FRONT_DIR / "setka-front-bridge-b24.py"
B24_OVERLAY = FRONT_DIR / "setka-b24.js"

if not B24_CORE_PATH.exists():
    raise RuntimeError("SETKA_B24_CORE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b24_core", B24_CORE_PATH)
b24 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b24)


class Handler(b24.Handler):
    server_version = "SETKAFrontB2.4/1.1"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/setka-b24.js":
            if not B24_OVERLAY.exists():
                self.send_error(404, "SETKA B2.4 overlay missing")
                return
            data = B24_OVERLAY.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if path in ("/", "/index.html"):
            index = b24.base.INDEX
            if not index.exists():
                self.send_error(404, "SETKA front source missing")
                return
            html = index.read_text(errors="replace")
            module_anchor = "    initialize();\n  </script>"
            if "window.SETKA_GRAPH_BRIDGE" not in html and module_anchor in html:
                html = html.replace(
                    module_anchor,
                    f"{b24.base.GRAPH_BRIDGE_INJECTION}\n    initialize();\n  </script>"
                )
            b23_marker = '<script src="/setka-b2.js" defer></script>'
            b24_marker = '<script src="/setka-b24.js" defer></script>'
            if b23_marker not in html:
                html = html.replace("</body>", f"  {b23_marker}\n</body>")
            if b24_marker not in html:
                html = html.replace("</body>", f"  {b24_marker}\n</body>")
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

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.4 · http://127.0.0.1:{args.port}/")
    print("SETKA LOCAL FRONT B2.4 · human Russian + event inspector + evidence-only trace replay")
    print("SETKA LOCAL FRONT B2.4 · temporal trace connectors are presentation, not graph edges")
    print("SETKA LOCAL FRONT B2.4 · device token stays in macOS Keychain")
    print("SETKA LOCAL FRONT B2.4 · CANON mutation unavailable through front ingress")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
