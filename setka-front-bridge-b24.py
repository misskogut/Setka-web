#!/usr/bin/env python3
import argparse
import importlib.util
import json
import urllib.parse
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path.home() / ".setka"
FRONT_DIR = ROOT / "front"
BASE_BRIDGE_PATH = FRONT_DIR / "setka-front-bridge-b23.py"

if not BASE_BRIDGE_PATH.exists():
    raise RuntimeError("SETKA_B23_BASE_BRIDGE_MISSING")

spec = importlib.util.spec_from_file_location("setka_front_b23_base", BASE_BRIDGE_PATH)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

TRACE_BRIDGE_INJECTION = r'''
    // B2.4 · evidence-only event trace renderer. Temporal connectors are a
    // presentation of recorded order and MUST NOT be interpreted as graph edges.
    let eventTraceGroup = null;
    let eventTraceRestore = null;
    let eventTracePayload = null;
    let eventTraceIndex = -1;
    let eventTraceTimer = null;
    let eventTracePreviousSnapshotRef = null;
    let eventTracePlaying = false;

    function disposeEventTraceGroup() {
      if (!eventTraceGroup) return;
      eventTraceGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose?.());
        else child.material?.dispose?.();
      });
      eventTraceGroup.parent?.remove(eventTraceGroup);
      eventTraceGroup = null;
    }

    function traceStagePosition(stage) {
      if (!stage || stage.mappedToFrozenBody === false) return null;
      const id = stage.nodeId || stage.masked;
      if (id && nodeMap.has(String(id))) return nodeMap.get(String(id)).position.clone();
      const x = Number(stage.x), y = Number(stage.y), z = Number(stage.z);
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) return new THREE.Vector3(x, y, z);
      return null;
    }

    function traceStageColor(stage) {
      const code = String(stage?.stageCode || stage?.kind || "").toUpperCase();
      if (/FAIL|ERROR|DENIED|REJECT/.test(code)) return new THREE.Color(0xff8d8d);
      if (/SUCCESS|SUCCEEDED|PASS|FINAL|COMPLETED/.test(code)) return new THREE.Color(0x9dffbe);
      if (/ROUTE|DUTY|POSITION|SELECT/.test(code)) return new THREE.Color(0xbda7ff);
      if (/MATERIAL|RECIPE|ACTION|EXECUT/.test(code)) return new THREE.Color(0xffd27d);
      return new THREE.Color(0x87e9ff);
    }

    function ensureTracePresentation() {
      if (eventTraceRestore) return;
      eventTraceRestore = {
        pointsOpacity: points?.material?.opacity ?? 0.88,
        graphOpacity: graphLines?.material?.opacity ?? 0.105,
        growthOpacity: growthLines?.material?.opacity ?? 0.08,
        hubOpacities: hubs?.children?.map((hub) => hub.material?.opacity ?? 0.94) || [],
        autoRotate: controls.autoRotate
      };
      if (points?.material) points.material.opacity = 0.075;
      if (graphLines?.material) graphLines.material.opacity = 0.022;
      if (growthLines?.material) growthLines.material.opacity = 0.015;
      hubs?.children?.forEach((hub) => { if (hub.material) hub.material.opacity = 0.12; });
      controls.autoRotate = false;
      dom["auto-toggle"]?.classList.remove("active");
    }

    function renderEventTraceStep(index) {
      if (!eventTracePayload?.stages?.length) return { ok:false, state:"TRACE_NOT_LOADED" };
      const stages = eventTracePayload.stages;
      const nextIndex = Math.max(0, Math.min(Number(index) || 0, stages.length - 1));
      ensureTracePresentation();
      disposeEventTraceGroup();
      eventTraceIndex = nextIndex;
      eventTraceGroup = new THREE.Group();
      eventTraceGroup.name = "SETKA_EVENT_TRACE_B24";
      graphGroup.add(eventTraceGroup);

      const positions = [];
      const colors = [];
      const resolved = [];
      let mapped = 0;
      let unmapped = 0;
      for (let i = 0; i <= nextIndex; i += 1) {
        const stage = stages[i];
        const pos = traceStagePosition(stage);
        resolved.push(pos);
        if (!pos) { unmapped += 1; continue; }
        mapped += 1;
        positions.push(pos.x, pos.y, pos.z);
        const c = traceStageColor(stage);
        colors.push(c.r, c.g, c.b);
      }

      if (positions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({
          size: Math.max(0.12, Math.min(0.36, graphRadius * 0.015)),
          vertexColors: true, transparent: true, opacity: 1,
          sizeAttenuation: true, depthTest: false, depthWrite: false
        });
        const cloud = new THREE.Points(geometry, material);
        cloud.renderOrder = 41;
        eventTraceGroup.add(cloud);
      }

      const temporalPositions = [];
      for (let i = 1; i <= nextIndex; i += 1) {
        const a = resolved[i - 1], b = resolved[i];
        if (!a || !b) continue;
        temporalPositions.push(a.x,a.y,a.z,b.x,b.y,b.z);
      }
      if (temporalPositions.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(temporalPositions, 3));
        const material = new THREE.LineBasicMaterial({
          color:0xbda7ff, transparent:true, opacity:0.88, depthTest:false, depthWrite:false
        });
        const lines = new THREE.LineSegments(geometry, material);
        lines.renderOrder = 40;
        eventTraceGroup.add(lines);
      }

      const current = resolved[nextIndex];
      if (current) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(0.13, Math.min(0.34, graphRadius * 0.016)),18,12),
          new THREE.MeshBasicMaterial({color:traceStageColor(stages[nextIndex]),wireframe:true,transparent:true,opacity:1,depthTest:false})
        );
        marker.position.copy(current);
        marker.renderOrder = 42;
        eventTraceGroup.add(marker);
        const direction = camera.position.clone().sub(controls.target);
        if (direction.lengthSq() < 0.0001) direction.set(0.72,0.42,1.55);
        direction.normalize();
        controls.target.copy(current);
        camera.position.copy(current).addScaledVector(direction, Math.max(graphRadius * 0.35, 3.2));
        controls.update();
      }

      const stage = stages[nextIndex] || {};
      if (dom["graph-classification"]) {
        dom["graph-classification"].textContent = `TRACE · ${nextIndex + 1}/${stages.length} · ${stage.stageCode || stage.kind || "RECORDED STEP"}`;
      }
      return {
        ok:true,state:"TRACE_STEP_RENDERED",index:nextIndex,total:stages.length,
        mappedThroughStep:mapped,unmappedThroughStep:unmapped,
        currentMapped:Boolean(current),snapshotRef:state.graphRef,
        temporalConnectorsAreGraphEdges:false
      };
    }

    function pauseEventTrace() {
      eventTracePlaying = false;
      if (eventTraceTimer) clearTimeout(eventTraceTimer);
      eventTraceTimer = null;
      return {ok:true,state:"TRACE_PAUSED",index:eventTraceIndex};
    }

    async function loadEventTrace(trace) {
      pauseEventTrace();
      clearSemanticSpotlight({fit:false});
      disposeEventTraceGroup();
      if (eventTraceRestore) {
        if (points?.material) points.material.opacity = eventTraceRestore.pointsOpacity;
        if (graphLines?.material) graphLines.material.opacity = eventTraceRestore.graphOpacity;
        if (growthLines?.material) growthLines.material.opacity = eventTraceRestore.growthOpacity;
        hubs?.children?.forEach((hub,i) => { if (hub.material && eventTraceRestore.hubOpacities[i] !== undefined) hub.material.opacity = eventTraceRestore.hubOpacities[i]; });
        controls.autoRotate = eventTraceRestore.autoRotate;
      }
      eventTraceRestore = null;
      eventTracePayload = trace || null;
      eventTraceIndex = -1;
      eventTracePreviousSnapshotRef = state.graphRef;
      if (!eventTracePayload?.stages?.length) return {ok:false,state:"TRACE_EMPTY"};
      const targetSnapshot = eventTracePayload.snapshotRef;
      if (targetSnapshot && targetSnapshot !== state.graphRef) {
        await loadGraph(targetSnapshot, "EVENT_TRACE_REPLAY");
      }
      return renderEventTraceStep(0);
    }

    async function playEventTrace(trace = null) {
      if (trace) {
        const loaded = await loadEventTrace(trace);
        if (!loaded?.ok) return loaded;
      }
      if (!eventTracePayload?.stages?.length) return {ok:false,state:"TRACE_NOT_LOADED"};
      pauseEventTrace();
      eventTracePlaying = true;
      const tick = () => {
        if (!eventTracePlaying) return;
        if (eventTraceIndex >= eventTracePayload.stages.length - 1) {
          eventTracePlaying = false;
          eventTraceTimer = null;
          return;
        }
        renderEventTraceStep(eventTraceIndex + 1);
        eventTraceTimer = setTimeout(tick, 650);
      };
      eventTraceTimer = setTimeout(tick, 650);
      return {ok:true,state:"TRACE_PLAYING",index:eventTraceIndex,total:eventTracePayload.stages.length};
    }

    async function clearEventTrace(options = {}) {
      pauseEventTrace();
      disposeEventTraceGroup();
      const previous = eventTracePreviousSnapshotRef;
      if (eventTraceRestore) {
        if (points?.material) points.material.opacity = eventTraceRestore.pointsOpacity;
        if (graphLines?.material) graphLines.material.opacity = eventTraceRestore.graphOpacity;
        if (growthLines?.material) growthLines.material.opacity = eventTraceRestore.growthOpacity;
        hubs?.children?.forEach((hub,i) => { if (hub.material && eventTraceRestore.hubOpacities[i] !== undefined) hub.material.opacity = eventTraceRestore.hubOpacities[i]; });
        controls.autoRotate = eventTraceRestore.autoRotate;
        dom["auto-toggle"]?.classList.toggle("active", controls.autoRotate);
      }
      eventTraceRestore = null;
      eventTracePayload = null;
      eventTraceIndex = -1;
      eventTracePreviousSnapshotRef = null;
      if (options.restoreSnapshot !== false && previous && previous !== state.graphRef) {
        await loadGraph(previous, "TRACE_RETURN");
      }
      if (dom["graph-classification"]) dom["graph-classification"].textContent = "SNAPSHOT · FROZEN BODY";
      return {ok:true,state:"TRACE_CLEARED",snapshotRef:state.graphRef};
    }

    async function seekEventTrace(index) {
      pauseEventTrace();
      return renderEventTraceStep(index);
    }

    async function loadTraceSnapshot(snapshotRef) {
      if (!snapshotRef) return {ok:false,state:"SNAPSHOT_REF_REQUIRED"};
      pauseEventTrace();
      await loadGraph(snapshotRef,"INSPECTOR_SNAPSHOT");
      return {ok:true,state:"SNAPSHOT_LOADED",snapshotRef:state.graphRef};
    }

    window.SETKA_EVENT_TRACE_BRIDGE = Object.freeze({
      version:"B2.4",
      ready:()=>Boolean(points && state.graph && nodeMap.size),
      load:loadEventTrace,
      play:playEventTrace,
      pause:pauseEventTrace,
      seek:seekEventTrace,
      next:()=>seekEventTrace(Math.min((eventTraceIndex < 0 ? 0 : eventTraceIndex + 1), Math.max(0,(eventTracePayload?.stages?.length || 1)-1))),
      prev:()=>seekEventTrace(Math.max(0,(eventTraceIndex < 0 ? 0 : eventTraceIndex - 1))),
      clear:clearEventTrace,
      loadSnapshot:loadTraceSnapshot,
      state:()=>({playing:eventTracePlaying,index:eventTraceIndex,total:eventTracePayload?.stages?.length || 0,snapshotRef:state.graphRef})
    });
    document.querySelectorAll(".mode-button").forEach((button) => button.addEventListener("click", () => {
      if (eventTracePayload) clearEventTrace({restoreSnapshot:false});
    }, {capture:true}));
'''

base.GRAPH_BRIDGE_INJECTION = base.GRAPH_BRIDGE_INJECTION + "\n" + TRACE_BRIDGE_INJECTION

class Handler(base.Handler):
    server_version = "SETKAFrontB2.4/1.0"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/b2/health":
            return self._json(200, {
                "ok": True,
                "state": "SETKA_LOCAL_FRONT_B24_READY",
                "commandTokenExposed": False,
                "semanticSpotlight": True,
                "presentationColorModes": ["GENERATION", "TYPE", "FAMILY"],
                "defaultLanguage": "ru-human",
                "eventInspector": "DETAILS_AND_REFS",
                "eventTrace": "EXPLICIT_RECORDED_ONLY",
                "traceIndex": True,
                "graphMutation": False,
                "canonMutation": False,
            })

        if path == "/api/b24/event":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                stream = q.get("stream", ["SYSTEM"])[0]
                mode = q.get("mode", ["INTEGRATION"])[0]
                event_no = int(q.get("event_no", [""])[0])
                device_ref, token = base.load_device()
                result = base.rpc("setka_minimal_front_b24_event_inspector_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_stream": stream,
                    "p_event_no": event_no,
                    "p_mode": mode,
                })
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {"ok": False, "state": "EVENT_INSPECTOR_BRIDGE_ERROR", "message": str(e)})

        if path == "/api/b24/traces":
            if not self._local_origin_ok():
                return self._json(403, {"ok": False, "state": "ORIGIN_DENIED"})
            try:
                q = urllib.parse.parse_qs(parsed.query)
                limit_value = max(1, min(int(q.get("limit", ["200"])[0]), 500))
                device_ref, token = base.load_device()
                result = base.rpc("setka_minimal_front_b24_trace_index_v1", {
                    "p_device_ref": device_ref,
                    "p_token": token,
                    "p_limit": limit_value,
                })
                return self._json(200, result)
            except Exception as e:
                return self._json(500, {"ok": False, "state": "TRACE_INDEX_BRIDGE_ERROR", "message": str(e)})

        return super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"SETKA LOCAL FRONT B2.4 · http://127.0.0.1:{args.port}/")
    print("SETKA LOCAL FRONT B2.4 · event inspector exposes recorded facts and refs")
    print("SETKA LOCAL FRONT B2.4 · trace renderer uses explicit recorded trace/replay only")
    print("SETKA LOCAL FRONT B2.4 · temporal connectors are presentation, not graph edges")
    print("SETKA LOCAL FRONT B2.4 · device token stays in macOS Keychain")
    print("SETKA LOCAL FRONT B2.4 · CANON mutation unavailable")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
