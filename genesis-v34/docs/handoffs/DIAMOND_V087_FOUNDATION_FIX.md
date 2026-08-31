# Diamond President v0.8.7 — foundation cleanup

Date: 2026-08-26
Status: stable Black Box checkpoint
Parent: `diamond-v0.8.6`
Public Production: unchanged (`public-new-chat-v1.1`)

## Why this version exists

The iPhone review of v0.8.6 exposed three foundation-level interface failures before the President Cabinet had grown further:

1. Architecture SVG wires escaped the intended blueprint workspace and rendered over unrelated tabs. Re-layout after taps, swipes and scrolling made the wires appear to be created by user gestures.
2. The research shell showed a historical version selector (`v0.8.4`) while the live system chip showed `diamond-v0.8.6`, creating two competing meanings of “current version”.
3. RU was selected while dynamic System-layer labels and descriptions still appeared in English.

The first remediation attempt also exposed a process problem: a runtime JavaScript syntax error could reach Pages before any syntax gate existed. A later remediation used an over-broad DOM observer that could feed back on its own translations. Both were caught before v0.8.7 was promoted.

## Root causes

### Leaked architecture SVG
Architecture connections were treated as a visual overlay rather than as a child of the dedicated architecture workspace. This violated containment: a visual representation of architecture could survive outside the architecture mode.

### Version ambiguity
Research/version navigation and the active working checkpoint were displayed together as if both represented current runtime state. Historical browsing belongs in Versions; the working header must have one source of truth.

### Partial localization
The base i18n dictionary covered primary interface strings but not several dynamic System-layer names, statuses and descriptions. RU therefore became a mixed-language mode.

### Missing pre-browser syntax gate
The initial v0.8.7 remediation runtime contained a syntax error in `watchTabs()`. Browser smoke alone was too late and too opaque for this class of failure.

## What v0.8.7 changes

- `Живой чертёж` is the dedicated architecture workspace inside `#tab-blueprint`.
- The only architecture-wire SVG is `#bp87wires`, physically contained inside that tab.
- Leaving the blueprint tab clears its wire paths.
- System and other tabs are asserted to contain no leaked wire/trace SVG.
- Research path recording remains data capture only; there is no canvas, pointer trail or visible gesture drawing.
- The duplicate top historical-version selector is removed from the working shell. Version history remains in `Версии`.
- Root, navigation and the reviewed System runtime strings receive Russian UI coverage when RU is active.
- The President runtime receives a mandatory `node --check` gate before browser smoke.

## Stabilization evidence

GitHub Pages deployment:
- Run `32966372144` — success

Diamond v0.8.7 smoke:
- Run `32966372161` — success
- Runtime syntax gate — success
- `canvas = 0`
- Live Blueprint workspace exists inside `#tab-blueprint`
- Blueprint SVG exists inside that tab
- System leaked SVG count = `0`
- Root badge is Russian
- Blueprint navigation label is Russian
- reviewed English System headings count = `0`
- page errors = `0`

Release source:
- `github:misskogut/Setka-web@075fa725044b985e6ffea506b0e6afb19455f36d:diamond-president-v087.html`

## New hard rules for President fronts

A President front must not be marked stable unless all of the following pass:

1. Runtime JavaScript syntax gate.
2. Browser smoke on the deployed Pages artifact.
3. No global trace canvas or visible pointer-path renderer.
4. No architecture SVG outside the dedicated architecture workspace.
5. RU smoke for root/navigation and the reviewed dynamic screen when RU is active.
6. One unambiguous working-version indicator in the operational header.

## What did not change

- President authentication and capabilities.
- Canonical architecture facts and edges.
- SETKA Flow authority model.
- Public product and Production pointer.
- Historical checkpoints.

## Remaining verification

The automated browser smoke is structural and deterministic, but it is not a real-device iPhone/Safari interaction session. The next manual verification should specifically tap, swipe and scroll through System, Flow, Versions and Live Blueprint on iPhone and confirm that no wire/trace layer appears outside Live Blueprint and that no important RU surface falls back to English.
