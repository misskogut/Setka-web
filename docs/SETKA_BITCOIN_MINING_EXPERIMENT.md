# SETKA — Bitcoin Mining Experiment

Status: FUTURE RESEARCH EXPERIMENT / NOT YET IMPLEMENTED / NO LIVE MINING SPEND AUTHORIZED.

Purpose: preserve a future research branch for testing whether SETKA can make Bitcoin mining cheaper, faster or more profitable by improving search organization, resource allocation, hardware control and system-level efficiency while keeping cryptographic claims separate from operational optimization.

## Core research question

> **Can SETKA reduce the real cost per accepted Bitcoin mining result by discovering what part of the total mining process is genuinely irreducible SHA-256d work and what part is avoidable system overhead, poor search organization, energy waste, latency, thermal loss, downtime or unnecessary dependency?**

Do not assume a SHA-256 shortcut exists. Treat that as a high-risk hypothesis to be tested against strict controls.

## Three distinct layers — do not mix them

1. **Cryptographic search layer** — does a SETKA-guided nonce/header search produce more low hashes per equal number of real SHA-256d evaluations than an unbiased control?
2. **Mining orchestration layer** — can SETKA schedule, partition and coordinate a fleet without overlap, stale work or avoidable idle time?
3. **Economic/physical layer** — can SETKA improve accepted work per joule, dollar, hardware-hour or hardware lifetime through better control of electricity, temperature, voltage/frequency, cooling, pool latency, downtime and maintenance?

A gain at layer 2 or 3 is valuable even if layer 1 shows no cryptographic shortcut.

## Fleet experiment

SETKA fleet should be used as a hypothesis/search coordinator, not confused with physical hash power.

Logical ships may cheaply explore many candidate search policies, parameter regimes and control strategies. Real SHA-256d checks must still be counted as physical work on CPU/GPU/ASIC hardware.

Canonical comparison:

`CONTROL FLEET = unbiased/random or standard nonce/search scheduling`

`SETKA FLEET = SETKA-selected search regions / policies / adaptive scheduling`

Both receive:

- the same block/header inputs;
- the same number of real SHA-256d evaluations;
- the same target/difficulty definition;
- the same hardware class where applicable;
- the same time/energy budget where applicable.

Primary cryptographic question:

> **Does SETKA obtain a statistically reproducible increase in useful low-hash outcomes per equal number of SHA-256d attempts?**

If no, the SHA search should be treated as practically irreducible under the tested conditions and delegated to ASIC hardware.

## Hypotheses worth testing

### H0 — null cryptographic hypothesis

Nonce/header candidate selection by SETKA is no better than unbiased search after equalizing the number of SHA-256d evaluations.

This is the default expectation and must be preserved as a real possible result.

### H1 — search-organization efficiency

SETKA can reduce duplicated, stale or overlapping search work across a fleet even without changing SHA-256 probability.

### H2 — non-hash overhead compression

A meaningful fraction of total mining cost is outside SHA-256d itself and can be reduced by causal optimization of scheduling, networking, power, cooling, maintenance and control.

### H3 — adaptive ASIC operating point

SETKA can find better dynamic voltage/frequency/temperature operating policies than a static configuration for a chosen objective such as joules per accepted share, profit per hardware-hour or lifetime-adjusted yield.

### H4 — wear-aware mining

Maximum instantaneous hashrate is not always maximum lifetime profit. SETKA should model degradation, thermal cycling, fan/pump wear, hashboard error rates and maintenance probability as causal state.

### H5 — energy-aware scheduling

If electricity price or available power changes over time, SETKA can shift operating intensity to cheaper periods or available surplus while preserving hardware health.

### H6 — pool/network efficiency

SETKA can reduce stale/rejected shares and dead time through better pool selection, connection handling, job switching and latency-aware orchestration.

### H7 — mixed-hardware routing

A heterogeneous fleet may outperform a single policy when SETKA routes work according to each device's efficiency, thermal state, age, fault profile and energy cost.

### H8 — heat as a recoverable output

Where physically useful, waste heat can be treated as a secondary product rather than pure loss. Evaluate only with a real use case; do not count theoretical heat value as profit.

### H9 — capability compression

SETKA should test whether a large external mining-management stack can be reduced to a smaller native control primitive after its useful capability has been observed and benchmarked.

### H10 — possible SHA structure

Test whether any SETKA-derived candidate-selection rule produces persistent statistical bias toward lower hashes across independent block headers.

This is the strongest and least likely hypothesis. Any apparent effect must survive preregistration, holdout headers, negative controls, multiple seeds, repeated trials and independent reproduction before being treated as anything beyond noise.

## Additional places to look for cheap/profitable gains

- **accepted shares per joule**, not only raw TH/s;
- **accepted shares per dollar of electricity**;
- **profit per hardware-hour**;
- **profit per expected hardware lifetime**;
- undervolting/underclocking versus overclocking regimes;
- dynamic frequency by temperature and board condition;
- chip/hashboard-level error-rate asymmetry;
- cooling efficiency and temperature variance;
- thermal transients and restart costs;
- fan/pump power and failure risk;
- stale/rejected share rate;
- pool latency and failover time;
- job-switch latency;
- connection outage recovery;
- firmware overhead and control-loop frequency;
- search-range collision/duplication across workers;
- idle periods between jobs;
- energy tariff/load-shifting opportunities;
- curtailment or surplus-energy operation where available;
- maintenance timing and predictive failure;
- spare-parts inventory versus downtime;
- mixed-age fleet scheduling;
- residual value / replacement timing of hardware;
- transaction-fee and block-template economics where the mining setup actually controls them;
- optional useful heat recovery when a real consumer of heat exists.

## Metrics

Keep cryptographic, physical and economic metrics separate.

### Cryptographic/search metrics

- real SHA-256d evaluations;
- minimum hash observed;
- count below fixed comparison thresholds;
- success frequency per fixed attempt count;
- distribution of hash outputs;
- duplicate/overlapping candidate rate;
- effect size versus randomized control;
- confidence intervals / preregistered significance criteria;
- replication across independent headers.

### Physical metrics

- TH/s;
- joules per TH;
- accepted shares per kWh;
- chip/hashboard error rate;
- temperature mean/variance;
- cooling power;
- uptime/downtime;
- restart/recovery latency;
- stale/rejected shares;
- hardware fault/repair rate.

### Economic metrics

- electricity cost per accepted share;
- total operating cost per accepted share;
- revenue per kWh;
- gross margin per hardware-hour;
- expected lifetime profit;
- maintenance cost;
- downtime cost;
- pool/fee cost;
- capital payback period;
- heat-recovery credit only when actually realizable.

## Causal model for each ASIC/miner entity

Each physical miner should be represented as a long-lived SETKA entity with at least:

`IDENTITY + MODEL + AGE + CHIP/HASHBOARD STATE + FIRMWARE + VOLTAGE + FREQUENCY + TEMPERATURE + COOLING + POWER + HASHRATE + ERROR RATE + POOL/LATENCY + ACCEPTED/REJECTED SHARES + MAINTENANCE + FAILURE HISTORY + ENERGY PRICE + CONTROL POLICY`

Preserve causal changes and irreversible observations; do not permanently store every high-frequency telemetry sample when intervals/aggregates plus raw evidence archive are sufficient for replay and analysis.

## Experimental progression

### Phase 0 — offline proof harness

- implement Bitcoin SHA-256d test vectors and block-header construction;
- prove correctness against known vectors;
- build unbiased baseline search;
- build SETKA fleet partitioning with guaranteed non-overlap;
- define preregistered metrics and negative controls;
- no live mining economics yet.

### Phase 1 — cryptographic simulation / CPU-GPU lab

- equal-attempt comparisons across many historical headers;
- test candidate-selection hypotheses;
- preserve failed hypotheses;
- do not infer advantage from wall-clock speed unless hardware work is equalized.

### Phase 2 — telemetry replay

Use historical/public or owned miner telemetry to test power/thermal/pool/control policies without risking hardware.

### Phase 3 — one-ASIC shadow controller

SETKA observes a real ASIC and generates recommendations while the existing controller remains authoritative. Compare predicted versus observed outcomes before giving control authority.

### Phase 4 — bounded canary control

Only after shadow evidence, allow a narrow safe operating envelope with hard temperature/power/frequency guards and immediate rollback.

### Phase 5 — fleet optimization

Scale only after a single-device result is reproducible. Compare SETKA-controlled fleet versus baseline over matched energy/hardware/time windows.

## Scientific guardrails

- preregister the hypothesis and scoring rule before exposing holdout results;
- use negative/random controls;
- equalize actual SHA-256d attempts for claims about search advantage;
- keep operational efficiency claims separate from cryptographic claims;
- do not treat a visually interesting pattern as evidence;
- do not tune on the holdout set;
- preserve failed experiments;
- require independent replication for any claimed nonce/search bias;
- distinguish statistical significance from economically meaningful gain;
- include hardware wear and energy cost in profitability claims;
- never extrapolate a simulator-only gain directly to real ASIC profit.

## SETKA-specific research question

This experiment should explicitly ask:

> **Where is the Causal Irreducibility Boundary of Bitcoin Proof-of-Work?**

Possible outcome A:

`SHA-256d search is effectively irreducible -> use ASIC as a connector/physical organ -> optimize everything around it.`

Possible outcome B:

`SETKA finds a reproducible organization/control advantage -> compress non-hash cost and improve economic mining efficiency.`

Possible outcome C:

`SETKA finds reproducible lower-hash bias per equal SHA attempts -> escalate to rigorous cryptographic research before any practical claim.`

All three outcomes are useful.

## Relationship to kernel mission

This is an experiment, not a new mandatory kernel mission. It should reuse:

- fleet/runtime abstraction;
- causal replay and sparse storage;
- Mission Gate / Pre-scale Gate;
- resource physics;
- connector neutrality;
- self-diagnostics;
- capability assimilation.

The preferred architecture is:

`SETKA = causal optimizer / experimenter / controller`

`ASIC = replaceable SHA-256 physical organ`

The objective is not to imitate ASIC in software. The objective is to discover whether SETKA can reduce the total irreducible work, reduce avoidable surrounding work, or operate the physical organ more economically.

## Activation rule

Do not buy hardware, spend on electricity, deploy a live mining controller or authorize a live mining pool connection merely because this document exists. Activate live phases only through an explicit later decision with defined budget, hardware, safety envelope and benchmark protocol.
