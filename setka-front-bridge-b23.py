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

GRAPH_BRIDGE_INJECTION = r'''
    // B2.3 presentation bridge. It may recolor/highlight only the already loaded
    // frozen snapshot. It does not create or mutate graph facts.
    let semanticSpotlightGroup = null;
    let semanticSpotlightRestore = null;
    let semanticSpotlightSnapshotRef = null;
    let graphPresentationColorMode = "GENERATION";

    function normalizeSpotlightText(value) {
      return String(value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase("ru-RU")
        .replace(/[_:/\\.-]+/g, " ")
        .replace(/[^\\p{L}\\p{N}]+/gu, " ")
        .trim()
        .replace(/\\s+/g, " ");
    }

    function stableHue(value) {
      const text = String(value ?? "∅");
      let h = 2166136261 >>> 0;
      for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return (h % 360) / 360;
    }

    function presentationColor(node, mode) {
      if (mode === "TYPE") {
        const c = new THREE.Color();
        c.setHSL(stableHue(node.type), 0.68, 0.61);
        return c;
      }
      if (mode === "FAMILY") {
        const c = new THREE.Color();
        c.setHSL(stableHue(node.family), 0.62, 0.62);
        return c;
      }
      return generationColor(node.generation);
    }

    function setGraphPresentationColorMode(mode) {
      const next = ["GENERATION", "TYPE", "FAMILY"].includes(String(mode || "").toUpperCase())
        ? String(mode).toUpperCase()
        : "GENERATION";
      if (!points || !points.geometry || !indexToNode.length) {
        return { ok: false, state: "GRAPH_NOT_READY", mode: graphPresentationColorMode };
      }
      clearSemanticSpotlight({ fit: false });
      const attr = points.geometry.getAttribute("color");
      if (!attr) return { ok: false, state: "GRAPH_COLOR_ATTRIBUTE_MISSING", mode: graphPresentationColorMode };
      indexToNode.forEach((node, index) => {
        if (!node) return;
        const c = presentationColor(node, next);
        attr.setXYZ(index, c.r, c.g, c.b);
      });
      attr.needsUpdate = true;
      hubs?.children?.forEach((hub) => {
        const node = nodeMap.get(hub.userData.nodeId);
        if (node && hub.material?.color) hub.material.color.copy(presentationColor(node, next));
      });
      graphPresentationColorMode = next;
      return {
        ok: true,
        state: "PRESENTATION_COLOR_MODE_APPLIED",
        mode: next,
        snapshotRef: state.graphRef,
        graphMutation: false,
        ontologyMutation: false,
        truth: "COLORS_ARE_DETERMINISTIC_PRESENTATION_ONLY"
      };
    }

    function disposeSemanticSpotlight() {
      if (!semanticSpotlightGroup) return;
      semanticSpotlightGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose?.());
        else child.material?.dispose?.();
      });
      semanticSpotlightGroup.parent?.remove(semanticSpotlightGroup);
      semanticSpotlightGroup = null;
    }

    function clearSemanticSpotlight(options = {}) {
      const sameSnapshot = semanticSpotlightSnapshotRef && semanticSpotlightSnapshotRef === state.graphRef;
      disposeSemanticSpotlight();
      if (sameSnapshot && semanticSpotlightRestore) {
        if (points?.material) points.material.opacity = semanticSpotlightRestore.pointsOpacity;
        if (graphLines?.material) graphLines.material.opacity = semanticSpotlightRestore.graphOpacity;
        if (growthLines?.material) growthLines.material.opacity = semanticSpotlightRestore.growthOpacity;
        hubs?.children?.forEach((hub, i) => {
          if (hub.material && semanticSpotlightRestore.hubOpacities[i] !== undefined) {
            hub.material.opacity = semanticSpotlightRestore.hubOpacities[i];
          }
        });
        controls.autoRotate = semanticSpotlightRestore.autoRotate;
        dom["auto-toggle"]?.classList.toggle("active", controls.autoRotate);
      }
      semanticSpotlightRestore = null;
      semanticSpotlightSnapshotRef = null;
      if (dom["graph-classification"]) dom["graph-classification"].textContent = "SNAPSHOT · FROZEN BODY";
      if (options.fit) fitGraph();
      return { ok: true, state: "SPOTLIGHT_CLEARED", snapshotRef: state.graphRef };
    }

    function spotlightPointCloud(nodes, color, size) {
      const geometry = new THREE.BufferGeometry().setFromPoints(nodes.map((node) => node.position));
      const material = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity: 1,
        sizeAttenuation: true,
        depthTest: false,
        depthWrite: false
      });
      const cloud = new THREE.Points(geometry, material);
      cloud.renderOrder = 30;
      return cloud;
    }

    function semanticSpotlight(query) {
      const rawQuery = String(query ?? "").trim();
      const needle = normalizeSpotlightText(rawQuery);
      if (!needle) return { ok: false, state: "EMPTY_SPOTLIGHT_QUERY", directMatches: 0 };
      if (!points || !state.graph || !nodeMap.size) {
        return { ok: false, state: "GRAPH_NOT_READY", directMatches: 0, snapshotRef: state.graphRef };
      }

      clearSemanticSpotlight({ fit: false });

      const tokens = needle.split(" ").filter(Boolean);
      const searchable = (node) => [node.id, node.type, node.name, node.family, node.parent]
        .filter(Boolean)
        .map((value) => normalizeSpotlightText(value));

      let direct = [...nodeMap.values()].filter((node) => searchable(node).some((field) => field === needle));
      let matchKind = "EXACT";
      if (!direct.length) {
        direct = [...nodeMap.values()].filter((node) => {
          const fields = searchable(node);
          const combined = fields.join(" ");
          return fields.some((field) => field.includes(needle)) || tokens.every((token) => combined.includes(token));
        });
        matchKind = "SUBSTRING";
      }

      if (!direct.length) {
        return {
          ok: true,
          state: "SPOTLIGHT_NO_GRAPH_MATCH",
          query: rawQuery,
          matchKind: "NONE",
          directMatches: 0,
          relatedNodes: 0,
          realEdges: 0,
          topologyChanged: false,
          snapshotRef: state.graphRef
        };
      }

      const directIds = new Set(direct.map((node) => node.id));
      const linkedEdges = edgeMeta.filter((edge) => directIds.has(edge.source.id) || directIds.has(edge.target.id));
      const relatedIds = new Set();
      linkedEdges.forEach((edge) => {
        if (!directIds.has(edge.source.id)) relatedIds.add(edge.source.id);
        if (!directIds.has(edge.target.id)) relatedIds.add(edge.target.id);
      });
      const related = [...relatedIds].map((id) => nodeMap.get(id)).filter(Boolean);

      semanticSpotlightRestore = {
        pointsOpacity: points?.material?.opacity ?? 0.88,
        graphOpacity: graphLines?.material?.opacity ?? 0.105,
        growthOpacity: growthLines?.material?.opacity ?? 0.08,
        hubOpacities: hubs?.children?.map((hub) => hub.material?.opacity ?? 0.94) || [],
        autoRotate: controls.autoRotate
      };
      semanticSpotlightSnapshotRef = state.graphRef;

      if (points?.material) points.material.opacity = 0.045;
      if (graphLines?.material) graphLines.material.opacity = 0.014;
      if (growthLines?.material) growthLines.material.opacity = 0.009;
      hubs?.children?.forEach((hub) => { if (hub.material) hub.material.opacity = 0.08; });
      controls.autoRotate = false;
      dom["auto-toggle"]?.classList.remove("active");

      semanticSpotlightGroup = new THREE.Group();
      semanticSpotlightGroup.name = "SETKA_SEMANTIC_SPOTLIGHT";
      graphGroup.add(semanticSpotlightGroup);

      const directRender = direct.slice(0, 500);
      const relatedRender = related.slice(0, 1200);
      const edgeRender = linkedEdges.slice(0, 4000);
      const directSize = Math.max(0.12, Math.min(0.42, graphRadius * 0.018));
      const relatedSize = Math.max(0.075, Math.min(0.24, graphRadius * 0.011));

      semanticSpotlightGroup.add(spotlightPointCloud(directRender, 0x9dffbe, directSize));
      if (relatedRender.length) semanticSpotlightGroup.add(spotlightPointCloud(relatedRender, 0x87e9ff, relatedSize));

      if (edgeRender.length) {
        const edgePositions = [];
        edgeRender.forEach((edge) => edgePositions.push(
          edge.source.position.x, edge.source.position.y, edge.source.position.z,
          edge.target.position.x, edge.target.position.y, edge.target.position.z
        ));
        const edgeGeometry = new THREE.BufferGeometry().setAttribute(
          "position", new THREE.Float32BufferAttribute(edgePositions, 3)
        );
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xffd27d,
          transparent: true,
          opacity: 0.92,
          depthTest: false,
          depthWrite: false
        });
        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edgeLines.renderOrder = 29;
        semanticSpotlightGroup.add(edgeLines);
      }

      const focusBox = new THREE.Box3();
      directRender.forEach((node) => focusBox.expandByPoint(node.position));
      const focusCenter = focusBox.getCenter(new THREE.Vector3());
      const focusSize = focusBox.getSize(new THREE.Vector3());
      const focusRadius = Math.max(focusSize.x, focusSize.y, focusSize.z) * 0.62;
      const viewDistance = Math.max(graphRadius * 0.12, focusRadius * 2.8, 1.8);
      const viewDirection = camera.position.clone().sub(controls.target);
      if (viewDirection.lengthSq() < 0.0001) viewDirection.set(0.72, 0.42, 1.55);
      viewDirection.normalize();
      controls.target.copy(focusCenter);
      camera.position.copy(focusCenter).addScaledVector(viewDirection, viewDistance);
      controls.update();

      if (dom["graph-classification"]) {
        dom["graph-classification"].textContent = `SPOTLIGHT · ${rawQuery.toUpperCase()} · REAL GRAPH ONLY`;
      }

      return {
        ok: true,
        state: "SEMANTIC_SPOTLIGHT_MATCH",
        query: rawQuery,
        matchKind,
        directMatches: direct.length,
        relatedNodes: related.length,
        realEdges: linkedEdges.length,
        topologyChanged: false,
        snapshotRef: state.graphRef,
        rendered: {
          direct: directRender.length,
          related: relatedRender.length,
          edges: edgeRender.length,
          truncated: direct.length > directRender.length || related.length > relatedRender.length || linkedEdges.length > edgeRender.length
        },
        direct: direct.slice(0, 24).map((node) => ({ id: node.id, name: node.name, type: node.type, family: node.family }))
      };
    }

    window.SETKA_GRAPH_BRIDGE = Object.freeze({
      version: "B2.3",
      ready: () => Boolean(points && state.graph && nodeMap.size),
      snapshotRef: () => state.graphRef,
      mode: () => state.mode,
      spotlight: semanticSpotlight,
      clearSpotlight: clearSemanticSpotlight,
      setColorMode: setGraphPresentationColorMode,
      colorMode: () => graphPresentationColorMode
    });
    dom["reset-view"]?.addEventListener("click", () => clearSemanticSpotlight({ fit: false }));
'''


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
    server_version = "SETKAFrontB2.3/1.0"

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
                "state": "SETKA_LOCAL_FRONT_B23_READY",
                "commandTokenExposed": False,
                "semanticSpotlight": True,
                "presentationColorModes": ["GENERATION", "TYPE", "FAMILY"],
                "defaultLanguage": "ru-human",
                "graphMutation": False,
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
                limit_value = max(1, min(int(limit_raw), 200))
                device_ref, token = load_device()
                result = rpc("setka_minimal_front_b2_transcript_page_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_stream": stream,
                    "p_mode": mode,
                    "p_before_no": before,
                    "p_limit": limit_value,
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
            module_anchor = "    initialize();\n  </script>"
            if "window.SETKA_GRAPH_BRIDGE" not in html and module_anchor in html:
                html = html.replace(module_anchor, f"{GRAPH_BRIDGE_INJECTION}\n    initialize();\n  </script>")
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
    print(f"SETKA LOCAL FRONT B2.3 · http://127.0.0.1:{args.port}/")
    print("SETKA LOCAL FRONT B2.3 · human Russian is the default presentation layer")
    print("SETKA LOCAL FRONT B2.3 · graph colors are deterministic presentation only")
    print("SETKA LOCAL FRONT B2.3 · device token stays in macOS Keychain")
    print("SETKA LOCAL FRONT B2.3 · CANON mutation unavailable through B2 ingress")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
