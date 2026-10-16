# Reusable asset authoring field guide

Use this alongside [ASSET-PIPELINE.md](ASSET-PIPELINE.md). This is a map of working
building blocks and lessons, not a claim that procedural geometry matches every reference.
Source photography establishes visible shape; uncertain functions/materials remain explicit.

## Start with a reusable family

Describe silhouette, approximate world footprint/height, support, visible material, required
orientations/states and intended interactions before drawing. Search the semantic catalogue
for an existing family. Reuse its geometry when appropriate; do not duplicate objects simply
to change direction. Give different materials/styles distinct selectable identities.

Existing generators are source-code recipes. Their external `parameters` contract is empty;
do not claim that editing recipe JSON currently changes geometry or palette. Add new sprite
regions at the end to preserve existing IDs/atlas coordinates. Registered original recipes
live in `assets/recipes/originals.json`; original PNGs are authoring/recovery sources.

| Need | Working starting point | Important constraints |
|---|---|---|
| Box, cabinet, tabletop | `tools/make_cafe_assets.py`: `box`, `point`, `oriented` | Rotate geometry, collision and support together. Cabinet may occupy only part of a cell. |
| Rounded/multipart counter | Same generator: counter families, polygon clipping | Shared edges must not become seams; occupancy is a sparse cell set, not a rectangle. |
| Table decoration/equipment | Same generator: menu, circular display pair | `TianMount=table`; host must expose `IsTable` + `Surface`. Keep separate editable objects. |
| Wall-mounted shelves | Same generator: wall shelves N/W/E/S | Opposite face uses `TianWallSide=opposite`; slots and interaction point extend across the host boundary. |
| Lights and overhead detail | Same generator: pendants, ceiling spots/conduits | Ceiling mount needs an actual supporting floor/ceiling; light behavior is distinct from drawn glow. |
| Brick, plaster, weathering | `tools/make_masonry_assets.py` | Preserve wall openings and material identity; texture cannot stand in for architectural geometry. |
| Glazing and frames | `tools/make_architectural_windows.py` | Intact/broken/open are states, not directions. Browser alpha decoding may require PNG. |
| Open mesh/bar guards | Masonry generator: `tian_guard_{mesh,bars}_{N,W}` | Structural edge supported by adjacent slab; not a wall-mounted decoration. Block movement while transmitting sight. |
| Straight stair flights | Cafe generator + `straightStairPath` | Delivered runs3–6, four directions. Match rise/gradient and guard edges; both landings need floors and unobstructed entry boundaries. |
| Textiles/interior trim | `tools/make_house_details.py`, `tools/make_interior_rugs.py` | Mount and layering must agree in catalogue, preview and gameplay. |
| Repeated floor materials | Cafe generator: terrazzo palettes, street paving | Fix grain at world scale; independent seeded x/y distribution; inspect multiple adjacent cells, not one swatch. |
| Raised/chamfered paving | Cafe generator + `ground-footprint.js` | Convex `TianGroundPolygon`, explicit height and lower base; walk across both profiles. |

## Contracts learned from actual failures

- **Shape and collision:** use `TianCollisionPolygon` for partial-cell solids. Verify a person
  can use the free part and cannot pass through the occupied part in every orientation.
- **Installation:** `TianMount` selects floor/table/wall/window/ceiling support. Normal and
  opposite wall faces must use the same side for art, reachability, E hint and stock display.
- **Occlusion:** opposite-face art and stock need projected-face depth, not host-cell depth.
  Use shared `furnishingDepth`; inspect both opaque exterior and cutaway interior. A shelf
  that looks right through transparent walls can still paint through a nearer opaque wall.
- **Contents:** `TianDisplaySlots` are local x/y/height coordinates, not scene coordinates.
  Storage data remains on its stable host; moving a shelf must move the inventory binding.
- **Multipart anchors:** catalogue parts are normalized to their bounding-box minimum, not
  necessarily sprite part zero. Diagonal strips can start at `(0, span-1)`; derive placement
  and support from catalogue offsets, and test every segment.
- **Reference links:** replacing an object or wall can leave photo annotations pointing at
  removed IDs. Rebind through public annotation commands and audit links after each batch.
- **Assemblies:** preserve host IDs, sparse occupied cells and children through move/rotate,
  undo and reload. Adding a pretty sprite alone is not successful integration.
- **Materials:** vary palette, grain/aggregate, joints and edge wear independently. A grey
  tint is not a terrazzo surface; a brick pattern is not a wall opening. Keep scale consistent.
- **Semantics:** `TianVariantFamily` joins direction variants; condition and multipart roles
  remain distinct. A pale circular object is not a confirmed speaker just because it resembles one.
- **Repeated textures:** independent coordinate sampling matters. The first terrazzo recipe
  used correlated modular x/y values and produced diagonal bands only obvious across a room.
  Preserve rejected multi-cell screenshots; a successful lossless build cannot detect this.
- **Evidence:** historical tests prove a feature existed then. Reinspect the latest scene
  after topology changes: the interior threshold disappeared even though its earlier test passed.

## Batch the scene work

Inventory all input images first; separate missing assets from missing placement or uncertain
interpretation. Group by geometry/support/material method, prove one representative in its
intended context, then generate siblings together. Build and inspect one batch, place through
bounded public transactions in support-before-child order, and collect corrections from a
complete route. Track rebuilds/reloads/rework and case completion, not only sprite count.

Use a batch ledger before starting production: reference region, family, existing asset ID
or missing capability, required variants, support dependency, acceptance check and status.
An unidentified object stays uncertain rather than becoming an invented production task.
Directions are variants of one family; damage and function remain separately identified.

Separate **production batches** (shared generator/material/support) from **placement
batches** (dependency order and a reviewable region). A single atlas build can serve several
placement transactions. Do not regenerate a whole family between placing individual items.
For each production family, validate a representative junction/host and all distinct support
contracts before expanding variants. Fix foundational geometry before making its siblings.

Place structure → openings/stairs → finishes → furniture → mounted details. Preview each
bounded transaction against the latest revision, commit once, then inspect its resulting
state before retrying an uncertain response. Do not make the entire house one transaction.
Collect non-blocking visual corrections during one full review route and fix them together;
repair support, collision, corrupt saves or invalid IDs immediately. Reuse unchanged passing
checks and rerun checks affected by the correction. Log build/reload counts, elapsed time
and reworked families; claim a speedup only after comparing equivalent completed work.

## Prove the asset works

1. Run the canonical build, not only the generator. Use a Pillow/WebP Python via
   `TIAN_ASSET_PYTHON` when system Python lacks it; build/freshness commands are in the pipeline guide.
2. Inspect catalogue family grouping and preview. Place using public workshop operations.
3. Inspect the actual assembled object at normal game zoom, including its junctions,
   support height and neighboring objects. For materials, inspect a multi-cell patch.
4. Exercise affected behavior: rotation, host movement, collision/reach, inventory, undo,
   export/reopen. A decoration need not invent an interaction to pass.
5. Confirm delivery equivalence in the target browser. Offline RGBA equality alone did not
   catch semi-transparent WebP differences; architecture/house-detail pages currently retain PNG.
6. Keep a reference-region binding, known approximations, recipe/build hashes and rendered
   evidence. Structural tests and pixel-losslessness do not establish artistic fidelity.

## Concrete examples to reuse

- `tests/cafe-furnishings.test.mjs`: counters and mounted equipment, cabinet/display rotation.
- `tests/cafe-wall-details.test.mjs`: opposite-face shelf reach and inventory rehosting.
- `docs/project-zomboid/evidence/264-opposite-wall` (repository root): wall-face correction.
- `docs/project-zomboid/evidence/267-cabinet-display`: full recipe → build → public placement.
- `docs/project-zomboid/evidence/268-layout-review`: latest-scene visual audit catches lost detail.

Still missing: a visual recipe editor, a general external parameter schema, automatic material
recognition, and an independently accepted broad style library. This guide makes current
experience reusable; it does not claim those capabilities already exist.

Batch regression example: `workshop-commands.test.mjs` now covers legacy-overlay
erase followed by structural drawing, undo and reload. A successful transaction
receipt alone did not prove the erasure survived the next operation's compilation.

### Volumetric support migration

Do not infer a supporting surface from a lot boundary or a visually flat sprite layer.
Compile actual floor semantics and polygon masks; room-owned cells and their holes must
remain owned by the room compiler. Rugs/overlays and water are not independent walking
support. Carry source floor elevation through the same units as structure and collision.
Checkpoint322 regression: an open door worked, but the character fell into the courtyard
because only room slabs had been compiled. Always verify both sides of an opening and a
return route, including outdoor support, instead of accepting the door crossing alone.

### Local fixture emitters (volumetric preview)

Inspect the emitter against its own geometry before tuning brightness: a point inside a
solid stem can self-shadow the entire tabletop. The table-lamp prototype uses two offset
samples clear of the stem, splitting total intensity rather than multiplying energy.
Visible bulb/shade emission is switched with the actual lights; it is an approximation of
fabric transmission, not proof of indirect illumination. Inspect identical-camera on/off
captures, preserve support height and record per-fixture shadow-map cost. Two shadowed
samples are not yet a catalogue-wide performance policy.

### Volume migration coverage

A tile-name set is insufficient to identify multipart furniture: review and store source
`SpriteGridPos` offsets for each direction. E-facing tables can have reverse tile numbering.
Reject inconsistent arrangements or ambiguous family matches. Report every omitted scene
object and missing support; never silently treat an incomplete 3D view as a whole-scene
walkthrough. Fixtures on unconverted hosts must be reported instead of floating over an
invisible surface. See `volume-furniture-coverage.test.mjs`.

Domestic volume batch: `domestic-furniture-volume.js` generates sofa/bed and oven/fridge
assemblies from separate semantic recipes. Upholstered assemblies retain individual cushions,
feet and frames; appliances retain seams, panels and handles. Rounded footprint corners are
chamfers, not accepted upholstered curvature. Verify every bevel against both local face
spans (thin glass first failed this), and test overall physical footprint after adding trim.
Four-direction imported mappings come from Facing + SpriteGridPos, never numeric ID order.

Wet-fixture volumes: `wet-furniture-volume.js` shares ceramic ellipse/rim geometry between
standing sink and toilet; separate convex rim wedges leave a real basin cavity instead of a
solid disk. Storage counter preserves the imported35/32 tabletop height. Source directions
are reviewed independently (standing sink N/W have differing source Surface metadata and
remain approximate). Retain source interactions; geometry alone does not implement plumbing,
washing, sitting, storage animation or a complete bathroom.

Opaque door migration: inspect closed source silhouette in wall-plane coordinates and clamp
base to the floor only after visual review. fixtures_doors_01_0/1 and48/49 share reviewed
bounds but differ in glazing; adapter must require the correct source property, not treat
matching dimensions as identical semantics. Validate closed obstruction and open passage with
the full body width, retaining jambs/lintel. Diagnostic open pose is not persisted gameplay.

Shower template: keep a real open front and separate screen colliders; render glass with
explicit material opacity without removing its collision. Flush tray/drain must match source
floor elevation. A4mm drain initially blocked a full-height body: test entry with realistic
foot clearance, not just eye-height rays. Generic step-up support remains separate work.

Emitter transforms: light position/target are points, but area-source sample offsets are
vectors. Rotate vectors with the source facing before world scaling; never apply placement
translation, tabletop support or floor height to them. Symmetric table lamps can conceal
orientation defects: verify asymmetric sample offsets in all four directions and non-unit
scale, then inspect real source/target positions. See volume-lamp.test.mjs checkpoint338.

Wall-light volume template: local x follows the wall, local y projects into the room, local
z is height from storey base. Validate the authoritative wallMounts before emitting geometry;
add half of the actual wall thickness in metres, never an arbitrary grid offset. N and W
wall frames differ from freestanding furniture-facing transforms. Rotate source sample vectors
in that same wall frame. Reject openings, missing hosts, diagonal/opposite mounts until they
have supported geometry. The emitter must sit beyond the opaque diffuser face; otherwise the
fixture self-shadows. Wall-strip/sconce recipes preserve authored Tian IDs and source sprites.
Checkpoint339: very short spot shadow near planes (.01m) plus tiny bias gave visible grid-like
self-shadow artifacts at the house's large coordinates. A .1m near plane and modest bias reduced
them in real browser captures; this is not proof of broad precision or performance acceptance.

Outdoor frame/plant templates: preserve reviewed multipart layouts (park bench E uses reversed
source tile numbering). A bench seat must block a standing body while nearby circulation stays
clear. Plant foliage can be nonblocking while pot/soil remain solid; document that choice rather
than silently deleting all collision. Seeded ridged leaves and tapered pot wedges are reusable
geometry, not proof of species/source likeness or final foliage quality. Verify export, then
walk across indoor/outdoor support with real door pose and furniture obstacles.

Architectural surfaces use source-ID material recipe mappings and fixed world-axis UV phase.
Do not use furniture longest-span UV selection for floors: different room bounds rotate or reset
wood joints. Keep top-face UV axes XY across rooms, polygon cuts and exterior cells. Changing
appearance must preserve support collision/holes; never derive a replacement blanket plane.
Surface-material recipe payloads are tiny because textures are synthesized and cached at runtime;
report generated/GPU costs separately. Unmapped source IDs stay visibly provisional, not guessed.

Whole-house batches: count shadow samplers together with material maps. A seventh two-sample
fixture caused the16-unit fragment limit to hide textured geometry despite passing per-fixture
tests. Budget source samples jointly and preserve total energy; never pick a centered emitter
inside a solid lamp stem. Current10-sampler guard is provisional; floors above10 fixtures need
lighting virtualization/atlas work, not silent shadow removal. Whole-scene GPU checks are
mandatory before accepting an asset batch. Reusable assembly recipes are approximate geometry,
not proof of source likeness. Window fixtures must face the occupied room, not blindly positive
world axes; verify both sides of an exterior wall and retain source opening ownership.

### Interaction consumers must preserve geometry contracts (344)

Compile visibility solids once per scene rebuild for nearby interaction, but keep source floor
polygons for spawn selection. A convex query cache is not a drop-in replacement for every
consumer of volume.collision. Verify room spawn plus reach plus open/close in the real house
after caching changes; isolated collision tests did not catch the wiring regression. Door
interaction requires distance and occlusion, not just nearest scene ID. Endpoint body overlap
checks do not establish a collision-free animated hinge sweep.

### Batch rendering without batching away identity (346)

For multipart furniture, merge compatible opaque draw geometry within the same editable object
only. Preserve the authoritative object, source part IDs, collision/support and separate
emissive/transparent passes. Keep a runtime A/B switch during verification. Measure identical
camera/light states: draw calls can fall while submitted triangles rise due to coarser culling;
CPU submission improvements alone do not establish improved frame cadence or GPU time.

## Volume-first catalogue batch (351)

`studio-furniture-volume.js` and `tools/make_studio_assets.py` demonstrate a shared geometric
recipe producing3D delivery and four isometric catalogue directions. Use native IDs rather than
silently changing an unrelated PZ family. Sparse footprints need an explicit prefab anchor in
every orientation (a rotated L shape may not occupy0,0). Verify all four catalogue assemblies
resolve to exactly one volume recipe, including source offsets. These raster previews remain
approximate flat-colored projections; lossless compression does not imply final art quality.

Original atlas recipes may declare `sourceFiles`: isolated staging copies these dependencies
and the report hashes them. Include transitive local generator imports and input recipes;
a successful in-place generator run is insufficient if isolated canonical generation fails.

### Soft surfaces and near-view rejection (356)

For explicitly soft beveled studio parts, use angle-weighted shared vertex normals before expanding to triangle UVs. Keep hard architecture/wood normals flat. Do not globally smooth every mesh. Bump-textured parts may batch only with matching texture identity and physical bump amplitude; otherwise surface detail can silently undo draw-call reductions.

Near-view inspection rejected the initial cloth patch: imported upholstery seams repeated as rectangular surface markings. Whole-room screenshots hid the defect. Tighten the reviewed patch to the interior fabric and reduce relief amplitude; seams must be authored geometry rather than repeated surface texture. Preserve failed images alongside the corrected rendering. Luminance detail is not measured physical height.

### Occupied-space allowances

A static furniture footprint does not represent its use. Optional volume recipe `activityZones` contain local min/max boxes, label and evidence note, transformed with exactly the mesh placement/facing/support transform. Chair/stool pull-back and trainer exercise envelopes are advisory checks in the volume inspector. Preserve envelope dimensions when correcting alignment; do not shrink them solely to pass a layout. Check real architectural prism collision as well as convex furniture. Current coverage is partial and does not certify ergonomics, animated movement, room containment, door swing or circulation. The west-facing studio trainer exposed a width-centering error; its 0.1 m local offset removes the wall intrusion while preserving the 1.8 × 1.2 m exercise zone.

### Padded envelopes (367)

Use `upholsteryVolume` for bounded convex padded forms; it retains authored extents and creates collision from the same visible hull. Its superellipsoid exponent controls squareness. Stable part IDs and original material recipes remain intact. It does not simulate draped cloth, sag, wrinkles or stitching. Register the helper as a transitive source dependency before canonical atlas rebuilding. Remove or re-author old planar decorative strips that would float above the new curved surface. Check both close lighting and movement cost: finer curved collision hulls are more expensive than beveled boxes.

### Textile family details

`textile-detail-volume.js` provides sewn piping following the thin axis of a bounded
soft cushion, and a cloth strip that bends over a furniture edge with deterministic
folds. Use the same authored dimensions as the cushion; do not make trim a second
collision barrier. Structural cushions retain their convex collision envelopes.
Decorative trim has no collision, so integration checks must explicitly distinguish it
from the underlying body and still test that the furniture blocks a walking character.
Drapes require a real supporting edge and sufficient floor clearance. These are original
geometric details, not simulated fabric or recovered details from source sprite pixels.
Register the helper and transitive hull dependencies in both raster and volume recipes,
rebuild both deliveries, and inspect the whole room at normal play zoom and close range.

### Explicit wall-light faces

Directional wall-light variants carry TianWallSide=front (positive wall normal) or
opposite (negative wall normal). N/W attachments remain the structural support axes;
S/N/E/W facing records represent all four emitted directions. The 3D compiler applies
one transform to mesh vertices, collision solids, emitter position/target and source
samples. Existing fixtures without explicit side retain room-side inference for save
compatibility. Test both N and W supports and both faces after wall translation. Avoid
placing over a door/window: current wall-light volumes require a solid wall segment.

### Authored fabric microstructure (385)
Keep imported source colour separate from authored yarn geometry/response. `wovenSurfacePixels`
creates deterministic even-count interlacing, bounded tangent normals and roughness; recipes
record physical repeat dimensions and relief in metres. It does not recover missing source
pixels. Use `relief` for pixel arrays and numeric `height` for texture dimensions: duplicate
height keys produced invalid runtime maps despite data-only tests passing. Verify the actual
DataTexture dimensions, normal data and near/play-distance renders. Shared material batching
must include normal-map identity/scale. Tiny woven detail alone does not establish visual quality.

### Furniture relocation during residence (387)
A visual move must move saved container contents as well as authored stock positions.
Use stable scene object identity and verified multipart correspondence; remap world container
addresses atomically, retain item IDs and depleted state, and transform the old stock baseline
before computing additions. Refuse ambiguous occupied destinations. Test with player-stored
belongings (not only authored supplies) and partial fluid. Container deletion/replacement and
changed multipart correspondence need explicit policies; never silently refill to hide them.

### Architecture finishes (388)
Use material-owned finish profiles and the authoritative room/wall/aperture geometry.
Generate skirting only on supported interior faces; floor-level doors and full-height glazing
must interrupt it. Casings stay outside the aperture. Keep selection linked to host wall,
recipe dimensions validated before publish, and distinguish decorative finish from structural
collision. Runtime tests must include actual door traversal and near/room-distance views.

### Shadow artifacts versus material damage (390)
Before redrawing source textures to remove bands, compare the same camera with local
lamps off and directional shadow casting isolated in a disposable code trial. Restore
casting after diagnosis. Broad PCF samples must compare receiver depth at each tap,
not one centre depth; increasing constant or normal bias can detach thin-wall shadows.
The shared soft-shadow hook now applies bounded receiver-plane correction. Preserve
failed images and check daylight as well as night: this is not an indirect-light fix.

### Complete observations before building (391)
A whole-scene public query must include independent roof volumes and physical
calibration, not only rooms/walls/objects. Compare read projections with portable
exports when diagnosing absent structure; an omitted field is not proof of absence.
Roof photo bindings use the same entity vocabulary as scene queries and navigation.
Scoped queries conservatively include intersecting roof AABBs and keep global physical
dimensions; null means no dimensions authored, not zero dimensions.


### Separate material detail from illumination (395)
Plaster now has independent periodic colour, roughness and authored height channels;
physical bump amplitude is explicit in its versioned surface recipe. Preserve imported
colour provenance; generated height does not recover physical measurements from sprites.
Local reflection probes complement SH diffuse. Disable reflected lighting during capture
and prevent the standard environment diffuse term from double-counting the same bounce.
Reserve an environment sampler in the whole-scene shadow budget, dispose stale/cancelled
PMREM targets, and test cold mode switches as well as warmed frame cadence. A smooth warm
sample does not excuse multi-second shader compilation on the first light toggle.

### Independent wood finish (412)

Do not treat sprite brightness as measured relief. Reviewed source-patch colour may
retain artistic shading even after affine gradient removal. Wood materials can now
provide `texture.finish` (`size`, physical `metres`, `relief` in metres, `seed`):
`wood-finish.js` produces independent periodic normal/roughness maps while leaving
source colour intact. Set painted-luminance `bumpScale` to zero for this path. Finish
and weave are mutually exclusive. Include finish parameters in cache identity and
register both wood-finish.js and material-relief.js as recipe source dependencies.
This adds an authored approximation of surface response, not recovered PBR detail
or higher source resolution. Inspect close daylight and local warm light before
claiming an aesthetic improvement; normal-map existence alone is not acceptance.

### Review large surfaces before adding procedural detail

The Studio exterior audit found that replacing imported floor/ground art with generic noise lost source character even while indoor floors retained it. For a reviewed isometric ground tile, reuse `source-floor` with verified atlas offsets and projection plane, register every source page, and inspect day/night at the same framing. Record resampling and baked shading explicitly. Do not call the result recovered albedo, add RGB-derived height indiscriminately, or count a flat grass texture as volumetric vegetation. Check metre-scale repeat and obvious tiling before adding more furniture to hide the problem.

### Preserve presentation when adapting animated source assets

A pose-only renderer call can omit effects applied after rasterization. Check original frame compositing as well as bones, maps and visibility: the volume actor adapter initially lost the existing threat wash this way. Share immutable imported maps/geometry, own variant materials, and dispose only owned resources. Lighting probes must sample world positions after morphing/skinning; evaluating at begin_vertex samples the bind pose. Keep display-space readability styling distinct from claimed physical material reconstruction.

### Physical placement must be a transaction rule

Renderer-only rejection leaves public build commands and2D edits inconsistent. Attach `createScenePlacementValidator(volumeAssets)` to the `StructuredWorkshopModel` used for editing and propagate it to draft/staged models. Validate the final batch state before persistence; restore preview offsets independently. Test a real mapped overlap through direct commit, preview and durable save, assert zero writes on failure, and retain valid placement/undo checks. Report unmapped collision coverage; do not silently call legacy sprite flags full3D validation. Scene loading, structural-only changes and live door poses need their own explicit policies.

### Soft supports (422)

Declare load-bearing cushions with `softSupport: 'seat'`, and bed covers with
`softSupport: 'cover'`; keep them out of static render batches. Immutable source
vertices remain the restoration authority. Runtime foam response uses real seconds,
not accelerated survival time. Covers follow their mattress; rigid frames do not.
The collision hull is a conservative undeformed envelope, not a deformable contact
solver. Do not advertise this as cloth or biomechanical simulation.

Validate sit and sleep independently: bed sitting attaches to the nearest approach-side
edge, while lying follows the bed axis. Imported actor hierarchies contain reflected
transforms; aim limbs in parent-local space rather than decomposing mirrored world
matrices into quaternions. Test the reflected and non-reflected cases. Inspect actual
skin contact in-browser; a passing spring test does not establish visual quality.
Use `softSupport: 'overlay'` for a sofa throw that follows its nearest cushion
without turning the seat into a bed. Deep chaise seats need a front-lip sitting
anchor; their centre is suitable for reclining, not dropping legs through the pad.
Correct upper-body heading as well as leg targets. Rest-pose hands must be raised
away from the cushion. These are authored pose constraints, not solved human contact.

Do not reuse planar receiver-gradient shadow correction on deforming upholstery:
422 produced triangle-shaped mottling even after smooth normals and layer binding
were corrected. Curved soft meshes now retain 24-tap filtering without the planar
depth extrapolation. Preserve failed/after screenshots and verify both day/night.
Dense throws bind to the support's actual triangles at build time. Cache triangle
coefficients and duplicate vertex bindings to avoid blocking preview startup.

### Instance fine placement (427)

Do not distort a shared recipe to fix one scene's furniture spacing. Use public `objects.nudge` with ids/dx/dy in source-grid units. It stores a world-axis `placementOffset` per instance, limited to ±0.5 cells per axis to retain stable tile/inventory anchors. The 3D Fine positioning checkbox enables 0.05-cell arrow and drag steps. Move the complete supporting assembly; mounted children follow, independent mounted/wall fixture nudges are rejected. Offset values are validated on document import and geometry compilation; rotated objects rotate offsets, copied/moved objects retain them. Render vertices, convex hulls and activity zones use the same transform. Interaction reach points and raster object/footprint positions read the saved offset too. Legacy sprite selection and whole-cell solid fallbacks remain coarse; this is not unrestricted free placement or a replacement for completing continuous spatial interaction.

Verification should include public command commit, UI nudge, save/reload, collision rejection and actual seating contact. Tests on mathematical displacement alone cannot establish comfortable ergonomics.

### Authored yarn variation (431)

`wovenSurfacePixels` accepts bounded irregularity and integer seed. Smooth periodic fields vary yarn thickness and micro-roughness without replacing imported colour or deriving height from painted light. Recipe/cache keys include the full weave object. Defaults preserve regular weave. This is authored microstructure, not recovered cloth measurements; it cannot substitute for cushion silhouette, folds, seams or broad fabric colour variation. Use source-floor `finish` for separately authored wood normal/roughness while preserving imported floor colour. Repeating board layout still needs distinct source/layout work.

### Tailored upholstery and conservative collision (432)

`upholsteryVolume.creaseDepth` authors bounded inward gathers at the sewn perimeter. Stable IDs seed phase so siblings differ deterministically. Keep the pre-crease collision mesh explicit and subdivide only rendering triangles; increasing the convex collision tessellation made the regression suite ~10× slower. Validate every visible vertex stays inside the envelope and transformed collision against the authored envelope, rather than asserting that deliberately concave cloth is convex. Runtime foam uses the same undeformed conservative collision convention. This is authored tailoring, not a full cloth solver or measured real upholstery.

### Character dimensions must exclude attachments (433)

Measure visible body skin/direct body meshes, respecting ancestor visibility. A recursive all-mesh bound included held rigid objects and hidden descendants, producing a plausible1.8m diagnostic while shrinking the actual person roughly in half. Check skeletal limb lengths and actual seated/standing furniture comparisons alongside bounds. Calf aiming must use the actual transformed knee rather than an assumed thigh endpoint.

### Wall faces and declared orientation families

Do not overwrite an authored `TianVariantFamily` with a filename heuristic during installation. Test the installed catalogue, not only raw recipe metadata: a postprocessor can silently split N/W from S/E. Wall axis and wall face are different. An object attached to an N wall may project into either adjacent room; check actual rendered vertices and collision bounds on both faces, particularly near the resident entrance. Use `objects.flipWallSide` (also exposed by the 3D furniture toolbar) to select an existing verified opposite-face variant while preserving object identity/support/container migration. Reject absent variants instead of mirroring an unverified sprite. Rehost fixtures, run physical preview, then actually enter and use the room; non-overlap alone does not prove access.

### Dynamic display surfaces (441)
A live screen is a semantic surface on the authoritative placed object, not a replacement baked asset. Transform screen corners with the same object/support transform as its geometry; verify every direction. Keep video pixels in their declared colour space and average emitted energy in linear space. Never normalize a dark frame to a bright light. Exclude live emitters/surfaces from cached static lighting or they leave stale light after shutdown. Verify a real advancing stream and browser CORS, not merely a successful master-manifest response. Package the pinned player and license in static deployments, and release media/lighting together on scene exit.

### World interaction IDs versus scene object IDs (442)
Tile interactions identify coordinates plus source tile; editable objects identify stable scene UUIDs. Never pass one as the other. Resolve exactly one same-level scene object through its multipart source offsets after rechecking reach; fail on ambiguity. This same mapping must connect media, deformation/contact, contents and future authored interactions. Keep alternative nearby targets selectable when one nearest E prompt hides a door behind another fixture; use the normal collision/sweep guards for every entrypoint.

### Refrigerator and finish lessons (443)
- A material's metalness describes the exposed surface, not the substrate: enamel-coated appliances and ceramic should remain dielectric. Add restrained roughness/height variation at authored physical scale; don't increase exposure to disguise plastic surfaces.
- Split moving doors/seals/handles from the stationary shell and exclude them from static batching. Transform hinge points through the same orientation/scale/support path as geometry. Inspection-only poses must reset before movement unless collision is also updated.
- Canonical batch commands must rebuild both raster and volume delivery. A passing raster manifest does not prove that new 3D recipe geometry shipped. Regeneration-equality tests caught this omission.

### Live container contents (444)
- `food-props-volume.js` and `assets/recipes/volume/food-props.json` batch six food/container families into one immutable compressed delivery. `semantics.itemKinds` maps real item types to geometry; empty migration intentionally prevents treating contents as tile furniture.
- The container publishes origin and three transformed basis vectors through `sceneFurnitureVolumes`. Use that same basis for contents and interior light; do not duplicate orientation/offset rules in the renderer.
- `fridge-contents.js` reads actual inventory instances when opened. Stable IDs determine slots; unknown/overflow items are explicitly reported, never replaced by decorative stock. Take/Store continue through normal Simulation validation and timed actions.
- Shelf material needs its own definition: reusing an oven's opaque black glass hid the contents. Transparent shelves avoid an opaque shadow plane. A local cabinet lamp reveals contents without raising whole-room exposure.
- Shader sampler budgets must include the renderer's own BRDF/DFG LUT, not only visible maps. On the tested16-unit browser:3 surface maps+1 room reflection+1 DFG LUT+sun/TV/container shadows reserve8 units, leaving8 fixture shadow samplers. A new interactive light exposed this limit as disappearing opaque furniture. Preserve failure screenshots and inspect actual compiler logs; a pure budget arithmetic test cannot establish completeness of the accounting.
- Final remedy for9-fixture rooms: losslessly pack opaque base RGB and roughness into RGBA, reducing surface samplers3→2. Reserve the DFG LUT explicitly; do not overwrite opacity when applying packed alpha. Chain material shader hooks through room-bounce and shadow-filter installation. Clone `Texture.source` when packing a cloned texture because Three texture clones share Source by default. Never repack transparency; keep that material's explicit resource cost.
- When source colour128px and normal/roughness512px differ, pack roughness into matching normal alpha instead of resampling either source. Keep separate shader cache keys and UV selection for colour-alpha vs normal-alpha. Match packing support to actual material opacity, not unused alpha bytes in an opaque source image. Fresh browser compiler logs are mandatory after adding any new shadowed emitter; one correct fridge screenshot did not prove fabric shaders compiled.

### Local reflection bounds (445)
- Room cubemaps need capture origin and room bounds as well as image data. Use box-projected reflection direction for nearby room-shell hits; keep it paired with the published probe texture. This adds uniforms, not samplers, and preserves the16-unit budget.
- Parallel ray components at a room boundary must be excluded from the nearest-plane minimum. Exterior fragments must not project through an unrelated room. Unit tests cover these geometry cases; actual browser shader compilation is still required.
- Box projection cannot establish furniture parallax, moving reflections, or diffuse occlusion. Record those limits rather than labeling a successful shader compile a GI quality pass.

### Static capture versus animated shadows (446)
- Repeated cubemap faces share the same static light-space shadows. A capture can reuse those maps, but cannot freeze or overwrite the live animated shadow maps between yielded frames.
- `createCaptureShadowCache` swaps capture-owned maps only for synchronous capture renders, restores all live flags/maps in finally, and disposes its own maps on completion/cancellation. New captures invalidate all static caches so edits and light changes remain reflected.
- Verify rendered equivalence, resources after cleanup, and measured frame cadence separately. Lower redundant work does not by itself prove a meaningful user-visible performance gain.

### Textile coverage audit (449)
Audit materials actually referenced by compiled geometry, not every generic material declared
in a recipe. Six used fibre surfaces lacked texture entirely: wash, wardrobe, bath towel,
floor lamp, table lamp and generic sofa. Reuse the reviewed upholstery-detail patch with
separately authored physical weave profiles; retain source provenance, tint and stable IDs.
Towels use coarser relief, shades tighter/flatter weave. Share identical profile maps and
use the existing matching-normal-alpha roughness packing rather than adding samplers.
A near-room screenshot still showed the shade largely smooth at play distance: subpixel
weave is not a solution for silhouette, broad textile colour, emission or diffuse transport.
Record that limitation rather than increasing relief until it shimmers. Remove stale
"no weave" metadata when adding maps, while retaining lack of cloth/visual acceptance.

### Textile colour and paused-residence verification (450)
Micro-normal weave vanishes with minification. An explicit `dyeVariation` profile now
adds bounded low/mid-frequency authored yarn-dye variation to derived runtime colour in
linear light. Original source pixels/alpha are untouched, source-cache identity includes
the profile, and no shader sampler is added. This is authored appearance, not lossless
reconstruction or a cloth/GI solution. Sofa/bed/clothing/towels use stronger variation than
shades; inspect at normal play distance for obvious tiling or dirt-like mottling.
A visual inspection also exposed pause autosave loss: the 30-second autosave could retain
an earlier position despite a displayed prior save success. Save on pause/blur and coalesce
one trailing request behind in-flight writes; verify by normal movement and reload, not
only serialization unit tests. Do not call an approximately restored camera/time an exact
controlled lighting comparison.

### Fixture use frames and pose coordinate systems (452)
Author fixture work faces from actual recipe dimensions through the mesh transform; don't
infer user-facing sides from sprite names. Apply the same access gate to every UI path
(drink, fill and rinse), and test a rear rejection plus an actual walk around to the front.
Source actor yaw assumes its legacy X/Z projection. Volume Rx90 changes that basis:
ordinary actor pose sampling needs reversed world yaw. Physical movement heading must
use resolved world displacement, not screen-relative keys. Keep specialized furniture-rest
pose mapping separate until verified; a numeric angle test alone missed the visible wrong
facing. Retain the failed screenshot and compare the corrected character with the fixture.

### Duplicate skinned rigs and household IK (453)
Body and clothing can carry independent rigs with identical bone names. A root-level
getObjectByName changes only the first one and visibly separates sleeves from skin. Find
all matching chains, solve each with its measured lengths, and update skeletons after
world matrices. Use a transformed fixture target from shared geometry; clamp unreachable
wrist goals instead of stretching arms, and tighten actual standing reach. Verify mid-action
and after cancel in the browser. Analytic limb tests do not establish believable fingers,
cloth contact or a finished animation; source shoulder artifacts remain to be reviewed.

### Contact shading and HDR pipeline (454)
Screen-space AO is a restrained contact approximation, not diffuse bounce or atmospheric
scattering. Compare the same paused camera and clock; measure full multipass draw totals
and frame cadence, not only the final pass. Exclude transparent/faded cutaway geometry
from depth and restore all state on exceptions; avoid duplicate shadow rendering during
normal capture. Keep AO outside radiance captures. Display-space custom shader effects
must be reviewed when introducing an HDR composer: apply authored tints in linear space
before tone mapping, with one final output conversion. Disabled passes can retain GPU
allocations; equal renderer resource counts do not establish equal memory cost.

### Inspect competing surfaces before tuning materials (455)
The oven cabinet and separate metal hob originally ended at the same exposed top plane.
That produced broken bright lines resembling bad reflection/roughness. Stop the carcass
at the hob underside in the shared generator; do not cover z-fighting with roughness,
postprocessing or polygon offset. Preserve source IDs, bump the recipe, rebuild delivery,
and verify both geometry separation and the actual resident view. Shared internal contact
planes are distinct from two overlapping exposed surfaces.

### Diffuse probe receiving-side weighting (456)
Distance alone does not distinguish samples behind a receiving surface. Weight local SH
samples by a continuous wrapped world-normal term before normalization; retain a small
positive floor to avoid disappearing interpolation. Use posed world position and shaded
normal. This is an interpolation heuristic, not occlusion: it cannot establish visibility
through furniture, replace volume scattering, or prove a reference aesthetic. Record
capture completion and actual images separately from structural SH tests.

### Spend bounded emitter budgets completely (457)
Integer per-fixture division can waste residual shadow slots. Allocate one reviewed
source sample per fixture, distribute remaining slots by physical source extent with
diminishing returns, and cap by authored candidates. Stable IDs resolve ties. Divide
energy by each fixture's actual sample count. Test non-divisible budgets, reordered
fixtures, energy and cleanup. This improves available finite-source sampling only when
slots were previously idle; do not claim a visual gain on already saturated floors or
confuse it with blocker-search contact-hardening shadows.

### Shared honed stone finish (464)
Use honed-stone for authored fine mineral-composite worktops: colour clouds and fine
aggregate, independent roughness and shallow relief, repeated at explicit physical scale.
Counter/sink/breakfast-bar share the recipe, cache and stable IDs. Pack roughness into
opaque colour alpha as usual; no new texture sampler for roughness. This is original
approximate material authoring, not recovered PZ stone detail. Compare normal gameplay
views: microrelief alone does not fix block-like geometry, absent reflection visibility
or poor light transport. Preserve those unresolved visual limitations in the journal.

### Shader sampler budgets need actual linked programs (465)
The installed Three standard material uses DFG LUT too; do not assume it is exclusive
to physical/sheened cloth. Count every directional/spot shadow, map/normal-or-bump,
environment, LUT and new visibility texture together. Disabling a feature via a uniform
does not remove its sampler at link time. Omit the code or use a compiled variant.
A model can partly disappear because only some material programs exceed hardware limits.
Read complete recent diagnostics after a rendered failure; host/browser timestamp mismatch
can hide errors. Keep failed screenshots, restore the default, then integrate a shared
shadow atlas rather than dropping lamps or stripping source material maps. Depth-atlas
viewports use render-target physical pixels, not device-scaled renderer viewport calls.

### Studio finish batch (472)

Coated dark metal is authored as a dielectric finish; aluminium and brass use conductor
response. Avoid assigning an intermediate metalness to every metal-looking component.
Use shared deterministic microfinish maps at physical repeat scale and preserve reviewed
source wood/cloth maps. Batch related recipe changes through build_volume_assets.mjs.
Inspect under actual scene lighting: missing illumination cannot be corrected by roughness
alone. Current appliance top darkness remains an unresolved lighting observation.

### Roof interior finish (474)

Independent roof volumes accept optional `interiorTile` (wall-finish tile or null).
Use the public roof profile editor / roofVolume.update command. The 3D adapter partitions
existing underside triangles into roof-interior meshes, keeps the original closed collision
hull on the exterior shell, and retains roofId for cutaway/capture. It does not add a flat
suspended ceiling, lining thickness, insulation or a second scene. Existing roofs without
this field retain their previous appearance. Save an editor draft and apply it to the
residence before judging resident-render evidence: editor and resident plans are separate.

### Open lamp shades and shared shadow budgets

Linen table/floor lamps expose a downward `light` plus `additionalLights` for
upward aperture output. Transform every source position/target/sample with its
host and furniture orientation. Both lobes cast shadows and switch together;
this is an approximate aperture distribution, not measured IES or cloth transport.
Keep their combined intensity bounded when adding a direction. A shared spot
atlas consumes one fragment sampler, but each source still consumes an atlas
slot/render; reserve TV and fridge slots separately. Do not reuse the old
one-sampler-per-source budget when the atlas is installed. Browser startup must
be exercised after lighting topology changes: unit tests alone missed the actual
11-source residence exceeding the legacy nine-source allocation.

### Material detail must retain compatible batching

Opaque parts in the same editable object may share a render batch when their
normal texture identity, normal-space mode, normal scale, other material values
and vertex attribute layout match. Preserve normals and UVs exactly while applying
only the existing local-origin translation. Normal mapping alone is not a reason
to disable batching; different maps/modes/scales remain separate. Animated fridge
hinges, soft supports, transparency and object identity boundaries remain excluded.

### Physical interaction anchors and legacy reach
A low bench can invalidate a whole-cell reach check even when its keyboard is physically reachable. Define interaction anchors in the same transform as compiled geometry, preserve world instance IDs and destroyed state, and share discovery between contextual prompts and inventory. Verify blocked, remote and other-floor cases as well as the successful route. Do not treat passing legacy reach or a modal button as proof of physical access. Rest/danger UI and action rules must use the same visibility model as enemy perception, retaining alerted threats.

### Ergonomic placement and dual-purpose seats (498)

Nominal sprite footprints are not physical furniture centres: a2.2m console can occupy
three1m cells and face North; its centre is then1.9m from the anchor, not1.5m. Align TV,
console and viewing cushion from transformed geometry. Choose TV seats by forward
alignment and physical visibility; nearest cushion is appropriate for ordinary rest,
not automatically the best viewing seat. Check circulation after placing seats: zero
intersection alone did not reveal the narrow piano-bench/sofa-back passage.

Explicit `objects.nudge` with `relativeToHost:true` permits a tabletop child adjustment;
physical validation checks its bottom contact footprint against the host top bounds.
Whole-grid movement still carries the host assembly. The bounds test is conservative
for rectangular tops and does not prove support on arbitrary concave/perforated tops.

Piano-bench storage uses `TianStorage` alongside `BedType`, preserving sitting/media
classification. A lidHinge stores a local point, axis and open angle; transform all three
with the object and exclude moving parts from static batching. Inspection lids close
before resident movement resumes; this is not an unrestricted open-lid collision solver.

### Video-lit diffuse surfaces (501)

Dynamic screen emitters must not be baked into static room captures. The TV now uses
`television-diffuse-transfer.js`: four screen patches → opaque scene surfaces → existing
room probes, with cached SH coefficients multiplied by decoded linear RGB. Keep physical
occluders active even when camera cutaways fade their materials. Zero/stop must remove
energy, and cache preparation must cancel when geometry or source changes. Slice ray work
across frames: an actual studio preparation initially blocked533ms; four-ray slices reduced
the measured maximum step to10.7ms. Do not present that measurement as full performance
acceptance. This approximation uses base-colour albedo, ignores glass/specular and further
bounces; textured albedo integration and dynamic geometry transport remain future work.

### Multifunction drawers and multipart inventory (502)

Use `TianStorage` alongside a bed/seat classification, and accept it in both editor
stocking and game storage UI. Multi-cell furniture must resolve storage to one stable
anchor, while reach validation uses the actually nearby part. Test take/store from the
far side: testing only the anchor misses empty-looking duplicate containers.
`drawerSlide` is a local translation transformed with the assembly, excluded from static
batching. Inspection closes before movement. Clothing display slots must follow actual
inventory and hide on removal; empty drawers must not retain decorative clothes. Check
open travel against bedside furniture, and track imported geometry helpers in recipes.
Reserve TV/fridge shadow slots before adding furniture lamps; derive limits from the
actual atlas capacity rather than maintaining a second stale hardcoded maximum.
