# SETKA · FRONT B2.9 · SIMPLE SURFACE CONTRACT

## Visible surface

The default Mac workbench intentionally exposes only four user-facing concepts:

1. Graph
2. Onboard computer
3. Transcript
4. Branch selector

Everything else from B1/B2.3/B2.5/B2.7/B2.8 remains hidden from the normal surface until it is deliberately reintroduced.

## Graph

Default view: BODY.

BODY shows the exact cached body snapshot for the selected version / branch baseline.

Optional graph view: STRUCTURE.

STRUCTURE shows the global backend object/relation index and is explicitly labelled as a system map, not as the body.

Permanent graph controls:
- Links
- Center
- Root
- View: Body / Structure

Zoom / pan / rotate are direct pointer/trackpad interactions and do not require extra buttons.

## Onboard computer

The onboard computer is a human-facing summary of the selected context.

Initial B2.9 contents:
- current system version;
- selected branch;
- human-readable state;
- explicit notice when several branches share the same body snapshot;
- simple search over the real system index.

Technical refs and backend status codes are hidden from the default surface.

## Transcript

The transcript is closed by default and opens on demand.

Two simple filters:
- Whole system
- This branch

Events are rendered in human language where a known mapping exists. Raw technical payloads are not shown on the default surface.

## Branches

The simple selector exposes the five primary parallel branch baselines:
- Canon
- Linear
- Self-organization
- Motorways
- Integration

B2.9 never fabricates different body topology when the backend points those branches to the same body snapshot.

## Information buttons

Graph, Onboard computer, Transcript and Branch selector each have a small `i` explanation written in plain Russian.

## Hidden legacy surface

B2.9 hides from the default workbench:
- B2.5 / B2.8 version badges;
- LOCAL BACKEND counters;
- graph loading/status chips;
- LIVE channel badge;
- raw mode strip;
- developer graph statistics;
- command dock STATUS / SNAPSHOT / GRAPH / EVENTS / REPORT;
- RUS/SYS engineering switch;
- B2.7.4 layout UI and vault;
- B2.8 structure explorer panel;
- raw source bar and debug classifications.

These mechanisms may remain loaded underneath for compatibility, but they are not user-visible.

## Safety

B2.9 is a presentation reset.

- CANON mutation: false
- runtime mutation: false
- backend data deletion: false
- mirror policy change: false
- COLD experiment RAW remains remote
