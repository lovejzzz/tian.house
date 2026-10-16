# Volumetric workshop implementation

Scope: [Active goal v2](ACTIVE-GOAL-V2.md). This is an evidence ledger, not completed parity.

## 296: wall source → physical mesh

- `src/wall-volume.js`: explicit same-unit endpoints, height, thickness, base; rectangular
  aperture in local physical coordinates. Closed manifold outward surface with through
  reveals; empty full-height passage. Collision cells share the occupied wall partition.
- `src/scene-wall-volumes.js`: read-only source document adapter. Stable wall/opening IDs,
  material IDs and level IDs retained. Caller must supply explicit physical calibration.
  Existing normalized aperture metadata is converted; absent metadata yields unresolved IDs.
- `studies/wall-volume.html`: isolated browser development sample with real WebGL lighting,
  rotations and aperture switching. Does not mutate user saves. Local dependency path is
  development-only; deliverable library assets must use a production dependency build and
  the versioned recipe/semantic/delivery contract before shipping.
- Five tests check watertightness/winding, volume, collision agreement, diagonal geometry,
  passage/invalid aperture and adapter nonmutation. Browser captures verify front/side/back.
- Cantó inventory198 walls:180 generated,18 missing aperture profiles. Diagnostic metrics
  are uncalibrated; converted count is not a quality/accuracy acceptance rate.

## Next dependencies

1. Shared junction topology: avoid gaps/overlaps at corners, diagonal and T intersections.
2. Resolve metric source calibration and unknown opening profiles with evidence.
3. Integrate compiled volumes into workshop selection/editing and physical navigation;
   do not create independently editable duplicate scene state.
4. Add slabs/roof thickness, door leaves/glass and materials with the source recipe contract.
5. Finish complete furnished room/yard sample, rotate/day/night, save/restore and performance
   baseline, before claiming a new rendering foundation or scaling catalogue conversion.

## 297: shared endpoint junctions

Angular-bisector partitions now handle equal-thickness walls at L/T/cross/45-degree endpoints.
Output remains separately identified closed meshes with matched convex collision prisms;
it is not an optimized boolean union. Short-wall/jamb inversion is rejected. Ten affected
checks plus five-wall front/reverse WebGL views pass; diagnostic shadow seam fixed and
before/after retained in evidence297. Cantó audit remains180/198 with18 missing profiles.

Next integration must retain shared identity and public scene operations. Varying thickness,
height joins, unsplit mid-edge intersections and gameplay prism collision remain pending;
do not claim all architectural junctions or full editor integration complete.

## 298: workshop integration and source selection

Workshop controls → 3D structure preview consumes the actual current scene. Orbit/zoom,
floor choice and wall ray selection work; select a wall's owner room and return to existing
room editing. It is read-only scene presentation, not a second scene model. Missing aperture
profiles and provisional metrics remain visible. Mesh resources released on close. Live
browser selected Cantó wall and returned to correct room, then inspected/orbited upper
floor. Export unchanged;679 tests pass; evidence298. Next: resolve source units, floor slabs
and aperture profiles/assemblies, then shared command editing in the new viewport.

## 299: room slabs and void-aware floor selection

`scene-slab-volumes.js` derives physical slabs from room cells/polygons, explicit voids and
compiled floor presence (including stair cuts). Floor datum stays at storey height; slab
extends downward by explicit thickness. Shared mesh/collision partitions retain room IDs.
Workshop preview renders slabs, supports floor picking and routes to the same room editor.
Cantó upper floor inspected from above and terrace selected; saved data unchanged.681 tests
pass. Cell-part internal faces and wall/slab foundation seams still need optimization and
section validation; diagnostic materials and units are not source-fidelity acceptance.

## 300: saved physical dimension contract

Optional scene.physicalDimensions carries four metre dimensions plus evidence/description;
public scene.physicalDimensions command sets it or resets with dimensions:null. Horizontal
scale remains scene.units calibration. Preview uses saved settings; legacy2D gameplay does
not yet. Locked geometry and invalid/overlarge junction thickness reject. Browser save/reopen
and undo restore verified;683 suite passes plus new command regression. Per-floor elevations,
metric navigation, roof conversion and accurate reference measurements remain outstanding.

## 301: generic opening volumes

Parameterized frame and leaf/glass geometry now fits explicit host apertures. Door pivot
transforms geometry/collision consistently; window frame has sill, door frame does not.
Preview renders diagnostic assemblies and maps selection to original opening/host room.
Cantó4 profiled ground doors rendered; missing profiles remain unresolved. Glass inspected
in standalone study.687 tests pass. Source-specific style, state, mechanisms, production
asset recipe/catalogue integration and live interaction remain outstanding.

### Checkpoint302: fixed glazing semantic migration

The adapter recognizes existing TianGlazing=fixed + axis-specific Window semantics as
full-height/full-host apertures, including diagonal runs. Cantó ground now previews5
previously omitted panes:9 assemblies and5 unresolved openings. No source save edits.
688 tests pass; browser image in evidence/302-fixed-glazing/ground.png. Continuous assembly
frame joins, glazed door material/hinges and unknown legacy apertures remain pending.

### Checkpoint303: glazed leaves and hinge semantics

openingVolume supports start/end pivots and separate glazed leaf-frame/glass parts.
Preview consumes existing doorTrans/TianDoorHinge metadata.689 tests pass; browser Cantó
closed-pose evidence303. Poses are geometry-tested only, not yet live/game interaction.
Original steel muntins, handles, continuous assembly frames and authored dimensions pending.

### Checkpoint304: interactive pose inspection

Preview offers temporary closed/45/+90/-90 door poses, preserves view/selection, and disables
pose editing for fixed panes. Browser checked opposite-hinge pair; screenshot304.689 tests
pass. Continuous double-door fixed centre jamb remains a confirmed defect to remove before
clearance acceptance. No animation, live game physics or saved pose contract claimed.

### Checkpoint305: continuous double-door frame joins

Explicit same-assembly continuous door members omit matching shared jambs; leaf width
extends accordingly. Endpoint/height/floor checks preserve unrelated frames. Large-world
boundary roundoff repaired in wallVolume after browser failure.692 tests pass; Cantó open
pair visually rechecked (evidence305). Physical standing-height sample clearance tested;
character navigation/swept obstacle rejection not yet integrated. Fixed glazing joins pending.

### Checkpoint306: multipart fixed-glazing joins

Fixed glazing with explicit assembly identity now shares its outer frame. Independent panes
stay separate.693 tests pass; browser two-host study screenshot306. Glass collision continues
across the join; subtle alpha seam from internal glass end faces remains for optical work.
No actual-house mutation; generic continuous sash-window styling is not inferred.

### Checkpoint307: continuous glass surfaces

Internal fixed-pane render caps omitted at confirmed shared ends; outer caps and collision
retained. Study168 triangles/24 collision prisms, browser both sides in evidence307.694 tests
pass. Transparency still uses diagnostic alpha material; no optical-fidelity claim.

### Checkpoint308: roof render meshes

Existing roof profiles compile to thick slope/closure render meshes in physical units;
preview integration added, provisional15cm vertical skin explicitly labelled.695 tests pass,
independent asymmetric browser study evidence308. Actual editable-roof browser integration,
eave/corner trimming, overhang and sloped collision/headroom remain unaccepted.

### Checkpoint309: actual roof integration lifecycle

Public command added a temporary concave asymmetric roof, visible in 3D preview and after
page reload. Single Undo restored complete exported house exactly to checkpoint300.
Evidence309 added.png/restored.json/verification.json. No code changes or repeat tests.
This is source/preview/persistence acceptance only, not the finished Cantó roof.

### Checkpoint310: roof collision solids

Roof/closure meshes carry exact convex planes from rendered extrusions. Local-coordinate
segment clipping detects entry/exit without filling attic/courtyard.698 tests pass including
large coordinates, reverse motion and thin skin. Browser study43 bodies. Not yet consumed
by character navigation; finite-radius sweep/support/headroom remain to implement.

### Checkpoint311: finite body sweep

Continuous SAT supports axis-aligned body boxes against roof convex solids and existing
wall/slab/door prisms.701 tests pass: narrow doors/low lintels/thin walls, floor contact,
upright versus crouched roof clearance. Physical controller integration remains pending;
this is not capsule collision or actual-browser character passage acceptance.

### Checkpoint312: interactive body controller

Reusable box controller slides against earliest contact, stops existing penetration.
Browser test body blocked by closed door and passes after opening (evidence312).703 tests
pass. No gravity/stairs, moving-door sweep or actual-house character integration yet.

### Checkpoint313: gravity/support

stepPhysicalBody provides bounded substeps, gravity and floor/ceiling response.706 tests
pass. Browser drop lands at expected height and grounded body passes open door (evidence313).
Actual-house controller, stairs and final character/continuous input remain pending.

### Checkpoint314: actual-house physical walkthrough

Preview can spawn finite body on selected room's actual compiled slab and step with gravity
against current-floor solids. Cantó grounded/wall stop/back-away browser verified; evidence314.
706 tests pass. No artificial terrain, no saves changed. Missing opening geometry, other-floor
colliders, stairs, furniture and continuous controls remain explicit limitations.

### Checkpoint315: continuous keyboard/focus

Scoped held WASD/arrows, diagonal normalization, blur/visibility key reset, timestamp reset
and disposed listeners. Native browser500ms/300ms movement and canvas-focus recovery verified
(evidence315).706 tests pass. OS-app/background lifecycle and performance profiling pending.

### Checkpoint316: all-floor collision

All structural floors feed physics; current floor still controls rendering.707 tests pass,
including void fall to lower slab. Cantó browser upper support/edge-wall blocking verified
(evidence316); actual fall unverified because the tested void has an edge wall.9 apertures
remain unresolved. Browser replacement is tab38; no house mutation.

### Checkpoint317: provisional stair volumes

Existing vertical links compile to solid-flight treads (straight/return/legacy height
semantics), both endpoint floors see them.709 tests pass; Cantó browser evidence317.
Provisional18cm riser subdivision; not original art reconstruction or shipping recipe.
Step-up/headroom and actual ascent/descent still pending, as are rails/under-stair fidelity.

### Checkpoint318: step-up + actual legacy flight traversal

Grounded22cm step checks overhead/across/landing, rejects tall obstacles/low ceiling.
711 tests pass; real Cantó native-key ascent z.9→3.9 and descent→.9 verified, evidence318.
Display still stays selected floor; automatic following, return/all-direction route coverage,
side barriers and authored stair fidelity remain pending.

### Checkpoint319: floor/camera follow

Body height selects visible floor with downward hysteresis; camera target follows movement.
712 tests pass; actual Cantó native-key up/down switches level1→0 without stopping controller
(evidence319). Cutaway smoothness, time-based camera damping and rebuild performance pending.

### Checkpoint320: collision broad phase

Compiled convex bounds feed a bounded static spatial grid. Swept-body queries and spawn
checks filter candidates without changing narrow-phase SAT or stable contact ordering.
Large queries/solids and legacy missing bounds retain fallback coverage. 714 tests pass,
including exact full-scan/indexed movement and stair-route parity. Actual held-key browser
ascent/descent crosses level:0/1 and returns grounded (evidence320). Synthetic Node
2k/10k/50k timings are retained separately from still-pending browser performance budgets.

### Checkpoint321: legacy glass-door dimensions

Reusable source-silhouette audit and inferred 48/49 glass-door profiles recover six of
nine missing assemblies in actual Cantó. Three corner/miter conflicts remain explicit;
per-host reporting prevents one bad opening from aborting all preview geometry. 716
tests pass. Actual closed-door collision/open-door crossing verified, but courtyard
support is missing and body falls outside; not a successful exterior walkthrough.
Source art/style unchanged; inferred dimensions are diagnostic, not accepted art fidelity.

### Checkpoint322: compiled exterior support

Added saved-plan exterior/standalone surfaces, per-level/material, sharing slab extrusion.
Preserves water, empty cells, room holes, polygon masks, basement support and explicit
low platforms. 718 tests pass. Actual private-room door → courtyard → room route stays
grounded (evidence322), fixing checkpoint321's fall. No blanket plane or scene mutation.
Five surface groups in current case; three corner apertures remain unresolved. Neutral
rendering is diagnostic, not final terrain/material art or swimming acceptance.

### Checkpoint323: clipped corner jambs

Physical cross-section clipping replaces inverted rectangular jamb partitions. Shared
internal faces cancel; rendering/collision use the same clipped regions. Exact coverage,
closed/outward geometry, reversed/end cases and invalid-short-wall rejection verified.
719 full tests plus16 affected tests after one added case pass. Actual previously missing
upper corner door blocks closed and permits a grounded round trip open (evidence323).
Current source34:191 wall volumes/18 opening assemblies/0 unresolved. This resolves the
three checkpoint321 geometry conflicts; source styling and dynamic door sweep remain.

### Checkpoint324: recipe-backed timber table

First furniture family has source recipe, semantics, migration mapping, material,
compressed delivery, physical geometry and collision. Public command placed both source
orientations; browser loaded gzip model and actor collided at the actual tabletop edge.
722 tests pass. Test transaction undone; export equals309 exactly. Prototype plain timber
material only; textures, catalogue-wide coverage and full visual acceptance are pending.

### Checkpoint326: light/shadow foundation

Z-up sunlight/moonlight rig fitted to far-world scene bounds, tone mapping and physical
opaque shadows. Day/night control is preview-only. 723 suite tests; browser paired views
and held-input check. Retained rejected crushed-dark image and revised environment fill.
Not visual acceptance: fixture lights, textures, GI/contact detail, hidden ceiling/floor
occlusion and shadow performance budgets remain unverified. See evidence326.

### 327 — table-mounted lamp / local light prototype

Registered procedural lamp with compressed delivery; generalized build to two families.
Same authoritative objects supply table support and scene-positioned shadow-casting local
lights. Diagnostic switch permits identical-camera on/off comparison. 726 tests pass;
public placement, browser on/off, grounded route and exact export restoration verified.
See `evidence/327-table-lamp/`. Downward spotlight and untextured open shade remain a
prototype: no fabric transmission, bulb, soft area illumination, whole-room visual acceptance
or measured multi-fixture performance. Full goal and deployment remain incomplete.

### 328 — fixture self-shadow correction

Resolved emitter inside lamp stem using two energy-split samples; added bulb and switchable
shade emission. Six affected tests pass; browser on/off confirms tabletop illumination,
public placement/undo/export preserve source exactly. Evidence `evidence/328-lamp-emitter/`.
Fabric transmission remains approximated, multiple-light performance unmeasured, final
visual target unmet. This extends327 rather than replacing its broader pending acceptance.

### 329 — chair and shelf batch

Shared open-frame generator, four-way placement transforms, compressed chair/shelf recipes
and source metadata mappings. Five-object public batch tested in browser, day/night, aisle
walking and chair contact. 730 tests pass; undo/export exact restoration. Evidence329.
Only four prototype families supported; unknown-object visibility, materials, populated
storage, full room/yard and game interaction acceptance remain pending.

### 330 — furniture coverage and source layout validation

All four family recipes record reviewed source part offsets. Invalid/ambiguous mappings,
missing support/level and unconverted furniture report explicit reasons; unconverted hosts
do not leave floating lamps. Browser valid-E-table/unknown-chair case reports1/1 correctly;
732 tests pass and undo/export restores exactly. Evidence330. Missing geometry is still
missing collision; diagnostics do not constitute full migration or acceptance.

### 331 — 3D furniture editing through authoritative commands

Mesh selection resolves host/group and highlights all linked parts. Move/rotate save through
existing gateway and history; no alternate scene. Browser lamp-select → move table assembly
→ rotate → reload/export → three undos verified, with exact edited/reloaded and restored
exports. 734 tests pass. Evidence331. Nudge UI is provisional; free placement/drag UX and
full-game acceptance remain unfinished.

### 332 — recipe-driven wood material

Shared generated color/roughness maps, physical object-local UVs, mipmaps and disposal.
11 affected tests pass. First stripe-heavy browser result rejected and revised; day/night
captures retained. Exact undo/export restoration. Evidence332. Generic timber remains an
approximation; final materials/whole-room appearance and broader acceptance are pending.
