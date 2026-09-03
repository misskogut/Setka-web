# SETKA Generative Ship Geometry v1

Status: KERNEL DESIGN CONTRACT / OFFLINE GITHUB IMPLEMENTATION ONLY.
Origin: President + ✎ Solai geometry session, 2026-09-03.

## 1. Core thesis

A SETKA ship should not be canonically represented as a permanently materialized mesh or a manually stitched collection of coordinates. The preferred representation is a compact generative mathematical object whose visible/working geometry can be unfolded when required and folded again after use.

Canonical idea:

`FOLDED SHIP = IDENTITY + GENESIS + LAW + PARAMETER DOMAINS + VARIABLES + COUPLING LAW + CAUSAL PATCHES + NUMERIC/REPLAY CONTRACT + PROOFS`

`UNFOLDED SHIP = deterministic materialization of the required sector(s) from that compact state`

The system edits causes/parameters/addresses and then regenerates the affected geometry. It does not treat an already-rendered drawing as the source of truth.

## 2. Quadratic family as the current candidate generator

The current candidate mathematical family is:

`Q_c(z): z_(n+1) = z_n^2 + c`

with complex parameter:

`c = c_re + i*c_im`

and complex dynamical state:

`z = z_re + i*z_im`.

For Mandelbrot membership the canonical critical orbit starts from `z_0 = 0` and asks whether the orbit remains bounded.

The `c` plane is parameter space. The orbit of `z` is dynamical state under that parameter.

For a fixed declared initial condition and numerical contract, every `c` defines one canonical orbit/dynamics. This MUST NOT be simplified to the false claim that every `c` has one stable scalar fixed point. Depending on `c`, the long-term behavior may be a fixed point, periodic cycle, more complicated bounded regime, neutral/boundary behavior, or escape.

## 3. Relationship to logistic bifurcation

The real logistic family

`x_(n+1) = r*x_n*(1-x_n)`

is conjugate to a real slice of the quadratic family through the change of variables

`z_n = r*(1/2 - x_n)`

with parameter mapping

`c = r*(2-r)/4`.

Under this transform:

`z_(n+1) = z_n^2 + c`.

Therefore the familiar period-doubling bifurcation cascade and the real quadratic family are two views of the same underlying dynamical family. In SETKA, the working visual label **Mandelbrot antenna** may be used for the coupled parameter/dynamic visualization, but the kernel contract relies on the equations and mappings above rather than on the label.

## 4. One mathematical object, multiple projections

The exact combined state is naturally four-dimensional:

`P = (Re(c), Im(c), Re(z), Im(z))`.

A three-dimensional UI is therefore a projection, not the whole mathematical object.

Canonical parameter-plane axes:

- `X = Re(c)`;
- `Y = Im(c)`.

The displayed `Z` axis is a selectable diagnostic/materialization lens. Valid candidate lenses include:

- attractor/orbit state;
- period;
- Lyapunov estimate;
- escape time;
- convergence/recovery rate;
- activity;
- ship age or another explicitly derived ship variable.

The UI MUST preserve which projection/lens produced a rendered geometry so a 3D view is never mistaken for the full four-dimensional state.

## 5. Dynamic fibers and “ghost petals”

Over each parameter location `c`, SETKA may treat the corresponding orbit/dynamic regime as a **dynamic fiber**:

`c -> O(c)`.

A fiber does not need to be permanently materialized. When its generator inputs are complete and reproducible it may remain in state:

`GHOST / FOLDED = mathematically available, not currently expanded`.

When required:

`UNFOLD(c, interval, lens) -> materialized local dynamic geometry`.

After bounded computation/inspection:

`SEAL required evidence -> DROP derived materialization -> return to FOLDED/GHOST`.

The project metaphor “ghost petals” refers to these unmaterialized but reproducible local fibers. It is an implementation/visualization term, not a claim of a separate mathematical object.

## 6. Dynamic passport

For a parameter/sector, SETKA may derive a compact dynamic passport:

`D(c,t) = { regime_class, period, attractor_summary, lyapunov, escape_time, convergence_rate, ... }`.

The passport is derived evidence unless a field contains irreducible external information. Exactness/approximation status and algorithm version MUST be explicit per field.

A dynamic passport is a better canonical concept than “one stable solution per c”: one `c` has one declared canonical dynamics, while its long-term representation may contain multiple orbit points or a nontrivial regime.

## 7. Ship anatomy as parameter domains

A ship part/organ is represented as a declared domain plus generator/coupling semantics rather than a permanently stored mesh:

`SECTOR = ID + DOMAIN_IN_C_SPACE + LOCAL_PARAMETERS + LAW_VERSION + COUPLING_REFERENCES + CAUSAL_PATCHES + PROOF_METADATA`.

A ship is a set/hierarchy of such domains under one compatible geometry contract.

This allows a sector to be unfolded independently. The rest of the ship may remain folded.

Example materialization state:

`SHIP`
`|- hull: FOLDED`
`|- engine: UNFOLDED`
`|  |- core: UNFOLDED`
`|  '- cooling: FOLDED`
`'- sensor: GHOST`.

## 8. Fold / unfold contract

`FOLD(sector)` is lossless only when all information required for exact regeneration is already preserved: generator law/version, parameter domain, variables, causal patches, numerical semantics, required coupling inputs, boundaries/checkpoints and verification hashes.

`UNFOLD(sector)` regenerates derived geometry from the preserved contract.

No explicit geometry may be discarded merely because it looks reproducible. Exact reconstruction must be mechanically demonstrated under the declared numerical/replay contract before canonical replacement.

## 9. Safe structural operations

The candidate kernel operations are:

- `FOLD(sector)` — remove disposable materialization while preserving the sufficient generator contract;
- `UNFOLD(sector)` — regenerate only the requested sector/range/lens;
- `COPY(sector)` — instantiate the same generator description under a new entity/instance identity;
- `MOVE(sector,new_address)` — change a declared placement/parameter mapping, then recompute affected dependencies;
- `SWAP(A,B)` — exchange declared addresses/mappings and recompute affected regions;
- `SPAWN(template,n)` — create multiple instances sharing immutable generator/template content where valid;
- `DETACH/DELETE(instance)` — remove the instance relation without manually editing every derived coordinate.

Two kinds of move MUST be distinguished:

- `VISUAL_MOVE` changes only presentation/projection and MUST NOT mutate canonical dynamics;
- `PARAMETER_MOVE` changes the mathematical address/domain and therefore MUST recompute the affected dynamics/coupling.

## 10. Coupling law is mandatory for self-reaction

`Q_c(z)=z^2+c` defines dynamics for a given parameter. It does not by itself make neighboring ship sectors influence one another.

Cross-sector self-reaction requires an explicit, versioned coupling law, for example conceptually:

`theta_i(t+1) = G_i(theta_i(t), D_i(t), neighbors(t), external_irreversible_inputs(t))`

where `theta_i` may include `c_i` or other local parameters.

Therefore the complete reactive ship is:

`SHIP = QUADRATIC/PARAMETER FIELD + SECTOR DOMAINS + COUPLING LAW + CAUSAL EVENTS`.

A moved/copied/spawned part automatically affects only those regions reachable through the declared dependency/coupling graph. Unknown dependencies fail closed to review.

## 11. Candidate -> verify -> commit

Structural manipulation is not declared infallible merely because it is mathematical. Wrong equations, incompatible law versions, incomplete coupling, bad numeric semantics or invalid domain transforms can still create an invalid ship.

Every canonical structural mutation follows:

`CANDIDATE -> VERIFY INVARIANTS -> COMMIT`.

Minimum invariants include:

- law/version compatibility;
- valid parameter/domain address;
- complete numerical/replay contract;
- no forbidden overlap or missing domain boundary;
- coupling/dependency completeness for the affected region;
- preservation of irreducible inputs/history;
- deterministic regeneration where exactness is claimed;
- checkpoint/root/hash verification where required;
- operation provenance and branch lineage.

Counterfactual manipulation should occur on a branch first when the effect is uncertain:

`shared prefix -> candidate branch -> unfold affected sectors -> verify -> accept or discard branch`.

## 12. Feigenbaum scaling

For period-doubling systems in the Feigenbaum universality class, the parameter-spacing ratio approaches

`delta ~= 4.669201609...`.

For the real quadratic family the period-doubling accumulation point is approximately

`c_infinity ~= -1.401155189092...`.

A second Feigenbaum constant is commonly written

`alpha ~= -2.502907875...`

(sign convention may vary; `|alpha|` is the relevant geometric scale magnitude in many discussions).

SETKA may use these as **asymptotic scaling operators/hints** for adaptive resolution in a verified period-doubling regime:

`next parameter scale ~= previous scale / delta`.

`delta` MUST NOT be used as an exact formula for finite bifurcation locations. Exact locations/states come from the declared generator or verified residual/checkpoint data.

Likewise `alpha` may guide state-space geometric scaling only where the universality assumptions have been verified.

## 13. Adaptive fractal resolution

A promising optimization is to allocate materialization effort according to dynamical structure rather than uniform resolution.

Conceptually:

`coarse scan -> detect verified period-doubling region -> refine near information-bearing boundary -> use asymptotic scaling as planning hint -> exact generator verification`.

This may reduce CPU/storage for deep zooms and local sector inspection, but any claimed gain must be benchmarked against uniform/adaptive numerical baselines.

## 14. Canonical storage target

A folded ship should tend toward:

`IDENTITY`
`+ GENESIS`
`+ GEOMETRY_LAW_VERSION`
`+ C_DOMAINS / SECTOR ADDRESSES`
`+ CURRENT VARIABLES`
`+ COUPLING LAW/VERSION`
`+ CAUSAL PATCHES / IRREVERSIBLE INPUTS`
`+ NUMERIC/REPLAY CONTRACT`
`+ SPARSE CHECKPOINTS / HASHES`
`+ INSTANCE/BRANCH LINEAGE`

and not permanent dense storage of every reproducible coordinate, orbit point or rendered mesh.

This extends the existing Causal Irreducibility and Structural Irreducibility laws to ship anatomy:

> **Do not store the drawing when the drawing can be proven and unfolded from the laws, variables, domains and irreversible causes that generate it.**

## 15. Current implementation boundary

This document establishes the kernel geometry contract and vocabulary. It does not claim that the whole live SETKA/PostgreSQL ship runtime already uses this representation.

The offline kernel may implement/test pure deterministic primitives first. No Supabase/PostgreSQL write, compaction or migration is authorized by this document. Cryosleep and post-recovery backup/audit/handshake gates remain authoritative.
