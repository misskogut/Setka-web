# SETKA President — Russian Display Contract

Status: canonical human-interface rule for President / administrative surfaces.

## Core law

SETKA keeps **English as the canonical machine/architecture language**, while the Russian President interface must present **Russian meaning by default**.

The President must not be forced to decode internal English terminology in RU mode.

## Separation

For a canonical system entity, keep two layers:

- machine/canonical identity: English stable key or English canonical name;
- human RU display: clear Russian label and description.

Example:

- canonical: `PRESIDENT_ROOT`
- RU display: `Президент / корневой доступ`

- canonical: `BLACK_BOX`
- RU display: `Чёрный ящик`

- canonical: `SIMULATION`
- RU display: `Симуляция`

- canonical: `RUNTIME`
- RU display: `Рабочее подключение`

The Russian translation must not overwrite or mutate the canonical key.

## Visual semantics

When Russian text represents a canonical SETKA entity rather than ordinary prose, the UI may give it a stronger visual weight (for example brighter text / higher font weight). This communicates that the label is an architectural object without exposing English jargon.

The canonical English name may be available through metadata, inspector, EN mode, or a non-intrusive hint/tooltip. It should not dominate RU mode.

## Prohibited behavior in RU mode

Do not expose unexplained English labels such as:

- VIEWING
- WORKING
- TRACES
- BLACK BOX
- SIMULATION
- DRAFT
- RUNTIME
- GUARDRAIL

when a stable Russian semantic label exists.

Technical identifiers may remain visible only when they are themselves needed as identifiers, and should be accompanied by a Russian explanation when ambiguity is possible.

## Versioning requirement

Every new President version must preserve this contract. Localization regressions are UI defects and should be caught by smoke/E2E checks where practical.

## Truth rule

Translation is presentation. Canonical identity remains machine-readable and stable across languages, versions, migrations and recovery.
