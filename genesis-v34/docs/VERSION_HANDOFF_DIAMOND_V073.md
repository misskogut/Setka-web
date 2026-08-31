# Diamond v0.7.3 — Pencil Interaction Recorder Handoff

## Purpose
Allow the President to demonstrate a UI path without explaining every tap in text. One pencil button records the actual pointer/finger path through the President cabinet, saves it separately, assigns a short Trace ID, and allows later replay/reference.

## Working version
- Checkpoint: `diamond-v0.7.3`
- Front: `diamond-president-v0.7.3`
- URL: `https://misskogut.github.io/Setka-web/diamond-president-v073.html`
- Functional base: tablet-landscape control room v0.7.1
- API: `setka-diamond-president-v3@4` / API version 8

## Interaction contract
1. Tap `✎` once → recording starts.
2. Continue using the real President UI normally.
3. Tap `✎` again → recording stops and auto-saves.
4. A short ID such as `TRACE-XXXXXXXX` is returned.
5. Recent traces appear in the right inspector and can be replayed or copied for reference.

The recorder is passive. It must never substitute or block normal UI interactions, confirmations, access checks, or mutations.

## Recorded facts
- pointer down / move / up / cancel
- pointer id and pointer type, supporting multiple simultaneous fingers
- normalized and absolute pointer position
- timestamps relative to trace start
- active President tab
- semantic target when available: tab, floor, cabinet, node, edge, element id, button label
- central work-area scroll position
- viewport dimensions / DPR / orientation
- summary: start/end tab, unique semantic targets, pointer types

## Explicitly NOT recorded
- values entered in inputs, textareas, or selects
- President Key or any credential value
- arbitrary page text except bounded labels needed to identify clicked controls
- screenshots, video, microphone, camera

## Storage and authority
Canonical table: `diamond.interaction_traces`.

Access is only through President-session-gated RPCs exposed to service role:
- `diamond_trace_save`
- `diamond_trace_list`
- `diamond_trace_get`

Direct `anon` and `authenticated` execution is revoked. RLS is enabled with no public policies. Trace saves are audit logged by the President gateway.

Payload limits:
- max 12,000 events per trace
- max ~2 MB JSON event payload

## Trace references
The UI can copy a short phrase such as `Посмотри запись TRACE-XXXXXXXX`. A future engineering/Work pass should resolve that Trace ID through the protected President trace gateway rather than relying on screenshots or chat reconstruction.

## Replay semantics
Replay is a visual overlay using normalized coordinates and recorded scroll positions. It is explanatory playback only; it MUST NOT re-execute the original mutations or clicks.

## Version-history note
`diamond-v0.7.2` is retained as a failed historical checkpoint. Its Pages artifact deployed, but its first pencil loader contained a nested JavaScript/template injection defect. It was archived instead of being silently overwritten.

v0.7.3 corrected the loader and then fixed a trace-list helper collision found by browser smoke testing.

## Verification completed
- GitHub Pages deployment passed for corrected v0.7.3 source.
- Real Chromium President-shell smoke passed: login shell loads, loader is replaced, `✎` exists, and there are no page errors.
- Trace RPC permissions verified: anon=false, authenticated=false, service_role=true.
- Black Box pointer and Diamond working checkpoint point to v0.7.3.
- Public Production remains `public-new-chat-v1.1`.

## Verification intentionally pending
Authenticated end-to-end trace save/list/get/replay with the real President credentials was not executed during this build because no current authorization/codeword was supplied for credential use. Do not infer successful authenticated trace persistence until that test is performed.

## Work review follow-ups
- Materialize derived President fronts instead of loader-composing from v0.7.1 for stronger artifact immutability.
- Add optional trace annotation/title after save without making annotation mandatory.
- Add version-aware replay mapping when layout changes substantially between President versions.
- Consider a trace-to-test conversion flow: selected gesture path → synthetic scenario candidate → Preview simulation, never automatic Production mutation.
