# Momento — remaining work batches

Baseline: checkpoint269 / editor460. Review all four photographs plus the architect plan
before adding work. The previous incremental process repeatedly rebuilt/reloaded for single
objects; the following bounded batches replace that default.

## Batch A: visible interior finishes and equipment

| Observed anchor | Current gap | Shared production method | Placement / evidence |
|---|---|---|---|
| Dark strip under doorway, brown panel and curtain | Missing | Thin stone floor overlay, four directions, no collision | Along the south side of the rear partition; width approximate |
| Pale horizontal air-conditioning unit in coffee view | Missing | Wall-mounted box/louvers N/W; decorative equipment | Rear coffee wall above prep counter; function not simulated |
| Wall electrical fittings | Missing | Wall plate N/W; low and worktop-height styles | Coffee work wall and brown panel; unreadable socket details approximate |
| Grey aggregate floor | Implemented269 | Seeded terrazzo palette | Keep current room finish; do not regenerate a second duplicate |
| Dark doorway threshold | Restored268 | Existing opening threshold | Preserve ID and height; verify in final route |
| Source evidence context | Photo-only notes conflict with later drawing | Reference update in same placement batch | Preserve what photos alone show; append drawing-based interpretation |

Batch A acceptance: one canonical build; all new families in catalogue; floor overlay
preserves underlying structural floor; wall fixtures reject unsupported placement; one
public placement transaction in dependency order; one scene inspection and route. Capture
material/shape approximations. No invented functional HVAC or wiring simulation.

## Batch B: full case verification

- Restore each of four saved views; compare actual openings, counts, proportions and primary
  object relationships. Record source-relative ratios separately from unverified metre scale.
- Complete entrance/customer/staff/inner-door/exhibition/stairs route and supported interactions.
- Move/rotate the actual counter assembly, undo; repaint actual wall without losing openings.
- Export/import latest scene, refresh/reopen and named restore. Earlier feature fixtures do
  not substitute for current scene verification.
- Retain hidden upper interior/roof and uncertain services as inferred. Current upper room
  is not an observed furnished apartment.

## Remaining boundaries

Straight rather than curved outer curb, stylized material grain and approximate fixtures
remain explicit. Independent human fidelity review and full design gates are not waived.
Cantó House, Warehouse Morinha, frozen unseen cases and production verification remain next
stages of the original goal, not replaced by finishing this batch.

## Work accounting

Record canonical builds, browser reloads, public transactions, rejected candidates and
completed whole-case gates per batch. Compare those counts and elapsed time for similar
scope; raw asset count or unequal profiler durations do not establish improved throughput.

## Batch A execution — checkpoint 270

- One build and reload produced four reusable families / ten directional sprites.
- Public request `momento-interior-utility-batch-270` placed five floor overlays and
  three wall fixtures together: editor460 → 461. Public reference-context request
  updated two notes: 461 → 462. Export: `evidence/270-interior-batch/scene-final.json`.
- `preservation.json` confirms existing objects, walls, openings (including threshold),
  rooms, vertical links, inventory and all prior floor tiles remain intact.
- Actual browser coffee view captured in `coffee-batch.png`. Fixtures are stylized,
  equipment dimensions approximate; this is not full photographic-fidelity acceptance.
- Actual temporary-character route traversed entrance, customer aisle, new border and
  service doorway both ways. Report records 0 → 8/96 → 0 surface height, then closing
  the door blocks at y11406.18085. HP100. `walkthrough.json` is not a survival test.
- No rebuild/reload was needed during placement and route review. Two commits, zero
  rejected placement previews. Comparable before/after elapsed throughput not measured.
- Still pending: new source-region annotations, browser exact-pixel proof for this
  atlas revision, consolidated full-case Batch B. No production deployment.

## Batch B progress — checkpoint 271

Actual public command rotation of the current cafe counter (462 → 463) rotated
its grinder, cups, menu and stored baseball bat together. UI undo (464) exports
exactly the original document, including all reference data. Actual room.finish
command changed 31 wall records (465), preserved openings, objects and inventory;
UI undo (466) again exports exactly the baseline. Reload/reopen also exports
exactly that same document. See `evidence/271-scene-editability/checks.json` and
intermediate exports/screenshots; the temporary alternate designs were reverted.

Browser decode of the latest cafe PNG/WebP compared 16,711,680 RGBA channels with
zero differences: 146,736 source bytes → 54,008 delivery bytes. This completes
the pending Batch A browser pixel gate. Evidence `browser-pixels.json`.

Current scene editor466; source scene remains checkpoint270 scene-final.
Remaining Batch B work includes full route including stairs, actual latest import
and named version restoration, quantitative visual comparison and unresolved
independent review. New fixture reference-region annotations remain pending.
No rebuild; one intentional refresh; no production deployment.

## Batch B progress — checkpoint 272

Actual character route: west entry outside → south pavement → east stair entry
(two-leaf steel door) → bottom run → landing → upper run → Floor1 → reverse
route → Floor0 → blue exhibition entry → exhibition floor. HP100, 640 recorded
surface/cell samples. Evidence: `evidence/272-route-recovery/walkthrough.json`.

Imported checkpoint271 export using the UI file chooser; re-export is exactly
equal. Saved named version `version:momento-batch-checkpoint-272`, renamed via
public command, restored named version via public command. Final editor468.
Restored export differs only in sceneDocument.revision; geometry, references,
stock and name restored. Evidence: checks.json and version-save/restore.json.

**New visual failure:** complete exterior view `restored-exterior.png` renders
interior opposite-face wall shelving and its stock in front of the street wall.
Do not count exterior fidelity passed. Workshop painter currently sorts generic
objects by tile x+y+.5 and stock by x+y+.7, without accounting for negative
wall-face projection. Investigate shared draw ordering before continuing visual
acceptance; preserve this screenshot as a rejected output.

No code build or production deployment this checkpoint. Remaining photo/annotation
and independent review gates, Cantó, Warehouse and unseen acceptance stay open.

## Rendering correction — checkpoint 273

Fixed the checkpoint272 exterior failure in shared furnishingDepth: opposite-face
fixtures sort from their actual projected fixture point; stock follows immediately
after the fixture and before opaque walls on the same depth diagonal. Workshop,
game renderer and house thumbnail now share the rule. No scene-coordinate exception.

Real saved exterior view no longer shows the internal shelf/coffee bags through
the street wall; reverse-counter cutaway still shows the shelf and inventory.
Before:272/restored-exterior.png; after:273-fixture-occlusion/exterior.png and
interior.png. Source scene unchanged, editor468. Runtime suite641 passed, including
both N/W opposite-face regressions and ordinary-object ordering invariants.

Authoring guide now requires opaque exterior plus cutaway review for wall-face
assets. This corrects the observed failure, not a claim of general perfect
isometric occlusion or photographic fidelity. Remaining full-case visual gates
and subsequent example scenes are unchanged.

## Updated-geometry route — checkpoint 277

Actual route after the two-cell chamfer change: west cafe entry → shared aisle →
exhibition → former chamfer cells now interior → new diagonal boundary → blue
side exit. Character blocked at the new edge and exits only through the opened
door. HP100. Export report in277-corner-route; this specifically covers changed
floor geometry, not another three-day survival claim. Reload/reopen export equals
checkpoint276 scene-final exactly. Current editor474.

Next visual batch: centered multipart graphic across the two-segment corner face;
source-region bindings for utility fixtures; divider/service-region proportions
with supports and clearances treated together. No ad hoc scene-file edits.

### Centered graphic completed — checkpoint278

Two-panel corner graphic is placed through public commands and visually centered.
Removed-entity reference links repaired; no dangling annotation entity remains.
645 runtime tests, asset freshness and exact reload pass. Evidence278. Remaining:
new utility reference-region bindings, updated browser atlas equality, coordinated
divider/service proportions and full-case visual review. No production deployment.

### Consolidated review checkpoint280

Latest scene480 refresh/export equals279 scene-final exactly. Current cafe atlas
17,694,720 RGBA channels compare exactly in browser; fetched hashes match current
local PNG/WebP files.149,830→55,252 bytes (63.1% smaller). All four current views
are captured together. Missing utility-region annotations are now supplied in279.

Remaining: bar divider width, grid-limited chamfer/service proportions, stylized
brick/terrazzo grain and counter/equipment shapes; fixed isometric camera does not
match photographic projection. No human visual acceptance recorded. Retain this
saved case for combined final review while starting Cantó's development input/
architecture inventory. This does not waive Momento's outstanding final gates.
