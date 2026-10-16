# Profiled roof volumes — implementation record

Status: geometry kernel and independent scene transactions implemented and tested;
**not connected to the manual editor UI, renderer, rain/support model or deployment**. Existing fixed30° roofs
remain unchanged. This is a dependency of Cantó reconstruction, not roof acceptance.

## Evidence and correction (289)

Additional authorized inputs from the architect's published project:
https://www.archdaily.com/957636/canto-house-piano-piano-studio
Four section drawings were downloaded at medium and large sizes; URLs, bytes and SHA256
are in evidence/289-roof-research/source-{,large-}manifest.json (the medium manifest is
named source-manifest.json). Local study files are under
/tmp/tian-house-photo-references/canto/section-{3,4,5,6}-large.jpg.
These are additional development inputs, not part of the later unseen-photo examination.

Published Section03 (file section-6) explicitly labels ridge7.55m, cornice6.34m and
opposite lower edge4.10m; horizontal labels4.28/4.58m. Heights are relative to the drawing
reference datum, not a new assumption about the game's floor interval. The two eaves
are unequal. Therefore a symmetric fixed30° gable cannot establish source fidelity.
Exact interpretation of surface versus structural datum, wall thickness and alignment
with plan dimensions still needs correlation. Do not derive a precise pitch by mixing
labels from different faces. Section01 (file section-3) shows the exterior courtyard
flight and terrace/service volume; Sections02/04 supplement opposite cuts.

## Geometry contract implemented

`profiledRoofGeometry({vertices, profile:{axis,knots}, baseElevation})` produces slope
polygons and vertical boundary closures. Ridge axis X varies height across Y; axis Y
varies across X. Knots are ordered cross-coordinate/elevation pairs, allowing a
monopitch, asymmetric ridge or multiple linear segments. Heights share the caller's
explicit units. No implicit metre/pixel/storey conversion is embedded.

Footprints currently use the workshop's validated integer orthogonal/45-degree polygon
contract. Each triangulated footprint piece is clipped separately at profile changes.
This avoids bridging disconnected portions of a concave courtyard. Every outline edge
gets infill to the base, including raised concave sides; edges split where slopes change.
This addresses the missing side closure discovered in288. It does not yet union
intersecting volumes, generate thickness/soffits, or solve variable wall tops.

Tests cover asymmetric labelled values, both axes, translated world coordinates, total
area conservation, courtyard exclusion, plane membership, complete boundary coverage,
invalid profiles and crossed outlines. Three tests pass. A synthetic L fixture is saved
as evidence/289-roof-research/concave-fixture.json; it is not Cantó's finished roof.

## Remaining integration, in dependency order

1. Introduce authoritative roof volumes independent of room partitions, stable identity,
   profile/footprint/material edits, bounds and overlap validation; keep legacy roofs.
2. Establish explicit vertical units and wall-top behavior. Derive render surfaces,
   rain shelter and collision/support consistently; closures must not seal occupied
   space or courtyard access incorrectly. Roof undersides/thickness and intersecting
   volumes require their own geometry.
3. Add public commands and manual footprint/profile controls, previews, undo/redo and
   persistence. AI and people must use the same rules.
4. Map material recipes onto surfaces with consistent scale/anchors; preserve the
   recipe → lossless atlas → semantic catalogue pipeline. Do not flatten the entire
   building or ship a scene-specific roof image.
5. Real browser checks for concave court, uneven eaves, volume intersection, wall-top
   closure, room access, edited profile, save/reload and existing-house preservation.
6. Install measured Cantó roof through public operations and compare sections/photos;
   missing dimensions and remaining approximations stay explicit.

A diagnostic plot attempt failed because matplotlib is absent from both checked Python
runtimes; no preview image was generated, and no rendered-quality claim is made.

## Scene transaction checkpoint290

Added optional authoritative `scene.roofVolumes`; older scenes remain unchanged when
this collection is absent. A volume has stable id, owner levelId, footprint vertices,
ordered profile, baseElevation, explicit elevationUnit:`storeys`, surfaceTile and
closureTile. Storeys are renderer units; source metres must be converted using an
explicit evidenced vertical mapping in future UI, never passed through as level values.

`roofVolume.add {roof}`, `roofVolume.update {id,patch}` and
`roofVolume.remove {id}` use the normal scene reducer/WorkshopCommands transaction.
Allowed updates cover footprint/profile/base/materials/name; identity and owner do not
silently change. `entities.lock` now supports these volumes. Room splitting leaves their
geometry unchanged. Compiled `plan.roofGeometry` is derived exclusively from current
entities; supplied cache contents are discarded on reconstruction.

Validation covers global IDs, owner existence, finite ordered profiles, supported
storey range, lot boundary, existing material types,64-volume/50000-cell aggregate
budget and locking. Tests cover public preview/commit atomicity, room partition edits,
profile changes, removal/undo/redo, persistence and forged-cache rejection.660 tests pass;
affected volume tests were rerun after tightening null collection/base-floor validation.
Evidence290-roof-volumes.

Still incomplete: no manual roof-volume panel, renderer, shelter/collision/occupied-space
checks, intersections or source-matched material projection. Do not install these volumes
in the user's house or deploy this intermediate branch as a completed roof feature.
The reducer/cache integration is a development foundation, not a visual acceptance.

## Runtime shelter and slab intersection checkpoint291

Added `RoofRuntime`, using the compiled slope polygons and their actual plane heights.
Per-cell clipping/indexing avoids scanning the whole roof on every point query. World
`hasRoof` now consults these surfaces before the legacy integer-floor roof scan. A point
under an asymmetric slope is sheltered; a point above it, outside it, or within the
concave courtyard is not. Removing/replacing a plan rebuilds the index, clearing stale
shelter. This does not create an invisible walkable floor under the roof.

Structural compilation now rejects a roof surface intersecting an existing solid floor.
It checks exact shared polygon area, including partial diagonal floor cells, rather than
rejecting all cells whose bounding boxes touch. Either operation order is protected:
adding a floor across a roof, adding a roof through a floor, or lowering an existing
profile through a floor all fail without mutating the editor state.

664 runtime tests pass. New tests verify unequal-eave heights, courtyard exclusion,
above/below checks, removal clearing shelter, disjoint touching triangles, public-model
atomic rejection and profile-edit rollback. Evidence291-roof-shelter/tests.log.

This is **slab intersection**, not complete occupied-volume validation: wall trimming,
closure collision, furniture/headroom, stairs, intersecting roof volumes and material
thickness remain unimplemented. Manual controls, actual drawing and browser visual/rain
acceptance are still required. Cantó remains unchanged at507; no prototype volume has
been installed in its scene, and no deployment was performed.

## Workshop rendering checkpoint292

`roof-render.js` subdivides slope geometry into cell-sized textured faces and boundary
closures into short segments for the workshop depth queue. Material coordinates derive
from world footprint positions, so clipping does not stretch each triangle into a new
texture. The existing wall-plane extraction is shared with closure rendering. Whole
building includes fractional-height roof bands; the Roofs toggle removes these faces.

Profile volume surfaces now require a **planar floor texture** (`solidfloor`). Previously
accepted arbitrary BlockRain sprites are not valid planar sources: legacy pitched sprites
already contain projection and cannot be unprojected as a flat tile without distortion.
This tightens only the new unpublished profile-volume material contract; legacy roof
families are unchanged. A dedicated roof material family/physical tile mapping remains
needed for source-matched roofing rather than the diagnostic gray floor tile.

Browser proof: public batch507→508 built an L-shaped temporary room and profile roof in
the empty yard; update509 changed the exaggerated slope to a shallower asymmetric one.
The initial shallow view revealed back closure faces overpainting slopes as white saw
teeth. Added outward-face culling for the fixed camera and reloaded: saw teeth removed.
Saved before/after evidence, checked Roofs toggle, then undid both transactions510/511.
Restored export equals original Cantó checkpoint288 exactly. Main game never resumed.

665 tests passed before the final backface adjustment; affected geometry/roof tests passed
afterwards. Browser inspection supplies the actual rendering evidence. Files under
292-roof-render include fixture.json, roof-fixture.png, before-backface-fix.png,
steep-profile.png, roofs-hidden.png, restored.json and test logs.

Remaining: game renderer/thumbnail integration, close-up antialias seams and slope lighting,
manual controls, physical closures/headroom/wall trimming, intersecting volumes, exact
materials and real Cantó roof installation. This workshop preview is not final roof
acceptance or an accepted Cantó roof. No deployment.

### Checkpoint 293 — Manual controls

Edit rooms → Profile roof now creates a roof from the selected room boundary and edits
existing independent volumes. Controls expose profile points, ridge direction, closure
base, name and planar/wall finishes. Uses the shared command gateway; invalid geometry
cannot save. Browser create/update/remove and undo exercised; see PROCESS.md293 and
`evidence/293-roof-panel/panel.png`. This is not the final Cantó roof acceptance.

### Checkpoint 294 — Game rendering and volume cutaway

The game now renders profile faces through the shared roof renderer. Roof-only elevation
bands do not expose upper floor slabs. `roof-presentation.js` fades whole independent
volumes when beneath their actual slope footprint and derives uniform brightness from
visible/remembered nearby cells. Concave courtyard and above-roof cases are covered by
unit checks; live walk-through exterior/under-roof/courtyard captures and original-save
restoration are in evidence/294-roof-game.669 tests pass. This supplies presentation only:
physical enclosure/headroom and full night/material fidelity are not accepted yet.
