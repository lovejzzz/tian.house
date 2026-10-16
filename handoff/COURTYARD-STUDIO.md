# Courtyard Studio — permanent volumetric sample

Checkpoint 333, original residential design; not a photo reconstruction or accepted final art.
Built through House Library → New house → Blank plot and public Build commands. Previous
Cantó house saved by the new-house workflow. Current draft and named library entry persist.
Export: `evidence/333-courtyard-studio/house.json`.

## Spatial intent and current state

- Living / kitchen: [7995,11402,8003,11408], 8×6 assumed metres. North kitchen appliances,
  west seating/storage, central dining/work table, east courtyard entry. Separate routes
  around table to bedroom/bathroom; tested north edge then central north–south passage.
- Bedroom: [7995,11408,8000,11412], 5×4. Bed in southern portion with access from living;
  west glazing. Bed currently S-facing; assess relationship to window and headboard at next review.
- Bathroom: [8000,11408,8003,11412], 3×4. Separate access from living. **Empty**, needs proper
  opaque door, privacy window, sanitary fixtures, waterproof finishes, lighting and ventilation.
- East courtyard / deck: 4×4 floor patch [8003,11404,8007,11408]. Garden planting, boundary,
  exterior lighting, seating and roof still missing. Grass currently renders as plain solid material.
- Seven openings: 3 doors, 4 windows. Existing glass-door prototype is unsuitable for bedroom
  and bathroom privacy; replace using a general opaque-door family, not a scene-only workaround.

## Batch inventory

| Family | Current count | Volume delivery | Next review |
|---|---:|---|---|
| Table / lamp | 1 each | existing | support height, glare, final surface material |
| Dark wooden chair | 2 | existing | dining reach, chair spacing |
| Metal shelving | 1 | existing | intended contents, residential finish |
| Sofa | 1 | new approximate 12-part recipe | upholstery shape / seams, orientation |
| Bed | 1 | new approximate 12-part recipe | textile volume, bedside furniture |
| Oven | 1 | new approximate 14-part recipe | kitchen adjacency / worktop integration |
| Fridge | 1 | new approximate 8-part recipe | handle clearance, authored metal |
| Kitchen counter / sink | missing | pending | prepare with bathroom wet-fixture batch |
| Bathroom fixtures | missing | pending | shared plumbing / ceramic family |
| Roof / garden / ceiling lights | missing | pending | complete building envelope and exterior |

New mesh-only recipes preserve imported IDs and source layouts; approximate geometry is
originally authored, not a claimed lossless reconstruction of PZ pixels. Recipe metadata,
materials, geometry and collision are compressed into gzip deliveries. Existing interaction
records remain on the same source objects. No separate hidden furnished scene.

## Evidence and limits

Public revisions: blank542, structure543, openings/deck544, furniture545. First openings
preview rejected duplicate room/door ID; changed opening IDs before commit. Commit544 receipt
was read after observation timeout; no repeated submission. Reload restored named scene.
Preview reports44 walls,3 slabs,2 exterior surfaces,9 furnishings,7 openings,0 unresolved
furnishings/openings,0 roofs,source revision7. This is coverage of placed items only.

Actual diagnostic body moved from7995.5,11402.5 to7998.101,11402.5 then7998.101,11405.717,
remaining grounded and clear. Day/night images in evidence folder. This is a limited route,
not a complete home inspection, gameplay residence, or quality acceptance. Normal game
remains paused11:44. Production unchanged.

The result is still visibly blocky, with flat architecture materials and incomplete lighting.
Next work must complete wet rooms, kitchen surfaces, roof and yard in this permanent scene,
then address whole-scene material/light/occlusion quality; do not return to disposable prop
fixtures as the primary deliverable.

## Checkpoint334 update

Public request courtyard-wet-334 at545 committed546; source revision9. Added Modern Counter
at7999,11402 (S), White Standing Sink at8000,11402 (S), bathroom sink8000,11410 (E), Fancy
Toilet8002,11411 (N). All13 current furnishings have approximate 3D mappings. Saved library
entry and export `evidence/334-volume-publication/house.json` supersede333 for continued work.

Bathroom diagnostic walk contacts the sink at8000.5,11409.951, then moves east and south to
8001.817,11411.153 grounded/clear. It verifies a usable bypass, not actual sanitary interaction
or entry-door traversal. Basin rims have real empty centers. Kitchen standing sink is a
provisional fixture, needs integrated worktop continuity. Bathroom still lacks bathing,
privacy, finishes, ventilation and local light; earlier 'empty' status is superseded only
by these two fixtures. Roof and yard remain pending.

## Checkpoint335 — roof shell

Added studio-roof via public roofVolume.add request546→547: footprint7995,11402 through
8003,11412, base1 storey, profile rises1.08→1.24 acrossX (ridge axisY). This is an approximate
low-pitch roof, not a construction-engineered assembly; surface material remains provisional.
Current authoritative export: evidence/335-roof-shell/house.json. Named library save succeeded.

Roof cutaway hides its color/depth pass while retaining its shadow mesh and all-floor collision.
Hidden roof pieces cannot intercept clicks intended for furniture/floors. Toggle restores the
same mesh, not a second scene. Browser day view now loses the previous overhead sun wash while
retaining directional light through openings. Actual route7995.5,11402.5→7998.103,11405.714
remains grounded/clear. Complete roof view and cutaway screenshots retained. Remaining: opaque
privacy doors, bathing, materials, lighting distribution, garden, and roof exterior details.

## Checkpoint336 — privacy

Bedroom and bathroom door tiles now fixtures_doors_01_1 (opaque), with original opening IDs
preserved. Latest export: evidence/336-privacy-doors/house.json, editor548. Actual diagnostic
closed/open passage succeeded; provisional generic brown leaf still needs source/style-aware
materials and moulding details. The earlier glass-door privacy issue is resolved geometrically;
final gameplay interaction and visual style remain separate gates.

## Checkpoint337 — shower

Open-front shower at8002,11409 (S),14 total source objects, editor549. Latest export337-shower/
house.json. Full-body entry, rear collision and exit verified in browser diagnostic walk.
Bathroom now has bathing geometry alongside sink/toilet, but water/animation, finishes,
ventilation and room lighting remain pending. Glass alpha is provisional, not refraction.

### Checkpoint338

Saved revision550 adds a bedroom writing desk, supported linen lamp and chair.17 objects
resolve to volume prototypes. Diagnostic entry-to-desk approach remains clear; night-on/off
screenshots show actual local illumination but overall room brightness is not yet accepted.
Current UI export: evidence/338-light-transform/house.json. Bathroom/kitchen lighting and
bedroom general light remain outstanding; this is not gameplay residence acceptance.

### Checkpoint339

Saved revision551 contains21 objects, including kitchen/bathroom strip lights and bedroom/
living wall sconces. Current export: evidence/339-wall-lights/house.json. Source wall ownership
persists across reload. Night on/off and shadow-adjusted screenshots retained; bathroom aisle
passes diagnostic body test. Lighting is more readable but material/atmosphere/performance
acceptance remains open. All these lamps use the preview's common switch, not final individual
gameplay interaction yet.

### Checkpoint340

Saved revision552:24 objects, patio park bench and two potted plants. Evidence in340-patio.
Diagnostic route crosses entry onto patio; bench blocks at expected front and retreat is clear.
Outdoor floor/grass material separation remains inadequate; this is an incomplete garden study.

### Checkpoint341

Saved revision553 retains24 objects; patio16 cells now stone paving with a two-cell-wide,
five-cell approach path. Source-keyed 3D materials distinguish wood, paving and grass. Walked
through door, along patio/path and onto lawn grounded/clear. Current evidence/export341-surface-materials.
Only three surface identities mapped; broader materials, garden and final visual quality pending.

### Checkpoint342 — whole-house batch

Saved revision554,36 objects. One transaction added wardrobe, bathroom supplies/counter,
kitchen and desk/dining sets, reading lamp, wall art and four curtains; roof finish changed.
Current export342-interior-batch/house.json. Integrated GPU failure was fixed by sample budgeting;
lighting remains capped pending virtualization. Interior/roof day and night screenshots retained.
Bedroom circulation passes; bathroom requires precise alignment near jamb (known UX gap).
