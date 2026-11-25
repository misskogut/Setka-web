# SETKA · Prismatic flower logo study

An isolated, unapproved interactive 3D study of the founder's supplied reference. Entry: `experiments/prismatic-flower-logo/index.html`. It imports none of the application, calendar, catalog, account, research or Golden Honey runtime. The reference image is not shipped, sampled or used as a texture.

## Geometry and interaction

- One watertight indexed shell: 6,554 shared vertices / 13,104 triangles. Its explicit asymmetric four-chamber contour and swept concave folds are defined by `sculptedPoint`, rather than spherical noise.
- Surface springs, neighbor coupling, contact indentation, tangential drag, damped propagation and release recovery alter the real vertex positions. Normals are recomputed after updates. This is a membrane/shape-recovery approximation, not an incompressible volumetric FEM simulation.
- Large letters are closed marching-cubes isosurfaces of custom Cyrillic centerline sweeps. Junctions are welded and normals smoothed. Small captions use actual beveled font outlines (DejaVu ExtraLight, license included).
- All geometry has one rigid card parent. The card is an opaque rounded solid with depth, an independently readable reverse, and real depth-buffer occlusion. The vertical gesture follows the existing card's center-pivot, signed 180-degree settle and cubic/eased return principles. A selectable Y axis allows inspection from the sides.

## Optics: implementation boundaries

- Three.js MeshPhysicalMaterial: microfacet reflections, angle-dependent Fresnel behavior, IOR, screen-space transmission/refraction, optical thickness, absorption, dispersion and clearcoat. The procedural HDR studio is generated from light panels, independently of the reference.
- Golden/lilac leaves, ribbons, 27 small spherical bubbles, the central flower and the luminous orbit are actual internal/spatial meshes. Their image is present in the transmission scene capture.
- Scattering, luminous energy, caustic-like flow lines and a particle wave are art-directed geometry/emission plus bloom. They are not a participating-medium solver or a physically traced photon caustic calculation.
- Screen-space transmission has limitations at image boundaries and for transparent-within-transparent surfaces; the shader does not trace repeated internal bounces. The reference's exact path-traced studio lighting is not reproduced physically.

## Rebuild and QA

Pinned dependencies are scoped to this experiment. `npm ci`, `npm run build`, `npm test` rebuild and check it. Runtime is the self-contained `app.js`, without a CDN or font download. `qa/browser.mjs` records six views, hold/drag/release, swipe and a 390×844 viewport in Chromium and WebKit; the workflow retains its evidence. It never claims a physical-iPhone test. URL options `?capture=1&angle=60` provide frozen clean views for reproducible comparisons. Live QA status and known visual differences are recorded in `qa/REPORT.md` after browser verification.

Adaptive resolution limits the initial pixel ratio on narrow viewports. Poor frame timing reduces it to 1.1; manual high/eco modes remain available. Rendering pauses while the tab is hidden and releases resources on pagehide. `prefers-reduced-motion` starts paused. WebGL2 is required; lack of WebGL produces an explicit error instead of a simulated flat substitute.
