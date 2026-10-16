# Cantó House — development case, input baseline 280

Status: reference workspace created through House Library → From photos. Construction
and acceptance are pending. Momento remains a saved regression case with outstanding
visual review; moving to this development case does not mark Momento or the goal passed.

## Fixed input and provenance

Source: [Cantó House / Piano Piano Studio](https://www.archdaily.com/957636/canto-house-piano-piano-studio).
Architecture: Piano Piano Studio. Photographs: Milena Villalba. This run explicitly
uses **photos plus drawings**, not a photo-only reconstruction. All 19 published
numbered photos were inspected before authoring. Both floor plans are also inputs.
The source URL/hash manifest is `evidence/280-case-review/canto/source-manifest.json`.
Reference images are local study inputs, not published game asset pages.

Eight core inputs pinned in the workshop (current reference limit): photo02 courtyard,
photo03 upper gallery, photo06 street corner, photo08 terrace, photo14 interior stair,
photo16 living/kitchen and the two plans. Other photos remain supplemental evidence,
not an undisclosed unseen test. No sections used at this baseline; additions must be logged.

The architect description establishes a taller northern dwelling, central and smaller
private courtyards, southern garage with terrace above, and screened terrace facade.
The drawings establish room connections. Finish and furnishing observations below come
from the photographs; unobserved construction details remain inferred.

## Inventory before production

| Batch | Required visible families and relationships | Starting capability / gap to verify |
|---|---|---|
| Structure | Two levels; open central courtyard; small planted courtyard; living-room void; upper gallery; garage below terrace | Rooms, floor openings, multilevel supports exist. Validate both courtyard voids remain open and terrace is supported. |
| Circulation | Main entrance on long street facade; interior straight stair; exterior courtyard stair; upper gallery to terrace | Existing straight stair families. Source bottom stair has a broad tiled plinth with two timber steps: cannot substitute an unwalkable sprite. |
| Envelope | Smooth off-white walls; pitched tiled roof; black wide courtyard glazing; white-framed street windows; garage opening | Existing wall/glazing/roof tools. Check operable widths, sills and grid approximation as a group. |
| Screens and guards | Terracotta perforated brick screen, large unglazed cutouts; white vertical-bar and fine-mesh guards | Catalogue search required. Brick screen must be a solid pedestrian boundary with visible holes, not ordinary glass. |
| Timber | Knotty pine sliding panels with exposed top rails; pale plank flooring; dining table; step blocks | Existing wood furniture is a starting point. Missing sliding-panel behavior/art must be declared and implemented generically if needed. |
| Terracotta | Running bond and herringbone floor; brick edging; terrace bench and sink base; vaulted ceiling infill between beams | Need coordinated reusable material/trim family. Ceiling detail is separately hideable; no scene-specific baked image. |
| Living/kitchen | Pale three-seat sofa with cushions; island with timber top and two wicker stools; prep run/sink; fridge; timber dining chairs; low sideboard | Catalogue audit before making replacements. Objects remain selectable; appliances/tabletop objects mounted on their hosts. |
| Soft details | White curtains, woven pendant, tapered white pendant, ceiling fan, small wall lights, pots/palms, fruit bowl and books | Batch by support: window, ceiling, wall, tabletop, floor. Decorative-only behavior explicit. |
| Private rooms | Bed, wardrobe, timber doors; bathroom basin, round woven mirror, shower and pale/olive tiles | Photo12/13 establish finishes; plans establish hidden partitions. Plumbing capacity and fixtures outside visible evidence inferred. |

No piano: studio name is not an observed object. No basement is evidenced for this case.
No people/pets need to be recreated to prove the architectural workshop.

## Layout and scale contract

Use the dimensioned plans rather than importing Momento proportions. Along the long
plan edge the labelled bays are 5.43, 5.22, 4.65, 4.40 m. Cross bays are approximately
4.88 and 4.25 m; outer faces and nonparallel boundary lines need explicit treatment.
Proposed initial structural grid: 1 m/cell, approximately20×9 cells. This is a working
rounding proposal, not a verified calibration or excuse for collapsed passages.
Record integer rounding and relative error for each bay before placing furniture.

Ground topology: living/kitchen at the left of the plan; central courtyard and dining/
entry circulation in the middle; bedroom/service strip and small courtyard next; garage
at the right. Upper topology: void over living area with gallery, private/flexible rooms,
central courtyard void, roof terrace over garage and the adjoining rear strip. Do not
fill either courtyard or the living void with an automatic upper floor.

## Implementation batches and acceptance

1. Build connected ground/upper shells, voids, both stairs, garage and terrace. Walk all
   routes before furniture. Preserve editable room/wall/opening identities.
2. Inventory catalogue matches for the table above. Generate missing related families
   together; prove one representative per support/material family, then canonical build.
3. Place envelope, screens, guards and finishes together; then furniture and mounted
   details together. Use public transactions with preview; inspect actual placed output.
4. Compare eight core views and supplemental private-room details. Report omissions,
   geometry/material approximations and inference separately; model self-score is not
   acceptance. Keep Momento's remaining corrections in the final combined review.
5. Actual routes: street→entrance→living/kitchen→central courtyard→bedroom/private
   courtyard; living→indoor stair→gallery/private rooms→terrace; courtyard→outdoor stair
   →terrace; street→garage. Verify guards prevent falls, voids stay open and glazing/
   doors do not create invisible blockers. Use relevant supported interactions.
6. Move/rotate major objects with attached items; edit a wall/opening; undo/redo; save,
   refresh, export/import and continue after a manual edit. Preserve prior houses and
   paused normal game. Record performance and retain failed evidence.

No scene-file injection; no case-specific runtime branches. Later Warehouse development,
fixed-library unseen cases, extension test and deployment are still required.

## Next production ledger — batch workflow

The inventory above covers all input views. Finish the following dependency groups rather
than switching between manufacturing an individual object and decorating an individual room.
These are planned batches, not claims of available catalogue matches or completed assets.

| Group | References / scope | Representative check before expansion | Placement dependency / status |
|---|---|---|---|
| Structural capability | Plans, photos02/03/14: outside stair, void guards, roof regions, upper partitions | Ascend/descend the intended direction; guard a void edge; roof excludes courtyard | First; N/W-only stairs and L-room gable restriction under investigation |
| Envelope | Photos02/04/06/07/12/17: fixed/sliding glass, street windows, pine panels | One opening with adjoining wall, correct anchor, clearance, state and host rotation | Supported shell; existing hinged placeholders retained until replacement works |
| Terracotta and plaster | Photos08/13/14/15: paving, screen, bench/sink base, tile and plaster | Multi-cell patch and corner; perforated screen blocks passage; material scale | Structure/envelope; audit catalogue before generating missing families |
| Furniture | Photos12/14/15/16: bed/storage, sofa, island, stools, table, sideboard | One item per distinct footprint/support contract, real walking clearance | Approved floor plan; batch reusable geometry/material siblings |
| Mounted details | Photos08/12/13/14/15: curtains, lights, mirror, plants, books, bowl | One per wall/window/ceiling/table support, move/rotate its host | Stable host IDs; place after furniture, not while hosts are being redesigned |

Each batch records reused/new family IDs, build/reload counts, affected checks and rendered
evidence when executed. No baseline timings exist yet, so no numerical speedup is claimed.
Review all completed rooms in one route, collect cosmetic corrections, then make a grouped
correction pass. Blocking structural or persistence faults interrupt the batch immediately.

## Implemented checkpoint280

House Library → From photos preserves Momento and creates scene
551b003e-1b31-44f9-a35d-6dbc53b56682. Eight core images imported by file chooser;
source/evidence metadata updated through public reference commands. All19 photos
and both plans are recorded as used input, not an unseen set.

Public request canto-ground-zones-280 creates five ground zones and courtyard
boundary walls, editor491. Saved plan-linked view492. Envelope20×9 cells from
origin7993,11400. Long bays5/5/5/5 versus5.43/5.22/4.65/4.40m: approximately
−7.9/−4.2/+7.5/+13.6%. Provisional grid units, not applied scene calibration.
Courtyards remain grass voids without structural floors. Current floor textures
are working placeholders. No openings, upper structure, stairs or furniture yet;
this is intentionally an unwalkable structural draft, not an accepted scene.
Next batch must add circulation/openings and upper voids/stairs before furniture.

## Circulation checkpoint281

Public batches493/494 merge the open living/dining/circulation zones instead of
adding false doors between them. Added15 opening segments: entrance, courtyard
glazing/doors, private-room/patio links, garage side entry and three-panel street
door. These use working catalogue assets; hinged glazing and standard entrance
doors do not yet reproduce the photographed sliding timber/glass systems.

Upper living/private gallery follows the L-shaped supported footprint;12-cell
void over living room and automatically opened stair shaft remain clear. Upper
terrace spans garage and private ground rooms. Temporary timber N staircase is
passable but differs from the photographed white stairs and bottom plinth.
No roof or terrace screen/void guards yet; upper room subdivisions also pending.

Actual keyboard walkthrough entered from street, climbed to7994/11400/F1,
went around the void to8010/11403/F1 over garage, returned downstairs, crossed
central courtyard, entered private room, passed small courtyard into garage and
exited to8010/11411/F0. HP100. Doorway-center alignment matters; the double
opening seam needed both leaves open. These observations are retained, not
reported as polished interaction. Evidence281-canto-circulation.

Next structural batch: exterior courtyard stair, explicit guards and supported
roof volumes, upper subdivisions. Existing straight stairs expose N/W directions
only; source orientation must not be faked by drawing a stair that cannot be
walked. L-shaped merged rooms currently reject gable roofs, so roof design needs
a general supported solution rather than covering courtyard voids.

## Guard checkpoint284

Added ten editable fine-mesh guard edges around the north, west and south sides of
the living void through public walls.draw, editor497. The east edge remains the
existing courtyard envelope. Original recipes now provide white mesh and vertical-bar
families, N/W variants grouped into two catalogue choices. Photo03 establishes a
white framed fine-mesh guard; this raster approximation uses an orthogonal lattice
rather than claiming exact reproduction of the photographed mesh weave.

Walked street→entrance→indoor stair→upper landing→north gallery and attempted to walk
into the void: stopped at7996/11400/F1. Retained report and screenshot. Runtime tests
separately isolate guard collision from missing-floor collision and check sight through
both directions/styles. Nearby guards currently inherit structural wall cutaway fading;
this remains a presentation refinement, not a failed physical boundary.

648 runtime tests,15 pipeline tests and canonical freshness pass. Browser compares
5,406,720RGBA channels of current masonry source/delivery with zero differences;
fetched hashes match the final build. Scene export equals refresh/reopen export exactly.
Evidence:284-guards. Outside stairs, roof volumes, upper partitions and subsequent
finish/furniture batches remain pending; no visual acceptance or deployment claimed.

## Straight stair capability checkpoint285

Reinspected both plans: the external flight arrow points toward the terrace at the
right of the central courtyard. It needs ascent toward +X, unavailable in the legacy
N/W-only stair pair. Added a reusable straight flight family in four directions and
runs3–6, using the shared routed-stair height/transition contract. Existing timber
stairs and return stair IDs are unchanged. A proposed four-cell exterior run begins
at7999/11401 and ends at8002/11401, with upper landing8003/11401; this is a grid
approximation, not a measured calibration.

The temporary terrace west wall crosses that upper landing boundary. New validation
rejects it rather than publishing stairs ending against an impassable wall. A proper
open passage in the editable perimeter is needed next; do not substitute a fake door
or silently remove an owned wall. The exterior stair is therefore not installed yet.

Through public commands, created a reversible two-floor test enclosure with a five-cell
eastward stair, walked up from7991/11416/F0 to7997/11416/F1 and returned to ground.
Exported evidence and undid the entire fixture. Restored house equals checkpoint284
exactly. Test art is solid white construction with simple bars, not an accepted match
to the source's tread material/underside.652 runtime tests and asset freshness pass;
current source/delivery hashes match and22,118,400 browserRGBA channels compare exactly.
Evidence285-straight-stairs. Roof work remains pending.

## Upper private layout checkpoint288

Checkpoint287 installed the exterior E4 stair and full-height upper passage, including
actual ascent/descent and correction of the landing-versus-lower-wall collision bug.

Reinspected upper plan and photos03/06. Public batch504→505 split the southern upper
strip at y11406, leaving a one-cell gallery at y11405. Private cells now comprise:

- bathroom strip: [7993,11406,7994,11409], room `canto-upper-private`;
- bedroom: [7994,11406,7998,11409], room `canto-upper-bedroom`;
- flexible room: [7998,11406,8003,11409], room `canto-upper-flex`;
- separate circulation strip: [8003,11406,8004,11409], room `canto-upper-hall`.

Three ordinary N doors at x7993/7995/8000,y11406 and an open passage at x8003 provide
access from the gallery. These are working access placements, not verified exact door
positions or the photographed pine sliding partitions. Integer rounding remains, and
furniture/plumbing must still prove the narrow bathroom's usable layout. No rooms are
called fully furnished or faithful at this checkpoint.

Temporary walkthrough entry506 tested gallery→bedroom7995/11407→bath7993/11407→flex
8000/11407→hall8003/11407, all F1; opened doors using E. Returned through gallery
between rooms. Undid entry507. Original street spawn preserved. Exported scene equals
reload/reopen export exactly. Evidence288-upper-layout. Existing void/guards, both
stairs and terrace passage retained. Main game never resumed; no deployment.

### Roof decision from this inspection

A trial to clip one rectangular gable against the L footprint was reverted before any
scene placement: merely removing roof tiles above the courtyard leaves raised cut edges
without appropriate vertical infill/trim. Existing gable-end generation handles only
ends perpendicular to the ridge, so a concave cut also needs side closures. Passing
rectangular-roof tests would not prove this geometry correct.

Do not add a rectangular bounding-box roof over the courtyard or use a flat roof as a
fidelity substitute. Next roof work needs independently editable roof volumes, actual
slope/eave/ridge heights, clipped footprints and all boundary closures. Photo03 supports
a sloped ceiling, photo06 supports the exterior massing; neither alone establishes every
roof plane or a precise30° pitch. Acquire sections/roof views before declaring the roof
configuration measured. A generic roof fixture must include a concave courtyard, exposed
raised edge, intersecting roof volumes and occupied space beneath it.
