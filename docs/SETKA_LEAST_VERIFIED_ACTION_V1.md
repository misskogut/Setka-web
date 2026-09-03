# SETKA Least Verified Action Principle v1

Status: KERNEL DESIGN CONTRACT / OFFLINE GITHUB IMPLEMENTATION ONLY.
Origin: President + ✎ Solai optimization session, 2026-09-03.

## 1. Purpose

SETKA needs one upper optimization law that unifies storage compression, incremental computation, local materialization, connector choice, branch evaluation, privacy minimization and resource-aware execution.

The physical analogy is the principle of stationary action, Fermat-style optical path optimization and variational problems such as the brachistochrone. The analogy is architectural, not a claim that every natural system globally minimizes one scalar utility.

Canonical SETKA rule:

> **Among causally, safely, legally and technically admissible paths to an allowed outcome, prefer the path with the lowest verified total action under the declared cost contract.**

Working name:

**Least Verified Action (LVA).**

## 2. Physical analogy and strict boundary

Hamilton's principle is commonly written

`delta S = 0`

with

`S = integral L dt`.

The physical path makes action stationary; it is not correct to simplify all physics to “nature always chooses the globally cheapest option.” SETKA therefore does not copy the physics formula literally. It borrows the variational architecture:

`candidate paths -> admissibility constraints -> path functional -> local/global comparison`.

For SETKA the engineering decision is usually minimization among known verified admissible alternatives:

`gamma* = argmin A_SETKA(gamma), gamma in Gamma_valid`.

The word **verified** is mandatory: missing safety, causal, privacy, provenance, authority or measurement semantics must not be converted into a low numeric score.

## 3. Admissible path first, cost second

A path is not eligible for optimization until all required hard constraints pass.

Typical hard constraints include:

- causal completeness for irreducible facts;
- required replay exactness;
- provenance/branch lineage preservation;
- safety invariants;
- privacy/disclosure policy;
- authority/permission policy;
- recoverability requirements;
- active cryosleep/recovery gates;
- declared numerical/runtime semantics where exactness is claimed.

Decision order:

`HARD CONSTRAINTS -> EVIDENCE COMPLETENESS -> COST NORMALIZATION -> ACTION COMPARISON -> CANDIDATE -> VERIFY -> COMMIT`.

A path that deletes required history is not “cheaper.” It is **inadmissible**.

## 4. SETKA action functional

Different resources use different units and MUST NOT be naively added as raw numbers. Each cost dimension is normalized by a declared reference/budget before weighting.

For a path gamma split into segments j and resource dimensions k:

`A_SETKA(gamma) = sum_j sum_k w_k * (fixed_jk + duration_j * rate_jk) / reference_k`.

Candidate cost dimensions include:

- COMPUTE;
- STORAGE_IO;
- CANONICAL_STORAGE;
- NETWORK;
- AI;
- LATENCY;
- ENERGY;
- MONEY;
- COORDINATION;
- MATERIALIZATION;
- PRIVACY_EXPOSURE only inside already-permitted disclosure bounds.

`reference_k > 0` defines the normalization scale for that resource and `w_k >= 0` declares current mission preference. A weight is policy, not a physical constant, and must be versioned when mission economics change.

## 5. No trade of truth or safety for efficiency

Correctness, required exactness, causal completeness, safety, authority and privacy limits are constraints, not ordinary weighted costs.

Forbidden shortcut:

`lower bytes + lost irreversible cause -> reject`.

Allowed optimization:

`same verified causal result + fewer bytes -> prefer`.

The same distinction applies to compute, latency, AI use and disclosure.

## 6. Whole-path optimization, not shortest-step greed

The shortest or locally cheapest next step is not necessarily the least-action path over the mission horizon.

The brachistochrone analogy is useful: a path may initially move in a direction that looks locally more expensive yet reach the destination sooner overall.

SETKA therefore allows one-time investment when the verified integrated action over the declared horizon is lower, for example:

- build an index now to avoid repeated scans later;
- create a checkpoint now to reduce future replay cost;
- materialize a reusable verified result once;
- create a local deterministic primitive to avoid repeated AI calls;
- pay a connector setup cost when later execution is materially cheaper;
- precompute a safe shared structure when many branches will reuse it.

Every such decision must include its evaluation horizon and setup cost. Otherwise an optimizer can falsely label deferred cost as savings.

## 7. Counterfactual path selection

SETKA's branch runtime is the natural place to evaluate alternatives:

`shared causal prefix -> branch gamma_1 / gamma_2 / ... -> verify constraints -> estimate/measure A_SETKA -> choose or request review`.

The rejected branch need not become canonical history unless its experiment/result is itself an irreversible fact required by policy.

A branch comparison must record enough provenance to reproduce the decision inputs and cost contract.

## 8. Delta-action and replanning

When the world changes, SETKA should not blindly recompute the whole plan.

If a bounded causal delta changes only part of the cost landscape:

`previous plan + causal delta -> affected cost/dependency region -> recompute candidate action locally -> keep or re-route`.

This connects LVA directly to Computational Irreducibility.

A local stationarity diagnostic may compare a current path with valid neighboring perturbations:

`delta A = A(neighbor) - A(current)`.

If a verified neighbor has materially lower action, the current path is not locally optimal under the current contract.

Absence of a better sampled neighbor is **not proof of global optimality**.

## 9. Relation to existing SETKA laws

LVA is an upper selector over existing organs rather than a replacement for them.

- Causal Irreducibility asks what information must survive.
- Structural Irreducibility asks what structure must be explicit.
- Computational Irreducibility asks what must actually be recomputed.
- Minimum Sufficient Disclosure asks what must leave the local contour.
- Least Verified Action asks which admissible combination of those mechanisms yields the lowest verified total mission cost.

Canonical synthesis:

> **Do not store what can be proven and replayed. Do not enumerate what can be generated. Do not recompute what can be derived from a verified delta or reusable result. Do not disclose what the recipient does not need. Among the remaining valid paths, choose the least verified action.**

## 10. Execution-planner integration

The future execution planner should evaluate candidate plans in this order:

1. reject hard-constraint failures;
2. send UNKNOWN hard constraints or unknown evidence semantics to review;
3. normalize measured/declared resource dimensions;
4. compute action for comparable paths;
5. retain Pareto information so a single weight choice does not erase trade-offs;
6. select the minimum-action verified path under the current policy;
7. verify invariants on a branch when the operation is state-changing;
8. commit only after the existing SETKA mutation/replay/provenance gates pass.

Candidate routes may include replay, cache, incremental recomputation, local materialization, index/sparse lookup, local deterministic compute, external connector or a hybrid path.

## 11. Pareto frontier before scalar winner

A weighted scalar is useful for a concrete decision, but SETKA should preserve whether alternatives are Pareto-dominated.

Path A dominates path B when A is no worse on every declared normalized cost dimension and strictly better on at least one, with identical hard-constraint status.

A dominated candidate can usually be removed before choosing weights.

If two candidates remain non-dominated and the policy does not define sufficient weights/preferences, the result is `REVIEW_REQUIRED`, not an invented optimum.

## 12. Evidence semantics

Every cost value used for a consequential choice should declare one of:

- MEASURED;
- DERIVED_EXACT;
- ESTIMATED_BOUNDED;
- ESTIMATED_UNBOUNDED;
- UNKNOWN.

`ESTIMATED_UNBOUNDED` and `UNKNOWN` cannot silently win a canonical consequential decision because they appear numerically small.

Decision-relevant external prices, observed latency, energy readings or other non-reproducible measurements are irreducible inputs and must be preserved according to the normal causal policy if the decision depends on them.

Purely deterministic action totals are derived and may be rematerialized from the preserved evidence and policy version.

## 13. Optimization examples

The same LVA selector can compare:

- full ship unfold vs local sector unfold;
- dense storage vs verified fold/unfold representation;
- full recompute vs causal delta propagation;
- duplicated branch histories vs content-addressed structural sharing;
- repeated AI call vs deterministic cached/replayed result;
- central raw-data transfer vs local compute plus minimum sufficient disclosure;
- native subsystem vs connector vs hybrid execution;
- uniform fractal refinement vs verified adaptive refinement;
- immediate cheap action vs setup investment plus lower recurring cost.

This is the intended link to the project's Crown Mission: optimization is not a collection of tricks but a repeatable constrained path-selection law.

## 14. Metrics

Track at least:

- verified action per successful outcome;
- action reduction versus baseline plan;
- invalid/inadmissible candidates rejected before cost comparison;
- fraction of decisions with complete cost evidence;
- Pareto-dominated candidates removed;
- replanning fraction after causal delta;
- setup investment payback horizon;
- CPU/storage/network/AI/latency/energy/money saved per verified result;
- safety/privacy/causal violations introduced by optimization: target zero.

## 15. Current implementation boundary

This v1 contract defines a deterministic offline evaluator for bounded candidate plans and tests its semantics. It does not claim a global optimizer, continuous calculus-of-variations solver, autonomous production scheduler or live Supabase execution planner.

No PostgreSQL/Supabase write, migration, fleet wake-up or cryosleep change is authorized by this contract. Existing recovery and governance gates remain authoritative.
