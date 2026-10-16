# Source-preserving volume and indirect-light direction

2026-10-14. User correction takes precedence over earlier prototype appearance decisions.
Keep PZ's rich authored surface information; add volume rather than replace it with clean
boxes and generic noise. Static Hour remains the light/material/atmosphere reference.
No claim of UE5/Lumen equivalence. Preserve every other current-goal requirement.

## Material contract

Separate source color evidence, inferred surface relief/roughness, and newly authored hidden
faces. Imported sprites contain painted lighting: inverse projection is resampling, not
lossless source reconstruction or automatic albedo recovery. Never use luminance directly
as height without checking painted shadows, seams and markings. Keep original atlas and IDs.

First whole-room comparison uses the existing Courtyard Studio, unchanged geometry/lights.
349 replaces the procedural wood floor across rooms with source tile40 inverse-isometric
sampling. Source plane top=(64,192), axes=(64,32),(-64,32), original128×256 plane. Trim offsets
come from atlas region. Alpha-weighted bilinear sampling, at most3px edge extension, hard fail
on unsupported holes.128×128 output is a runtime cache; existing compressed raster delivery
remains canonical. Recipe records source files and build hashes. This is a visual experiment,
not completion of whole-house material migration. The same approach requires reviewed planes
for walls and each furniture face; do not stretch whole sprites over unrelated box faces.

Next material batch: wall plaster/trim, sofa fabric, wood furniture and metal appliances,
review source crops and planes together, recover only supported detail, explicitly label new
side/back surfaces. Rounded upholstered silhouettes, bevels and seams must be upgraded too.
No expanding the simple-box library until this batch has visual acceptance.

## Indirect light experiment

Read primary work:
- https://research.nvidia.com/index.php/publication/2019-05_dynamic-diffuse-global-illumination-ray-traced-irradiance-fields
- https://github.com/NVIDIAGameWorks/RTXGI-DDGI/blob/main/docs/Algorithms.md
- https://research.nvidia.com/publication/2020-09_scaling-probe-based-real-time-dynamic-global-illumination-production-technical

These establish visibility-aware irradiance probes, radiance update and temporal reuse as
research directions. Their RTX implementation/performance is NOT evidence our browser target
can run equivalent tracing. Current implementation still uses hemisphere plus direct shadowed
lights, no indirect GI. Do not rename hemisphere fill as bounce light.

Build a bounded indoor experiment with a geometry visibility cache and diffuse transport.
Evaluate lightmaps/surface patches for static surfaces, visibility-aware probes for moving
objects, and asynchronous invalidation after geometry/material/light edits. First validate one
bounce and color transfer against a small offline reference; then multiple bounces and temporal
updates. Separate sky/direct/indirect contributions. No arbitrary extra point lights to fake
bounce: these leak through walls and exhaust sampler limits already encountered in342.

Area-source soft shadows, local contact shadow, specular/environment response and restrained
participating-media scattering are separate stages. Fog cannot substitute for missing transport.

## Acceptance matrix

Same camera/exposure: source-vs-procedural surface; direct-only vs indirect; day/night; lamps
on/off; door open/closed; furniture moved; warm wall next to neutral wall. Test sealed wall and
thin wall for leakage; inspect behind objects, floor contact, corners and window gradients.
Require changes to follow edits and toggles without stale cached illumination. Measure update
latency, frame time, peak memory and delivery costs on the actual MacBook. Preserve failed
screenshots; no visual acceptance based on unit counts or one flattering camera angle.

349 evidence proves only original floor color reprojection is integrated. GI, soft shadows,
source-based furniture materials and Static Hour quality remain unachieved.

## Experiment350: captured room radiance, first bounce only

Implemented explicit opt-in room probe study. For each of up to4 rectangular rooms, choose a
clear1.35m sample point, capture6 linear-HDR32² faces, integrate nine SH coefficients and apply
cosine-convolved irradiance in the material's indirect diffuse branch. This reuses Three's
cubemap→SH integration rather than claiming a new mathematical invention. Captures disable
hemisphere fill, background color, emissive surfaces and the study itself; direct lamps/sun
remain. Restore roofs during capture even when editor cutaway is on. Restore source colors
instead of selection highlights. Thus the input is direct-lit surface radiance, not a hidden
extra ambient lamp or recursive feedback loop.

Fragment masks use room bounds and world-normal offsets; they reduce cross-room spread but
DO NOT solve within-room spatial visibility. One sample can over-color a wall, miss a shaded
corner or spread illumination behind furniture. Surface softness remains limited by existing
direct-light shadows. No multi-bounce transport, dynamic character probes, specular GI or fog.
Nonrectangular rooms explicitly unsupported in this study, not silently treated as rectangles.

Geometry/door/lamp/day-night edits immediately invalidate/disable old coefficients. Recapture
is MANUAL in this experiment; automatic incremental updates are still required. At3 rooms,
initial capture1310ms and lamps-off recapture905ms in actual browser. These blocking capture
costs and visual coarse lighting are not accepted production behavior. Screenshots350 show
first warm color transfer and disappearance after lights-off recapture. Keep disabled by default.
