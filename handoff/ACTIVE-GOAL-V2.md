# Tian House — Active goal v2: volumetric photo-to-scene workshop

Updated 2026-10-14 through checkpoint332. User-directed scope update; not achieved.
Verified with get_goal on 2026-10-14: the scheduler is `active` and its stored objective
contains the complete updated scope in GOAL-CURRENT.md, including the Static Hour target.
This document updates the execution scope of the existing goal; it does not create a
second goal or declare the previous objective complete. The persisted goal text references
this document and preserves the photo-to-scene and workshop design requirements.

## Outcome

Build a browser-based architectural workshop that turns reference photographs into
editable, walkable, locally saved three-dimensional scenes. Give buildings, furniture and
props real volume, consistent materials, lighting and interaction. Preserve Tian House's
intimate miniature-world identity and English UI; use The Sims 4 as a building usability
reference, the four user-provided Static Hour screenshots as the primary lighting, prop-detail
and interior-atmosphere target, and Desperados III as an additional environment-quality
reference. Follow [Static Hour visual target](STATIC-HOUR-VISUAL-TARGET.md) for concrete
criteria. These are acceptance targets, not claims of achieved parity.
Complete all development cases, independent acceptance and the previously requested
Hawke's Bay capstone; then deploy to tian.house and verify the deployed experience.

This upgrades the visual/asset foundation of the existing project. It does not discard
workshop capabilities, photo analysis, simulation, project OS, house library or saved homes.

## Non-negotiable acceptance

- Walls, floors, roofs, reveals, frames and corners are physical geometry with explicit
  thickness. A convincing fixed-camera sprite, depth effect or dark outline is insufficient.
- Main furniture and props have appropriate 3D silhouettes from supported rotating views,
  coherent scale and grounding. Thin real objects can be thin; detail textures and distant
  impostors are allowed as optimizations, not substitutes for close-range volume.
- Geometry, openings, collision, selection, support, door motion, usable clearance and
  interaction anchors share one source. Adding thickness must not silently block old doors.
- Day/night illumination, contact shadows, material roughness, glass and interior/exterior
  balance form a consistent style. A global dark overlay alone does not pass night lighting.
- Visual acceptance must meet the Static Hour reference rubric: motivated local lighting,
  cool/warm spatial hierarchy, readable shadows, grounded detailed props, differentiated
  materials and purposeful clutter. Compare actual browser captures at normal play zoom
  and close range, under day/night and light-switch changes; preserve movement/editing
  and performance. Plain geometry, a dark color filter or one flattering shot cannot pass.
- Every existing catalogue family is inventoried. Track unique geometry, materials,
  directions, states and multipart assemblies separately. Migrate the complete catalogue
  by families, with explicit accepted/pending/unknown records; do not hide unconverted
  entries or reduce the denominator to a showcase room. No invented unseen geometry is
  labelled recovered original geometry. Direction variants are not separate rebuild jobs.
- Recipes, compressed delivery and semantic catalogue remain the asset contract, extended
  to meshes, material textures, LOD, collision, mounting and interaction. Build reproducibly;
  preserve original sources, provenance, stable IDs and migration mappings. Generated or
  imported 3D assets must enter this contract before becoming shipping assets.
- Humans and AI use the same public editing/command layer; no special scene code or direct
  hidden-state edits to bypass missing capabilities. Geometry and contents stay editable.
- Reference inventories distinguish observed/inferred/approximate details. Verify scale,
  architecture, objects, materials and lighting against explicit reference views.
- Preserve existing houses and gameplay, including local saves and portfolio computer/OS.
  Save/reload/import/export/version restore/undo/redo remain valid after migration.
- Run actual browser editing and character walkthroughs, including doors, stairs, narrow
  circulation, upstairs, basement, furniture use and return to the workshop. Retain the
  requested three-day in-game residence acceptance; temporary no-survival walkthroughs
  are not substitutes for it.
- Measure on the actual MacBook/browser: frame-time percentiles, memory, startup time,
  interaction latency and transferred bytes. Establish device/settings and numerical
  acceptance budgets before scaling batches. Neither “3D is smaller” nor test counts
  alone prove visual quality or performance.
- Record implementation, failures, fixes, comparisons, remaining gaps and reproducible
  checks. Feed generalizable lessons/tools back into SRE. Full acceptance precedes public
  deployment; verify tian.house afterward. Keep goal active while any requirement remains.

## Revised order and gates

1. **Inventory and foundation.** Record present scene/asset/performance baselines; identify
   reusable mesh families, uncertain shapes and source data. Specify world units, floor
   heights, thickness and migrations. Preserve legacy renderer/saves during development.
2. **One end-to-end volume sample.** Add WebGL rendering from the same authoritative scene
   and commands. Build a room plus yard with joined walls, window/door reveals, floor/roof,
   glass, cabinet, sofa, table, small props and a light. Orbit, edit, walk through, compare
   day/night, save/reload and measure performance. This is a gate, not the final deliverable.
3. **Complete generic tools and batch migration.** Upgrade building/editing/collision and
   UI against the new geometry. Generate families in batches after representative approval;
   use shared meshes/materials and LOD. Finish catalogue-wide conversion and audit. Include
   vegetation, vehicles, pools, terrain, objects/contents, and character visual compatibility.
4. **Photo workflow and development cases.** Retain the reference workspace and public AI
   commands. Finish Momento Brewers Café → Cantó House → Warehouse Morinha. Revalidate
   existing scenes under the new renderer; old 2D visual evidence does not establish new
   3D fidelity. Use full input inventories before producing and placing asset batches.
5. **Frozen independent acceptance.** Freeze the pipeline/version, select an unseen photo
   case, build through general tools and inspect fidelity/usability/performance. Do not add
   scene-specific code to pass. If generic fixes are required, retain failure evidence and
   repeat independent acceptance on a fresh case after the next freeze.
6. **Known-reference final capstone.** Reconstruct Alma Reynard's Nightcall house at
   Hawke's Bay, including all rooms, furniture/props, functioning concealed room, coastal
   site, beach and night appearance. Prepare research/tools earlier. Follow
   HAWKES-BAY-FINAL-EXAM.md: investigate dimensions, record errors and missing facts, and
   do not call an approximation 1:1. This known case never substitutes for the unseen test.
7. **Release.** Complete preservation/regression, residence and performance checks, final
   comparative screenshots and open-issue audit. Deploy to tian.house; verify actual
   online assets, gameplay/workshop and persistence. Deliver code, recipes/catalogue,
   scene saves, references, comparison evidence, design docs and process journal.

## Migration strategy

The authoritative editable scene remains independent of renderers. A versioned adapter
compiles it into meshes/materials/collision/interaction data. Do not maintain a second,
independently editable 3D scene that can drift from the workshop document. The new renderer
starts alongside the old one; production switches only after preservation and feature
checks pass. Modernize units/geometry where necessary rather than disguising grid errors.

Generate repeated hard-surface families parametrically; reuse carefully authored templates
for upholstered furniture, foliage and textiles; use dedicated models for complex shapes.
Extract reusable material information cautiously: baked highlights/shadows in old sprites
must not become double lighting. AI assistance is a drafting tool, not proof of geometry,
function, hidden details or final quality. Batch discovery → templates → assets → inspection
→ placement → whole-scene route, then fix collected visual issues together.

## Current evidence and limits

Checkpoint332: the diagnostic WebGL preview compiles thick walls, openings, slabs,
exterior support, roof geometry and approximate stairs from the authoritative scene.
Four prototype furniture families are supported: table, lamp, wooden chair and metal
shelf. Local fixture lighting and procedural timber materials are present. Furniture
selection, host/group movement and verified rotation use the existing public command,
persistence and undo pipeline. Unsupported furniture and invalid source layouts are
reported explicitly; their geometry/collision remains absent.

Latest full suite: 734 tests at checkpoint331. Checkpoint332 ran 11 affected tests after
material changes; it did not rerun the entire suite. Browser evidence includes day/night,
failed-and-corrected material captures, assembly editing, refresh persistence and exact
export restoration. These checks do not constitute a completed room-and-yard sample,
full game integration, complete catalogue migration or visual parity. Production remains
the Canvas renderer. Performance budgets, furnished sample acceptance, all development
cases under 3D, unseen acceptance, capstone, three-day residence and release remain open.
See VOLUMETRIC-WORKSHOP-IMPLEMENTATION.md and PROCESS.md for concrete evidence.

## Immediate execution priority

Complete a coherent, editable and walkable furnished room plus yard before expanding
isolated prop polish indefinitely. Include storage contents, seating, textiles, wall details,
architecture, outdoor elements and motivated lights. Use this sample to collect and fix
material, interaction, support, occlusion and performance issues in batches. Preserve all
larger gates above; passing the sample cannot complete the overall goal.

Each batch should produce user-visible building capability or a coherent scene result,
plus relevant evidence. Tests, diagnostic panels, status documents and isolated props are
supporting work, never substitutes for the requested finished workshop and scenes.

## Goal bookkeeping

The available goal API can read a goal or set complete/blocked/paused status, but cannot
replace the stored objective or resume a blocked goal. Do not mark the unfinished goal complete to create another.
Continue the existing active goal under the user's newest instructions and these updated
referenced design documents. No repeat /goal prompt is required from the user.


## User visual correction — 2026-10-14

Preserve PZ authored material detail while adding true volume. Generic smooth boxes and
procedural replacement textures do not satisfy the target. Follow
[SOURCE-MATERIAL-AND-GI.md](SOURCE-MATERIAL-AND-GI.md) for source color/painted-light separation,
whole-room comparisons and visibility-aware indirect-light experiments. Explore a custom
browser-appropriate GI pipeline; do not claim UE5/Lumen parity without evidence. This adds
visual requirements and does not reduce any existing scope or completion criteria.

Latest residential sample is Hearth Studio, per user brief and COZY-STUDIO.md. Complete this
compact single-resident open studio before returning to broader house examples. Keep prior
houses. Batch351 provides35 placed objects and a real diagnostic route, not finished art or
three-day residence. Source material fidelity and soft indirect lighting remain required.
