# Polygon room integration contract

Status: 45-degree polygon rooms now compile through the public command path, render in the editor/game/thumbnails, and use shared runtime geometry. A visible Corner cut control, real SE walkthrough, NE visual check, refresh, undo/redo and export/import have been verified. This is an initial polygon-room capability, not a completed Momento reconstruction. Flat polygon roofs and grid-square eaves are verified (184). Single diagonal doors now support public placement, replacement, removal, game toggling and traversal (185). Single diagonal windows now support placement, continuous approach and two-way climbing with full-body clearance checks (186). Single and paired fixed full-height glazing now work on orthogonal and diagonal hosts (187). Polygon pitched roofs, general vertex handles, and polygon split/merge remain incomplete. The staged refusal described in historical sections 181–182 has been removed.

## Why this is necessary

Momento's exterior reference has a chamfered street corner. Replacing it with a rectangle loses a defining shape. A diagonal sprite alone is insufficient: the boundary crosses a cell interior, so whole-cell floor occupancy and N/W-only wall flags cannot describe it. The visible floor, physical wall, room membership and editable outline must share geometry.

## Implemented kernel

`apps/pz-browser/src/polygon-footprint.js` accepts simple integer-grid outlines with orthogonal and 45-degree segments. It rejects crossing/touching outlines, doublebacks, unsupported angles and out-of-budget shapes. Canonical winding and start vertex make equivalent outlines deterministic. Four rectangle corners can be chamfered.

Compilation returns canonical vertices, area, floor cells with local polygon pieces and fractional area, and closed boundary edges. Diagonal lengths are sqrt(2), not one cell. Concave outlines are triangulated before clipping so an empty notch is not filled. Clipping happens in local coordinates: direct world-coordinate calculations falsely reported overlaps near the supported coordinate limit. Tests compare translated output at source-map and positive/negative large coordinates.

Swept-square intersection handles a wall crossing inside a single grid cell and long motion segments. It is a geometric intersection predicate, **not yet a complete actor movement resolver**: sliding, retreat from contact, staircase traversal and spawn recovery remain integration requirements.

## Required integration before exposing the tool

1. Add authoritative polygon room footprints and diagonal wall identities. Preserve unaffected wall IDs and photo bindings. Existing room.cells and rectangular documents retain their meanings. Invalid imported polygons must fail atomically.
2. Compile partial floor masks and physical boundaries from that same kernel. Preserve ground outside a cut room. Shared boundaries, adjacent partial cells, legacy structures and scene budget checks must use actual occupied area, not bounding boxes.
3. Add a public chamfer operation and editor handle through the normal preview/commit, revision, receipt and undo path. Before removing a boundary segment, detect hosted doors/windows, mounted objects, locked components and shared neighbors; do not silently delete their identities.
4. Render masked floors and correctly mapped wall material in the game, workshop and library thumbnails. Derive wall UVs from physical length/height; do not resize a complete isometric wall image into a different perspective. Reuse geometry for picking, outlines and depth ordering. Test both diagonal axes including their different projected widths.
5. Integrate same-cell boundary collision, actor clearance and contact retreat. Update pathfinding, line of sight, interaction reach, indoor membership and valid standing positions. Visual clipping alone cannot pass this gate.
6. Update roof outlines, upper floors, holes and stairs. Unsupported structural combinations must have explicit errors until implemented; never approximate them silently with bounding rectangles.
7. Actual browser acceptance: create each chamfer orientation through public controls; furnish and walk both sides; save, reload, export/import, undo/redo; inspect corners at multiple zooms. Existing orthogonal houses must remain unchanged.

## Evidence and remaining scope

Geometry tests: `apps/pz-browser/tests/polygon-footprint.test.mjs`.
Run evidence: `evidence/180-polygon-geometry/`.
Neither the numerical sweep nor the automated suite proves editor usability, wall texture quality, actor behavior or a photo reconstruction. Those gates remain open. Curves and arbitrary wall angles beyond 45 degrees are also not supported by this first kernel.

## Structural integration (181)

Rooms may carry `polygon` world-grid vertices and their exact bounding `rect`;
`cells` and `polygon` are mutually exclusive. Derived floor fragments remain out
of the authoritative document. `room.chamfer` cuts a rectangular room;
`room.outline` changes a polygon outline. Both reducers preserve unaffected wall
identities, share retained neighbor walls, obey existing entity locks and reject
lost openings, mounts, furnished floor, entry points, supplies and stairs.
Reapplying a reversed equivalent outline preserves the same structure.

Room overlap now intersects convex pieces rather than treating every touched cell
as completely occupied. Two rooms can share opposite triangular halves and one
diagonal wall. Floor holes require complete cell coverage. Rectangle-only merge,
boundary drag and roofs explicitly refuse polygon shapes until their matching
implementations exist.

`compilePolygonRoomGeometry` derives version-1 floor fragments and diagonal wall
endpoints/material-plane metadata. `compileStructuralScene` has an internal
`polygonGeometry` staging option for integration tests: it preserves underlying
ground in partial cells and does not emit misleading N/W wall sprites for a
diagonal. It rebuilds geometry from entities and ignores stale derived metadata.
The public model/session does not pass this option; preview rejects the edit
without changing the current document. This is a temporary implementation gate,
not an external permission requirement. Remove it and replace its refusal test
with real public commit/reload/walkthrough acceptance when consumers are complete.

Evidence: `evidence/181-polygon-structure/tests.log` (473 automated tests). No
browser acceptance, new playable save, or deployment is claimed for this stage.

## Runtime integration (182)

`PolygonRuntime` indexes compiler floor fragments and walls. `World.setHousePlan`
replaces that index whenever a house is loaded; changing to an ordinary plan
clears it. `canStep`, full actor movement, visibility rays and interaction reach
now test same-cell diagonal walls. `floorAt`, rain blocking and indoor checks
respect actual floor fragments rather than the whole touched cell. Underlying
ground remains walkable outside a cut on the ground floor.

Movement uses swept actor squares and exact L-infinity distance to a segment.
Touch permits tangential movement; a pre-existing small penetration permits
retreat without crossing through to the other side. Corner probes still handle
legacy axis walls/floors; diagonal clearance is resolved once for the whole body.
This avoids a corner probe treating tangential contact as a crossing.

Automated runtime tests instantiate the real World from staged compiled rooms.
They cover both approaches to all four chamfers, repeated pressure, long motion,
contact escape, same-cell visibility/reach, upper floor support, indoor/outdoor
classification, JSON roundtrip and switching houses. Full suite: 479 passing
tests; evidence in `evidence/182-polygon-runtime/tests.log`.

This does not prove browser controls, wall rendering, routing to off-center
standing positions, large-scene performance or full gameplay. The public commit
gate remains until the visual consumers and actual editor walkthrough are ready.

## Public editor and visual verification (183)

Edit rooms → select a room → Corner cut chooses NW/NE/SE/SW and a whole-cell
distance. Editing an existing polygon explicitly replaces it with one corner cut.
The public `room.chamfer` (rectangular source) and `room.outline` (explicit
vertices) commands use the same reducer and normal receipt/history persistence.
Polygon edge dragging remains unavailable; the corner editor and public outline
command provide edits. Room labels report actual area, separate from bounds.

Floor drawing unions fragments per tile and clips the source floor sprite.
Source N/W wall art is unprojected into its physical material plane, then mapped
onto the new segment at its sqrt(2) length. Texture padding is clamped and pattern
phase follows the wall run; this fixed seams found in actual browser inspection.
A face parallel to the view direction is shown edge-on. Editor, gameplay and
library thumbnails share these routines. Diagonal wall clearance rejects
whole-cell furniture/stairs on the boundary.

Actual browser 8883: add a room using Build commands, apply SE cut 3 via the
visible control, export, reload and reopen with identical export; set an entry
and walk into the slanted wall, continue pushing without passing, then retreat.
Game reload retains location. NE cut 3 renders edge-on; undo restores SE. Undo
to rectangle and redo to SE restores the exact export. Importing the original
export preserves content except the expected scene revision (20→21). Cleanup
export is identical to the initial four-photo empty draft. See
`evidence/183-polygon-editor/verification.json` and screenshots.

This workflow exposed localStorage quota failure in the pre-walkthrough backup.
GameSaveStore now stores backup and replacement in one IndexedDB transaction,
reads legacy saves without deleting them, and serializes writes. Running game
state changes only after persistence succeeds. Tests cover >6 MiB payloads,
abort after the backup put, retry and ordered saves. The real four-photo house
then loaded, walked and reloaded successfully. Page-close asynchronous save
completion and multi-tab game-save conflict handling were not stress-tested.

486 automated tests pass. Browser testing covers this fixture, not arbitrary
polygons, all material families, multi-level polygon buildings, performance
budgets, or unseen-photo acceptance. No deployment was made.


## 184 — Flat polygon roofs and continuous grid-square eaves

Flat roofs now compile the actual room footprint into shared floor masks. Roof
cells carry roof ownership, area and local convex fragments; editor drawing,
thumbnail rendering, rain cover and walking support use the same geometry.
The visible Add flat roof, Corner cut and Roof overhang controls work together;
a flat roof follows an outline edit without losing its identity. Gable roofs on
polygon rooms still reject explicitly.

Eaves are the continuous Minkowski sum with an axis-aligned square of radius
0–2 cells, consistent with existing grid-square eaves. This is not a uniform
Euclidean normal-distance offset. Integer translations alone would leave holes
for half-cell triangles. The implementation expands convex sector pieces and
unions their coverage; the four-sector representation is exact for the validated
integer orthogonal/45-degree vocabulary, not an arbitrary-angle approximation.
Roof-area tests cover all four cuts, positive/negative world translation and an
independent polygon-versus-square intersection oracle for concave shapes.

Whole-cell objects and stair bases require all sectors to be supported. Cutting
roofs protects rooftop contents, entries and stairs before compilation. Existing
upper structures or lot overflow still reject atomically; roofs sharing opposite
parts of one upper cell remain conservatively rejected. No claim is made for
arbitrary roof intersections, fascia, thickness, drainage or polygon gables.

Real browser 8883: public Build commands add the rectangle, Add flat roof creates
its roof, Corner cut makes SE distance 3, Roof overhang cycles 0→1→2. Whole
building shows the clipped outline; hiding Roofs retains the room floor and
walls. Reload export (52) and redo export (53) exactly equal (51). Importing the
unchanged (51) through the file chooser produces (54), differing only in scene
revision. Undo restores (55), identical to pre-test (50), with four photos and
zero rooms. Console errors are empty. See evidence/184-polygon-roofs.

491 automated tests pass. Partial roof support/rain were tested using actual
World instances; this turn did not perform a new rooftop character walk or a
three-day residence test. Photos remain unbuilt and no deployment was made.


## 185 — Hosted diagonal single doors

Diagonal door openings retain a stable opening ID and host-wall ID. Compilation
emits the source leaf, matching frame and one-cell physical width in the derived
wall descriptor; it never inserts a fake N/W collision tile. The leaf stays one
cell wide on a sqrt(2)-cell wall, with material-matched wall segments on either
side. Drawing uses the unprojected frame/leaf planes. An open leaf rotates about
its hinge; edge-on leaves have a visible thin edge.

Runtime changes use an opening-ID-based virtual tile key, avoiding collisions
with ordinary source tiles. Closed doors block movement; open doors leave the
actual side jambs. Opaque/glazed doors differ for vision, and curtains/barricades
retain their blocking effect. Nearby E interactions target the real wall centre,
ignore only the target host boundary, and still reject intervening walls. Door
lock/inside logic and the normal game serialization path consume the descriptor.
No open-leaf swing obstruction solver or arbitrary door widths was added.

Catalog placement hits the visible diagonal face, auto-selects compatible N/W
source art, previews the actual derived wall and commits through the structural
model. Manual orientation retains the mismatch warning. Erase hits the visible
opening and restores its wall. The new public `opening.replace` command requires
preserving an existing opening's ID; removal uses `opening.remove`. Room locks
and retained photo bindings therefore keep their normal meaning.

Real browser 8883: Build commands create the shell; the catalog search for
fixtures_doors_01_0 finds Door W; clicking the middle SE wall places it. Clicking
the door with Erase restores the wall, Undo restores the door. Set entry and Walk
through succeed with the four-photo payload. Holding S stops at the closed door;
E opens it and S exits. E closes from outside, W remains blocked, E/W returns.
After closing inside, saving and reloading, the game restores 8003,11407 at 17:16
Day 1 and offers Open door. HUD coordinates are integer cells; exact continuous
collision on both sides of all four chamfers is separately tested with World.

Editor export57 equals pre-reload56; file-chooser import produces58 differing
only in scene revision. Undo returns59 identical to baseline55, four photos and
zero rooms. Console errors are empty. Evidence: evidence/185-diagonal-doors.
The complete suite passed496 tests; final affected checks passed5 after the
last diagnostic/garage-door guard adjustment.

The handoff validator now checks derived wall, frame and leaf atlas references,
not only tile-square references; missing frame testing proves live state remains
unchanged. This closes a derived-asset coverage gap found during implementation.

Windows deliberately remain unavailable on diagonal walls. Their existing
approach, landing, barricade side, turn and climb motion assume adjacent grid
squares. They must use continuous positions and validate the entire landing
footprint before release. Diagonal glazing/material families and general opening
sizes remain further work. The actual visual walkthrough covers the SE single
wooden door; other orientations and glazed-door vision have automated coverage,
not equivalent browser evidence. No photo case or deployment was completed.


## 186. Diagonal single windows

A hosted single window uses the material family's window-opening frame, a stable
scene-opening state key, and the source pane's open/smashed/glass-removed offsets.
The editor uses the same placement/preview/undo path as diagonal doors. A matching
material direction is required; full-height custom glazing is not yet supported.

Two standing points sit 0.45 cells along the normal through the opening centre.
Approach moves through World.move and refuses an obstructed direct approach rather
than snapping to a cell centre. Climbing checks the swept .18-radius square body
against other diagonal boundaries, retained jambs, ordinary walls, solid objects,
and floor support. The checked crossing follows a continuous smoothstep path after
the climb-start phase; it does not reuse the source's axis-aligned root translation.
The animation clips remain the existing source clips. Open windows retain sill
collision, and climbing remains an explicit action. Barricade sides use the wall
normal; either side blocks climbing. Modern side-specific boards render in the
wall plane. Legacy numeric barricades retain collision but lack reconstructed art.

All four chamfer directions have automated open/close, two-way climb, sill collision,
undo/reload and state-save checks. Missing support at a body corner, a solid landing,
barricades and a landing blocked during the action reject/cancel the crossing. A
mid-crossing obstruction returns the actor to its recorded start; a richer retreat
animation remains future polish. Initial test failure was an invalid barricade
fixture (planks instead of plankHealth), corrected against the actual state schema.

Actual browser evidence on localhost8883: place Wooden Window W from the catalog
on the SE face; set entry with the toolbar; Walk through; S approaches the window;
E opens; S alone remains blocked; Nearby/Climb through exits; W approaches from
outside and Climb through returns; W continues into the room. Reload restored
8003,11407 at 19:36 Day1 and Close window; E then closed successfully. The actor
was injured by an existing exterior zombie during the test; this is not a residence
or combat acceptance test. The final resource-preflight change also passed a real
Walk through after reload. Game is paused at the test room entry, with existing
thirst/bleeding state retained. Editor Undo three times restores export61 exactly
to export59: four photos, no rooms. Export60 retains the single-window fixture.
Console errors were empty. No file-chooser import was repeated in this milestone.

499 full-suite tests passed before final resource-preflight/board-render changes;
9 affected door/window tests then passed, including a new missing-state-art check.
Evidence: evidence/186-diagonal-windows. No photo case was built or deployed.


## 187. Fixed full-height glazing and continuous picture assemblies

TianGlazing=fixed plus a matching uppercase WindowN/W property explicitly denotes
fixed architectural glazing, carrying its own frame. Orthogonal structural walls
now compile these panes directly instead of requiring an ordinary window frame;
previously the catalog asset existed but failed on editable walls. Derived diagonal
panes span the full sqrt(2)-cell segment. The renderer preserves 4-pixel edge strips
while adapting the glass field to the physical width, rather than widening all
frame members. Source single/picture glazing art is reused, no raster files changed.
Fixed glass transmits sight, blocks movement, and does not expose opening/climbing
interaction. Destruction of fixed glass is not implemented by this capability.

Single panels and two-part picture panes support catalog auto N/W alignment and
R/manual direction. A two-part diagonal asset follows consecutive diagonal hosts
(x+1,y+/-1); same-level/axis/material direction and every supporting segment must
exist. Preview highlights and draws both parts. Too-short support refuses the whole
operation. Picture parts retain separate opening IDs plus a shared assemblyId;
removing or replacing one removes the old complete picture, avoiding a borderless
half. Undo restores the complete assembly. Floor copying remaps assembly IDs so
removal downstairs cannot delete upstairs panes.

Public automation can use catalog command place with hostWallId for a diagonal
host, still validated by the same model/asset/position rules. openings.replace
accepts an atomic list of opening records; single opening.replace and opening.remove
share the identity-preserving assembly reducer. No scene-specific code was added.

506 tests passed. Coverage includes N/W structural placement, all four chamfer
orientations, full-span vision and movement, no erroneous interactions, atomic
rejection, room lock, auto orientation, whole removal/replacement, export/reload,
floor-copy identity separation and physical frame strip sizes. Initial failures
exposed an incorrect assumption that authoritative walls already had derived a/b
endpoints, corrected to the validated unit-diagonal physical length; an orthogonal
erase test initially picked the intersecting corner wall, corrected to an unambiguous
face. Browser evidence covers SE and W, not all four rendering directions.

Real UI: start revision333/four-photo empty study; public room/chamfer transaction;
select Picture glazing N; click SE first face auto-aligns to W and places both parts;
click W wall places another picture; last diagonal segment rejects an oversized run.
Erase second diagonal part restores both wall segments, Undo restores glass. Actual
Walk through, held S, then S again stays at8004,11408; Nearby has no actions. Game
paused/saved20:49Day1; pre-existing thirst/bleeding retained. Export62==reloaded63.
Importing the same62 was a no-op; one extra Undo changed reference metadata, detected
by export comparison and exactly recovered with Redo66. Subsequently imported62 from
the empty baseline, yielding67 identical except scene revision. Undo restores68
exactly equal to61, preserving all four references. Console errors empty. Evidence:
evidence/187-fixed-glazing. Photo cases and deployment remain incomplete.
