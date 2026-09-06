# SETKA · Бортовой самописец · GitHub sensor V1

STATUS: ACTIVE_PASSIVE_SENSOR
PARENT: `ops/SETKA_FLIGHT_RECORDER_V1.md`

## Canonical meaning

This is **not a second Flight Recorder**.

It is the code/stem-cell sensor of the same logical **Бортовой самописец / Flight Recorder**.

`BLACK BOX` remains the protected SETKA / VERSTAK intellectual system.

## Native RAW

Do not copy Git history into a second SETKA raw store.

For repository code evolution, native Git/GitHub history is already the raw evidence layer:

- commit SHA;
- parent SHA(s);
- branch/ref;
- committed timestamp;
- changed file paths and diff/stat;
- workflow run/job/log references when they exist.

A SETKA session/report/transcript may store only compact evidence references such as commit SHA / workflow run ID when correlation is known.

## Separation of surfaces

`GITHUB_CODE_HISTORY` = code-side consequence and is natively observed by Git history.

`GITHUB_CONNECTOR_EXTERNAL` = the ChatGPT Work connector invocation itself. It remains UNINSTRUMENTED unless the platform exposes a trusted execution hook.

Do not infer connector calls from commits. A commit proves a repository mutation, not which hidden tool path caused it.

## Cross-sensor correlation

When known, correlate:

`actor/sessionRef -> code change -> commit SHA -> regression/workflow evidence -> runtime effect`

Missing correlation is `UNKNOWN`, never invented.

## Retention

Git remains the repository's native source of code lineage. SETKA must not duplicate whole diffs/logs into the database merely for observability.

## Cryosleep guard

While `ops/SETKA_CRYOSLEEP.yml` denies scheduled external writes/autonomous runs, do not add an autonomous push/schedule workflow merely for recorder telemetry. Native Git history remains the passive sensor. Any future active GitHub adapter must obey the current cryosleep/resume policy.
